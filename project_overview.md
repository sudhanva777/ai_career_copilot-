# 🤖 AI Career Copilot - Project Overview

## 1. Project Goal & Vision

**AI Career Copilot** is designed to be a full-stack AI SaaS product that helps candidates by analyzing their resumes, matching them to job roles, and coaching them through intelligent mock interviews. The core loop consists of uploading a resume, receiving an ATS score and gap analysis, practicing via an AI interview simulator, and getting actionable feedback.

## 2. Current Architecture

The system consists of the following stack components:

* **Frontend:** React.js, Vite, and Vanilla CSS. It uses a custom glassmorphism design system rather than Tailwind. Client-side routing is handled via React Router.
* **Backend:** FastAPI with SQLite (`app.db`) and SQLAlchemy ORM.
* **AI/NLP Layer:** Python libraries (`spacy`, `SentenceTransformer` scaffolding) and `httpx` API integrations for connecting to a local `Ollama` (Llama 3) LLM instance.

## 3. What Has Been Accomplished So Far

The project has achieved end-to-end functionality integrating the UI with the core backend micro-services.

1. **Authentication System (Completed & Stabilized):**
    * Backend JWT generation and HTTP-Only cookie logic via `/auth/register` and `/auth/login`.
    * **Frontend:** Fully stabilized React AuthContext with robust, loop-free session hydration and graceful 401 unauthenticated-state handling.
    * Secure protected routes wrapper prevents unauthenticated access to the dashboard.

2. **Resume Processing Pipeline (Functional):**
    * **Upload & Parsing:** Backend routes correctly accept PDF and DOCX files (`/resume/upload`), utilizing PyMuPDF/pdfplumber for text extraction.
    * **Frontend:** The `UploadPage.jsx`, `AnalysisPage.jsx`, and `DashboardPage.jsx` components are completely built and successfully fetching/displaying live data from the backend.

3. **NLP Analysis Engine (Functional Prototype):**
    * The NLP system (`nlp_pipeline.py`) currently utilizes a **mocked** exact-match keyword searching strategy against a predefined `SKILL_ONTOLOGY`.
    * It successfully calculates a mathematical ATS score, recommends job roles, and identifies gap skills based on this mock dictionary, saving results to the database.
    * SentenceTransformer modeling is stubbed out but not yet executing the deep semantic matching.

4. **AI Interview Coach Module (Completed):**
    * **Backend (`llm_coach.py`):** Fully integrated with a local Ollama instance. Uses candidate resume context to generate dynamic questions (`/interview/start`) and evaluates textual responses (`/interview/answer`) scoring them 0-10 with detailed LLM feedback. Includes static fallback questions if Ollama is offline.
    * **Frontend:** The `InterviewPage.jsx` provides a slick, interactive chat-bubble UI that handles the Q&A loop autonomously and renders a final summary screen with score breakdowns.

## 4. How It Works (The Code Flow)

1. **Initialization:** `app/main.py` spins up the FastAPI application, mounts the CORS middleware matching `http://localhost:5173`, and binds the SQLite SQLAlchemy models.
2. **Data Flow:**
    * A user logs in via the UI. The token is stored, and the dashboard mounts, fetching past resumes and analyses.
    * A user uploads a PDF. The file is saved and text is extracted via `pdf_utils`.
    * The text is passed to `nlp_pipeline.analyze_resume()`, extracting exact-match skills, computing an ATS score, predicting roles, and detailing missing skills. Results are served to the React Analysis UI.
    * To start an interview, the React frontend passes the analysis ID to the backend. The backend invokes the Ollama generation API with the candidate's context. Questions are stored in the database and sent to the UI.
    * Upon answering, Ollama evaluates the answer vs the question context, sending feedback and a 0-10 score back to the React UI's chat interface.

## 5. Next Steps / Pending Work

The foundational integration is finished. The remaining work focuses exclusively on improving AI accuracy and production-readiness.

* **NLP Enhancements:** Migrate the core `nlp_pipeline.py` away from the mocked exact-match `SKILL_ONTOLOGY`. Implement the `SentenceTransformer` based semantic vector matching and train/integrate the Random Forest/SVM classifier for genuine role prediction.
* **Production Deployment:** Shift the local SQLite database to PostgreSQL, containerize the application using Docker, and configure cloud hosting (e.g., Railway/Vercel) for public access.
* **Performance Tuning:** Introduce Celery or Redis for background job processing, as the current resume parsing/LLM calls block the API response synchronously.
