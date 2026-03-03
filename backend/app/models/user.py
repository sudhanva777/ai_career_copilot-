from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.models.base import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String)
    role = Column(String, default="User") # Admin or User
    created_at = Column(DateTime, default=datetime.utcnow)
