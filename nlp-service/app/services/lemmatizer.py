import re
from functools import lru_cache

import pymorphy3

_WORD_RE = re.compile(r"[^\W\d_]+", re.UNICODE)


@lru_cache(maxsize=1)
def get_morph() -> pymorphy3.MorphAnalyzer:
    # Инициализация словарей pymorphy3 занимает время — держим единственный
    # экземпляр анализатора на процесс вместо создания на каждый запрос.
    return pymorphy3.MorphAnalyzer()


def lemmatize(text: str) -> list[dict]:
    morph = get_morph()
    tokens = _WORD_RE.findall(text.lower())

    result = []
    for token in tokens:
        parsed = morph.parse(token)[0]
        result.append(
            {
                "text": token,
                "lemma": parsed.normal_form,
                "pos": str(parsed.tag.POS) if parsed.tag.POS else None,
            }
        )
    return result
