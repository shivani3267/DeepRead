from app.ingestion.chunker import academic_chunker

def test_chunking_preserves_metadata():
    dummy_pages = [
        {"page_number": 1, "text": "This is page 1 content. " * 30},
        {"page_number": 2, "text": "This is page 2 content. " * 40},
    ]

    chunks = academic_chunker.chunk_pages(
        pages=dummy_pages,
        document_id="doc_test_123",
        version_id="v1",
        extra_metadata={"title": "Test Paper", "access_scope": "public"},
    )

    assert len(chunks) >= 2
    for chunk in chunks:
        assert chunk["document_id"] == "doc_test_123"
        assert chunk["version_id"] == "v1"
        assert chunk["page_number"] in [1, 2]
        assert "chunk_id" in chunk
        assert len(chunk["text"]) > 0
        assert chunk["metadata"]["access_scope"] == "public"

def test_chunking_respects_empty_pages():
    empty_pages = [{"page_number": 1, "text": ""}]
    chunks = academic_chunker.chunk_pages(empty_pages, "doc_empty", "v1")
    assert len(chunks) == 0
