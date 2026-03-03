# DevOps Infrastructure - AI Career Copilot

## 1. Docker Services Layout

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/career_copilot
      - REDIS_URL=redis://redis:6379/0
      - OLLAMA_URL=http://ollama:11434
    depends_on:
      - db
      - redis
      - chromadb
    volumes:
      - ./uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=career_copilot
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  pgdata:
  chroma_data:
  ollama_data:
```

## 2. Ports
*   **Frontend**: 3000 (Mapped to 80 in Nginx)
*   **Backend**: 8000
*   **Vector DB (Chroma)**: 8001
*   **PostgreSQL**: 5432
*   **Redis**: 6379
*   **Ollama**: 11434

## 3. Environment Variables (.env)
```bash
# Security
SECRET_KEY=yoursecretkeyhere
JWT_ALGORITHM=HS256

# Database
DATABASE_URL=postgresql://user:pass@db:5432/career_copilot
VECTOR_DB_URL=http://chromadb:8000

# External APIs
GROQ_API_KEY=gsk_xxx
OLLAMA_BASE_URL=http://ollama:11434

# App Settings
UPLOAD_DIR=./uploads
ALLOWED_ORIGINS=http://localhost:3000
```

## 4. CI/CD Pipeline Overview

### GitHub Actions Workflow
1.  **Build & Lint**: Run `pytest` and `flake8` for the backend; `npm run lint` for the frontend.
2.  **Test**: Execute integration tests using a transient Docker Compose environment.
3.  **Deploy (Production)**:
    *   **Frontend**: Deploy to **Vercel** via `vercel-deploy` action.
    *   **Backend**: Deploy Docker containers to **Railway.app** via Railway CLI.
    *   **Database**: Managed PostgreSQL on Railway.

## 5. Monitoring
*   **Logs**: Winston (Frontend) and Loguru (Backend) integrated with cloud log drains.
*   **Uptime**: Managed by Railway's health check endpoints and external monitoring (e.g., UptimeRobot).
