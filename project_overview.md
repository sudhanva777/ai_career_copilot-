# AI Career Copilot — Technical Project Overview

A deep-dive into the architecture, data model, service design, and security decisions of the AI Career Copilot platform.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Database Schema](#2-database-schema)
3. [Authentication Flow](#3-authentication-flow)
4. [NLP Pipeline](#4-nlp-pipeline)
5. [LLM Coaching Pipeline](#5-llm-coaching-pipeline)
6. [Job Description Matching](#6-job-description-matching)
7. [Career Health Dashboard](#7-career-health-dashboard)
8. [Migration Strategy](#8-migration-strategy)
9. [Security Design](#9-security-design)
10. [API Contract Summary](#10-api-contract-summary)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Testing Strategy](#12-testing-strategy)

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                 BROWSER (React 18 + Vite)                     │
│  Auth · Dashboard · Analysis · Interview · Jobs · Report      │
│              apiFetch (credentials: include)                  │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP (port 3000 → proxy /api → 8000)
┌─────────────────────────▼────────────────────────────────────┐
│              FASTAPI (uvicorn, port 8000)                      │
│  SlowAPIMiddleware → CORSMiddleware → Routers                 │
│  ┌──────────┐ ┌────────┐ ┌───────────┐ ┌──────┐ ┌─────────┐ │
│  │  auth    │ │ resume │ │ interview │ │ jobs │ │dashboard│ │
│  └──────────┘ └────┬───┘ └─────┬─────┘ └──┬───┘ └────┬────┘ │
└───────────────────┼────────────┼───────────┼──────────┼──────┘
                    │            │           │          │
         ┌──────────┘       ┌────┘      ┌───┘     ┌────┘
         ▼                  ▼           ▼          ▼
┌─────────────────┐  ┌────────────┐  ┌────────────────────────┐
│  NLP Pipeline   │  │ LLM Coach  │  │  SQLite / PostgreSQL    │
│  spaCy          │  │ (Ollama)   │  │  6 tables, Alembic      │
│  SentenceTrans. │  │ llama3     │  │  migrations (4 steps)   │
│  Skill ontology │  │ httpx 30s  │  └────────────────────────┘
└─────────────────┘  └────────────┘
```

**Docker Compose services:** `db` (postgres:15), `backend`, `frontend`, `ollama`

**Named volumes:** `pgdata`, `uploads_data`, `ollama_data`

The backend is a single FastAPI process. All AI work happens synchronously in the request (NLP) or via `asyncio`/`httpx` calls to Ollama (LLM). There is no task queue — the 30-second Ollama timeout is the safety valve. The frontend is served by Vite in development (port 3000, `/api` proxied to 8000) and by Nginx in Docker.

---

## 2. Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | INTEGER PK | Auto-increment, indexed |
| `email` | STRING UNIQUE | Indexed |
| `password_hash` | STRING | bcrypt via passlib |
| `name` | STRING | Nullable |
| `role` | STRING | Default `'User'` |
| `created_at` | DATETIME | |

### `resumes`
| Column | Type | Notes |
|--------|------|-------|
| `resume_id` | INTEGER PK | Indexed |
| `user_id` | INTEGER FK | → `users.user_id` CASCADE DELETE |
| `filename` | STRING | Original display name only |
| `raw_text` | TEXT | Extracted from PDF/DOCX |
| `file_path` | STRING | UUID-based path on disk |
| `upload_date` | DATETIME | |

### `analysis`
| Column | Type | Notes |
|--------|------|-------|
| `analysis_id` | INTEGER PK | |
| `resume_id` | INTEGER FK | → `resumes.resume_id` CASCADE DELETE |
| `ats_score` | FLOAT | 0.0–100.0 |
| `skills_json` | JSON | `[{skill: str, score: float}, …]` |
| `role_pred_json` | JSON | `[{role: str, score: float}, …]` |
| `gaps_json` | JSON | `[str, …]` |
| `rewrite_suggestions_json` | JSON | `NULL` until POST /rewrite called; `[]` = generated but no gaps; `[{…}]` = suggestions ready |
| `created_at` | DATETIME | |

### `interview_sessions`
| Column | Type | Notes |
|--------|------|-------|
| `session_id` | INTEGER PK | |
| `user_id` | INTEGER FK | → `users.user_id` CASCADE DELETE |
| `analysis_id` | INTEGER FK | → `analysis.analysis_id`; **nullable** — set to NULL when analysis not found |
| `target_role` | STRING | |
| `overall_score` | FLOAT | Computed when all 5 questions are answered |
| `practice_mode` | BOOLEAN | Default False; allows re-answering |
| `started_at` | DATETIME | |

### `interview_qa`
| Column | Type | Notes |
|--------|------|-------|
| `qa_id` | INTEGER PK | |
| `session_id` | INTEGER FK | → `interview_sessions.session_id` CASCADE DELETE |
| `question_text` | TEXT | LLM-generated question |
| `user_answer` | TEXT | NULL until answered |
| `ideal_answer` | TEXT | LLM-generated; set on answer |
| `similarity_score` | FLOAT | 0.0–10.0 (LLM-assigned, legacy name) |
| `llm_feedback` | TEXT | |
| `question_category` | STRING | Technical / Behavioral / Situational / Problem Solving / Communication |

### `job_matches`
| Column | Type | Notes |
|--------|------|-------|
| `match_id` | INTEGER PK | |
| `user_id` | INTEGER FK | → `users.user_id` CASCADE DELETE, NOT NULL |
| `resume_id` | INTEGER FK | → `resumes.resume_id` CASCADE DELETE, NOT NULL |
| `jd_text` | TEXT | Full JD (truncated to 10 000 chars) |
| `jd_source` | STRING | `"paste"` or the URL |
| `match_score` | FLOAT | 0.0–100.0 |
| `matched_skills_json` | JSON | `[str, …]` |
| `missing_skills_json` | JSON | `[str, …]` |
| `created_at` | DATETIME | |

**Cascade behaviour:** All FK columns use `ondelete='CASCADE'`. Deleting a user removes all their resumes, analyses, sessions, Q&A rows, and job matches. SQLite foreign-key enforcement is enabled via `PRAGMA foreign_keys=ON` on each connection.

**Key design decisions:**
- `analysis_id` on `interview_sessions` is nullable — a session started with a stale or missing analysis ID resolves to NULL rather than failing with a FK integrity error.
- `rewrite_suggestions_json IS NULL` means "never generated". `[]` means "generated but no gap skills existed". The GET /rewrite endpoint uses `is None` (not `not value`) to distinguish these two states.
- `similarity_score` is a legacy column name — the value is actually the LLM-assigned 0–10 score, not a cosine similarity value.

---

## 3. Authentication Flow

```
Browser                          FastAPI
  │                                │
  │─── POST /auth/register ───────►│  bcrypt hash password → INSERT user
  │◄── 200 {user_id, email} ───────│
  │                                │
  │─── POST /auth/login ──────────►│  bcrypt.verify → create JWT (exp: 24h)
  │◄── 200 Set-Cookie: session=JWT─┤  HttpOnly, SameSite=lax, Secure=prod
  │                                │
  │─── GET /resume/list ──────────►│  decode JWT → user_id
  │◄── 200 [{id, filename, …}] ────┤
  │                                │
  │─── POST /auth/logout ─────────►│  Set-Cookie: session=""; max_age=0
  │◄── 200 ───────────────────────┤  browser drops the cookie
```

**JWT payload:** `{"sub": "<user_id>", "exp": <unix_ts>}`

**Cookie attributes:**
- `HttpOnly=True` — not readable by JavaScript
- `SameSite=lax` — sent on same-site navigations; not cross-site POST requests
- `Secure=True` when `ENVIRONMENT=production`; `False` in `development`
- `max_age` matches `ACCESS_TOKEN_EXPIRE_MINUTES * 60` (default 86400 s = 24 h)

**Rate limiting:** `POST /register` → 3 req/min; `POST /login` → 5 req/min. SlowAPI reads `X-Forwarded-For` to get the real client IP behind a proxy. Limiting is always active regardless of `ENVIRONMENT`.

**401 handling in the frontend:** `apiFetch` (in `client.js`) intercepts any 401 and redirects to `/login`, except when the path starts with `/auth/` to prevent an infinite redirect loop.

---

## 4. NLP Pipeline

**Entry point:** `POST /resume/upload` → `nlp_pipeline.analyze_resume(raw_text)`

### Text extraction

| Format | Primary | Fallback |
|--------|---------|---------|
| PDF | PyMuPDF (`fitz`) | pdfplumber |
| DOCX | python-docx paragraph join | — |

Guard: fewer than 50 extracted characters → HTTP 422 ("scanned PDF — use a text-based file").

### Skill extraction

```python
SKILL_ONTOLOGY = {
    "Python":  ["python", "py", "python3"],
    "FastAPI": ["fastapi", "fast api"],
    # 30 skills × avg 3 aliases ≈ 90 candidate strings
}

# At module load — pre-embed all aliases once
SKILL_EMBEDDINGS = {
    skill: model.encode(aliases, normalize_embeddings=True)
    for skill, aliases in SKILL_ONTOLOGY.items()
}
```

The pipeline splits the resume text into sentences, encodes them with `all-MiniLM-L6-v2` (384-dim, cosine normalised), and computes similarity against each skill's pre-computed alias embeddings. The maximum similarity across all aliases is the skill's score. Skills with score ≥ **0.35** are returned as `{skill: str, score: float}`.

The embedding model is loaded as a singleton at module import time in `embedding_service.py`. Docker bakes model weights into the image at build time.

### Role prediction

Ten predefined roles, each with a fixed required-skill set:

```python
ROLE_PROFILES = {
    "Software Engineer": {"Python", "Git", "SQL", "REST APIs", …},
    "Data Scientist":    {"Python", "Machine Learning", "Pandas", …},
    # … 10 roles
}
```

Score per role = `(matched_skills / required_skills) × 100`. Roles with score > 0 are returned sorted descending, top 5 max.

### Gap analysis

Gap skills = union of all required skills across all roles with score > 0, minus detected skills. Returned as a flat `[str]` list.

### ATS score

`ats_score = min(100, detected_skill_count × (100 / 15))`

A resume with ≥ 15 detected skills scores 100. This is a simplified heuristic but the primary signal users see and optimise over time.

### Score history

`GET /resume/history` returns all of the user's resume versions ordered oldest-first with:
- `version_label`: V1, V2, V3, …
- `delta`: ATS score change vs. previous version (null for V1)
- `new_skills`: up to 3 skills present in this version but not the previous
- `ats_score`: rounded to 1 decimal place

### Job description matching

`extract_jd_skills(jd_text)` tokenises the JD with spaCy, lowercases and deduplicates tokens, then cosine-similarity matches them against the skill ontology (same threshold: 0.35).

`compare_resume_to_jd(resume_skills, jd_skills)` returns:
- `matched_skills`: skills present in both resume and JD
- `missing_skills`: skills in JD but not in resume
- `match_score`: `len(matched) / (len(matched) + len(missing)) × 100`

---

## 5. LLM Coaching Pipeline

All LLM calls go through `httpx.AsyncClient` → `OLLAMA_BASE_URL/api/generate` with a 30-second timeout. Model: `llama3`. Format: `"format": "json"` to encourage JSON-only output.

### Rewrite suggestions (`generate_rewrite_suggestions`)

Sends the first 2000 characters of the resume and the gap skills list. Expects a JSON array of 5–8 objects:

```json
[{
  "section":  "Summary | Skills | Experience | Projects | Education",
  "severity": "high | medium | low",
  "current":  "exact text from resume, or 'Not present'",
  "improved": "complete ready-to-paste text (bullet starts with •)",
  "reason":   "one sentence explaining the improvement"
}]
```

Each field is normalised and validated. Unknown sections default to `"Experience"`, unknown severities to `"medium"`. Suggestions are persisted to `analysis.rewrite_suggestions_json` so the GET endpoint can return them without re-calling Ollama.

**Fallback (`_fallback_rewrite_suggestions`):** One template bullet per gap skill (up to 6) plus a Skills section suggestion. Returns `[]` if there are no gap skills — the GET endpoint handles this as a valid empty result, not a missing-data 404.

### Question generation (`generate_questions`)

Sends the role name and the user's detected skills as context. Expects:

```json
[{"question": "…", "category": "Technical | Behavioral | Situational | Problem Solving | Communication"}]
```

Invalid categories normalise to `"Technical"`. Each question is stored in a `interview_qa` row with its category before the session is returned to the user.

**Fallback (`get_fallback_questions` in interview router):** 5 static role-tagged questions when the LLM call raises. `ai_available: false` is included in the response.

### Answer evaluation (`evaluate_answer`)

Sends the question and the user's answer. Expects:

```json
{"score": 7.5, "feedback": "…", "ideal_answer": "…"}
```

Score cast to `float`. When all 5 questions have been answered, `interview_sessions.overall_score` is computed as the mean of all `similarity_score` values and persisted.

**Fallback:** On `RuntimeError`, returns `score=5.0`, `ai_available=false`, and a placeholder feedback message.

---

## 6. Job Description Matching

**URL fetching (`_fetch_jd_from_url`):**

```
httpx.AsyncClient(timeout=15s, follow_redirects=True)
  → GET url (User-Agent: Mozilla/5.0)
  → BeautifulSoup("html.parser")
  → strip script/style/nav/footer/header/aside tags
  → get_text(separator="\n")
  → join non-empty lines
  → truncate to 10 000 chars
```

- `ConnectError` → HTTP 400 with actionable message
- Non-200 status → HTTP 400
- JD text < 20 characters after strip → HTTP 400

Every match result is saved to `job_matches`. The `/matches` endpoint returns all matches newest-first, with an 80-char preview of the first non-empty JD line (truncated with `…` if longer).

---

## 7. Career Health Dashboard

`GET /dashboard/summary` assembles all user data in a single call:

1. Fetches all resumes (newest first), latest analysis, all job matches, all interview sessions.
2. Computes **Career Health** as a composite score:
   - ATS score × 40%
   - Interview average (×10 to normalize to 0–100) × 35%
   - Best job match score × 25%
   - Only components with data contribute; missing components reduce the total weight.
3. Assigns a label: Excellent (≥80), Good (≥65), Fair (≥45), Needs Work (<45).
4. Builds a unified **recent activity** feed (up to 6 items, sorted by date) from resume uploads, job matches, and interview sessions.
5. Generates **next steps** (up to 3), personalised based on what is missing: no resume → upload prompt; low ATS → rewrite suggestion; no job matches → JD matching prompt; low interview score → practice prompt.

**Onboarding Wizard:** When `total_resumes === 0`, the frontend (`DashboardPage.jsx`) shows a 2-step modal overlay guiding the user through uploading their first resume. Dismissed via `localStorage` key `cc_onboarding_v1` (never shown again after first dismissal).

---

## 8. Migration Strategy

The project uses Alembic for schema migrations alongside `Base.metadata.create_all(bind=engine)` at FastAPI startup. This dual approach requires all migrations to be **idempotent** — they must check whether a table/column already exists before executing DDL.

**Migration chain:**

```
23dccde9f1d4  base tables (users, resumes, analysis, interview_sessions, interview_qa)
      │
      ▼
b1c3e2f4a7d9  ADD COLUMN analysis.rewrite_suggestions_json JSON
      │
      ▼
c2d4e6f8a1b3  CREATE TABLE job_matches
      │
      ▼
d3e5f7a9b1c4  ADD COLUMN interview_sessions.practice_mode BOOLEAN
              ADD COLUMN interview_qa.question_category STRING
```

Every migration uses `sa_inspect(bind)` to check existing tables/columns before DDL. Running `alembic upgrade head` on a database that was already bootstrapped by `create_all()` is safe — all operations are no-ops for columns/tables that already exist.

**Why not auto-generate migrations?** The base init migration intentionally omits columns added by later migrations. Auto-generation from models would include those columns, breaking the chain.

---

## 9. Security Design

| Control | Implementation |
|---------|---------------|
| Password storage | `passlib[bcrypt]` — one-way hash, no plaintext stored. Pinned to `bcrypt==3.2.2` for `passlib 1.7.4` compatibility (bcrypt ≥ 4.0 rejects passwords > 72 bytes in `detect_wrap_bug`). |
| Session token | JWT (HS256) stored in `HttpOnly SameSite=lax` cookie |
| Secure cookie | `secure=True` in production, `secure=False` only when `ENVIRONMENT=development` |
| CSRF | Mitigated by `SameSite=lax`; no separate token needed for same-origin requests |
| Rate limiting | SlowAPI always enabled: `register` 3 req/min, `login` 5 req/min; real IP via `X-Forwarded-For` |
| File validation | Extension check + MIME type check + magic-bytes check (first 4 bytes of content) + size ≤ 5 MB + non-empty |
| File storage | UUID-only filename on disk; original name stored in DB only. No path traversal possible. |
| SQL injection | SQLAlchemy ORM with parameterised queries throughout. No raw SQL strings. |
| Secret key | Validated at startup: `len(SECRET_KEY) < 32` → `RuntimeError` — server refuses to start. |
| CORS | Explicit `allow_origins` list; `allow_credentials=True` required for cookie-based auth |
| Auth on all routes | `user_id: int = Depends(get_current_user_id)` on every protected endpoint |
| Input validation | Pydantic schemas with `min_length` on all user-provided string fields |
| Duplicate answers | HTTP 409 if a question has already been answered (bypassed by `practice_mode=True`) |

---

## 10. API Contract Summary

### Key response shapes

**Analysis:**
```json
{
  "analysis_id": 1,
  "resume_id": 1,
  "ats_score": 73.3,
  "extracted_skills": [{"skill": "Python", "score": 0.82}, …],
  "predicted_roles":  [{"role": "Backend Engineer", "score": 75.0}, …],
  "gap_skills":       ["Kubernetes", "Terraform"]
}
```

**Resume list item:**
```json
{"id": 1, "filename": "my_resume.pdf", "uploaded_at": "2026-03-04T10:00:00"}
```

**History item:**
```json
{
  "resume_id": 2, "filename": "resume_v2.pdf",
  "uploaded_at": "2026-03-04T11:00:00",
  "ats_score": 80.0, "delta": 6.7,
  "version_label": "V2", "new_skills": ["Docker", "Kubernetes"]
}
```

**Rewrite suggestion item:**
```json
{
  "section": "Experience", "severity": "high",
  "current": "Wrote backend services.",
  "improved": "• Built and deployed REST APIs using FastAPI …",
  "reason": "Adds FastAPI keyword directly improving ATS keyword density."
}
```

**Interview session start:**
```json
{
  "session_id": 4,
  "questions": [{"id": 1, "text": "Describe …", "category": "Technical"}, …],
  "ai_available": true,
  "practice_mode": false
}
```

**Interview answer:**
```json
{
  "score": 7.5, "feedback": "Good answer …", "ideal_answer": "A strong answer would …",
  "ai_available": true, "session_complete": false, "overall_score": null
}
```

**Session summary:**
```json
{
  "session_id": 4, "target_role": "Backend Engineer",
  "overall_score": 7.2, "practice_mode": false,
  "per_category_scores": {"Technical": 7.5, "Behavioral": 6.8},
  "qa_list": [{
    "qa_id": 1, "question_text": "…", "question_category": "Technical",
    "user_answer": "…", "ideal_answer": "…",
    "similarity_score": 7.5, "llm_feedback": "…"
  }]
}
```

**Job match:**
```json
{
  "match_id": 1, "match_score": 68.0,
  "matched_skills": ["Python", "FastAPI", "Docker"],
  "missing_skills": ["Kubernetes", "Terraform"],
  "jd_source": "paste", "created_at": "2026-03-04T12:00:00"
}
```

**Dashboard summary:**
```json
{
  "career_health": 72, "career_health_label": "Good",
  "ats_score": 73.3, "interview_avg": 7.1, "best_match_score": 68.0,
  "total_resumes": 3, "total_sessions": 5, "total_matches": 2,
  "skills_detected": 11, "gaps_count": 4, "top_role": "Backend Engineer",
  "recent_activity": [{"type": "interview", "label": "Backend Engineer", "score": 7.2, "url": "/interview/summary/4", "date": "…"}],
  "next_steps": [{"label": "Improve your ATS score", "desc": "…", "url": "/rewrite/1", "priority": "high"}]
}
```

---

## 11. Frontend Architecture

### Routing (`App.jsx`)

```
/login, /register           → PublicRoute (redirect to / if authed)
/report/:resumeId           → ProtectedRoute outside AppShell (full-page print layout)
/*                          → ProtectedRoute → AppShell → nested routes:
    /                       → DashboardPage
    /upload                 → UploadPage
    /analysis               → AnalysisPage
    /resumes                → ResumesPage
    /history                → HistoryPage
    /rewrite/:resumeId      → RewritePage
    /jobs                   → JobMatchPage
    /interview              → InterviewPage
    /interview/summary/:id  → InterviewSummaryPage
```

`ReportPage` sits outside `AppShell` deliberately — it has its own white print-safe layout with a `window.print()` button and no sidebar navigation.

### API layer (`src/api/client.js`)

`apiFetch` is the single HTTP entry point for all pages:
- Adds `Content-Type: application/json` (omitted for `FormData` uploads)
- `credentials: 'include'` sends the HttpOnly session cookie
- 30-second timeout via `AbortSignal.timeout`
- `204` → returns `null`
- `401` → redirects to `/login` (guarded against `/auth/` paths to prevent loop)
- Non-OK → throws `Error` with `err.status = res.status` and `err.data = body`

### State management

No global state library. Each page manages its own loading/data state with `useState`/`useEffect`. Cross-page auth state lives in `AuthContext` (React Context + `useAuth` hook). Interview session state is encapsulated in `useInterview` custom hook which manages the `setup → session → results` phase machine.

### Charts (Recharts)

- `LineChart` — ATS score history (`HistoryPage`)
- `RadarChart` — per-category interview scores (`InterviewSummaryPage`)

### Key configuration

| Setting | Value | Source |
|---------|-------|--------|
| Vite dev port | 3000 | `vite.config.js` |
| API proxy | `/api` → `http://localhost:8000` | `vite.config.js` |
| API base (fallback) | `http://localhost:8000/api/v1` | `client.js` |
| JWT expiry | 1440 min (24 h) | `config.py` |
| Cookie max_age | 86 400 s | Derived from above |
| Upload size limit | 5 MB | `resume.py` |
| Skill match threshold | 0.35 cosine | `nlp_pipeline.py` |
| Ollama request timeout | 30 s | `llm_coach.py` |
| Minimum extracted text | 50 chars | `resume.py` |
| Rate limit — register | 3 / min | `auth.py` |
| Rate limit — login | 5 / min | `auth.py` |

---

## 12. Testing Strategy

**Framework:** pytest + pytest-asyncio + HTTPX `TestClient`

**Test database:** In-memory SQLite (`sqlite:///:memory:?check_same_thread=false`), fresh per test run.

**ML mocking:** `pytest_configure` hook (runs before collection, before any module is imported) injects `sys.modules["sentence_transformers"]` with a `MagicMock` whose `.encode()` returns `np.ones(384)`. `spacy.load` is patched to return a `MagicMock`. This avoids the 500 MB+ `sentence_transformers` + PyTorch install.

**Rate limiter bypass:** An `autouse=True` fixture sets `limiter.enabled = False` before each test and restores it after. `SlowAPIMiddleware.dispatch()` checks `limiter.enabled` as its very first step, so this cleanly bypasses all rate limit logic.

**Ollama mocking:** `unittest.mock.patch("app.services.ai.llm_coach.httpx.AsyncClient")` returns a pre-built JSON response payload for each test exercising the LLM path.

**Windows teardown:** `engine.dispose()` before `os.remove()` releases the SQLite file lock. `PermissionError` is caught and swallowed in the teardown fixture.

**Coverage:** 17 scenarios — health check, full auth flow, resume upload and validation, file-type attacks (wrong magic bytes, oversized, empty), full interview flow including practice mode, duplicate-answer rejection, wrong-session rejection, and unauthenticated-access checks on all routers.
