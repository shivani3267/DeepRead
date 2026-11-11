import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.core.security import verify_internal_key
from app.ingestion.pdf_extractor import pdf_extractor, PDFExtractionError
from app.ingestion.chunker import academic_chunker
from app.embeddings.embedding_service import embedding_service
from app.vector_store.pinecone_client import vector_store
from app.retrieval.retriever import academic_retriever
from app.classification.answerability import answerability_service
from app.generation.llm_provider import llm_provider
from app.generation.prompt_builder import INSUFFICIENT_EVIDENCE_MESSAGE
from app.citations.verifier import citation_verifier

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory job registry for tracking
ingestion_jobs: Dict[str, Dict[str, Any]] = {}

# ----------------- SCHEMAS -----------------

class IngestionRequest(BaseModel):
    document_id: str
    version_id: str
    file_path: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class QueryRequest(BaseModel):
    query: str
    authorized_document_ids: List[str]
    user_id: str
    conversation_id: Optional[str] = None
    top_k: int = 5

class EvaluateRequest(BaseModel):
    test_cases: List[Dict[str, Any]]

# ----------------- ENDPOINTS -----------------

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "DeepRead AI RAG Engine",
        "embedding_provider": embedding_service.provider,
        "embedding_model": settings.GEMINI_EMBEDDING_MODEL,
        "vector_store_type": "local_persistent",
        "total_vectors": vector_store.total_vectors,
        "llm_provider": llm_provider.__class__.__name__,
    }

@router.post("/internal/ingestion", dependencies=[Depends(verify_internal_key)])
async def ingest_document(payload: IngestionRequest):
    """
    Executes the ingestion pipeline:
    1. PyMuPDF page-by-page text extraction (preserves page numbers).
    2. Academic token chunking with overlap.
    3. Sentence Transformers embedding generation (BAAI/bge-small-en-v1.5).
    4. Pinecone vector upsert with metadata.
    """
    logger.info(f"[Ingestion] Starting ingestion for doc={payload.document_id}, version={payload.version_id}")

    try:
        # 1. Extraction
        extracted_pages = pdf_extractor.extract(payload.file_path)

        # 2. Chunking
        chunks = academic_chunker.chunk_pages(
            pages=extracted_pages,
            document_id=payload.document_id,
            version_id=payload.version_id,
            extra_metadata=payload.metadata,
        )

        if not chunks:
            logger.warning(f"No chunks generated for {payload.file_path}")
            return {
                "success": True,
                "document_id": payload.document_id,
                "version_id": payload.version_id,
                "extracted_pages": len(extracted_pages),
                "generated_chunks": 0,
                "indexed_vectors": 0,
            }

        # 3. Embeddings
        chunk_texts = [c["text"] for c in chunks]
        embeddings = embedding_service.embed_texts(chunk_texts)

        # 4. Upsert to Pinecone
        indexed_count = vector_store.upsert_chunks(chunks, embeddings)

        logger.info(f"[Ingestion] Completed: {len(extracted_pages)} pages, {len(chunks)} chunks indexed.")

        return {
            "success": True,
            "document_id": payload.document_id,
            "version_id": payload.version_id,
            "extracted_pages": len(extracted_pages),
            "generated_chunks": len(chunks),
            "indexed_vectors": indexed_count,
        }

    except PDFExtractionError as pe:
        logger.error(f"[Extraction Error]: {pe}")
        raise HTTPException(status_code=400, detail=str(pe))
    except Exception as e:
        logger.error(f"[Ingestion Error]: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ingestion pipeline failure: {str(e)}")

@router.post("/internal/query", dependencies=[Depends(verify_internal_key)])
async def execute_rag_query(payload: QueryRequest):
    """
    Executes grounded RAG query:
    1. Embeds query & retrieves chunks strictly restricted to authorized_document_ids.
    2. Runs answerability classification (baseline threshold + logistic regression).
    3. If evidence is insufficient, immediately abstains without hallucinating.
    4. Generates grounded answer via LLM.
    5. Verifies citations against retrieved source material.
    """
    query = payload.query.strip()
    authorized_docs = payload.authorized_document_ids

    if not authorized_docs:
        return {
            "answer": "No academic documents are currently accessible to your account for this query.",
            "citations": [],
            "is_abstention": True,
            "confidence": 0.0,
            "answerability": {"is_answerable": False},
        }

    # 1. Retrieval
    retrieval_res = academic_retriever.retrieve(
        query=query,
        authorized_document_ids=authorized_docs,
        top_k=payload.top_k,
    )
    chunks = retrieval_res["chunks"]
    features = retrieval_res["features"]

    # 2. Answerability Classification
    answerability = answerability_service.evaluate_retrieval(features)

    # 3. Abstention Check
    if not answerability["is_answerable"] or not chunks:
        return {
            "answer": INSUFFICIENT_EVIDENCE_MESSAGE,
            "citations": [],
            "is_abstention": True,
            "confidence": round(float(features.get("top_score", 0.0)), 3),
            "answerability": answerability,
            "retrieval_features": features,
        }

    # 4. LLM Generation
    raw_answer = await llm_provider.generate_answer(query, chunks)

    # Check if LLM itself declared insufficient evidence
    if (
        "not contain sufficient evidence" in raw_answer.lower()
        or "insufficient evidence" in raw_answer.lower()
    ):
        return {
            "answer": INSUFFICIENT_EVIDENCE_MESSAGE,
            "citations": [],
            "is_abstention": True,
            "confidence": round(float(features.get("top_score", 0.0)), 3),
            "answerability": answerability,
            "retrieval_features": features,
        }

    # 5. Citation Verification
    verified_answer, verified_citations = citation_verifier.verify(
        answer_text=raw_answer,
        retrieved_chunks=chunks,
    )

    return {
        "answer": verified_answer,
        "citations": verified_citations,
        "is_abstention": False,
        "confidence": round(float(features.get("top_score", 0.0)), 3),
        "answerability": answerability,
        "retrieval_features": features,
    }

@router.delete("/internal/vectors/{document_id}/{version_id}", dependencies=[Depends(verify_internal_key)])
def delete_version_vectors(document_id: str, version_id: str):
    """Purges Pinecone vectors for an obsolete or retired document version"""
    deleted_count = vector_store.delete_version_vectors(document_id, version_id)
    return {
        "success": True,
        "document_id": document_id,
        "version_id": version_id,
        "deleted_vectors": deleted_count,
    }
