from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class InterviewStart(BaseModel):
    target_role: str = Field(..., min_length=2)
    analysis_id: int


class InterviewAnswer(BaseModel):
    session_id: int
    question_id: int
    answer: str = Field(..., min_length=1)


class SessionOut(BaseModel):
    session_id: int
    questions: List[Dict]
    ai_available: bool = True


class AnswerOut(BaseModel):
    score: float          # 0.0–10.0
    feedback: str
    ideal_answer: str
    ai_available: bool = True
