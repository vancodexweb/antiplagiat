from fastapi import APIRouter

from app.models.schemas import LemmatizeRequest, LemmatizeResponse
from app.services.lemmatizer import lemmatize

router = APIRouter(tags=["nlp"])


@router.post(
    "/lemmatize",
    response_model=LemmatizeResponse,
    summary="Лемматизация и морфологический разбор русского текста (pymorphy3)",
)
def lemmatize_endpoint(payload: LemmatizeRequest) -> LemmatizeResponse:
    return LemmatizeResponse(tokens=lemmatize(payload.text))
