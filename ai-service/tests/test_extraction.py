import pytest
from pathlib import Path
from app.ingestion.pdf_extractor import pdf_extractor, PDFExtractionError

STORAGE_DOCS = Path(__file__).resolve().parent.parent.parent / "storage" / "documents"

def test_extract_valid_pdf():
    pdf_files = list(STORAGE_DOCS.glob("*.pdf"))
    assert len(pdf_files) > 0, "No sample PDF found in storage"

    pages = pdf_extractor.extract(str(pdf_files[0]))
    assert len(pages) > 0
    assert pages[0]["page_number"] == 1
    assert "text" in pages[0]
    assert pages[0]["char_count"] > 0

def test_extract_nonexistent_file():
    with pytest.raises(PDFExtractionError):
        pdf_extractor.extract("non_existent_file_path.pdf")
