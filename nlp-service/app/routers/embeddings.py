from fastapi import APIRouter

from app.models.schemas import EmbedSentencesRequest, EmbedSentencesResponse
from app.services.embeddings import MODEL_NAME, embed_sentences

router = APIRouter(tags=["nlp"])


@router.post(
    "/embed-sentences",
    response_model=EmbedSentencesResponse,
    summary="Разбить текст на предложения и посчитать их эмбеддинги (для детекции перефразирования)",
)
def embed_sentences_endpoint(payload: EmbedSentencesRequest) -> EmbedSentencesResponse:
    return EmbedSentencesResponse(model=MODEL_NAME, sentences=embed_sentences(payload.text))
