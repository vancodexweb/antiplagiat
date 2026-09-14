from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.utils.sentence_split import split_sentences

# Многоязычная модель эмбеддингов предложений (раздел 3.2, 4 ТЗ) — 384
# измерения, что соответствует колонкам vector(384) в Prisma-схеме api.
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


def embed_sentences(text: str) -> list[dict]:
    sentences = split_sentences(text)
    if not sentences:
        return []

    model = get_model()
    vectors = model.encode(sentences, convert_to_numpy=True, normalize_embeddings=False)

    return [
        {"position": i, "text": sentence, "embedding": vector.tolist()}
        for i, (sentence, vector) in enumerate(zip(sentences, vectors))
    ]
