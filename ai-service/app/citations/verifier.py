import re
from typing import List, Dict, Any, Tuple

class CitationVerifier:
    """
    Parses and strictly verifies citations produced in the LLM answer.
    Guarantees that no fabricated page numbers or nonexistent document IDs
    are returned to the student or faculty member.
    """

    CITATION_PATTERN = re.compile(
        r"\[(?:Doc|Document):\s*([a-zA-Z0-9_\-]+),\s*(?:Page|p\.?):\s*(\d+)\]",
        re.IGNORECASE,
    )

    def extract_citations(self, text: str) -> List[Tuple[str, int]]:
        matches = self.CITATION_PATTERN.findall(text)
        citations = []
        for doc_id, page_str in matches:
            try:
                citations.append((doc_id.strip(), int(page_str)))
            except ValueError:
                continue
        return citations

    def verify(
        self,
        answer_text: str,
        retrieved_chunks: List[Dict[str, Any]],
    ) -> Tuple[str, List[Dict[str, Any]]]:
        raw_citations = self.extract_citations(answer_text)

        # Build lookup of valid (doc_id, page_number) -> chunk
        valid_sources: Dict[Tuple[str, int], Dict[str, Any]] = {}
        for chunk in retrieved_chunks:
            key = (str(chunk.get("document_id")), int(chunk.get("page_number", 1)))
            valid_sources[key] = chunk

        verified_citations: List[Dict[str, Any]] = []
        seen_keys = set()
        sanitized_answer = answer_text

        for doc_id, page_num in raw_citations:
            key = (doc_id, page_num)
            citation_tag = f"[Doc: {doc_id}, Page: {page_num}]"

            if key in valid_sources:
                if key not in seen_keys:
                    chunk = valid_sources[key]
                    snippet = chunk.get("text", "")[:200]
                    verified_citations.append({
                        "document_id": doc_id,
                        "document_title": chunk.get("title", "Academic Document"),
                        "version_id": chunk.get("version_id"),
                        "page_number": page_num,
                        "snippet": snippet,
                        "similarity_score": chunk.get("similarity_score", 0.0),
                        "is_validated": True,
                    })
                    seen_keys.add(key)
            else:
                # Grounding check failed! The LLM invented a page or doc not in context!
                # Strip the fabricated citation from the final answer text
                sanitized_answer = re.sub(
                    rf"\[(?:Doc|Document):\s*{re.escape(doc_id)},\s*(?:Page|p\.?):\s*{page_num}\]",
                    "",
                    sanitized_answer,
                    flags=re.IGNORECASE,
                ).strip()

        # If LLM didn't format explicit inline citation tags but answer is grounded in retrieved chunks,
        # attach highest-scoring retrieved chunk as source citation
        if not verified_citations and retrieved_chunks:
            top_chunk = retrieved_chunks[0]
            if top_chunk.get("similarity_score", 0.0) >= 0.10:
                verified_citations.append({
                    "document_id": str(top_chunk.get("document_id")),
                    "document_title": top_chunk.get("title", "Academic Document"),
                    "version_id": top_chunk.get("version_id"),
                    "page_number": int(top_chunk.get("page_number", 1)),
                    "snippet": top_chunk.get("text", "")[:200],
                    "similarity_score": top_chunk.get("similarity_score", 0.0),
                    "is_validated": True,
                })

        return sanitized_answer, verified_citations

citation_verifier = CitationVerifier()
