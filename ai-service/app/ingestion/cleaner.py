import re
import unicodedata

class TextCleaner:
    """
    Cleans and normalizes extracted PDF text before chunking.
    Preserves academic notations, sentence boundaries, and paragraph structures.
    """

    @staticmethod
    def clean(text: str) -> str:
        if not text:
            return ""

        # Normalize Unicode characters (NFKC)
        normalized = unicodedata.normalize("NFKC", text)

        # Replace non-standard whitespace and non-breaking spaces with standard space
        normalized = normalized.replace("\xa0", " ").replace("\u200b", "")

        # Remove control characters except standard whitespace and newlines
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", normalized)

        # Replace 3 or more consecutive newlines with 2 newlines (preserve paragraphs)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

        # Replace multiple spaces/tabs within lines
        cleaned = re.sub(r"[ \t]+", " ", cleaned)

        return cleaned.strip()

text_cleaner = TextCleaner()
