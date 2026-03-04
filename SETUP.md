# AI Career Copilot — Complete Setup Guide

A step-by-step guide for running the project locally on Windows, from a fresh clone to a working app in your browser.

---

## What You Need Before Starting

Install these tools before you begin. If you already have them, skip ahead to [Quick Start](#quick-start-recommended).

| Tool | Version | Download |
|------|---------|----------|
| **Python** | 3.10 or higher | https://python.org/downloads — check **"Add Python to PATH"** during install |
| **Node.js** | 18 or higher | https://nodejs.org |
| **Git** | Any recent version | https://git-scm.com |
| **Ollama** | Latest | https://ollama.com/download — required for AI interview coaching and rewrite suggestions |

> ⚠️ **Note:** After installing Python, open a new terminal and run `python --version` to confirm it's in your PATH. If you see an error, re-run the installer and check the "Add to PATH" option.

---

## Quick Start (Recommended)

For Windows users — just double-click two files:

1. Clone or download this repository
2. Open the project folder
3. Double-click **`run_local.bat`**
4. Wait \~2 minutes on first run (installs everything automatically)
5. Browser opens at **http://localhost:3000**

**To stop everything:** double-click **`stop_local.bat`**

That's it. The launcher handles:
- Creating the Python virtual environment
- Installing all Python and Node dependencies
- Downloading the spaCy language model
- Running database migrations
- Pulling the llama3 AI model (first run only — may take several minutes)
- Starting the backend, frontend, and Ollama services
- Opening your browser automatically

---

## Manual Setup (if run_local.bat doesn't work)

Follow these steps if you prefer to run each service manually, or if the batch file encounters an issue.

### Step 1 — Clone the repo

```bash
git clone <repository-url>
cd ai_career_copilot
```

### Step 2 — Create the `.env` file

Copy the example file and fill in your secret key:

```bash
# From the project root
copy .env.example backend\.env
```

Generate a secure `SECRET_KEY`:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Open `backend\.env` and paste the output as the value for `SECRET_KEY`. Your `.env` file should look like this:

```env
# REQUIRED — generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=abc123def456...your64charlonghexstringhere...

# Database (SQLite for local dev — no setup needed)
DATABASE_URL=sqlite:///./app.db

# Environment ("development" disables secure-cookie flag for HTTP)
ENVIRONMENT=development

# Ollama AI service
OLLAMA_BASE_URL=http://localhost:11434

# File uploads folder (created automatically)
UPLOAD_DIR=./uploads

# Allowed origins for CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Session lifetime in minutes (1440 = 24 hours)
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

> ⚠️ **Note:** `SECRET_KEY` must be at least 32 characters. The server will refuse to start otherwise.

### Step 3 — Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download the spaCy English language model
python -m spacy download en_core_web_sm

# Run database migrations
alembic upgrade head

# Start the backend
uvicorn app.main:app --reload --port 8000
```

The API is now running at **http://localhost:8000**. Swagger docs at **http://localhost:8000/docs**.

### Step 4 — Frontend setup (new terminal)

```bash
cd frontend
npm install
npm run dev
```

The frontend is now running at **http://localhost:3000**.

### Step 5 — Ollama setup (new terminal)

```bash
# Start the Ollama server
ollama serve

# In another terminal — pull the AI model (first run only, ~4GB download)
ollama pull llama3
```

> ⚠️ **Note:** The `ollama serve` command must stay running in its terminal. The llama3 model is only downloaded once; subsequent starts are instant.

### Step 6 — Open the app

Navigate to **http://localhost:3000** in your browser.

---

## Environment Variables

All variables go in `backend/.env`. The app reads this file on startup.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Required** | — | Used to sign JWT session tokens. Must be ≥ 32 characters. Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | Optional | `sqlite:///./app.db` | Database connection string. Default uses SQLite (no extra setup). Use a PostgreSQL URL for production. |
| `ENVIRONMENT` | Optional | `production` | Set to `development` for local HTTP dev (disables secure cookie flag). |
| `OLLAMA_BASE_URL` | Optional | `http://localhost:11434` | URL of the Ollama server. Change if running Ollama on a different port or host. |
| `ALLOWED_ORIGINS` | Optional | `http://localhost:3000` | Comma-separated list of origins allowed by CORS. Must include your frontend URL. |
| `UPLOAD_DIR` | Optional | `./uploads` | Directory where uploaded resume files are stored. Created automatically. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Optional | `1440` | How long login sessions last (in minutes). 1440 = 24 hours. |

---

## What Each Service Does

### Backend (FastAPI on :8000)
The Python backend handles all business logic: user authentication (JWT in HttpOnly cookies), resume file upload and text extraction, NLP-based skill analysis, job description matching, AI-powered rewrite suggestions, and interview session management. It exposes a REST API under `/api/v1/` and connects to both the database and Ollama.

### Frontend (React/Vite on :3000)
A single-page React application served by Vite's dev server locally (or Nginx in Docker). It handles all UI: the dashboard, resume upload flow, analysis results, rewrite suggestions with live preview, interview coach, score history charts, and PDF export. All API calls go to the backend at port 8000.

### Ollama (:11434)
A local AI model runtime that serves the `llama3` language model. The backend calls Ollama to generate interview questions, evaluate answers, and produce resume rewrite suggestions. **Without Ollama running and llama3 pulled, AI features fall back to template-based responses** — the app still works, but coaching quality is reduced.

### SQLite (app.db)
A single-file database stored at `backend/app.db`. It holds all users, resumes, analysis results, interview sessions, and AI outputs. No server setup required — SQLite is built into Python. For production use, switch `DATABASE_URL` to a PostgreSQL connection string.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **"SECRET_KEY must be at least 32 characters"** | Run `python -c "import secrets; print(secrets.token_hex(32))"` and paste the result into `backend/.env` as `SECRET_KEY=...` |
| **Cookies not working / always getting logged out** | Set `ENVIRONMENT=development` in `backend/.env`. In production mode, cookies are `Secure` and require HTTPS. |
| **Resume upload fails / 422 error** | Make sure the file is a real PDF or DOCX (not renamed). The file must contain selectable text — scanned image-only PDFs are not supported. Max size is 5 MB. |
| **Interview questions are generic (not AI-generated)** | Ollama is either not running or llama3 is not pulled. Run `ollama serve` in a terminal, then `ollama pull llama3`. Check http://localhost:11434 is reachable. |
| **"Module not found" on backend startup** | Your virtual environment may not be activated. Run `venv\Scripts\activate` from the `backend/` folder, then retry. Or re-run `pip install -r requirements.txt`. |
| **`npm run dev` fails** | Make sure Node.js 18+ is installed (`node --version`). Delete `frontend/node_modules` and run `npm install` again. |
| **Ollama not found in PATH** | Re-run the Ollama installer from https://ollama.com/download. After install, open a **new** terminal window before trying again. |
| **Port already in use (8000 or 3000)** | Another process is using the port. Run `netstat -ano \| findstr :8000` to find the PID, then kill it in Task Manager. Or change the port in the uvicorn / Vite command. |
| **`alembic upgrade head` fails** | Delete `backend/app.db` (local dev only — you'll lose data) and retry. Or check `alembic/versions/` for migration conflicts. |
| **spaCy model not found** | Run `python -m spacy download en_core_web_sm` from inside the activated virtual environment (`venv\Scripts\activate` first). |

---

## Running Tests

The integration test suite covers authentication, resume upload, analysis, rewrite suggestions, interview flow, and more.

```powershell
# From the backend/ directory with venv activated
cd backend
venv\Scripts\activate

# Run all integration tests
$env:PYTHONPATH = "."; & "venv\Scripts\python.exe" -m pytest tests/test_integration.py -v
```

Expected output: **17 passed**

> ⚠️ **Note:** Tests mock the ML models (spaCy, sentence-transformers) and Ollama, so they run fast without requiring those services. Rate limiting is also disabled during tests.

---

## Project Structure

```
ai_career_copilot/
│
├── run_local.bat              # One-click launcher (Windows)
├── stop_local.bat             # One-click stop all services
├── .env.example               # Template for backend/.env
├── docker-compose.yml         # Full Docker stack (alternative to local run)
├── SETUP.md                   # This file
│
├── backend/
│   ├── .env                   # Your local config (SECRET_KEY etc.) — not in git
│   ├── requirements.txt       # Python dependencies
│   ├── alembic.ini            # Alembic migration config
│   │
│   ├── alembic/
│   │   └── versions/          # Database migration scripts (4 migrations)
│   │
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point, lifespan, CORS, /health
│   │   │
│   │   ├── core/
│   │   │   ├── config.py      # Settings via pydantic-settings, reads .env
│   │   │   ├── security.py    # JWT creation/verification, bcrypt password hashing
│   │   │   └── limiter.py     # SlowAPI rate limiter instance
│   │   │
│   │   ├── db/
│   │   │   └── session.py     # SQLAlchemy engine + get_db dependency
│   │   │
│   │   ├── models/            # SQLAlchemy ORM models
│   │   │   ├── user.py        # User (id, email, hashed_password)
│   │   │   ├── resume.py      # Resume (id, user_id, filename, raw_text, file_path)
│   │   │   └── analysis.py    # AnalysisResult (ats_score, skills, roles, gaps, rewrites)
│   │   │
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   │
│   │   ├── api/
│   │   │   ├── deps.py        # get_current_user_id dependency (reads JWT cookie)
│   │   │   └── v1/
│   │   │       ├── auth.py        # POST /register, /login, /logout, GET /me
│   │   │       ├── resume.py      # Upload, list, delete, analysis, rewrite, preview, export
│   │   │       ├── interview.py   # Start session, answer question, summary, stats
│   │   │       ├── job_match.py   # POST /job-match (URL or paste)
│   │   │       └── dashboard.py   # GET /dashboard/summary
│   │   │
│   │   └── services/
│   │       ├── file_service.py            # Saves uploads with UUID filenames
│   │       ├── embedding_service.py       # SentenceTransformer singleton
│   │       └── ai/
│   │           ├── nlp_pipeline.py        # spaCy skill extraction + ATS scoring
│   │           └── llm_coach.py           # Ollama calls: questions, evaluation, rewrites
│   │
│   └── tests/
│       ├── conftest.py                    # Pytest fixtures, ML mocks, limiter bypass
│       └── test_integration.py            # 17 integration tests (full API flow)
│
└── frontend/
    ├── package.json           # Node dependencies (React, Vite, Recharts, React Router)
    ├── vite.config.js         # Vite config — proxies /api/* to localhost:8000
    │
    └── src/
        ├── main.jsx           # React entry point
        ├── App.jsx            # Router setup, protected routes
        │
        ├── api/
        │   ├── client.js      # apiFetch wrapper (credentials, 30s timeout, 401 redirect)
        │   ├── auth.js        # login, register, logout, me
        │   ├── resume.js      # upload, list, delete, analysis, rewrite, preview, export
        │   ├── interview.js   # start, answer, summary, stats
        │   └── dashboard.js   # dashboard summary
        │
        ├── pages/
        │   ├── Dashboard.jsx       # Career health gauge, activity feed, next steps
        │   ├── UploadPage.jsx      # Resume upload + analysis polling
        │   ├── AnalysisPage.jsx    # ATS score, skills, roles, confidence breakdown
        │   ├── RewritePage.jsx     # AI suggestions + live preview + PDF export
        │   ├── InterviewPage.jsx   # Live interview session
        │   ├── InterviewSummaryPage.jsx  # Radar chart + per-question breakdown
        │   ├── HistoryPage.jsx     # Score history line chart (Recharts)
        │   ├── JobMatchPage.jsx    # Paste/URL job description matching
        │   ├── ReportPage.jsx      # Printable PDF career report
        │   └── Auth/               # Login + Register pages
        │
        ├── components/
        │   ├── layout/        # AppShell, Sidebar, PageHeader, TopBar
        │   └── ui/            # Button, Card, Badge, Spinner, EmptyState, Icon, etc.
        │
        └── hooks/
            ├── useAuth.js     # Auth context + login/logout helpers
            └── useNotify.js   # Toast notification hook
```

---

## Tech Stack Summary

| Layer | Technology | Why we chose it |
|-------|-----------|-----------------|
| **Frontend** | React 18 + Vite + React Router | Fast HMR dev experience, SPA routing, small bundle |
| **Backend** | FastAPI (Python) | Async-first, automatic OpenAPI docs, strong typing via Pydantic |
| **Database** | SQLite (dev) / PostgreSQL (prod) + SQLAlchemy + Alembic | Zero-config local dev; Alembic handles schema migrations cleanly |
| **NLP** | spaCy `en_core_web_sm` + `all-MiniLM-L6-v2` | Fast skill extraction locally; sentence embeddings for semantic matching |
| **LLM / AI** | Ollama + llama3 | Runs entirely locally — no API keys, no cost, full privacy |
| **Auth** | python-jose JWT in HttpOnly cookie + passlib bcrypt | Secure cookie-based sessions; bcrypt for password hashing |
| **File Processing** | PyMuPDF + pdfplumber + python-docx | Dual PDF extraction strategy; handles most real-world PDF layouts |
| **PDF Export** | ReportLab | Pure-Python PDF generation; no external binaries needed |
| **Charts** | Recharts | Composable React chart library; radar + line charts out of the box |
| **Rate Limiting** | SlowAPI | FastAPI-native rate limiting; prevents abuse on auth endpoints |
| **Testing** | pytest + pytest-asyncio | Integration tests covering the full API flow; ML deps mocked for speed |
| **Infrastructure** | Docker Compose (4 services) | One-command production-like deployment with Nginx, PostgreSQL, Ollama |
