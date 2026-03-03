from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user_id
from app.services.ai.llm_coach import generate_questions, evaluate_answer
from app.models.interview import InterviewSession, InterviewQA
from app.schemas.interview import InterviewStart, InterviewAnswer, SessionOut, AnswerOut

router = APIRouter()


def _fallback_error_detail(exc_msg: str) -> str:
    """Map internal error codes to user-friendly messages."""
    if "ai_unavailable" in exc_msg:
        return "AI service is unavailable. Using fallback questions."
    if "ai_timeout" in exc_msg:
        return "AI service timed out. Using fallback questions."
    if "ai_malformed" in exc_msg:
        return "AI response was malformed. Using fallback questions."
    return "AI service error. Using fallback questions."


def get_fallback_questions(role: str) -> list[dict]:
    """Static fallback questions when Ollama is unreachable."""
    base = [
        f"What is your strongest technical skill relevant to {role}?",
        f"Describe a challenging project you completed as a {role}.",
        "How do you handle tight deadlines and competing priorities?",
        "What does good code quality mean to you?",
        "Where do you see yourself in 3 years?",
    ]
    return [{"id": i + 1, "text": q} for i, q in enumerate(base)]


@router.post("/start", response_model=SessionOut)
async def start_interview(
    payload: InterviewStart,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Resolve analysis context safely (analysis may not exist)
    import json
    from app.models.analysis import AnalysisResult

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.analysis_id == payload.analysis_id
    ).first()
    # Guard: proceed with empty context if analysis not found
    skills = analysis.skills_json if analysis is not None else []
    context_str = json.dumps({"skills": skills})

    ai_available = True
    try:
        questions_data = await generate_questions(
            role=payload.target_role,
            context=context_str,
            count=5,
        )
    except Exception as exc:
        ai_available = False
        questions_data = get_fallback_questions(payload.target_role)
        print(f"[interview/start] {_fallback_error_detail(str(exc))}")

    session = InterviewSession(
        user_id=user_id,
        analysis_id=payload.analysis_id,
        target_role=payload.target_role,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Store questions in DB — extract text from dict
    qa_records = []
    for q in questions_data:
        q_text = q["text"] if isinstance(q, dict) else str(q)
        qa = InterviewQA(session_id=session.session_id, question_text=q_text)
        db.add(qa)
        db.flush()
        qa_records.append({"id": qa.qa_id, "text": q_text})

    db.commit()

    return {
        "session_id": session.session_id,
        "questions": qa_records,
        "ai_available": ai_available,
    }


@router.post("/answer", response_model=AnswerOut)
async def answer_question(
    payload: InterviewAnswer,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Verify session ownership
    session = db.query(InterviewSession).filter(
        InterviewSession.session_id == payload.session_id,
        InterviewSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(404, detail="Session not found")

    # Verify question belongs to this session
    qa = db.query(InterviewQA).filter(
        InterviewQA.qa_id == payload.question_id,
        InterviewQA.session_id == payload.session_id,
    ).first()
    if not qa:
        raise HTTPException(404, detail="Question not found in this session")

    # Reject duplicate answers
    if qa.user_answer is not None:
        raise HTTPException(409, detail="This question has already been answered")

    try:
        result = await evaluate_answer(
            question=qa.question_text,
            answer=payload.answer,
        )
    except RuntimeError as exc:
        detail = _fallback_error_detail(str(exc))
        result = {
            "score": 5.0,
            "feedback": f"{detail} Please try again later.",
            "ideal_answer": "N/A",
            "ai_available": False,
        }

    # Persist result
    qa.user_answer = payload.answer
    qa.similarity_score = result["score"]
    qa.llm_feedback = result["feedback"]
    qa.ideal_answer = result.get("ideal_answer", "")
    db.commit()

    return result
