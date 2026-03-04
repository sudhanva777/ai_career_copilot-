from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.api.deps import get_current_user_id
from app.services.file_service import save_upload_file
from app.services.ai.nlp_pipeline import analyze_resume
from app.services.ai.llm_coach import (
    generate_rewrite_suggestions,
    _fallback_rewrite_suggestions,
)
from app.models.resume import Resume
from app.models.analysis import AnalysisResult
from app.schemas.resume import ResumeOut, AnalysisOut, RewriteOut
from pydantic import BaseModel
from typing import List
import asyncio
import io
from pathlib import Path

router = APIRouter()

MAX_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
# Magic bytes for supported file types
MAGIC_BYTES = {
    ".pdf": b"%PDF",
    ".docx": b"PK\x03\x04",  # ZIP-based format (Office Open XML)
}


def _extract_text_pdf(file_path: str) -> str:
    """Try PyMuPDF first, fall back to pdfplumber on any failure."""
    # Attempt 1: PyMuPDF (fast, handles most PDFs)
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        if text.strip():
            return text
    except Exception:
        pass  # Fall through to pdfplumber

    # Attempt 2: pdfplumber (better for complex layouts)
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    except Exception:
        return ""


def extract_text(file_path: str, ext: str) -> str:
    """Extract raw text from PDF or DOCX, returning empty string on failure."""
    if ext == ".pdf":
        return _extract_text_pdf(file_path)

    if ext == ".docx":
        try:
            from docx import Document
            doc = Document(file_path)
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return ""

    return ""


@router.post("/upload", status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # ── Validate extension ────────────────────────────────────────
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, detail="Invalid file type. Only PDF and DOCX allowed.")

    # ── Validate MIME type (from Content-Type header) ─────────────
    if file.content_type not in ALLOWED_MIME_TYPES.values():
        raise HTTPException(400, detail="Invalid content type. Only PDF and DOCX are permitted.")

    # ── Read content ──────────────────────────────────────────────
    content = await file.read()

    # ── Validate size ─────────────────────────────────────────────
    if len(content) > MAX_SIZE:
        raise HTTPException(400, detail="File too large. Maximum 5MB allowed.")

    if len(content) == 0:
        raise HTTPException(400, detail="File is empty.")

    # ── Validate magic bytes (prevents spoofed Content-Type) ──────
    expected_magic = MAGIC_BYTES.get(ext, b"")
    if expected_magic and not content.startswith(expected_magic):
        raise HTTPException(
            400,
            detail="File content does not match the declared file type. Please upload a valid PDF or DOCX."
        )

    # ── Save file (UUID-only path — original name stored in DB) ───
    file_path = await save_upload_file(file.filename, content)

    # ── Extract text ──────────────────────────────────────────────
    try:
        raw_text = await asyncio.to_thread(extract_text, file_path, ext)
    except Exception:
        raw_text = ""

    if len(raw_text.strip()) < 50:
        raise HTTPException(
            422,
            detail=(
                "Could not extract enough text from this file. "
                "If this is a scanned PDF (image-only), please use a text-based PDF or DOCX."
            )
        )

    # ── Persist resume record first ───────────────────────────────
    resume = Resume(
        user_id=user_id,
        filename=file.filename,  # original name for display only
        raw_text=raw_text,
        file_path=file_path,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # ── Run NLP analysis ──────────────────────────────────────────
    try:
        analysis_data = await asyncio.to_thread(analyze_resume, raw_text)
    except Exception:
        # Analysis failed — still return the resume ID so user can retry
        raise HTTPException(
            500,
            detail="Resume saved but analysis failed. Please try re-uploading."
        )

    # ── Persist analysis ──────────────────────────────────────────
    analysis = AnalysisResult(
        resume_id=resume.resume_id,
        ats_score=analysis_data["ats_score"],
        skills_json=analysis_data["extracted_skills"],
        role_pred_json=analysis_data["predicted_roles"],
        gaps_json=analysis_data["gap_skills"],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "resume_id": resume.resume_id,
        "filename": resume.filename,
        "status": "processed"
    }


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Return all resume versions for the current user, ordered oldest-first,
    with ATS score, delta vs previous version, and version label (V1, V2, …).

    Response: List[{resume_id, filename, uploaded_at, ats_score, delta, version_label,
                     top_skills: List[str]}]
    """
    resumes = (
        db.query(Resume)
        .filter(Resume.user_id == user_id)
        .options(joinedload(Resume.analysis_results))
        .order_by(Resume.upload_date.asc())
        .all()
    )

    results = []
    prev_score = None
    prev_skills: set[str] = set()

    for idx, resume in enumerate(resumes):
        # Use already-loaded relationship to avoid N+1 queries
        analysis = resume.analysis_results[0] if resume.analysis_results else None

        ats_score = round(analysis.ats_score, 1) if analysis else None
        current_skills: set[str] = set()
        if analysis and analysis.skills_json:
            current_skills = {s["skill"] for s in analysis.skills_json if isinstance(s, dict)}

        delta = None
        if ats_score is not None and prev_score is not None:
            delta = round(ats_score - prev_score, 1)

        new_skills = sorted(current_skills - prev_skills)[:3]

        results.append({
            "resume_id": resume.resume_id,
            "filename": resume.filename,
            "uploaded_at": resume.upload_date.isoformat() if resume.upload_date else None,
            "ats_score": ats_score,
            "delta": delta,
            "version_label": f"V{idx + 1}",
            "new_skills": new_skills,  # up to 3 skills added vs previous version
        })

        if ats_score is not None:
            prev_score = ats_score
        prev_skills = current_skills

    return results


@router.get("/list", response_model=List[ResumeOut])
def list_resumes(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    resumes = db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.resume_id.desc()).all()
    return [
        {"id": r.resume_id, "filename": r.filename, "uploaded_at": r.upload_date}
        for r in resumes
    ]


@router.delete("/{resume_id}", status_code=204)
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    resume = db.query(Resume).filter(
        Resume.resume_id == resume_id,
        Resume.user_id == user_id
    ).first()
    if not resume:
        raise HTTPException(404, detail="Resume not found")

    # Delete associated analysis first (FK constraint)
    db.query(AnalysisResult).filter(
        AnalysisResult.resume_id == resume_id
    ).delete()
    db.delete(resume)
    db.commit()
    return None


@router.get("/analysis/{resume_id}", response_model=AnalysisOut)
def get_analysis(
    resume_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Verify resume belongs to this user
    resume = db.query(Resume).filter(
        Resume.resume_id == resume_id,
        Resume.user_id == user_id
    ).first()
    if not resume:
        raise HTTPException(404, detail="Resume not found")

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.resume_id == resume_id
    ).first()
    if not analysis:
        raise HTTPException(404, detail="Analysis not found for this resume")

    return {
        "analysis_id":      analysis.analysis_id,
        "resume_id":        analysis.resume_id,
        "ats_score":        analysis.ats_score,
        "extracted_skills": analysis.skills_json or [],     # List[{skill, score}]
        "predicted_roles":  analysis.role_pred_json or [],  # List[{role, score}]
        "gap_skills":       analysis.gaps_json or [],       # List[str]
    }


@router.post("/rewrite/{resume_id}", response_model=RewriteOut)
async def generate_rewrite(
    resume_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Generate and persist AI rewrite suggestions for a resume.

    Calls Ollama with the resume text and gap skills; falls back to
    template suggestions if Ollama is unavailable.
    """
    resume = db.query(Resume).filter(
        Resume.resume_id == resume_id,
        Resume.user_id == user_id,
    ).first()
    if not resume:
        raise HTTPException(404, detail="Resume not found")

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.resume_id == resume_id
    ).first()
    if not analysis:
        raise HTTPException(404, detail="Analysis not found — upload and analyse the resume first")

    gap_skills: list[str] = analysis.gaps_json or []
    ai_available = True

    try:
        suggestions = await generate_rewrite_suggestions(
            resume_text=resume.raw_text or "",
            gap_skills=gap_skills,
        )
    except RuntimeError:
        ai_available = False
        suggestions = _fallback_rewrite_suggestions(gap_skills)

    # Persist so GET /rewrite/{id} can return without re-calling Ollama
    analysis.rewrite_suggestions_json = [s for s in suggestions]
    db.commit()

    return {
        "resume_id": resume_id,
        "status": "ready",
        "suggestions": suggestions,
        "ai_available": ai_available,
    }


@router.get("/rewrite/{resume_id}")
def get_rewrite(
    resume_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Return previously generated rewrite suggestions for a resume.

    Returns HTTP 200 with status="not_generated" if suggestions have not
    been generated yet (avoids race-condition 404 on the frontend).
    Client should call POST /rewrite/{resume_id} to generate them.
    """
    resume = db.query(Resume).filter(
        Resume.resume_id == resume_id,
        Resume.user_id == user_id,
    ).first()
    if not resume:
        raise HTTPException(404, detail="Resume not found")

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.resume_id == resume_id
    ).first()
    if not analysis:
        raise HTTPException(404, detail="Analysis not found for this resume")

    if analysis.rewrite_suggestions_json is None:
        return JSONResponse(
            status_code=200,
            content={
                "resume_id": resume_id,
                "status": "not_generated",
                "suggestions": [],
                "ai_available": True,
            },
        )

    return {
        "resume_id": resume_id,
        "status": "ready",
        "suggestions": analysis.rewrite_suggestions_json,
        "ai_available": True,
    }


# ── Preview & Export helpers ───────────────────────────────────────────────

class PreviewRequest(BaseModel):
    applied_indices: List[int]


def _apply_suggestions(raw_text: str, suggestions: list, applied_indices: List[int]) -> str:
    text = raw_text
    for idx in applied_indices:
        if 0 <= idx < len(suggestions):
            s = suggestions[idx]
            current = s.get("current", "")
            improved = s.get("improved", "")
            if current and improved:
                text = text.replace(current, improved, 1)
    return text


def _generate_pdf(text: str) -> bytes:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_LEFT
    except ImportError:
        raise RuntimeError("reportlab is not installed")

    buffer = io.BytesIO()
    margin = 2 * cm
    page_width, _ = A4

    lines = text.split("\n")

    # Find first non-empty line as title (candidate name)
    title_line = ""
    body_start = 0
    for i, line in enumerate(lines):
        if line.strip():
            title_line = line.strip()
            body_start = i + 1
            break

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Times-Roman", 8)
        canvas.setFillGray(0.6)
        canvas.drawCentredString(page_width / 2, margin * 0.45, "Improved by AI Career Copilot")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,
        bottomMargin=margin,
    )

    title_style = ParagraphStyle("ResumeTitle", fontName="Times-Bold", fontSize=13, leading=16, spaceAfter=10, alignment=TA_LEFT)
    header_style = ParagraphStyle("SectionHeader", fontName="Times-Bold", fontSize=10, leading=14, spaceBefore=8, spaceAfter=2, alignment=TA_LEFT)
    body_style = ParagraphStyle("Body", fontName="Times-Roman", fontSize=10, leading=14, alignment=TA_LEFT)

    def esc(s: str) -> str:
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def is_section_header(line: str) -> bool:
        s = line.strip()
        return (
            bool(s)
            and s == s.upper()
            and any(c.isalpha() for c in s)
            and len(s) <= 60
        )

    story = []
    if title_line:
        story.append(Paragraph(esc(title_line), title_style))

    for line in lines[body_start:]:
        stripped = line.strip()
        if not stripped:
            story.append(Spacer(1, 6))
        elif is_section_header(stripped):
            story.append(Paragraph(esc(stripped), header_style))
        else:
            story.append(Paragraph(esc(stripped), body_style))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()


@router.post("/preview/{resume_id}")
def preview_updated_resume(
    resume_id: int,
    body: PreviewRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    resume = db.query(Resume).filter(
        Resume.resume_id == resume_id,
        Resume.user_id == user_id,
    ).first()
    if not resume:
        raise HTTPException(404, detail="Resume not found")

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.resume_id == resume_id
    ).first()
    if not analysis or analysis.rewrite_suggestions_json is None:
        raise HTTPException(404, detail="No rewrite suggestions found")

    preview_text = _apply_suggestions(
        resume.raw_text or "",
        analysis.rewrite_suggestions_json,
        body.applied_indices,
    )
    return {"preview_text": preview_text}


@router.get("/export-updated/{resume_id}")
def export_updated_resume(
    resume_id: int,
    applied_ids: str = Query(default=""),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    resume = db.query(Resume).filter(
        Resume.resume_id == resume_id,
        Resume.user_id == user_id,
    ).first()
    if not resume:
        raise HTTPException(404, detail="Resume not found")

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.resume_id == resume_id
    ).first()
    if not analysis or analysis.rewrite_suggestions_json is None:
        raise HTTPException(404, detail="No rewrite suggestions found")

    applied_indices: List[int] = []
    if applied_ids.strip():
        try:
            applied_indices = [int(x.strip()) for x in applied_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(400, detail="Invalid applied_ids format — use comma-separated integers")

    updated_text = _apply_suggestions(
        resume.raw_text or "",
        analysis.rewrite_suggestions_json,
        applied_indices,
    )

    try:
        pdf_bytes = _generate_pdf(updated_text)
    except RuntimeError:
        raise HTTPException(503, detail="PDF generation unavailable — reportlab not installed")
    except Exception:
        raise HTTPException(500, detail="PDF generation failed")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="updated_resume.pdf"'},
    )
