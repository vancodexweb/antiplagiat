from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import OcrResponse
from app.services.ocr import is_enabled, run_ocr

router = APIRouter(tags=["nlp"])


@router.post(
    "/ocr",
    response_model=OcrResponse,
    summary="Распознать текст сканированного PDF (OCR, раздел 3.9 — опциональный модуль)",
)
async def ocr_endpoint(file: UploadFile = File(...)) -> OcrResponse:
    if not is_enabled():
        raise HTTPException(status_code=503, detail="OCR отключён (переменная окружения ENABLE_OCR=false)")
    content = await file.read()
    return OcrResponse(text=run_ocr(content))
