"""
Integration test suite for AI Career Copilot API.

Run with:
    cd backend
    pytest tests/test_integration.py -v

Requirements:
    - ENVIRONMENT=test (set automatically below via monkeypatch)
    - Tests use an in-memory SQLite DB (no external services required)
    - Ollama calls are mocked
"""

import io
import json
import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport


# ── Override config BEFORE importing the app ─────────────────────────────────
import os
os.environ.setdefault("SECRET_KEY", "a" * 32)  # exactly 32 chars — passes validation
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_integration.db")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("OLLAMA_BASE_URL", "http://localhost:11434")
os.environ.setdefault("UPLOAD_DIR", "/tmp/test_uploads")

from app.main import app  # noqa: E402 — must come after env overrides
from app.db.session import engine, SessionLocal  # noqa: E402
from app.models import Base  # noqa: E402


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once for the test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()  # release all connections (required on Windows to delete the file)
    # Clean up test DB file
    import os
    try:
        os.remove("test_integration.db")
    except (FileNotFoundError, PermissionError):
        pass


@pytest_asyncio.fixture
async def client():
    """Async HTTPX client wired directly to the ASGI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
def pdf_bytes():
    """Minimal valid PDF binary."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R"
        b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        b"4 0 obj<</Length 44>>stream\n"
        b"BT /F1 12 Tf 100 700 Td "
        b"(Python Java SQL Docker AWS React) Tj ET\n"
        b"endstream endobj\n"
        b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        b"xref\n0 6\n"
        b"0000000000 65535 f\r\n"
        b"0000000009 00000 n\r\n"
        b"0000000058 00000 n\r\n"
        b"0000000115 00000 n\r\n"
        b"0000000266 00000 n\r\n"
        b"0000000360 00000 n\r\n"
        b"trailer<</Size 6/Root 1 0 R>>\n"
        b"startxref\n430\n%%EOF\n"
    )


# ────────────────────────────────────────────────────────────────────────────
# PHASE 7.1 — Health check
# ────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_returns_200_with_status(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "db" in data
    assert "ollama" in data
    assert "nlp" in data


# ────────────────────────────────────────────────────────────────────────────
# PHASE 7.2 — Auth flow: register → login → me → logout → me (401)
# ────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_full_auth_flow(client):
    # 1. Register
    resp = await client.post("/api/v1/auth/register", json={
        "name": "Test User",
        "email": "authflow@example.com",
        "password": "StrongPass1!",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "authflow@example.com"

    # 2. Login — check cookie is set
    resp = await client.post("/api/v1/auth/login", json={
        "email": "authflow@example.com",
        "password": "StrongPass1!",
    })
    assert resp.status_code == 200
    assert "session" in resp.cookies, "session cookie must be set after login"

    # 3. /me returns user data
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    me = resp.json()
    assert me["email"] == "authflow@example.com"
    assert "id" in me

    # 4. Logout clears cookie
    resp = await client.post("/api/v1/auth/logout")
    assert resp.status_code == 200
    # After logout cookie should be cleared (max_age=0)
    cookie = resp.cookies.get("session")
    assert cookie is None or cookie == ""

    # 5. /me after logout → 401
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"name": "Dup", "email": "dup@example.com", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_password_too_short(client):
    resp = await client.post("/api/v1/auth/register", json={
        "name": "Short", "email": "short@example.com", "password": "abc",
    })
    assert resp.status_code == 422  # Pydantic validation


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/v1/auth/register", json={
        "name": "Bad", "email": "badpass@example.com", "password": "correct_horse",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "badpass@example.com",
        "password": "wrong_password",
    })
    assert resp.status_code == 401


# ────────────────────────────────────────────────────────────────────────────
# Helper: register + login and return a client with cookie set
# ────────────────────────────────────────────────────────────────────────────

async def _authed_client(client, email="resume_user@example.com"):
    await client.post("/api/v1/auth/register", json={
        "name": "Resume User", "email": email, "password": "password123",
    })
    await client.post("/api/v1/auth/login", json={
        "email": email, "password": "password123",
    })
    return client


# ────────────────────────────────────────────────────────────────────────────
# PHASE 7.3 — Resume flow
# ────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_resume_upload_and_analysis(client, pdf_bytes):
    await _authed_client(client, "upload_ok@example.com")

    # Mock text extraction so we don't need a real PDF parser
    with (
        patch("app.api.v1.resume.extract_text", return_value=(
            "Python Java SQL Docker AWS React Machine Learning Pandas NumPy Spark "
            * 10  # > 50 chars
        )),
        patch("app.api.v1.resume.asyncio.to_thread", new=AsyncMock(side_effect=lambda fn, *a, **kw: fn(*a, **kw))),
    ):
        resp = await client.post(
            "/api/v1/resume/upload",
            files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
        )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert "resume_id" in body
    resume_id = body["resume_id"]

    # Get analysis
    resp = await client.get(f"/api/v1/resume/analysis/{resume_id}")
    assert resp.status_code == 200
    analysis = resp.json()
    assert "analysis_id" in analysis
    assert "ats_score" in analysis
    assert isinstance(analysis["extracted_skills"], list)
    assert isinstance(analysis["predicted_roles"], list)
    assert isinstance(analysis["gap_skills"], list)


# ────────────────────────────────────────────────────────────────────────────
# PHASE 7.4 — Resume validation edge cases
# ────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_invalid_extension(client):
    await _authed_client(client, "inv_ext@example.com")
    resp = await client.post(
        "/api/v1/resume/upload",
        files={"file": ("malware.exe", b"MZ\x90\x00", "application/octet-stream")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_file_too_large(client):
    await _authed_client(client, "too_large@example.com")
    big_file = b"%PDF" + b"x" * (5 * 1024 * 1024 + 1)
    resp = await client.post(
        "/api/v1/resume/upload",
        files={"file": ("big.pdf", big_file, "application/pdf")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_empty_file(client):
    await _authed_client(client, "empty_file@example.com")
    resp = await client.post(
        "/api/v1/resume/upload",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_wrong_magic_bytes(client, pdf_bytes):
    """File extension says PDF but magic bytes are wrong — should be rejected."""
    await _authed_client(client, "magic_mismatch@example.com")
    resp = await client.post(
        "/api/v1/resume/upload",
        files={"file": ("fake.pdf", b"PK\x03\x04" + b"notreallyadocx", "application/pdf")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_scanned_pdf_rejected(client, pdf_bytes):
    """PDF that extracts < 50 chars of text should return 422."""
    await _authed_client(client, "scanned@example.com")
    with (
        patch("app.api.v1.resume.extract_text", return_value=""),
        patch("app.api.v1.resume.asyncio.to_thread", new=AsyncMock(side_effect=lambda fn, *a, **kw: fn(*a, **kw))),
    ):
        resp = await client.post(
            "/api/v1/resume/upload",
            files={"file": ("scanned.pdf", pdf_bytes, "application/pdf")},
        )
    assert resp.status_code == 422


# ────────────────────────────────────────────────────────────────────────────
# PHASE 7.5 — Interview flow
# ────────────────────────────────────────────────────────────────────────────

MOCK_QUESTIONS = [
    {"id": 1, "text": "What is your strongest Python skill?"},
    {"id": 2, "text": "Describe a challenging project."},
    {"id": 3, "text": "How do you handle deadlines?"},
    {"id": 4, "text": "What does good code quality mean?"},
    {"id": 5, "text": "Where do you see yourself in 3 years?"},
]

MOCK_EVALUATION = {
    "score": 7.5,
    "feedback": "Good answer with clear examples.",
    "ideal_answer": "An ideal answer would include STAR format.",
    "ai_available": True,
}


@pytest.mark.asyncio
async def test_interview_full_flow(client, pdf_bytes):
    email = "interview_full@example.com"
    await _authed_client(client, email)

    # Upload a resume first
    with (
        patch("app.api.v1.resume.extract_text", return_value="Python SQL Docker AWS React " * 20),
        patch("app.api.v1.resume.asyncio.to_thread", new=AsyncMock(side_effect=lambda fn, *a, **kw: fn(*a, **kw))),
    ):
        up = await client.post(
            "/api/v1/resume/upload",
            files={"file": ("cv.pdf", pdf_bytes, "application/pdf")},
        )
    assert up.status_code == 201
    resume_id = up.json()["resume_id"]

    # Get analysis_id
    an = await client.get(f"/api/v1/resume/analysis/{resume_id}")
    analysis_id = an.json()["analysis_id"]

    # Start interview (mock Ollama)
    with patch("app.api.v1.interview.generate_questions", new=AsyncMock(return_value=MOCK_QUESTIONS)):
        start = await client.post("/api/v1/interview/start", json={
            "target_role": "Software Engineer",
            "analysis_id": analysis_id,
        })
    assert start.status_code == 200
    session_data = start.json()
    assert "session_id" in session_data
    assert len(session_data["questions"]) == 5

    session_id = session_data["session_id"]
    question_id = session_data["questions"][0]["id"]

    # Answer a question (mock Ollama)
    with patch("app.api.v1.interview.evaluate_answer", new=AsyncMock(return_value=MOCK_EVALUATION)):
        answer = await client.post("/api/v1/interview/answer", json={
            "session_id": session_id,
            "question_id": question_id,
            "answer": "I have 3 years of Python experience building microservices.",
        })
    assert answer.status_code == 200
    feedback = answer.json()
    assert "score" in feedback
    assert "feedback" in feedback
    assert "ideal_answer" in feedback


@pytest.mark.asyncio
async def test_answer_question_duplicate_rejected(client, pdf_bytes):
    """Answering the same question twice should return 409."""
    email = "dupe_answer@example.com"
    await _authed_client(client, email)

    with (
        patch("app.api.v1.resume.extract_text", return_value="Python SQL " * 20),
        patch("app.api.v1.resume.asyncio.to_thread", new=AsyncMock(side_effect=lambda fn, *a, **kw: fn(*a, **kw))),
    ):
        up = await client.post(
            "/api/v1/resume/upload",
            files={"file": ("cv.pdf", pdf_bytes, "application/pdf")},
        )
    resume_id = up.json()["resume_id"]
    an = await client.get(f"/api/v1/resume/analysis/{resume_id}")
    analysis_id = an.json()["analysis_id"]

    with patch("app.api.v1.interview.generate_questions", new=AsyncMock(return_value=MOCK_QUESTIONS)):
        start = await client.post("/api/v1/interview/start", json={
            "target_role": "Data Scientist",
            "analysis_id": analysis_id,
        })
    session_id = start.json()["session_id"]
    question_id = start.json()["questions"][0]["id"]

    answer_payload = {"session_id": session_id, "question_id": question_id, "answer": "First answer"}
    with patch("app.api.v1.interview.evaluate_answer", new=AsyncMock(return_value=MOCK_EVALUATION)):
        r1 = await client.post("/api/v1/interview/answer", json=answer_payload)
    assert r1.status_code == 200

    # Second identical submission
    with patch("app.api.v1.interview.evaluate_answer", new=AsyncMock(return_value=MOCK_EVALUATION)):
        r2 = await client.post("/api/v1/interview/answer", json=answer_payload)
    assert r2.status_code == 409


# ────────────────────────────────────────────────────────────────────────────
# PHASE 7.6 — Error cases
# ────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_analysis_nonexistent_resume(client):
    await _authed_client(client, "not_found@example.com")
    resp = await client.get("/api/v1/resume/analysis/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_start_interview_without_resume(client):
    """analysis_id that doesn't exist should still work (returns fallback questions)."""
    await _authed_client(client, "no_resume@example.com")
    with patch("app.api.v1.interview.generate_questions", new=AsyncMock(return_value=MOCK_QUESTIONS)):
        resp = await client.post("/api/v1/interview/start", json={
            "target_role": "Engineer",
            "analysis_id": 99999,
        })
    # Should succeed with fallback (no 500)
    assert resp.status_code in (200, 422)


@pytest.mark.asyncio
async def test_unauthenticated_access_to_resume_list(client):
    """Accessing protected route without cookie → 401."""
    # Use fresh client with no cookies
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as fresh:
        resp = await fresh.get("/api/v1/resume/list")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_interview_wrong_session_id(client):
    await _authed_client(client, "wrong_session@example.com")
    resp = await client.post("/api/v1/interview/answer", json={
        "session_id": 99999,
        "question_id": 1,
        "answer": "some answer",
    })
    assert resp.status_code == 404
