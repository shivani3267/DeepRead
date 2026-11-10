import re
from typing import List, Dict, Any
from app.core.config import settings
from app.ingestion.cleaner import text_cleaner

class AcademicChunker:
    """
    Splits page-extracted text into semantic chunks respecting sentence boundaries.
    Preserves exact page numbers, chunk index, document metadata, and token overlaps.
    """

    def __init__(
        self,
        target_tokens: int = None,
        overlap_tokens: int = None,
        chars_per_token: float = 4.0,
    ):
        self.target_tokens = target_tokens or settings.CHUNK_TARGET_TOKENS
        self.overlap_tokens = overlap_tokens or settings.CHUNK_OVERLAP_TOKENS
        self.chars_per_token = chars_per_token

        self.target_chars = int(self.target_tokens * self.chars_per_token)
        self.overlap_chars = int(self.overlap_tokens * self.chars_per_token)

    def _split_into_sentences(self, text: str) -> List[str]:
        # Split on sentence terminals while keeping punctuation
        sentence_pattern = r"(?<=[.!?])\s+"
        sentences = re.split(sentence_pattern, text)
        return [s.strip() for s in sentences if s.strip()]

    def chunk_pages(
        self,
        pages: List[Dict[str, Any]],
        document_id: str,
        version_id: str,
        extra_metadata: Dict[str, Any] = None,
    ) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []
        extra_meta = extra_metadata or {}

        for page_data in pages:
            page_num = page_data["page_number"]
            raw_text = page_data["text"]
            cleaned_text = text_cleaner.clean(raw_text)

            if not cleaned_text:
                continue

            # If the page text fits comfortably in one chunk
            if len(cleaned_text) <= self.target_chars + self.overlap_chars:
                chunk_id = f"{document_id}_v{version_id}_p{page_num}_c0"
                chunks.append({
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "version_id": version_id,
                    "page_number": page_num,
                    "title": extra_meta.get("title", "Academic Document"),
                    "text": cleaned_text,
                    "word_count": len(cleaned_text.split()),
                    "metadata": {
                        **extra_meta,
                        "document_id": document_id,
                        "version_id": version_id,
                        "page_number": page_num,
                        "chunk_id": chunk_id,
                        "title": extra_meta.get("title", "Academic Document"),
                    },
                })
                continue

            # Sentence-aware chunking with sliding window overlap
            sentences = self._split_into_sentences(cleaned_text)
            current_sentences: List[str] = []
            current_len = 0
            chunk_idx = 0

            for sent in sentences:
                sent_len = len(sent) + 1  # account for space
                if current_len + sent_len > self.target_chars and current_sentences:
                    chunk_text = " ".join(current_sentences).strip()
                    chunk_id = f"{document_id}_v{version_id}_p{page_num}_c{chunk_idx}"

                    chunks.append({
                        "chunk_id": chunk_id,
                        "document_id": document_id,
                        "version_id": version_id,
                        "page_number": page_num,
                        "title": extra_meta.get("title", "Academic Document"),
                        "text": chunk_text,
                        "word_count": len(chunk_text.split()),
                        "metadata": {
                            **extra_meta,
                            "document_id": document_id,
                            "version_id": version_id,
                            "page_number": page_num,
                            "chunk_id": chunk_id,
                            "title": extra_meta.get("title", "Academic Document"),
                        },
                    })
                    chunk_idx += 1

                    # Create overlap buffer from previous sentences
                    overlap_buffer: List[str] = []
                    overlap_accum = 0
                    for s in reversed(current_sentences):
                        if overlap_accum + len(s) <= self.overlap_chars:
                            overlap_buffer.insert(0, s)
                            overlap_accum += len(s) + 1
                        else:
                            break

                    current_sentences = overlap_buffer + [sent]
                    current_len = sum(len(s) + 1 for s in current_sentences)
                else:
                    current_sentences.append(sent)
                    current_len += sent_len

            # Residual trailing chunk
            if current_sentences:
                chunk_text = " ".join(current_sentences).strip()
                if chunk_text:
                    chunk_id = f"{document_id}_v{version_id}_p{page_num}_c{chunk_idx}"
                    chunks.append({
                        "chunk_id": chunk_id,
                        "document_id": document_id,
                        "version_id": version_id,
                        "page_number": page_num,
                        "title": extra_meta.get("title", "Academic Document"),
                        "text": chunk_text,
                        "word_count": len(chunk_text.split()),
                        "metadata": {
                            **extra_meta,
                            "document_id": document_id,
                            "version_id": version_id,
                            "page_number": page_num,
                            "chunk_id": chunk_id,
                            "title": extra_meta.get("title", "Academic Document"),
                        },
                    })

        return chunks

academic_chunker = AcademicChunker()
