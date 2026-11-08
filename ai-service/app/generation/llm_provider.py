import logging
import httpx
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.core.config import settings
from app.generation.prompt_builder import prompt_builder, INSUFFICIENT_EVIDENCE_MESSAGE

logger = logging.getLogger(__name__)

class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate_answer(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        """Generates grounded answer strictly based on retrieved chunks"""
        pass


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini LLM Provider (e.g. gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro).
    Employs Google's official Gemini REST API for high-speed, grounded generation with page citations.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY.strip()
        self.model = settings.GEMINI_MODEL.strip() or "gemini-1.5-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate_answer(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        if not self.api_key:
            logger.info(
                "[Gemini] GEMINI_API_KEY is not set in environment. "
                "Operating in Local Grounded Adapter mode. "
                "To enable live Gemini generation, configure GEMINI_API_KEY in ai-service/.env."
            )
            return await MockLLMProvider().generate_answer(query, chunks)

        user_prompt = prompt_builder.build_user_prompt(query, chunks)
        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"

        payload = {
            "system_instruction": {
                "parts": [{"text": prompt_builder.SYSTEM_PROMPT}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.1,  # Low temperature for strict factual grounding
                "topP": 0.95,
                "maxOutputTokens": 2048,
            },
        }

        try:
            timeout_cfg = httpx.Timeout(45.0, connect=5.0)
            async with httpx.AsyncClient(timeout=timeout_cfg) as client:
                response = await client.post(url, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"].strip()
                    logger.warning(f"[Gemini] Unexpected response structure: {data}")
                    return await MockLLMProvider().generate_answer(query, chunks)
                else:
                    logger.error(
                        f"[Gemini API Error] HTTP {response.status_code}: {response.text}. "
                        "Falling back to local grounded generator."
                    )
                    return await MockLLMProvider().generate_answer(query, chunks)

        except Exception as e:
            logger.error(f"[Gemini Request Failed]: {e}. Falling back to local grounded generator.")
            return await MockLLMProvider().generate_answer(query, chunks)


class OllamaProvider(BaseLLMProvider):
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_MODEL

    async def generate_answer(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        prompt = prompt_builder.build_user_prompt(query, chunks)
        system = prompt_builder.SYSTEM_PROMPT

        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "top_p": 0.9,
            },
        }

        try:
            timeout_cfg = httpx.Timeout(45.0, connect=3.0)
            async with httpx.AsyncClient(timeout=timeout_cfg) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("response", "").strip()
                else:
                    logger.warning(f"Ollama returned HTTP {response.status_code}: {response.text}")
                    return await MockLLMProvider().generate_answer(query, chunks)
        except Exception as e:
            logger.warning(f"Ollama service unavailable at {self.base_url} ({e}). Using deterministic academic grounded fallback.")
            return await MockLLMProvider().generate_answer(query, chunks)


class OpenAIProvider(BaseLLMProvider):
    def __init__(self):
        self.base_url = settings.OPENAI_BASE_URL.rstrip("/")
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL

    async def generate_answer(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        if not self.api_key:
            logger.warning("No OPENAI_API_KEY provided. Switching to fallback provider.")
            return await MockLLMProvider().generate_answer(query, chunks)

        prompt = prompt_builder.build_user_prompt(query, chunks)
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": prompt_builder.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    logger.error(f"OpenAI API Error: {resp.status_code} - {resp.text}")
                    return await MockLLMProvider().generate_answer(query, chunks)
        except Exception as e:
            logger.error(f"OpenAI request failed: {e}")
            return await MockLLMProvider().generate_answer(query, chunks)


class MockLLMProvider(BaseLLMProvider):
    """
    Intelligent local academic grounded response generator.
    Extracts, ranks, and synthesizes key factual claims directly from retrieved chunks
    with strict [Doc: <id>, Page: <page>] citations, ensuring completely local operation
    without requiring third-party cloud LLM API keys.
    """

    async def generate_answer(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        import re

        if not chunks:
            return INSUFFICIENT_EVIDENCE_MESSAGE

        stop_words = {
            "what", "which", "where", "when", "why", "how", "does", "explain",
            "describe", "about", "with", "from", "that", "this", "these", "those",
            "have", "been", "were", "will", "would", "could", "should", "the",
            "and", "are", "for", "in", "on", "at", "by", "is", "of", "to", "a", "an"
        }

        query_tokens = set(
            w for w in re.findall(r'[a-zA-Z0-9_\-\|\>\<\+]{2,}', query.lower())
            if w not in stop_words
        )

        candidate_sentences = []
        seen_texts = set()

        for chunk_idx, chunk in enumerate(chunks):
            text = chunk.get("text", "")
            doc_id = chunk.get("document_id")
            page_num = chunk.get("page_number", 1)
            chunk_score = float(chunk.get("similarity_score", 0.0))

            # Split into natural sentences
            raw_sentences = re.split(r'(?<=[.!?\n])\s+', text)
            for s in raw_sentences:
                clean_s = s.strip()
                if len(clean_s) < 20 or clean_s in seen_texts:
                    continue

                seen_texts.add(clean_s)
                sent_tokens = set(
                    w for w in re.findall(r'[a-zA-Z0-9_\-\|\>\<\+]{2,}', clean_s.lower())
                    if w not in stop_words
                )

                overlap = len(query_tokens.intersection(sent_tokens)) if query_tokens else 0
                # Rank score incorporates query term overlap, chunk relevance score, and order
                rank_score = (overlap * 3.0) + (chunk_score * 2.0) - (chunk_idx * 0.2)

                candidate_sentences.append((rank_score, overlap, clean_s, doc_id, page_num))

        if not candidate_sentences:
            return INSUFFICIENT_EVIDENCE_MESSAGE

        # If query has distinct topical keywords and zero matched across all chunks, safely abstain
        max_overlap = max((c[1] for c in candidate_sentences), default=0)
        if query_tokens and max_overlap == 0:
            return INSUFFICIENT_EVIDENCE_MESSAGE

        # Filter strictly for sentences that actually contain relevant query keywords
        relevant_picks = [c for c in candidate_sentences if c[1] > 0]
        if not relevant_picks:
            return INSUFFICIENT_EVIDENCE_MESSAGE

        # Sort descending by rank score
        relevant_picks.sort(key=lambda x: x[0], reverse=True)
        top_picks = relevant_picks[:3]

        answer_parts = []
        for _, _, sent, doc_id, page in top_picks:
            clean_sent = sent.strip()
            if not clean_sent.endswith((".", "!", "?")):
                clean_sent += "."
            answer_parts.append(f"{clean_sent} [Doc: {doc_id}, Page: {page}]")

        return "\n\n".join(answer_parts)


def get_llm_provider() -> BaseLLMProvider:
    provider_name = settings.LLM_PROVIDER.lower().strip()
    if provider_name == "gemini":
        return GeminiProvider()
    elif provider_name == "ollama":
        return OllamaProvider()
    elif provider_name in ("openai", "hosted"):
        return OpenAIProvider()
    elif provider_name == "mock":
        return MockLLMProvider()
    else:
        logger.warning(f"Unknown LLM provider '{provider_name}'. Defaulting to Gemini.")
        return GeminiProvider()

llm_provider = get_llm_provider()
