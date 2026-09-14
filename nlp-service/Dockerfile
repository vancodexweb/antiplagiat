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

COPY app ./app

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
