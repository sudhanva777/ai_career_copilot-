from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, model_validator, HttpUrl
from typing import Optional
import httpx
from urllib.parse import urlparse

from app.db.session import get_db
from app.api.deps import get_current_user_id
from app.models.resume import Resume
from app.models.analysis import AnalysisResult
from app.models.job_match import JobMatch
from app.services.ai.nlp_pipeline import extract_jd_skills, compare_resume_to_jd

router = APIRouter()

_URL_FETCH_TIMEOUT = 15.0
_MAX_JD_CHARS = 10_000   # truncate very long job descriptions
_ALLOWED_SCHEMES = {"http", "https"}


# ── Request / response schemas ─────────────────────────────────────────────

class JobMatchRequest(BaseModel):
    resume_id: int
    jd_text: Optional[str] = None
    jd_url: Optional[str] = None

    @model_validator(mode="after")
    def check_jd_provided(self):
        if not self.jd_text and not self.jd_url:
            raise ValueError("Provide either jd_text or jd_url.")
        if self.jd_url:
            parsed = urlparse(self.jd_url)
            if parsed.scheme not in _ALLOWED_SCHEMES:
                raise ValueError("URL must use http or https scheme.")
            if not parsed.netloc:
                raise ValueError("URL must include a valid hostname.")
        return self


# ── URL helper ─────────────────────────────────────────────────────────────

async def _fetch_jd_from_url(url: str) -> str:
    """Fetch a URL and extract visible text, stripping all HTML."""
    try:
        async with httpx.AsyncClient(
            timeout=_URL_FETCH_TIMEOUT,
            follow_redirects=True,
        ) as client:
            response = await client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; CareerCopilot/1.0)"},
            )
    except httpx.ConnectError:
        raise HTTPException(
            400,
            detail="Could not connect to the URL. Please paste the job description text directly.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            400,
            detail="URL request timed out. Please paste the job description text directly.",
        )

    if response.status_code != 200:
        raise HTTPException(
            400,
            detail=f"URL returned HTTP {response.status_code}. Please paste the job description text directly.",
        )

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        raise HTTPException(
            500,
            detail="HTML parsing library not available. Please paste the job description text directly.",
        )

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    lines = [line.strip() for line in soup.get_text(separator="\n").splitlines() if line.strip()]
    return "\n".join(lines)[:_MAX_JD_CHARS]


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/match")
async def match_job(
    payload: JobMatchRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Match a resume against a job description (pasted text or URL).

    Extracts skills from the JD using the NLP pipeline, compares against the
    resume's stored extracted skills, persists the result, and returns it.
    """
    # Verify the resume belongs to this user
    resume = db.query(Resume).filter(
        Resume.resume_id == payload.resume_id,
        Resume.user_id == user_id,
    ).first()
    if not resume:
        raise HTTPException(404, detail="Resume not found")

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.resume_id == payload.resume_id
    ).first()
    if not analysis:
        raise HTTPException(
            404,
            detail="No analysis found for this resume. Upload and analyse it first.",
        )

    # Resolve JD text
    if payload.jd_url:
        jd_text = await _fetch_jd_from_url(payload.jd_url)
        jd_source = payload.jd_url
    else:
        jd_text = payload.jd_text.strip()
        jd_source = "paste"

    if len(jd_text) < 20:
        raise HTTPException(400, detail="Job description is too short to analyse.")

    # Extract skills from JD
    jd_skills = extract_jd_skills(jd_text)

    # Pull resume skill names from stored analysis
    resume_skill_names: list[str] = [
        s["skill"] for s in (analysis.skills_json or [])
        if isinstance(s, dict) and "skill" in s
    ]

    # Compare
    result = compare_resume_to_jd(resume_skill_names, jd_skills)

    # Persist
    match = JobMatch(
        user_id=user_id,
        resume_id=payload.resume_id,
        jd_text=jd_text,
        jd_source=jd_source,
        match_score=result["match_score"],
        matched_skills_json=result["matched_skills"],
        missing_skills_json=result["missing_skills"],
    )
    db.add(match)
    db.commit()
    db.refresh(match)

    return {
        "match_id": match.match_id,
        "match_score": match.match_score,
        "matched_skills": match.matched_skills_json,
        "missing_skills": match.missing_skills_json,
        "jd_source": match.jd_source,
        "created_at": match.created_at.isoformat(),
    }


@router.get("/matches")
def list_matches(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Return all past JD matches for the current user, newest first."""
    matches = (
        db.query(JobMatch)
        .filter(JobMatch.user_id == user_id)
        .order_by(JobMatch.created_at.desc())
        .all()
    )

    results = []
    for m in matches:
        # Build a short preview: first non-empty line of the JD, capped at 80 chars
        preview = ""
        if m.jd_text:
            first_line = next(
                (line.strip() for line in m.jd_text.splitlines() if line.strip()),
                "",
            )
            preview = first_line[:80] + ("…" if len(first_line) > 80 else "")

        results.append({
            "match_id": m.match_id,
            "resume_id": m.resume_id,
            "match_score": m.match_score,
            "matched_skills": m.matched_skills_json or [],
            "missing_skills": m.missing_skills_json or [],
            "jd_source": m.jd_source,
            "jd_preview": preview,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    return results
