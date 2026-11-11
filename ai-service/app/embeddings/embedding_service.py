import logging
import hashlib
import re
import numpy as np
import httpx
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Online & Local Hybrid Embedding Service for DeepRead.
    Primary Online Model: Google Gemini text-embedding-004 (768 dimensions).
    Alternative Online Model: Hugging Face Inference API.
    Deterministic Local Fallback: 768-dimensional semantic n-gram feature hashing for offline testing.
    """

    def __init__(self):
        self.provider = settings.EMBEDDING_PROVIDER.lower().strip()
        self.dimension = settings.EMBEDDING_DIMENSION
        self.gemini_key = settings.GEMINI_API_KEY.strip()
        self.gemini_model = settings.GEMINI_EMBEDDING_MODEL.strip() or "text-embedding-004"
        self.hf_key = settings.HUGGINGFACE_API_KEY.strip()
        self.hf_model = settings.HUGGINGFACE_EMBEDDING_MODEL.strip() or "BAAI/bge-small-en-v1.5"

    def _generate_fallback_embedding(self, text: str) -> List[float]:
        """
        Deterministic, consistent 768-dimensional unit-norm vector fallback.
        Ensures consistent cosine similarity in offline testing environments.
        """
        vec = np.zeros(self.dimension, dtype=np.float32)
        tokens = re.findall(r"\w+", text.lower())

        if not tokens:
            return vec.tolist()

        # Unigram and Bigram hashing
        for idx, token in enumerate(tokens):
            h1 = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16) % self.dimension
            vec[h1] += 1.0

            if idx < len(tokens) - 1:
                bigram = f"{token}_{tokens[idx+1]}"
                h2 = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest(), 16) % self.dimension
                vec[h2] += 1.5

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def _embed_gemini_single(self, text: str, task_type: str = "RETRIEVAL_QUERY") -> List[float]:
        """Calls Google Gemini embedContent API for a single query or text"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:embedContent?key={self.gemini_key}"
        payload = {
            "model": f"models/{self.gemini_model}",
            "content": {"parts": [{"text": text[:8000]}]},
            "taskType": task_type,
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    values = data.get("embedding", {}).get("values", [])
                    if values:
                        v = np.array(values, dtype=np.float32)
                        norm = np.linalg.norm(v)
                        if norm > 0:
                            v = v / norm
                        return v.tolist()
                else:
                    logger.warning(f"[Gemini Embeddings] HTTP {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"[Gemini Embeddings API Error]: {e}")

        return self._generate_fallback_embedding(text)

    def _embed_gemini_batch(self, texts: List[str], task_type: str = "RETRIEVAL_DOCUMENT") -> List[List[float]]:
        """Calls Google Gemini batchEmbedContents API in batches of up to 50 items"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:batchEmbedContents?key={self.gemini_key}"
        all_embeddings = []
        batch_size = 50

        for i in range(0, len(texts), batch_size):
            chunk = texts[i : i + batch_size]
            requests = [
                {
                    "model": f"models/{self.gemini_model}",
                    "content": {"parts": [{"text": t[:8000]}]},
                    "taskType": task_type,
                }
                for t in chunk
            ]

            try:
                with httpx.Client(timeout=45.0) as client:
                    res = client.post(url, json={"requests": requests})
                    if res.status_code == 200:
                        data = res.json()
                        embeddings_data = data.get("embeddings", [])
                        for item in embeddings_data:
                            vals = item.get("values", [])
                            v = np.array(vals, dtype=np.float32)
                            norm = np.linalg.norm(v)
                            if norm > 0:
                                v = v / norm
                            all_embeddings.append(v.tolist())
                    else:
                        logger.warning(f"[Gemini Batch Embeddings] HTTP {res.status_code}: {res.text}")
                        for t in chunk:
                            all_embeddings.append(self._generate_fallback_embedding(t))
            except Exception as e:
                logger.warning(f"[Gemini Batch Embeddings Error]: {e}")
                for t in chunk:
                    all_embeddings.append(self._generate_fallback_embedding(t))

        return all_embeddings

    def _embed_huggingface(self, texts: List[str]) -> List[List[float]]:
        """Calls online Hugging Face Inference API"""
        url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.hf_model}"
        headers = {"Authorization": f"Bearer {self.hf_key}"}

        try:
            with httpx.Client(timeout=45.0) as client:
                res = client.post(url, headers=headers, json={"inputs": texts, "options": {"wait_for_model": True}})
                if res.status_code == 200:
                    data = res.json()
                    results = []
                    for vec in data:
                        v = np.array(vec, dtype=np.float32)
                        norm = np.linalg.norm(v)
                        if norm > 0:
                            v = v / norm
                        results.append(v.tolist())
                    return results
                else:
                    logger.warning(f"[HuggingFace Embeddings] HTTP {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"[HuggingFace API Error]: {e}")

        return [self._generate_fallback_embedding(t) for t in texts]

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        # 1. Google Gemini Online Embeddings
        if self.provider == "gemini" and self.gemini_key:
            return self._embed_gemini_batch(texts, task_type="RETRIEVAL_DOCUMENT")

        # 2. Hugging Face Online Embeddings
        if self.provider == "huggingface" and self.hf_key:
            return self._embed_huggingface(texts)

        # 3. Deterministic Local Semantic Adapter
        return [self._generate_fallback_embedding(t) for t in texts]

    def embed_query(self, query: str) -> List[float]:
        if not query:
            return [0.0] * self.dimension

        # 1. Google Gemini Online Embeddings
        if self.provider == "gemini" and self.gemini_key:
            return self._embed_gemini_single(query, task_type="RETRIEVAL_QUERY")

        # 2. Hugging Face Online Embeddings
        if self.provider == "huggingface" and self.hf_key:
            results = self._embed_huggingface([query])
            return results[0] if results else [0.0] * self.dimension

        # 3. Deterministic Local Semantic Adapter
        return self._generate_fallback_embedding(query)

embedding_service = EmbeddingService()
