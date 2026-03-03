# AI Career Copilot

A full-stack web application that helps job seekers turn their resume into actionable insights and practice interviews with an AI coach.

Upload a PDF or DOCX resume and get:

- An **ATS-style readiness score** (0–100)
- A list of **detected technical skills** with confidence scores
- **Top role matches** based on your skill profile
- **Gap skills** — what you are missing for your target roles
- An **AI interview coach** that generates role-specific questions and grades your answers

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6, vanilla CSS |
| Backend | FastAPI, SQLAlchemy 2, Alembic |
| Database | SQLite (dev) / PostgreSQL (prod) |
| NLP | spaCy `en_core_web_sm`, Sentence-Transformers `all-MiniLM-L6-v2` |
| LLM | Ollama (Llama 3) via local HTTP |
| Auth | JWT in HttpOnly cookie (`session`), passlib bcrypt |
| Infrastructure | Docker Compose, Nginx |

---

## Features

- **Secure authentication** — register/login with bcrypt-hashed passwords; JWT stored in an HttpOnly, SameSite=lax cookie; never exposed to JavaScript
- **Resume upload** — PDF and DOCX accepted (max 5 MB); magic-bytes validation prevents disguised files; UUID-only filenames on disk prevent path traversal
- **Resume analysis** — semantic skill extraction using sentence embeddings (cosine similarity threshold 0.35), ATS score, role prediction, and gap analysis against a curated ontology of 30 skills across 10 roles
- **Interview coach** — Ollama-powered question generation and answer scoring with score (0–10), written feedback, and an ideal answer; graceful static fallback when Ollama is offline
- **Rate limiting** — always enabled on all routes; register capped at 3 req/min, login at 5 req/min, forwarded IPs respected
- **Protected routing** — React frontend redirects unauthenticated users; session is validated against the server on every page load

---

## Project Structure

```
ai_career_copilot/
├── backend/
│   ├── app/
│   │   ├── api/v1/               # Route handlers: auth.py, resume.py, interview.py
│   │   ├── core/                 # config.py, security.py, limiter.py
│   │   ├── db/                   # session.py (engine + SessionLocal)
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── ai/               # nlp_pipeline.py, llm_coach.py
│   │   │   ├── embedding_service.py
│   │   │   └── file_service.py
│   │   └── main.py               # FastAPI app, lifespan, CORS, /health
│   ├── tests/
│   │   └── test_integration.py   # 15 integration tests (pytest-asyncio)
│   ├── .env                      # Local dev config (not committed)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                  # client.js (fetch wrapper), auth.js
│   │   ├── context/              # AuthContext.jsx
│   │   ├── pages/                # Login, Register, Dashboard, Upload,
│   │   │                         # Analysis, Interview, Resumes
│   │   └── App.jsx               # Router with ProtectedRoute / PublicRoute
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.js
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Setup

### Docker (recommended)

**Prerequisites:** Docker Desktop with Compose v2; at least 4 GB of free RAM for the Ollama model.

```bash
# 1. Copy the env template
cp .env.example .env

# 2. Set a secure SECRET_KEY (must be at least 32 characters)
#    Generate one:
python -c "import secrets; print(secrets.token_hex(32))"
# Paste the output as SECRET_KEY= in .env

# 3. Start all four services (db, backend, frontend, ollama)
docker compose up --build

# 4. Pull the Llama 3 model — first run only, takes a few minutes
bash scripts/setup_ollama.sh
```

URLs once running:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

---

### Local Development

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# spaCy model — required, not auto-downloaded
python -m spacy download en_core_web_sm

# Create a local env file
cp .env.example .env
# Edit backend/.env and set SECRET_KEY to at least 32 characters
# Set ENVIRONMENT=development so cookies work over plain HTTP

uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:8000` in dev mode automatically — no additional configuration needed.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Yes** | — | JWT signing key. Must be **at least 32 characters**. The server refuses to start with a shorter value. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | No | `sqlite:///./app.db` | SQLAlchemy connection URL. PostgreSQL: `postgresql://user:pass@host/dbname` |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173,http://localhost:3000` | Comma-separated CORS origins |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama HTTP endpoint. In Docker Compose this is `http://ollama:11434` |
| `UPLOAD_DIR` | No | `./uploads` | Root directory for uploaded files. The backend creates `uploads/resumes/` automatically on startup. |
| `ENVIRONMENT` | No | `production` | Set to `development` for plain-HTTP (non-Secure) cookies. Defaults to `production`, which sets `Secure=True` on the session cookie and requires HTTPS. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | JWT lifetime in minutes (default 24 hours, matches the cookie `max_age`). |

---

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | No | Create account. Body: `{username, email, password}`. Rate-limited: 3 req/min. |
| `POST` | `/login` | No | Log in and receive a `session` cookie. Body: `{email, password}`. Rate-limited: 5 req/min. |
| `GET` | `/me` | Yes | Return the current authenticated user. |
| `POST` | `/logout` | Yes | Clear the `session` cookie. |

### Resume — `/api/v1/resume`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/upload` | Yes | Upload a PDF or DOCX file (max 5 MB, multipart/form-data). Returns `{resume_id, filename, status}`. |
| `GET` | `/list` | Yes | List all resumes belonging to the current user. |
| `DELETE` | `/{resume_id}` | Yes | Delete a resume and its associated analysis record. |
| `GET` | `/analysis/{resume_id}` | Yes | Retrieve the analysis for a specific resume. |

**Analysis response shape:**

```json
{
  "analysis_id": 1,
  "ats_score": 70.0,
  "extracted_skills": [
    {"skill": "Python", "score": 0.61},
    {"skill": "FastAPI", "score": 0.58}
  ],
  "predicted_roles": [
    {"role": "Backend Engineer", "score": 60.0}
  ],
  "gap_skills": ["PostgreSQL", "Kubernetes"]
}
```

### Interview — `/api/v1/interview`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/start` | Yes | Start an interview session. Body: `{analysis_id, target_role}`. Returns `{session_id, questions: [{id, text}], ai_available}`. |
| `POST` | `/answer` | Yes | Submit an answer. Body: `{session_id, question_id, answer}`. Returns `{score, feedback, ideal_answer, ai_available}`. Each question can only be answered once (409 on duplicate). |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns service status for DB, Ollama, and NLP module. Response: `{"status": "ok" | "degraded", "db": ..., "ollama": ..., "nlp": ...}` |

---

## Running Tests

```bash
cd backend
pip install pytest pytest-asyncio httpx
pytest tests/test_integration.py -v
```

Tests use an in-memory SQLite database and mock Ollama with `unittest.mock.AsyncMock` — no running services are required. The suite covers 15 scenarios: health check, full auth flow, resume upload and validation, file type attacks (wrong magic bytes, oversized, empty), full interview flow, duplicate answer rejection, wrong-session rejection, and unauthenticated access.

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `RuntimeError: SECRET_KEY must be at least 32 characters` | `SECRET_KEY` in `backend/.env` is too short or missing | Generate with `python -c "import secrets; print(secrets.token_hex(32))"` and paste into `backend/.env` |
| `401` on every request after 30 minutes | Old JWT/cookie expiry mismatch (JWT expired before cookie) | Ensure `ACCESS_TOKEN_EXPIRE_MINUTES=1440` (default) in `.env` |
| Cookies not sent / 401 on every request locally | `ENVIRONMENT` defaults to `production`, enabling `Secure` cookies that browsers silently drop over HTTP | Set `ENVIRONMENT=development` in `backend/.env` |
| `OperationalError: no such pragma` / `psycopg2` error on startup | `check_same_thread` arg passed to PostgreSQL DBAPI | Fixed in `db/session.py` — the arg is only applied for SQLite URLs |
| Skills rendered as `[object Object]` in the UI | Frontend used `skill` (object) directly instead of `skill.skill` | Fixed in `AnalysisPage.jsx` |
| Resume analysis poll never resolves | `pollAnalysis` checked `res.stats` (field does not exist) | Fixed in `UploadPage.jsx` to check `res.analysis_id !== undefined` |
| `TypeError: evaluate_answer() unexpected keyword 'answer'` | Call site used `answer=` instead of `user_answer=` | Fixed in `interview.py` — use `user_answer=payload.answer` |
| Ollama questions not generating | Llama 3 model not pulled, or Ollama container not running | Run `bash scripts/setup_ollama.sh` after containers start; check `docker compose logs ollama` |
| File upload rejected despite valid PDF | File has wrong magic bytes (renamed extension) | Server validates first bytes of file content — upload a real PDF/DOCX |

---

## Additional Docs

- `project_overview.md` — technical deep-dive: DB schema, auth flow, NLP pipeline, security measures
- `how_it_works.md` — plain-language walkthrough for non-technical readers
- `docs/engineering/` — forward-looking design artifacts

---

## License

MIT — see `LICENSE`.
