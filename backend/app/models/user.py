from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String)
    role = Column(String, default="User")  # Admin or User
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    resumes = relationship(
        "Resume",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
