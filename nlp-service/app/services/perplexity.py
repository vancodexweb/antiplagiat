import os
from functools import lru_cache

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# Тяжёлая опциональная фича (раздел 3.3 ТЗ) — модель грузится лениво и
# только если явно включена флагом, чтобы не раздувать образ и время
# запуска сервиса по умолчанию.
MODEL_NAME = "sberbank-ai/rugpt3small_based_on_gpt2"


def is_enabled() -> bool:
    return os.getenv("ENABLE_PERPLEXITY_FEATURE", "false").lower() == "true"


@lru_cache(maxsize=1)
def _load():
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)
    model.eval()
    return tokenizer, model


def compute_perplexity(text: str) -> float:
    tokenizer, model = _load()
    encodings = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    input_ids = encodings.input_ids

    if input_ids.size(1) < 2:
        return 0.0

    with torch.no_grad():
        outputs = model(input_ids, labels=input_ids)

    return float(torch.exp(outputs.loss))
