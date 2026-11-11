import logging
from typing import List, Dict, Any
from app.embeddings.embedding_service import embedding_service
from app.vector_store.pinecone_client import vector_store

logger = logging.getLogger(__name__)

class AcademicRetriever:
    """
    Retrieves authorized academic document chunks matching a user query.
    Enforces that only document chunks authorized by Express backend reach the LLM.
    """

    def retrieve(
        self,
        query: str,
        authorized_document_ids: List[str],
        top_k: int = 5,
    ) -> Dict[str, Any]:
        if not authorized_document_ids:
            return {
                "chunks": [],
                "features": {
                    "top_score": 0.0,
                    "second_score": 0.0,
                    "score_diff": 0.0,
                    "mean_top_k": 0.0,
                    "chunk_count": 0,
                    "query_length": len(query),
                },
            }

        # 1. Embed user query
        query_vector = embedding_service.embed_query(query)

        # 2. Query vector store with authorized document IDs
        raw_matches = vector_store.query(
            query_vector=query_vector,
            authorized_document_ids=authorized_document_ids,
            top_k=top_k,
        )

        chunks: List[Dict[str, Any]] = []
        scores: List[float] = []

        for m in raw_matches:
            meta = m.get("metadata", {})
            score = float(m.get("score", 0.0))
            scores.append(score)

            chunks.append({
                "chunk_id": m.get("id"),
                "document_id": meta.get("document_id"),
                "version_id": meta.get("version_id"),
                "page_number": int(meta.get("page_number", 1)),
                "title": meta.get("title", "Academic Document"),
                "text": meta.get("text", ""),
                "similarity_score": round(score, 4),
            })

        # Calculate retrieval summary features for answerability classification
        top_score = scores[0] if len(scores) > 0 else 0.0
        second_score = scores[1] if len(scores) > 1 else (top_score if len(scores) == 1 else 0.0)
        score_diff = top_score - second_score
        mean_top_k = float(sum(scores) / len(scores)) if scores else 0.0

        features = {
            "top_score": round(top_score, 4),
            "second_score": round(second_score, 4),
            "score_diff": round(score_diff, 4),
            "mean_top_k": round(mean_top_k, 4),
            "chunk_count": len(chunks),
            "query_length": len(query),
        }

        return {
            "chunks": chunks,
            "features": features,
        }

academic_retriever = AcademicRetriever()
