FROM python:3.11-slim

WORKDIR /app

# System deps for spaCy, PyMuPDF
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libmupdf-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Bake sentence-transformers model into the image so cold starts are instant
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

# Create uploads dir and non-root user for security
RUN mkdir -p uploads && \
    addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Use workers=1 in production; --reload only for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
