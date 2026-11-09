import fitz  # PyMuPDF
from typing import List, Dict, Any
from pathlib import Path
import logging
import os
import tempfile
import subprocess
import json
import shutil

logger = logging.getLogger(__name__)

class PDFExtractionError(Exception):
    """Custom exception raised when PDF extraction fails"""
    pass

class PDFExtractor:
    """
    Extracts text page-by-page from academic PDFs while preserving exact page numbers.
    Includes automated Windows Native OCR fallback for scanned image PDFs.
    Maintains clean separation from chunking and downstream stages.
    """

    def _extract_with_ocr(self, doc, total_pages: int) -> List[Dict[str, Any]]:
        ocr_ps1 = Path(__file__).resolve().parent / "windows_ocr.ps1"
        tmp_dir = Path(tempfile.mkdtemp(prefix="deepread_ocr_"))

        try:
            logger.info(f"[PDFExtractor] Rendering {total_pages} scanned pages for Windows Native OCR...")
            for page_idx in range(total_pages):
                page = doc.load_page(page_idx)
                # Render page at 120 DPI for optimal OCR speed & recognition balance
                pix = page.get_pixmap(dpi=120)
                pix.save(str(tmp_dir / f"page_{page_idx + 1}.png"))

            logger.info("[PDFExtractor] Executing Windows Native OCR engine on rendered pages...")
            cmd = [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy", "Bypass",
                "-File", str(ocr_ps1),
                "-OutputDir", str(tmp_dir),
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
            raw_stdout = proc.stdout.strip()
            ocr_results = json.loads(raw_stdout) if raw_stdout else {}

            extracted_pages = []
            total_ocr_chars = 0
            for page_idx in range(total_pages):
                page_num = page_idx + 1
                text = (ocr_results.get(str(page_num)) or "").strip()
                char_count = len(text)
                total_ocr_chars += char_count
                extracted_pages.append({
                    "page_number": page_num,
                    "text": text,
                    "char_count": char_count,
                })

            logger.info(f"[PDFExtractor] Native OCR complete: {total_pages} pages, {total_ocr_chars} characters extracted.")
            return extracted_pages

        except Exception as e:
            logger.error(f"[PDFExtractor] Windows Native OCR fallback failed: {e}")
            return []
        finally:
            shutil.rmtree(str(tmp_dir), ignore_errors=True)

    def extract(self, file_path: str) -> List[Dict[str, Any]]:
        path = Path(file_path)
        if not path.exists():
            raise PDFExtractionError(f"File not found at path: {file_path}")

        if not path.is_file():
            raise PDFExtractionError(f"Provided path is not a file: {file_path}")

        extracted_pages: List[Dict[str, Any]] = []

        try:
            doc = fitz.open(str(path))
        except Exception as e:
            raise PDFExtractionError(f"Corrupted or invalid PDF format: {str(e)}")

        try:
            if doc.is_encrypted:
                raise PDFExtractionError("Encrypted PDFs requiring a password are not supported.")

            total_pages = len(doc)
            if total_pages == 0:
                raise PDFExtractionError("PDF file contains 0 pages.")

            total_chars = 0
            for page_idx in range(total_pages):
                page_num = page_idx + 1  # 1-indexed page numbering
                try:
                    page = doc.load_page(page_idx)
                    text = page.get_text("text") or ""
                    clean_page_text = text.strip()
                    char_count = len(clean_page_text)
                    total_chars += char_count

                    extracted_pages.append({
                        "page_number": page_num,
                        "text": clean_page_text,
                        "char_count": char_count,
                    })
                except Exception as page_err:
                    logger.warning(f"Failed extracting text from page {page_num}: {page_err}")
                    extracted_pages.append({
                        "page_number": page_num,
                        "text": "",
                        "char_count": 0,
                    })

            # Scanned document detection: if no text could be extracted, engage Windows Native OCR
            if total_chars < 50:
                logger.info(
                    f"[PDFExtractor] Document at {file_path} contains 0/minimal text ({total_chars} chars). "
                    "Engaging Windows Native OCR engine for scanned PDF..."
                )
                ocr_pages = self._extract_with_ocr(doc, total_pages)
                if ocr_pages and sum(p["char_count"] for p in ocr_pages) > 0:
                    return ocr_pages

            return extracted_pages

        finally:
            doc.close()

pdf_extractor = PDFExtractor()
