import os
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.config import settings
from app.core.limiter import limiter


# ── Secret key validation (must be >= 32 chars, not a dev key) ────
if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
    raise RuntimeError(
        "SECRET_KEY must be at least 32 characters. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────
    # Ensure upload directory exists
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "resumes"), exist_ok=True)
    yield
    # ── Shutdown ──────────────────────────────────────────────────
    from app.db.session import engine
    engine.dispose()


app = FastAPI(
    title="AI Career Copilot API",
    version="1.0.0",
    description="AI-powered resume analysis and interview coaching",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from slowapi.middleware import SlowAPIMiddleware
app.add_middleware(SlowAPIMiddleware)

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,  # Cache preflight for 24 hours — reduces OPTIONS round-trips
)

# ── Routers ───────────────────────────────────────────────────────
from app.api.v1 import auth, resume, interview, jobs, dashboard
from app.models import Base
from app.db.session import engine

Base.metadata.create_all(bind=engine)

app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Auth"])
app.include_router(resume.router,    prefix="/api/v1/resume",    tags=["Resume"])
app.include_router(interview.router, prefix="/api/v1/interview", tags=["Interview"])
app.include_router(jobs.router,      prefix="/api/v1/jobs",      tags=["Jobs"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])


@app.get("/health")
async def health():
    """Deep health check — verifies DB and Ollama reachability."""
    status = {"status": "ok", "service": "ai-career-copilot"}

    # ── Check DB ─────────────────────────────────────────────────
    try:
        from app.db.session import SessionLocal
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        status["db"] = "ok"
    except Exception:
        status["db"] = "error"
        status["status"] = "degraded"

    # ── Check Ollama ─────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            status["ollama"] = "ok" if r.status_code == 200 else f"http {r.status_code}"
            if r.status_code != 200:
                status["status"] = "degraded"
    except Exception:
        status["ollama"] = "error"
        status["status"] = "degraded"

    # ── Check NLP ────────────────────────────────────────────────
    try:
        from app.services.ai.nlp_pipeline import nlp
        status["nlp"] = "ok" if nlp else "not loaded"
    except Exception:
        status["nlp"] = "error"
        status["status"] = "degraded"

    return status
