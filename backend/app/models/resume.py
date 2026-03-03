from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.models.base import Base

class Resume(Base):
    __tablename__ = "resumes"
    resume_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    filename = Column(String)
    raw_text = Column(Text)
    file_path = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
