FROM python:3.11-slim

WORKDIR /app

# torch ставим отдельно с CPU-only индексом — иначе pip как зависимость
# sentence-transformers подтянет полную сборку с CUDA-библиотеками
# (несколько лишних гигабайт), которые в этом деплое не нужны.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Модель эмбеддингов (раздел 3.2, 4 ТЗ) скачивается на этапе сборки образа,
# а не при первом запросе — иначе контейнеру на старте нужен интернет и
# первый пользовательский запрос ждёт загрузки модели.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')"

# Модель уже в образе — без этого huggingface_hub на каждом старте лезет в
# сеть проверить, нет ли новой версии, и при недоступном интернете долго
# ретраит перед тем, как откатиться на локальный кэш.
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

COPY app ./app

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
