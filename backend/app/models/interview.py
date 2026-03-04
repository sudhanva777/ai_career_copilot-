from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    analysis_id = Column(Integer, ForeignKey("analysis.analysis_id", ondelete="CASCADE"), index=True)
    target_role = Column(String)
    overall_score = Column(Float, nullable=True)
    practice_mode = Column(Boolean, nullable=False, default=False, server_default='0')
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    analysis = relationship("AnalysisResult", back_populates="interview_sessions")
    questions = relationship(
        "InterviewQA",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class InterviewQA(Base):
    __tablename__ = "interview_qa"
    qa_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.session_id", ondelete="CASCADE"), index=True)
    question_text = Column(Text)
    user_answer = Column(Text, nullable=True)
    ideal_answer = Column(Text, nullable=True)
    similarity_score = Column(Float, nullable=True)
    llm_feedback = Column(Text, nullable=True)
    question_category = Column(String, nullable=True)

    session = relationship("InterviewSession", back_populates="questions")
