from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base


class Resume(Base):
    __tablename__ = "resumes"
    resume_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    filename = Column(String)
    raw_text = Column(Text)
    file_path = Column(String)
    upload_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="resumes")
    analysis_results = relationship(
        "AnalysisResult",
        back_populates="resume",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
