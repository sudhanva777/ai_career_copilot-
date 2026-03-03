from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any

class ResumeOut(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class AnalysisOut(BaseModel):
    analysis_id: int
    ats_score: float
    extracted_skills: List[str]
    predicted_roles: List[Dict[str, Any]]
    gap_skills: List[str]
