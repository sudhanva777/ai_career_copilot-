# AI Career Copilot — Technical Overview

## Project Goal

Help job seekers iterate faster by turning a resume into:

- ATS-style readiness score (0–100)
- Detected technical skills with confidence scores
- Top role matches ranked by skill overlap
- Actionable skill gaps
- AI-powered mock interview practice with scored feedback

---

## System Architecture

```
┌─────────────┐     HTTPS / cookies      ┌──────────────────┐
│ React (Vite)│ ──────────────────────▶ │  FastAPI /api/v1  │
│  Nginx      │ ◀────────────────────── │  (uvicorn)        │
└─────────────┘                          └────────┬─────────┘
                                                  │
                          ┌───────────────────────┼──────────────────────┐
                          │                       │                      │
                    ┌─────▼──────┐     ┌──────────▼────────┐  ┌────────▼───────┐
                    │  SQLAlchemy│     │  NLP pipeline      │  │ Ollama (llama3)│
                    │  ORM       │     │  (spaCy + SentTxfr)│  │ /api/generate  │
                    └─────┬──────┘     └───────────────────┘  └────────────────┘
                          │
               ┌──────────┴──────────┐
               │  SQLite (dev)        │
               │  PostgreSQL (prod)   │
               └─────────────────────┘
```

**Docker Compose services:** `db` (postgres:15), `backend`, `frontend`, `ollama`

**Named volumes:** `pgdata`, `uploads_data`, `ollama_data`

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | INTEGER PK | Auto-increment |
| `username` | VARCHAR | Unique |
| `email` | VARCHAR | Unique |
| `hashed_password` | VARCHAR | bcrypt hash |
| `created_at` | DATETIME | UTC, set on insert |

### `resumes`
| Column | Type | Notes |
|--------|------|-------|
| `resume_id` | INTEGER PK | |
| `user_id` | INTEGER FK | → `users.user_id` CASCADE DELETE |
| `filename` | VARCHAR | Original filename (display only) |
| `file_path` | VARCHAR | UUID-based path on disk |
| `raw_text` | TEXT | Extracted text (used for NLP) |
| `uploaded_at` | DATETIME | UTC |

### `analysis`
| Column | Type | Notes |
|--------|------|-------|
| `analysis_id` | INTEGER PK | |
| `resume_id` | INTEGER FK | → `resumes.resume_id` CASCADE DELETE |
| `ats_score` | FLOAT | 0.0–100.0 |
| `skills_json` | TEXT | JSON: `[{skill, score}]` |
| `roles_json` | TEXT | JSON: `[{role, score}]` |
| `gap_skills_json` | TEXT | JSON: `[str]` |
| `created_at` | DATETIME | UTC |

### `interview_sessions`
| Column | Type | Notes |
|--------|------|-------|
| `session_id` | INTEGER PK | |
| `user_id` | INTEGER FK | → `users.user_id` CASCADE DELETE |
| `analysis_id` | INTEGER FK | → `analysis.analysis_id` CASCADE DELETE |
| `target_role` | VARCHAR | Role the user is practicing for |
| `overall_score` | FLOAT | Nullable — not yet computed |
| `started_at` | DATETIME | UTC |

### `interview_qa`
| Column | Type | Notes |
|--------|------|-------|
| `qa_id` | INTEGER PK | |
| `session_id` | INTEGER FK | → `interview_sessions.session_id` CASCADE DELETE |
| `question_text` | TEXT | Generated question |
| `user_answer` | TEXT | Nullable until answered |
| `ideal_answer` | TEXT | Ollama-generated ideal answer |
| `similarity_score` | FLOAT | 0.0–10.0 score from Ollama |
| `llm_feedback` | TEXT | Written feedback from Ollama |

**Cascade behaviour:** All child rows are deleted when a parent is deleted. SQLite foreign key enforcement is enabled via `PRAGMA foreign_keys=ON` on each connection.

---

## Auth Flow

```
Browser                          FastAPI
  │                                 │
  │  POST /auth/register            │
  │  {username, email, password} ──▶│  bcrypt hash password
  │                                 │  INSERT user
  │◀── 200 {user_id, email} ────────│
  │                                 │
  │  POST /auth/login               │
  │  {email, password} ────────────▶│  verify bcrypt hash
  │                                 │  create JWT (exp: 24h)
  │◀── 200 + Set-Cookie: session ───│  HttpOnly, SameSite=lax
  │                                 │  Secure=True in production
  │                                 │
  │  GET /auth/me                   │
  │  Cookie: session=<jwt> ────────▶│  decode + verify JWT
  │◀── 200 {user_id, email} ────────│
  │                                 │
  │  POST /auth/logout              │
  │  Cookie: session=<jwt> ────────▶│  Set-Cookie: session="" max_age=0
  │◀── 200 ─────────────────────────│  browser drops the cookie
```

**JWT payload:** `{"sub": "<user_id>", "exp": <unix_ts>}`

**Cookie attributes:**
- `HttpOnly=True` — not readable by JavaScript
- `SameSite=lax` — sent on top-level navigations, not cross-site requests
- `Secure=True` when `ENVIRONMENT=production`; `False` in `development`
- `max_age` derived from `ACCESS_TOKEN_EXPIRE_MINUTES * 60` (default 86400 seconds)

**Rate limiting:** `POST /register` → 3 req/min; `POST /login` → 5 req/min. The limiter reads `X-Forwarded-For` to get the real client IP behind a proxy and is always active regardless of environment.

---

## Resume Analysis Pipeline

```
POST /resume/upload (multipart, ≤ 5 MB)
         │
         ▼
 1. Extension check (.pdf / .docx only)
         │
         ▼
 2. Magic bytes check
    PDF  → first 4 bytes must be %PDF
    DOCX → first 4 bytes must be PK\x03\x04
         │
         ▼
 3. Save to disk as <uuid>.<ext>
    (original filename stored in DB for display only)
         │
         ▼
 4. Text extraction
    PDF  → PyMuPDF (fitz) primary
           pdfplumber fallback
    DOCX → python-docx paragraph join
    Guard: < 50 extracted characters → 422 error
         │
         ▼
 5. NLP pipeline (nlp_pipeline.analyze_resume)
    a. spaCy tokenise + POS/NER
    b. SentenceTransformer embed resume text
    c. Compare against ontology (30 skills × 10 roles)
       using cosine similarity, threshold = 0.35
    d. Compute ATS score: (matched_skills / total_skills) × 100
    e. Rank roles by weighted skill overlap
    f. Identify gap skills: ontology skills not matched
         │
         ▼
 6. Persist Resume + AnalysisResult to DB
         │
         ▼
 7. Return {resume_id, filename, status}
    Frontend polls GET /resume/analysis/{id} until analysis_id present
```

**Skill ontology:** 30 curated technical skills (Python, JavaScript, Docker, Kubernetes, PostgreSQL, React, FastAPI, etc.) mapped to 10 target roles (Backend Engineer, Frontend Developer, DevOps Engineer, Data Scientist, Full Stack Developer, etc.).

**Embedding model:** `all-MiniLM-L6-v2` — loaded as a singleton at module import time in `embedding_service.py`. The Docker image bakes the model weights in at build time to avoid download latency at runtime.

---

## Interview Coach Flow

```
POST /interview/start {analysis_id, target_role}
         │
         ▼
 1. Load AnalysisResult for context (skills list)
    — graceful: proceeds with empty context if not found
         │
         ▼
 2. Call Ollama (llama3) via httpx (30 s timeout)
    Prompt asks for 5 JSON questions tailored to role + skills
    — ConnectError  → ai_available=False, use static fallback questions
    — TimeoutError  → ai_available=False, use static fallback questions
    — JSONDecodeError → ai_available=False, use static fallback questions
         │
         ▼
 3. Persist InterviewSession + 5 InterviewQA rows
         │
         ▼
 4. Return {session_id, questions: [{id, text}], ai_available}


POST /interview/answer {session_id, question_id, answer}
         │
         ▼
 1. Verify session ownership (user_id match) → 404 if not found
 2. Verify question belongs to session → 404 if not found
 3. Reject duplicate answers → 409 if already answered
         │
         ▼
 4. Call Ollama (llama3) to evaluate answer
    Returns {score: 0.0–10.0, feedback, ideal_answer, ai_available}
    — RuntimeError (any Ollama failure) → fallback: score=5.0, ai_available=False
         │
         ▼
 5. Persist: user_answer, similarity_score, llm_feedback, ideal_answer
 6. Return result to frontend
```

**Static fallback questions** (used when Ollama is unreachable): 5 generic role-tagged questions covering technical skills, project experience, deadline handling, code quality, and career goals.

---

## Security Measures

| Area | Implementation |
|------|----------------|
| Password storage | `passlib[bcrypt]` — one-way hash, no plaintext stored |
| Session token | JWT signed with HS256, stored in HttpOnly cookie |
| Cookie protection | `HttpOnly`, `SameSite=lax`; `Secure=True` in production |
| CORS | Strict allowlist from `ALLOWED_ORIGINS`; credentials required |
| Rate limiting | SlowAPI always enabled; register 3/min, login 5/min; real IP via X-Forwarded-For |
| File upload | Extension check + magic bytes validation; max 5 MB enforced by FastAPI |
| Filename safety | UUID-only filenames on disk; original name stored in DB only |
| SECRET_KEY | Server refuses to start if `len(SECRET_KEY) < 32` |
| SQL injection | SQLAlchemy ORM with parameterised queries throughout |
| Foreign key integrity | SQLite: `PRAGMA foreign_keys=ON` on each connection; PostgreSQL: native enforcement |
| Duplicate answers | 409 returned if a question has already been answered |

---

## Key Configuration Values

| Setting | Value | Source |
|---------|-------|--------|
| JWT expiry | 1440 minutes (24 h) | `config.py` `ACCESS_TOKEN_EXPIRE_MINUTES` |
| Cookie max_age | 86400 seconds | Derived: `ACCESS_TOKEN_EXPIRE_MINUTES * 60` |
| Upload size limit | 5 MB | `resume.py` |
| Skill match threshold | 0.35 cosine similarity | `nlp_pipeline.py` |
| Ollama request timeout | 30 seconds | `llm_coach.py` |
| Minimum extracted text | 50 characters | `resume.py` |
| Rate limit — register | 3/minute | `auth.py` |
| Rate limit — login | 5/minute | `auth.py` |

---

## Frontend Architecture

**Pages and routing:**

| Page | Route | Auth required | Purpose |
|------|-------|--------------|---------|
| `LoginPage` | `/login` | No (PublicRoute) | Email + password login |
| `RegisterPage` | `/register` | No (PublicRoute) | Account creation |
| `DashboardPage` | `/dashboard` | Yes | Overview and navigation hub |
| `UploadPage` | `/upload` | Yes | Resume file upload + analysis poll |
| `AnalysisPage` | `/analysis` | Yes | Display ATS score, skills, roles, gaps |
| `InterviewPage` | `/interview` | Yes | Question/answer interface |
| `ResumesPage` | `/resumes` | Yes | List and delete uploaded resumes |

**Auth state:** `AuthContext` holds `{user, loading}`. On mount, `GET /auth/me` is called; if it returns 200 the user is set; if 401 the user is cleared. `ProtectedRoute` redirects to `/login` when `user` is null. `PublicRoute` redirects to `/dashboard` when already authenticated.

**API client:** `apiFetch` wrapper in `api/client.js` — sets `credentials: "include"` on every request, enforces a 30-second `AbortController` timeout, and redirects to `/login` on any 401 response.

---

## Known Limitations

| Limitation | Detail |
|------------|--------|
| Synchronous NLP on upload request | `analyze_resume()` runs in the request thread; for large resumes this blocks until complete. A task queue (Celery/ARQ) would improve throughput. |
| No email verification | Accounts are active immediately after registration. |
| No password reset | No forgot-password flow implemented. |
| Interview overall score | `InterviewSession.overall_score` column exists but is never computed. |
| Single Ollama model | Hard-coded to `llama3`; no model selection UI. |
| SQLite concurrency | Suitable for single-user local development; PostgreSQL required for any multi-user deployment. |
| No observability | No structured logging, metrics, or tracing. |

---

## Where to Go Next

1. **Background workers** — move `analyze_resume()` to ARQ or Celery + Redis to keep the upload endpoint fast
2. **PostgreSQL by default** — set `DATABASE_URL` in `docker-compose.yml` and migrate with Alembic
3. **Overall interview score** — aggregate per-question scores into `InterviewSession.overall_score` at session end
4. **Structured logging** — add `structlog` and ship logs to a collector
5. **Model selection** — expose `OLLAMA_MODEL` as an env var and pass it through `llm_coach.py`
