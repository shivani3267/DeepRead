from app.citations.verifier import citation_verifier

def test_extract_citations():
    text = "Superposition allows states to coexist [Doc: doc_quantum, Page: 2]."
    citations = citation_verifier.extract_citations(text)
    assert len(citations) == 1
    assert citations[0] == ("doc_quantum", 2)

def test_verifier_keeps_valid_citation():
    retrieved_chunks = [
        {
            "document_id": "doc_quantum",
            "page_number": 2,
            "title": "Quantum Computing",
            "version_id": "v1",
            "text": "Superposition state representation.",
            "similarity_score": 0.85,
        }
    ]
    raw_answer = "Bell states exhibit quantum entanglement [Doc: doc_quantum, Page: 2]."
    verified_answer, verified_citations = citation_verifier.verify(raw_answer, retrieved_chunks)

    assert len(verified_citations) == 1
    assert verified_citations[0]["document_id"] == "doc_quantum"
    assert verified_citations[0]["page_number"] == 2
    assert verified_citations[0]["is_validated"] is True

def test_verifier_strips_hallucinated_page():
    retrieved_chunks = [
        {
            "document_id": "doc_quantum",
            "page_number": 2,
            "title": "Quantum Computing",
            "version_id": "v1",
            "text": "Page 2 content.",
        }
    ]
    # Page 99 was never retrieved!
    raw_answer = "Quantum algorithms [Doc: doc_quantum, Page: 99]."
    verified_answer, verified_citations = citation_verifier.verify(raw_answer, retrieved_chunks)

    # Fabricated tag must be removed from answer
    assert "[Doc: doc_quantum, Page: 99]" not in verified_answer
