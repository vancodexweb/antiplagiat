import os

import pytesseract
from pdf2image import convert_from_bytes

# OCR для сканированных документов (раздел 3.9 ТЗ) — опциональный модуль,
# включаемый флагом ENABLE_OCR.
OCR_LANGUAGES = os.getenv("OCR_LANGUAGES", "rus+eng")


def is_enabled() -> bool:
    return os.getenv("ENABLE_OCR", "true").lower() == "true"


def run_ocr(pdf_bytes: bytes) -> str:
    images = convert_from_bytes(pdf_bytes)
    pages_text = [pytesseract.image_to_string(image, lang=OCR_LANGUAGES) for image in images]
    return "\n\n".join(pages_text)
