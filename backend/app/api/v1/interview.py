from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.db.session import get_db
from app.api.deps import get_current_user_id
from app.services.ai.llm_coach import generate_questions, evaluate_answer, _VALID_CATEGORIES
from app.models.interview import InterviewSession, InterviewQA
from app.schemas.interview import (
    InterviewStart, InterviewAnswer, SessionOut, AnswerOut, SummaryOut, StatsOut
)

router = APIRouter()


def _fallback_error_detail(exc_msg: str) -> str:
    if "ai_unavailable" in exc_msg:
        return "AI service is unavailable. Using fallback questions."
    if "ai_timeout" in exc_msg:
        return "AI service timed out. Using fallback questions."
    if "ai_malformed" in exc_msg:
        return "AI response was malformed. Using fallback questions."
    return "AI service error. Using fallback questions."


def get_fallback_questions(role: str) -> list[dict]:
    base = [
        (f"What is your strongest technical skill relevant to {role}?", "Technical"),
        (f"Describe a challenging project you completed as a {role}.", "Behavioral"),
        ("How do you handle tight deadlines and competing priorities?", "Situational"),
        ("What does good code quality mean to you?", "Technical"),
        ("Where do you see yourself in 3 years?", "Behavioral"),
    ]
    return [{"id": i + 1, "text": q, "category": cat} for i, (q, cat) in enumerate(base)]


@router.post("/start", response_model=SessionOut)
async def start_interview(
    payload: InterviewStart,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    import json
    from app.models.analysis import AnalysisResult

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.analysis_id == payload.analysis_id
    ).first()
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

    # If the supplied analysis_id doesn't exist (or is stale), store NULL so that
    # the FK constraint doesn't reject the insert. Skills context already fell
    # back to [] above via `analysis = None`.
    resolved_analysis_id = analysis.analysis_id if analysis is not None else None

    session = InterviewSession(
        user_id=user_id,
        analysis_id=resolved_analysis_id,
        target_role=payload.target_role,
        practice_mode=payload.practice_mode,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    qa_records = []
    for q in questions_data:
        q_text = q["text"] if isinstance(q, dict) else str(q)
        q_cat = q.get("category", "Technical") if isinstance(q, dict) else "Technical"
        if q_cat not in _VALID_CATEGORIES:
            q_cat = "Technical"
        qa = InterviewQA(
            session_id=session.session_id,
            question_text=q_text,
            question_category=q_cat,
        )
        db.add(qa)
        db.flush()
        qa_records.append({"id": qa.qa_id, "text": q_text, "category": q_cat})

    db.commit()

    return {
        "session_id": session.session_id,
        "questions": qa_records,
        "ai_available": ai_available,
        "practice_mode": session.practice_mode,
    }


@router.post("/answer", response_model=AnswerOut)
async def answer_question(
    payload: InterviewAnswer,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.session_id == payload.session_id,
        InterviewSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(404, detail="Session not found")

    qa = db.query(InterviewQA).filter(
        InterviewQA.qa_id == payload.question_id,
        InterviewQA.session_id == payload.session_id,
    ).first()
    if not qa:
        raise HTTPException(404, detail="Question not found in this session")

    # In practice mode allow re-answering; otherwise block duplicates
    if qa.user_answer is not None and not session.practice_mode:
        raise HTTPException(409, detail="This question has already been answered")

    try:
        result = await evaluate_answer(
            question=qa.question_text,
            user_answer=payload.answer,
        )
    except RuntimeError as exc:
        detail = _fallback_error_detail(str(exc))
        result = {
            "score": 5.0,
            "feedback": f"{detail} Please try again later.",
            "ideal_answer": "N/A",
            "ai_available": False,
        }

    qa.user_answer = payload.answer
    qa.similarity_score = result["score"]
    qa.llm_feedback = result["feedback"]
    qa.ideal_answer = result.get("ideal_answer", "")
    db.commit()

    # Check if all questions answered; compute overall_score
    all_qa = db.query(InterviewQA).filter(
        InterviewQA.session_id == payload.session_id
    ).all()
    answered = [q for q in all_qa if q.user_answer is not None]
    session_complete = len(all_qa) > 0 and len(answered) == len(all_qa)
    overall_score = None
    if session_complete:
        scores = [q.similarity_score for q in answered if q.similarity_score is not None]
        if scores:
            overall_score = round(sum(scores) / len(scores), 2)
            session.overall_score = overall_score
            db.commit()

    return {
        **result,
        "session_complete": session_complete,
        "overall_score": overall_score,
    }


@router.get("/session/{session_id}/summary", response_model=SummaryOut)
async def get_session_summary(
    session_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    session = db.query(InterviewSession).filter(
        InterviewSession.session_id == session_id,
        InterviewSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(404, detail="Session not found")

    per_cat: dict[str, list[float]] = {}
    qa_list = []
    for qa in session.questions:
        cat = qa.question_category or "Technical"
        if qa.similarity_score is not None:
            per_cat.setdefault(cat, []).append(qa.similarity_score)
        qa_list.append({
            "qa_id": qa.qa_id,
            "question_text": qa.question_text,
            "question_category": cat,
            "user_answer": qa.user_answer,
            "ideal_answer": qa.ideal_answer,
            "similarity_score": qa.similarity_score,
            "llm_feedback": qa.llm_feedback,
        })

    per_category_scores = {
        cat: round(sum(scores) / len(scores), 2)
        for cat, scores in per_cat.items()
    }

    return {
        "session_id": session.session_id,
        "target_role": session.target_role,
        "overall_score": session.overall_score,
        "practice_mode": session.practice_mode,
        "per_category_scores": per_category_scores,
        "qa_list": qa_list,
    }


@router.get("/stats", response_model=StatsOut)
async def get_interview_stats(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == user_id,
    ).order_by(InterviewSession.started_at.desc()).all()

    total_sessions = len(sessions)

    now_utc = datetime.utcnow()
    one_week_ago = now_utc - timedelta(days=7)
    sessions_this_week = sum(
        1 for s in sessions
        if s.started_at is not None and s.started_at >= one_week_ago
    )

    scored = [s.overall_score for s in sessions if s.overall_score is not None]
    avg_score = round(sum(scored) / len(scored), 1) if scored else None

    today = now_utc.date()
    day_set = {s.started_at.date() for s in sessions if s.started_at is not None}
    streak = 0
    check_date = today
    while check_date in day_set:
        streak += 1
        check_date -= timedelta(days=1)
    # If no session today, count streak from yesterday
    if streak == 0:
        yesterday = today - timedelta(days=1)
        if yesterday in day_set:
            check_date = yesterday
            while check_date in day_set:
                streak += 1
                check_date -= timedelta(days=1)

    return {
        "sessions_this_week": sessions_this_week,
        "avg_score": avg_score,
        "streak_days": streak,
        "total_sessions": total_sessions,
    }
