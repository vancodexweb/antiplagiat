from pydantic import BaseModel, Field


class LemmatizeRequest(BaseModel):
    text: str = Field(..., description="Текст для лемматизации", examples=["Кошки бегали по дому."])


class LemmaToken(BaseModel):
    text: str = Field(..., description="Исходное слово в нижнем регистре")
    lemma: str = Field(..., description="Начальная форма слова (лемма)")
    pos: str | None = Field(None, description="Часть речи по тегам pymorphy3 (NOUN, VERB, ADJF, ...)")


class LemmatizeResponse(BaseModel):
    tokens: list[LemmaToken] = Field(..., description="Список разобранных слов текста")


class EmbedSentencesRequest(BaseModel):
    text: str = Field(..., description="Текст документа для разбиения на предложения и векторизации")


class SentenceEmbeddingItem(BaseModel):
    position: int = Field(..., description="Порядковый номер предложения в тексте")
    text: str = Field(..., description="Текст предложения")
    embedding: list[float] = Field(..., description="Вектор эмбеддинга предложения (384 измерения)")


class EmbedSentencesResponse(BaseModel):
    model: str = Field(..., description="Название модели, которой посчитаны эмбеддинги")
    sentences: list[SentenceEmbeddingItem] = Field(..., description="Предложения текста вместе с их эмбеддингами")


class PerplexityRequest(BaseModel):
    text: str = Field(..., description="Текст для расчёта перплексии")


class PerplexityResponse(BaseModel):
    perplexity: float = Field(
        ...,
        description="Перплексия текста по языковой модели — чем ниже, тем 'предсказуемее' текст для модели (часто характерно для ИИ-сгенерированного)",
    )
