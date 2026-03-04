from sqlalchemy import Column, Integer, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base


class AnalysisResult(Base):
    __tablename__ = "analysis"
    analysis_id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.resume_id", ondelete="CASCADE"), index=True)
    ats_score = Column(Float)
    skills_json = Column(JSON)                  # List[{skill, score}]
    role_pred_json = Column(JSON)               # List[{role, score}]
    gaps_json = Column(JSON)                    # List[str]
    rewrite_suggestions_json = Column(JSON, nullable=True)  # List[{section, severity, current, improved, reason}]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    resume = relationship("Resume", back_populates="analysis_results")
    interview_sessions = relationship(
        "InterviewSession",
        back_populates="analysis",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
