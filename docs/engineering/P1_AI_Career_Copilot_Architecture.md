# PROJECT 1 — AI CAREER COPILOT
## Master CTO-Level Super Architecture Diagram
**Team 1 | 6-Month Waterfall SDLC | Production-Grade AI SaaS**

---

## WATERFALL SDLC GOVERNANCE MODEL

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   WATERFALL SDLC — AI CAREER COPILOT                    │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│  PHASE 1     │  PHASE 2     │  PHASE 3     │  PHASE 4     │  PHASE 5    │
│  REQUIREMENTS│  DESIGN      │  IMPLEMENT   │  TEST        │  DEPLOY     │
│  Month 1     │  Month 2     │  Month 3-4   │  Month 5     │  Month 6    │
│              │              │              │              │             │
│ - Use Cases  │ - ERD Design │ - NLP Engine │ - Unit Tests │ - Docker    │
│ - Stakeholder│ - API Schema │ - LLM Layer  │ - Integration│ - Railway   │
│   Interviews │ - DB Schema  │ - Resume Svc │ - UAT        │ - Vercel    │
│ - SRS Doc    │ - Wireframes │ - Interview  │ - Perf Tests │ - CI/CD     │
│ - Risk Reg.  │ - Arch. Plan │   Coach Svc  │ - Security   │ - Monitor   │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
         ↓             ↓             ↓              ↓              ↓
    [Gate Review] [Gate Review] [Gate Review] [Gate Review] [Go-Live]
```

---

## 1. USE CASE DIAGRAM

```
                    ┌────────────────────────────────────────────┐
                    │          AI CAREER COPILOT SYSTEM          │
                    │                                            │
   ┌───────┐        │  ┌─────────────────┐                      │
   │       │─ ─ ─ ─▶│  │  Register/Login │                      │
   │       │        │  └─────────────────┘                      │
   │  JOB  │        │  ┌─────────────────┐                      │
   │SEEKER │─ ─ ─ ─▶│  │  Upload Resume  │                      │
   │       │        │  └────────┬────────┘                      │
   │(Actor)│        │           │                                │
   └───────┘        │  ┌────────▼────────┐                      │
                    │  │  View ATS Score  │ <<include>>          │
                    │  └────────┬────────┘──── Skill Extraction  │
                    │           │         └─── Gap Analysis       │
                    │  ┌────────▼────────┐                       │
                    │  │ Start Interview │ <<include>>            │
                    │  │   Coach Mode   │──── LLM Q Generation   │
                    │  └────────┬────────┘                       │
                    │           │                                 │
                    │  ┌────────▼────────┐                       │
   ┌────────┐       │  │ View Feedback & │                       │
   │  ADMIN │─ ─ ─▶ │  │ Download Report │                       │
   │(Actor) │       │  └─────────────────┘                       │
   └────────┘       │  ┌─────────────────┐                       │
                    │  │  Manage Users   │ <<extend>>             │
                    │  └─────────────────┘                       │
                    └────────────────────────────────────────────┘
```

---

## 2. ENTITY RELATIONSHIP DIAGRAM (ERD)

```
┌──────────────────┐         ┌───────────────────┐
│      USERS       │         │     RESUMES        │
├──────────────────┤ 1     N ├───────────────────┤
│ PK user_id       │─────────│ PK resume_id       │
│    email         │         │ FK user_id         │
│    password_hash │         │    filename        │
│    created_at    │         │    raw_text        │
│    role          │         │    upload_date     │
└──────────────────┘         │    file_path       │
                             └────────┬──────────┘
                                      │ 1
                                      │
                                      │ 1
                             ┌────────▼──────────┐
                             │    ANALYSIS        │
                             ├───────────────────┤
                             │ PK analysis_id     │
                             │ FK resume_id       │
                             │    ats_score       │
                             │    skills_json     │
                             │    gaps_json       │
                             │    role_pred_json  │
                             │    created_at      │
                             └────────┬──────────┘
                                      │ 1
                                      │ N
                             ┌────────▼──────────┐
                             │ INTERVIEW_SESSIONS │
                             ├───────────────────┤
                             │ PK session_id      │
                             │ FK user_id         │
                             │ FK analysis_id     │
                             │    target_role     │
                             │    started_at      │
                             │    overall_score   │
                             └────────┬──────────┘
                                      │ 1
                                      │ N
                             ┌────────▼──────────┐
                             │  INTERVIEW_Q&A     │
                             ├───────────────────┤
                             │ PK qa_id           │
                             │ FK session_id      │
                             │    question_text   │
                             │    user_answer     │
                             │    ideal_answer    │
                             │    similarity_score│
                             │    llm_feedback    │
                             └───────────────────┘
```

---

## 3. DATA FLOW DIAGRAM (DFD)

```
                   LEVEL 0 — CONTEXT DIAGRAM
┌──────────┐   Resume/Input   ┌────────────────────┐   Report/Feedback
│Job Seeker│─────────────────▶│                    │──────────────────▶ Job Seeker
│          │◀─────────────────│  AI CAREER COPILOT │
└──────────┘  Score & Feedback│      SYSTEM        │
                              └────────────────────┘

─────────────────────────────────────────────────────────────────────────

                   LEVEL 1 — SYSTEM DFD

  [Job Seeker]
       │
       │ (1) Resume PDF / Credentials
       ▼
  ┌─────────────────────────────┐
  │  1.0  AUTH & UPLOAD SERVICE │──────── D1: Users DB
  └───────────────┬─────────────┘
                  │ (2) Raw PDF bytes
                  ▼
  ┌─────────────────────────────┐
  │  2.0  NLP PROCESSING ENGINE │
  │   2.1 PDF Parser            │
  │   2.2 spaCy NER             │──────── D2: Skill Ontology
  │   2.3 BERT Embeddings       │
  │   2.4 Role Classifier       │
  └───────────────┬─────────────┘
                  │ (3) Skills JSON + Role Prediction
                  ▼
  ┌─────────────────────────────┐
  │  3.0  SCORING & GAP ENGINE  │──────── D3: Analysis DB
  │   3.1 ATS Score Calculator  │
  │   3.2 Gap Analyzer          │
  └───────────────┬─────────────┘
                  │ (4) Analysis Results
                  ▼
  ┌─────────────────────────────┐
  │  4.0  LLM INTERVIEW ENGINE  │──────── D4: Sessions DB
  │   4.1 Question Generator    │──────── [Ollama/Llama 3.2]
  │   4.2 Answer Evaluator      │
  │   4.3 Feedback Generator    │
  └───────────────┬─────────────┘
                  │ (5) Feedback + Score
                  ▼
  ┌─────────────────────────────┐
  │  5.0  REPORT GENERATOR      │──────── D5: Reports Storage
  └─────────────────────────────┘
                  │
                  ▼
          [Job Seeker] ← PDF Report / Dashboard
```

---

## 4. SEQUENCE DIAGRAM

```
  User         Streamlit UI      FastAPI          NLP Engine        Ollama LLM        Database
   │               │               │                  │                 │                │
   │──Upload PDF──▶│               │                  │                 │                │
   │               │──POST /resume/upload─────────────▶                 │                │
   │               │               │──parse_pdf()────▶│                 │                │
   │               │               │◀─raw_text────────│                 │                │
   │               │               │──extract_skills()▶                 │                │
   │               │               │◀─skills_json─────│                 │                │
   │               │               │──score_ats()─────▶                 │                │
   │               │               │◀─ats_score────────│                 │                │
   │               │               │──save_analysis()──────────────────────────────────▶│
   │               │               │◀──analysis_id─────────────────────────────────────│
   │               │◀─analysis_json│               │                  │                │
   │◀─Dashboard────│               │                  │                 │                │
   │               │               │                  │                 │                │
   │──Start Interview──────────────▶                  │                 │                │
   │               │──POST /interview/start───────────────────────────▶│                │
   │               │               │                  │──gen_questions()▶               │
   │               │               │◀──questions_json──────────────────│                │
   │               │◀─Questions────│               │                  │                │
   │──Submit Answer────────────────▶                  │                 │                │
   │               │──POST /interview/answer──────────────────────────▶│                │
   │               │               │                  │──eval + feedback▶               │
   │               │               │◀──feedback_json───────────────────│                │
   │               │               │──save_session()───────────────────────────────────▶│
   │◀─Feedback─────│◀─feedback─────│               │                  │                │
```

---

## 5. ACTIVITY DIAGRAM

```
START
  │
  ▼
[User Registers / Logs In]
  │
  ▼
[Upload Resume (PDF/DOCX)]
  │
  ▼
[Validate File Format & Size]
  │
  ├── INVALID ──▶ [Return Error to User] ──▶ END
  │
  ▼ VALID
[Extract Raw Text via PyMuPDF]
  │
  ▼
[Preprocess: NER, Tokenize, Clean]
  │
  ▼
[Extract Skills via DistilBERT + Skill Ontology]
  │
  ▼
[Predict Job Role via Cosine Similarity / Random Forest]
  │
  ▼
[Calculate ATS Score (0–100)]
  │
  ▼
[Run Gap Analysis: Candidate Skills vs Role Requirements]
  │
  ▼
[Persist Analysis to Database]
  │
  ▼
[Display Dashboard: Score + Radar Chart + Gap List]
  │
  ▼
[User Initiates Interview Coach?]
  │
  ├── NO ──▶ [Download Report] ──▶ END
  │
  ▼ YES
[LLM Generates Role-Specific Questions via Ollama]
  │
  ▼
[User Submits Answer]
  │
  ▼
[Semantic Similarity Score + LLM Feedback Generated]
  │
  ▼
[Store Session Results]
  │
  ▼
[More Questions?]
  │
  ├── YES ──▶ [Loop: Next Question]
  │
  ▼ NO
[Display Interview Summary + Improvement Tips]
  │
  ▼
[Export PDF Report]
  │
  ▼
END
```

---

## 6. DEPLOYMENT DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ENVIRONMENT                            │
│                                                                          │
│  ┌───────────────────────────┐    ┌──────────────────────────────────┐   │
│  │     CLIENT TIER           │    │        SERVER TIER (Railway)     │   │
│  │                           │    │                                  │   │
│  │  ┌─────────────────────┐  │    │  ┌────────────────────────────┐  │   │
│  │  │  Streamlit Frontend │  │    │  │  FastAPI Container         │  │   │
│  │  │  (Vercel CDN)       │  │    │  │  - Auth Service             │  │   │
│  │  │  Port: 443 (HTTPS)  │◀─┼────┼─▶│  - Resume Service          │  │   │
│  │  └─────────────────────┘  │    │  │  - Interview Coach Service  │  │   │
│  │                           │    │  │  Port: 8000                 │  │   │
│  │  Browser / Mobile App     │    │  └────────────┬───────────────┘  │   │
│  └───────────────────────────┘    │               │                  │   │
│                                   │  ┌────────────▼───────────────┐  │   │
│                                   │  │  AI/ML Engine Container    │  │   │
│                                   │  │  - spaCy / DistilBERT      │  │   │
│                                   │  │  - PyMuPDF Parser          │  │   │
│                                   │  │  - Sklearn Classifier      │  │   │
│                                   │  └────────────┬───────────────┘  │   │
│                                   │               │                  │   │
│                                   │  ┌────────────▼───────────────┐  │   │
│                                   │  │  Ollama LLM Container      │  │   │
│                                   │  │  Model: Llama 3.2 (3B)     │  │   │
│                                   │  │  Port: 11434               │  │   │
│                                   │  │  Fallback: Groq API        │  │   │
│                                   │  └────────────┬───────────────┘  │   │
│                                   │               │                  │   │
│                                   │  ┌────────────▼───────────────┐  │   │
│                                   │  │  Data Layer                │  │   │
│                                   │  │  PostgreSQL (Railway)      │  │   │
│                                   │  │  Redis Cache               │  │   │
│                                   │  │  File Volume (/uploads/)   │  │   │
│                                   │  └───────────────────────────┘  │   │
│                                   └──────────────────────────────────┘   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                     MONITORING & OPS LAYER                         │  │
│  │  GitHub Actions CI/CD │ Uptime Monitor │ Error Alerts │ Log Drain  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. MASTER SYSTEM ARCHITECTURE (Full Stack View)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      STREAMLIT FRONTEND LAYER                            │
│   Auth Pages │ Resume Upload │ Analysis Dashboard │ Interview Coach      │
│   Charts: ATS Gauge │ Skill Radar │ Interview Bar Chart │ Progress View  │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │ HTTPS REST
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      FASTAPI SERVICE LAYER                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐    │
│  │  Auth Service   │  │  Resume Service  │  │  Interview Service   │    │
│  │  POST /register │  │  POST /upload    │  │  POST /start         │    │
│  │  POST /login    │  │  GET  /analysis  │  │  POST /answer        │    │
│  │  JWT / OAuth    │  │  GET  /report    │  │  GET  /feedback      │    │
│  └─────────────────┘  └──────────────────┘  └──────────────────────┘    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
┌──────────────────┐     ┌──────────────────────┐    ┌────────────────────┐
│   NLP ENGINE     │     │   AGENT LAYER         │    │   LLM LAYER        │
│                  │     │                       │    │                    │
│  PyMuPDF Parser  │     │  ResumeAnalysisAgent  │    │  Ollama (Local)    │
│  spaCy NER       │────▶│  InterviewCoachAgent  │───▶│  Llama 3.2 (3B)   │
│  DistilBERT      │     │  FeedbackGenAgent     │    │                    │
│  Sklearn RF      │     │  ReportBuildAgent     │    │  Groq API Fallback │
└──────────────────┘     └──────────────────────┘    └────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
┌──────────────────┐     ┌──────────────────────┐    ┌────────────────────┐
│   STORAGE LAYER  │     │   VECTOR DB LAYER     │    │   MONITORING       │
│                  │     │                       │    │                    │
│  PostgreSQL      │     │  ChromaDB / FAISS     │    │  Uptime Robot      │
│  Redis Cache     │     │  Skill Embeddings     │    │  GitHub Actions    │
│  File System     │     │  Role Embeddings      │    │  Log Drain         │
│  (/uploads/)     │     │  Job Description Idx  │    │  Error Alerts      │
└──────────────────┘     └──────────────────────┘    └────────────────────┘
```

---

*CTO Architecture Document | AI Career Copilot — Team 1 | Version 1.0 | Waterfall SDLC*
