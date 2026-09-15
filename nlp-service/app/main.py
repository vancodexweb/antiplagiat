"""
nlp-service — вся тяжёлая NLP-логика проекта (лемматизация, эмбеддинги,
грамматика, OCR, читаемость). worker обращается сюда по HTTP; сам сервис
состояния не хранит (см. раздел 0 ТЗ).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import embeddings, lemmatize, perplexity
from app.services.embeddings import get_model
from app.services.lemmatizer import get_morph
from app.services.perplexity import is_enabled as perplexity_enabled


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Прогреваем модель эмбеддингов и словари pymorphy3 при старте, чтобы
    # первый реальный запрос не ждал их загрузки (несколько секунд).
    get_model()
    get_morph()
    # Модель перплексии — тяжёлая опциональная фича (раздел 3.3), грузим
    # только если явно включена флагом; иначе endpoint отвечает 503.
    if perplexity_enabled():
        from app.services.perplexity import _load

        _load()
    yield


app = FastAPI(
    title="Antiplagiat NLP Service",
    description="Внутренний NLP-сервис: лемматизация, эмбеддинги, грамматика, OCR, читаемость.",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(lemmatize.router)
app.include_router(embeddings.router)


@app.get("/health", summary="Проверка живости сервиса")
def health() -> dict[str, str]:
    return {"status": "ok"}
