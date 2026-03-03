# Low-Level Design (LLD) - AI Career Copilot

## 1. Directory Structure

### Backend (FastAPI)
```
/backend
├── app/
│   ├── api/                # API router and endpoints
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── resume.py
│   │   │   ├── interview.py
│   │   │   └── reports.py
│   ├── core/               # Configuration and security
│   │   ├── config.py
│   │   └── security.py
│   ├── models/             # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── resume.py
│   │   ├── analysis.py
│   │   └── interview.py
│   ├── schemas/            # Pydantic data validation schemas
│   │   ├── user.py
│   │   ├── resume.py
│   │   ├── analysis.py
│   │   └── interview.py
│   ├── services/           # Business logic and external integrations
│   │   ├── ai/             # NLP and LLM logic
│   │   │   ├── agents/     # Agent Layer
│   │   │   │   ├── resume_agent.py
│   │   │   │   ├── coach_agent.py
│   │   │   │   └── report_agent.py
│   │   │   ├── nlp_pipeline.py
│   │   │   ├── llm_coach.py
│   │   │   └── scorer.py
│   │   ├── vector_db/      # Vector DB Layer (ChromaDB/FAISS)
│   │   │   ├── embeddings.py
│   │   │   └── store.py
│   │   ├── file_service.py
│   │   └── auth_service.py
│   ├── utils/              # Helper functions
│   │   ├── pdf_utils.py
│   │   └── logger.py
│   └── main.py             # Entry point
├── tests/
├── requirements.txt
└── Dockerfile
```

### Frontend (React + Vite)
```
/frontend
├── src/
│   ├── api/                # Axios client and API calls
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Layout, Navbar, Sidebar
│   │   ├── dashboard/      # Gauges, Charts
│   │   └── interview/      # Chat interface
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   └── InterviewCoach.jsx
│   ├── store/              # State management (Zustand/Redux)
│   ├── styles/             # Tailwind CSS global styles
│   └── App.jsx
├── public/
├── tailwind.config.js
└── package.json
```

## 2. Responsibilities

*   **api/**: Responsible for routing incoming requests, performing basic validation, and returning JSON responses.
*   **services/**: Contains the core business logic. It orchestrates database operations and AI engine calls.
*   **models/**: Defines the database schema using SQLAlchemy.
*   **ai/**: Encapsulates all NLP (spaCy, BERT) and LLM (Ollama) logic.
*   **utils/**: General-purpose utilities like PDF extraction and logging.

## 3. Data Flow

1.  **Frontend** sends a POST request with a resume file to `/resume/upload`.
2.  **API** receives the file and passes it to `file_service`.
3.  `file_service` saves the file and triggers the `nlp_pipeline` in the **AI engine**.
4.  `nlp_pipeline` extracts text, identifies skills, and calculates the ATS score using `scorer`.
5.  Results are saved to the **database** via `models`.
6.  **API** returns the `analysis_id` to the frontend.
7.  **Frontend** fetches the results using `/resume/analysis/{id}` and displays them.
