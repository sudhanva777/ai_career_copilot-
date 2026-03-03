from pydantic import BaseModel
from typing import List, Dict

class InterviewStart(BaseModel):
    target_role: str
    analysis_id: int

class InterviewAnswer(BaseModel):
    session_id: int
    question_id: int
    answer: str

class SessionOut(BaseModel):
    session_id: int
    questions: List[Dict]

class AnswerOut(BaseModel):
    score: int
    feedback: str
    ideal_answer: str
