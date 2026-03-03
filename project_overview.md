## AI Career Copilot — Project Overview

### Project goal
Help job seekers iterate faster by turning a resume into:
- **ATS-style score**
- **Detected skills**
- **Top role matches**
- **Actionable skill gaps**
- **Mock interview practice + feedback**

### System architecture (current implementation)
- **Frontend**: React + Vite + React Router, vanilla CSS UI system
- **Backend**: FastAPI with SQLAlchemy (default DB URL points to SQLite)
- **AI/NLP**:
  - **Skill embeddings**: Sentence-Transformers (`all-MiniLM-L6-v2`)
  - **NLP runtime**: spaCy (`en_core_web_sm`, must be installed up front)
  - **Interview coach**: Ollama (Llama 3) via HTTP (`/api/generate`)

```mermaid
flowchart TB
  FE[React UI] -->|cookies + JSON| API[FastAPI /api/v1]
  API --> DB[(SQL DB via SQLAlchemy)]
  API --> UP[(uploads/resumes)]
  API --> OL[Ollama /api/generate]
  API --> NLP[nlp_pipeline.analyze_resume]
```

### Core modules (backend)
- **Entry point**: `backend/app/main.py`
  - mounts routers: `auth`, `resume`, `interview`
  - CORS origins from `ALLOWED_ORIGINS`
  - simple `/health` endpoint
- **Auth**: `backend/app/api/v1/auth.py`
  - issues JWT and stores it in an **HttpOnly cookie** named `session`
  - `GET /auth/me` validates cookie and returns the current user
- **Resume service**: `backend/app/api/v1/resume.py`
  - validates file type (PDF/DOCX) and size (5MB)
  - saves file via `backend/app/services/file_service.py`
  - extracts text (PyMuPDF with pdfplumber fallback; python-docx for DOCX)
  - calls `backend/app/services/ai/nlp_pipeline.py`
  - persists `Resume` + `AnalysisResult`
- **Interview coach**: `backend/app/api/v1/interview.py` + `backend/app/services/ai/llm_coach.py`
  - `start`: generates interview questions (fallbacks if Ollama is unreachable)
  - `answer`: evaluates answer via Ollama (fallback response on error)

### Data model (DB)
The persisted entities are:
- **User** (`users`)
- **Resume** (`resumes`)
- **AnalysisResult** (`analysis`)
- **InterviewSession** + **InterviewQA** (`interview_sessions`, `interview_qa`)

### Resume upload + analysis flow

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant BE as FastAPI
  participant FS as Uploads
  participant NLP as NLP pipeline
  participant DB as DB

  U->>FE: Upload PDF/DOCX
  FE->>BE: POST /api/v1/resume/upload (multipart)
  BE->>FS: Save file (uuid_filename)
  BE->>BE: Extract raw text (PDF/DOCX)
  BE->>NLP: analyze_resume(raw_text)
  NLP-->>BE: ats_score, extracted_skills, predicted_roles, gap_skills
  BE->>DB: Persist Resume + AnalysisResult
  BE-->>FE: { resume_id, filename, status }
  FE->>BE: GET /api/v1/resume/analysis/{resume_id}
  BE-->>FE: Analysis payload
```

### Interview coach flow

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant BE as FastAPI
  participant OL as Ollama
  participant DB as DB

  FE->>BE: POST /api/v1/interview/start
  BE->>DB: Read AnalysisResult (skills context)
  BE->>OL: POST /api/generate (question prompt)
  OL-->>BE: Questions JSON
  BE->>DB: Create InterviewSession + InterviewQA rows
  BE-->>FE: session_id + questions

  FE->>BE: POST /api/v1/interview/answer
  BE->>OL: POST /api/generate (evaluation prompt)
  OL-->>BE: {score, feedback, ideal_answer}
  BE->>DB: Persist QA result fields
  BE-->>FE: {score, feedback, ideal_answer}
```

### Security & operational notes
- **Session**: JWT stored in `session` cookie (`HttpOnly`, `SameSite=lax`).
- **CORS**: allowed origins are controlled by `ALLOWED_ORIGINS`.
- **Rate limiting**: SlowAPI limiter is wired in `backend/app/main.py` (enabled when `ENVIRONMENT=production`).

### Known constraints (documented, not changed here)
- **Startup latency**: skill embeddings are computed at import time in `nlp_pipeline.py`.
- **Database portability**: the repository includes Compose configs for Postgres, but the backend currently defaults to SQLite and does not include a Postgres driver in `backend/requirements.txt`.

### Where to go next
- Align the API contract docs under `docs/engineering/` with the current runtime payloads (cookie-based auth, analysis payload shapes).
- Production hardening: background workers for heavy analysis, observability, and DB driver + engine config for Postgres.
