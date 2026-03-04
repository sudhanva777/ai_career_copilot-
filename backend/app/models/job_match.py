from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base


class JobMatch(Base):
    __tablename__ = "job_matches"
    match_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True, nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.resume_id", ondelete="CASCADE"), index=True, nullable=False)
    jd_text = Column(Text, nullable=True)
    jd_source = Column(String, nullable=True)           # "paste" or the URL
    match_score = Column(Float, nullable=True)
    matched_skills_json = Column(JSON, nullable=True)   # List[str]
    missing_skills_json = Column(JSON, nullable=True)   # List[str]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    resume = relationship("Resume")
