from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime

class AnalysisOutput(BaseModel):
    analysis_id: int
    ats_score: float
    extracted_skills: List[str]
    predicted_roles: List[Dict[str, float]]
    gap_skills: List[str]
    
    class Config:
        from_attributes = True
