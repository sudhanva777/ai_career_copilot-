from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.config import settings
from app.core.limiter import limiter

app = FastAPI(
    title="AI Career Copilot API",
    version="1.0.0",
    description="AI-powered resume analysis and interview coaching"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from slowapi.middleware import SlowAPIMiddleware
app.add_middleware(SlowAPIMiddleware)

# startup checks
if settings.SECRET_KEY is None or settings.SECRET_KEY.startswith("dev-"):
    raise RuntimeError("SECRET_KEY must be set in production")

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,   # from env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────
from app.api.v1 import auth, resume, interview
from app.models import Base
from app.db.session import engine

Base.metadata.create_all(bind=engine)

app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Auth"])
app.include_router(resume.router,    prefix="/api/v1/resume",    tags=["Resume"])
app.include_router(interview.router, prefix="/api/v1/interview", tags=["Interview"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-career-copilot"}
