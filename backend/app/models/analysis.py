from sqlalchemy import Column, Integer, Float, JSON, DateTime, ForeignKey
from datetime import datetime
from app.models.base import Base

class AnalysisResult(Base):
    __tablename__ = "analysis"
    analysis_id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.resume_id", ondelete="CASCADE"), index=True)
    ats_score = Column(Float)
    skills_json = Column(JSON)      # List of strings
    role_pred_json = Column(JSON)   # List of {role, score}
    gaps_json = Column(JSON)        # List of strings
    created_at = Column(DateTime, default=datetime.utcnow)
