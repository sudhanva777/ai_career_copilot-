from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user_id
from app.services.file_service import save_upload_file
from app.services.ai.nlp_pipeline import analyze_resume
from app.models.resume import Resume
from app.models.analysis import AnalysisResult
from app.schemas.resume import ResumeOut, AnalysisOut
from typing import List
import os
from pathlib import Path

router = APIRouter()

MAX_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

def extract_text(file_path: str, ext: str) -> str:
    """Extract raw text from PDF or DOCX."""
    if ext == ".pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            return "\n".join(page.get_text() for page in doc)
        except ImportError:
            # Fallback to pdfplumber
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                return "\n".join(p.extract_text() or "" for p in pdf.pages)

    elif ext == ".docx":
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)

    return ""

@router.post("/upload", status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, detail="Invalid file type. Only PDF and DOCX allowed.")
    
    # Validate MIME type
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(400, detail="Invalid content type. Only PDF and DOCX are permitted.")

    # Read and validate size (Max 5MB)
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, detail="File too large. Maximum 5MB allowed.")

    # Save file
    file_path = await save_upload_file(file.filename, content)

    # Extract text + analyze (Run CPU-heavy tasks in a separate thread)
    try:
        import asyncio
        raw_text = await asyncio.to_thread(extract_text, file_path, ext)
        analysis_data = await asyncio.to_thread(analyze_resume, raw_text)
    except Exception as tuple_err:
        raise HTTPException(500, detail="Failed to process document")

    # Persist resume
    resume = Resume(
        user_id=user_id,
        filename=file.filename,
        raw_text=raw_text,
        file_path=file_path,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    # Persist analysis
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


@router.get("/list", response_model=List[ResumeOut])
def list_resumes(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    resumes = db.query(Resume).filter(Resume.user_id == user_id).all()
    # Return field 'id' (not resume_id) to match frontend contract
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
    return None   # 204 No Content


@router.get("/analysis/{resume_id}", response_model=AnalysisOut)
def get_analysis(
    resume_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Verify resume belongs to user
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
        "analysis_id":       analysis.analysis_id,
        "ats_score":         analysis.ats_score,
        "extracted_skills":  analysis.skills_json or [],
        "predicted_roles":   analysis.role_pred_json or [],
        "gap_skills":        analysis.gaps_json or [],
    }
