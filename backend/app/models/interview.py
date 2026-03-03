from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from datetime import datetime
from app.models.base import Base

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    analysis_id = Column(Integer, ForeignKey("analysis.analysis_id", ondelete="CASCADE"), index=True)
    target_role = Column(String)
    overall_score = Column(Float, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)

class InterviewQA(Base):
    __tablename__ = "interview_qa"
    qa_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.session_id", ondelete="CASCADE"), index=True)
    question_text = Column(Text)
    user_answer = Column(Text, nullable=True)
    ideal_answer = Column(Text, nullable=True)
    similarity_score = Column(Float, nullable=True)
    llm_feedback = Column(Text, nullable=True)
