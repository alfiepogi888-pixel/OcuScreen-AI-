FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CUDA_VISIBLE_DEVICES=-1 \
    TF_NUM_INTRAOP_THREADS=2 \
    TF_NUM_INTEROP_THREADS=1 \
    OMP_NUM_THREADS=2 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    PORT=7860
RUN useradd --create-home --uid 1000 appuser
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=appuser:appuser backend ./backend
COPY --chown=appuser:appuser data ./data
COPY --chown=appuser:appuser frontend ./frontend
COPY --chown=appuser:appuser model ./model
USER appuser
EXPOSE 7860
CMD ["sh", "-c", "exec uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1 --limit-concurrency 16 --timeout-keep-alive 5 --no-access-log"]
