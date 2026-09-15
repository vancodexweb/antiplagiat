from fastapi import APIRouter, HTTPException

from app.models.schemas import PerplexityRequest, PerplexityResponse
from app.services.perplexity import compute_perplexity, is_enabled

router = APIRouter(tags=["nlp"])


@router.post(
    "/perplexity",
    response_model=PerplexityResponse,
    summary="Перплексия текста через языковую модель (тяжёлая опциональная фича, раздел 3.3)",
)
def perplexity_endpoint(payload: PerplexityRequest) -> PerplexityResponse:
    if not is_enabled():
        raise HTTPException(
            status_code=503,
            detail="Функция перплексии отключена (переменная окружения ENABLE_PERPLEXITY_FEATURE=false)",
        )
    return PerplexityResponse(perplexity=compute_perplexity(payload.text))
