from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any, Optional


class ResumeOut(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class SkillOut(BaseModel):
    skill: str
    score: float


class AnalysisOut(BaseModel):
    analysis_id: int
    resume_id: int
    ats_score: float
    extracted_skills: List[SkillOut]   # list of {skill, score} objects
    predicted_roles: List[Dict[str, Any]]
    gap_skills: List[str]


class RewriteSuggestion(BaseModel):
    section: str        # Summary | Skills | Experience | Projects | Education
    severity: str       # high | medium | low
    current: str        # existing text or "Not present"
    improved: str       # ready-to-paste improved text
    reason: str         # one-line explanation


class RewriteOut(BaseModel):
    resume_id: int
    status: str = "ready"               # "ready" | "not_generated"
    suggestions: List[RewriteSuggestion]
    ai_available: bool = True
