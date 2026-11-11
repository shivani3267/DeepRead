import os
import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# Persistent storage directory on local filesystem
STORAGE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "storage" / "vector_store"
STORAGE_FILE = STORAGE_DIR / "vectors.json"


class LocalPersistentVectorStore:
    """
    Persistent local vector database stored on the local filesystem.
    Eliminates external cloud dependencies (such as Pinecone) and ensures
    vectors, chunks, and metadata persist permanently across server restarts.
    Supports exact cosine similarity scoring and metadata filtering.
    """

    def __init__(self, dimension: int = 768):
        self.dimension = dimension
        self.vectors: Dict[str, Dict[str, Any]] = {}
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self._load_from_disk()

    def _load_from_disk(self):
        """Loads vectors and metadata from local JSON file if present."""
        if not STORAGE_FILE.exists():
            logger.info(f"[LocalVectorStore] No existing index file at {STORAGE_FILE}. Starting empty.")
            return

        try:
            with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                raw_data = json.load(f)

            loaded_count = 0
            for vec_id, item in raw_data.items():
                values = np.array(item["values"], dtype=np.float32)
                norm = np.linalg.norm(values)
                if norm > 0:
                    values = values / norm
                self.vectors[vec_id] = {
                    "id": vec_id,
                    "values": values,
                    "metadata": item.get("metadata", {}),
                }
                loaded_count += 1

            logger.info(f"[LocalVectorStore] Successfully loaded {loaded_count} vectors from {STORAGE_FILE}")
        except Exception as e:
            logger.error(f"[LocalVectorStore] Failed to load index from {STORAGE_FILE}: {e}")

    def _save_to_disk(self):
        """Atomically persists vectors and metadata to disk."""
        try:
            serializable = {}
            for vec_id, item in self.vectors.items():
                serializable[vec_id] = {
                    "id": vec_id,
                    "values": item["values"].tolist(),
                    "metadata": item.get("metadata", {}),
                }

            tmp_file = STORAGE_FILE.with_suffix(".tmp")
            with open(tmp_file, "w", encoding="utf-8") as f:
                json.dump(serializable, f)
            tmp_file.replace(STORAGE_FILE)
            logger.debug(f"[LocalVectorStore] Persisted {len(serializable)} vectors to disk.")
        except Exception as e:
            logger.error(f"[LocalVectorStore] Failed to persist vectors to disk: {e}")

    def upsert(self, vectors: List[Dict[str, Any]]) -> int:
        for item in vectors:
            vec_id = str(item["id"])
            values = np.array(item["values"], dtype=np.float32)
            norm = np.linalg.norm(values)
            if norm > 0:
                values = values / norm
            self.vectors[vec_id] = {
                "id": vec_id,
                "values": values,
                "metadata": item.get("metadata", {}),
            }
        self._save_to_disk()
        return len(vectors)

    def query(
        self,
        vector: List[float],
        top_k: int = 5,
        filter_dict: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        if not self.vectors:
            return []

        q_vec = np.array(vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec = q_vec / q_norm

        scored_matches: List[Dict[str, Any]] = []

        for vec_id, data in self.vectors.items():
            meta = data["metadata"]

            # Evaluate metadata filter (e.g. {"document_id": {"$in": [...]}})
            if filter_dict:
                match = True
                for field, condition in filter_dict.items():
                    val = str(meta.get(field, ""))
                    if isinstance(condition, dict) and "$in" in condition:
                        allowed = [str(x) for x in condition["$in"]]
                        if val not in allowed:
                            match = False
                            break
                    elif str(condition) != val:
                        match = False
                        break
                if not match:
                    continue

            # Cosine similarity
            stored_val = data["values"]
            if len(stored_val) == len(q_vec):
                score = float(np.dot(q_vec, stored_val))
            else:
                score = 0.0

            scored_matches.append({
                "id": vec_id,
                "score": score,
                "metadata": meta,
            })

        # Sort descending by similarity score
        scored_matches.sort(key=lambda x: x["score"], reverse=True)
        return scored_matches[:top_k]

    def delete_by_version(self, document_id: str, version_id: str) -> int:
        doc_id_str = str(document_id)
        ver_id_str = str(version_id)
        to_delete = [
            vid for vid, data in self.vectors.items()
            if str(data["metadata"].get("document_id")) == doc_id_str
            and str(data["metadata"].get("version_id")) == ver_id_str
        ]
        for vid in to_delete:
            del self.vectors[vid]
        if to_delete:
            self._save_to_disk()
        return len(to_delete)


class LocalVectorStoreManager:
    """
    Primary local vector database manager replacing cloud Pinecone.
    Provides fast, persistent, zero-cloud local vector search.
    """

    def __init__(self):
        self.dimension = settings.EMBEDDING_DIMENSION
        self.local_store = LocalPersistentVectorStore(dimension=self.dimension)
        self.is_connected = True  # Always connected to local system
        logger.info(f"[VectorStore] Operating exclusively in Local Persistent Vector Store mode (dim={self.dimension}).")

    def upsert_chunks(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> int:
        if len(chunks) != len(embeddings):
            raise ValueError("Chunks count must match embeddings count.")

        vectors = []
        for chunk, emb in zip(chunks, embeddings):
            meta = chunk.get("metadata", {})
            title = chunk.get("title") or meta.get("title") or "Academic Document"
            scope = chunk.get("access_scope") or meta.get("access_scope") or "public"
            vectors.append({
                "id": str(chunk["chunk_id"]),
                "values": emb,
                "metadata": {
                    "document_id": str(chunk["document_id"]),
                    "version_id": str(chunk["version_id"]),
                    "chunk_id": str(chunk["chunk_id"]),
                    "page_number": int(chunk["page_number"]),
                    "title": title,
                    "text": chunk.get("text", ""),
                    "access_scope": scope,
                },
            })

        count = self.local_store.upsert(vectors)
        logger.info(f"[LocalVectorStore] Successfully indexed and persisted {count} chunks.")
        return count

    def query(
        self,
        query_vector: List[float],
        authorized_document_ids: List[str],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        doc_ids_clean = [str(did) for did in authorized_document_ids if did]
        if not doc_ids_clean:
            return []

        filter_dict = {
            "document_id": {"$in": doc_ids_clean}
        }

        return self.local_store.query(
            vector=query_vector,
            top_k=top_k,
            filter_dict=filter_dict,
        )

    def delete_version_vectors(self, document_id: str, version_id: str) -> int:
        deleted = self.local_store.delete_by_version(document_id, version_id)
        logger.info(f"[LocalVectorStore] Deleted {deleted} vectors for doc={document_id}, version={version_id}")
        return deleted

    @property
    def total_vectors(self) -> int:
        return len(self.local_store.vectors)


# Export standard vector_store singleton used across the AI service
vector_store = LocalVectorStoreManager()
