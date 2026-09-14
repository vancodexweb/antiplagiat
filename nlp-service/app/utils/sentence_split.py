import re

# Разбиение на предложения по знакам конца предложения. Не претендует на
# 100% точность с сокращениями/инициалами — этого достаточно для нарезки
# текста перед векторизацией (см. также аналогичную эвристику в
# server/src/documents/metrics/basic-metrics.service.ts на стороне api).
_SENTENCE_SPLIT_RE = re.compile(r'(?<=[.!?…])\s+(?=[А-ЯA-ZЁ0-9"«])|\n+')
_HAS_LETTER_RE = re.compile(r'[^\W\d_]', re.UNICODE)


def split_sentences(text: str) -> list[str]:
    parts = _SENTENCE_SPLIT_RE.split(text)
    return [p.strip() for p in parts if p.strip() and _HAS_LETTER_RE.search(p)]
