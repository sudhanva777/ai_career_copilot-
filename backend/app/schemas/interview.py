from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any


class InterviewStart(BaseModel):
    target_role: str = Field(..., min_length=2)
    analysis_id: int
    practice_mode: bool = False


class InterviewAnswer(BaseModel):
    session_id: int
    question_id: int
    answer: str = Field(..., min_length=1)


class SessionOut(BaseModel):
    session_id: int
    questions: List[Dict]
    ai_available: bool = True
    practice_mode: bool = False


class AnswerOut(BaseModel):
    score: float          # 0.0–10.0
    feedback: str
    ideal_answer: str
    ai_available: bool = True
    session_complete: bool = False
    overall_score: Optional[float] = None


class SummaryOut(BaseModel):
    session_id: int
    target_role: str
    overall_score: Optional[float]
    practice_mode: bool
    per_category_scores: Dict[str, float]
    qa_list: List[Dict[str, Any]]


class StatsOut(BaseModel):
    sessions_this_week: int
    avg_score: Optional[float]
    streak_days: int
    total_sessions: int
