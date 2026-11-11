import sys
from pathlib import Path

# Add ai-service to sys.path
AI_SERVICE_DIR = Path(__file__).resolve().parent.parent / "ai-service"
sys.path.insert(0, str(AI_SERVICE_DIR))

from app.ingestion.pdf_extractor import pdf_extractor
from app.ingestion.chunker import academic_chunker
from app.embeddings.embedding_service import embedding_service
from app.vector_store.pinecone_client import vector_store

STORAGE_DOCS = Path(__file__).resolve().parent.parent / "storage" / "documents"

def index_doc(doc_id: str, version_id: str, pdf_filename_pattern: str, title: str, scope: str):
    matches = list(STORAGE_DOCS.glob(f"*{pdf_filename_pattern}*"))
    if not matches:
        print(f"No file matching {pdf_filename_pattern} in {STORAGE_DOCS}")
        return

    file_path = str(matches[0])
    print(f"\n[Indexing] Ingesting {title} (ID: {doc_id})...")
    pages = pdf_extractor.extract(file_path)
    print(f"Extracted {len(pages)} pages.")

    chunks = academic_chunker.chunk_pages(
        pages=pages,
        document_id=doc_id,
        version_id=version_id,
        extra_metadata={"title": title, "access_scope": scope},
    )
    print(f"Generated {len(chunks)} chunks.")

    texts = [c["text"] for c in chunks]
    embeddings = embedding_service.embed_texts(texts)

    count = vector_store.upsert_chunks(chunks, embeddings)
    print(f"Upserted {count} vectors to vector store.")

if __name__ == "__main__":
    import json
    # Query MongoDB IDs from node or use matching pattern
    # We can fetch IDs from MongoDB or pass them
    print("Testing indexer...")
