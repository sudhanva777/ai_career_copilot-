from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user_id
from app.services.ai.llm_coach import generate_questions, evaluate_answer
from app.models.interview import InterviewSession, InterviewQA
from app.schemas.interview import InterviewStart, InterviewAnswer, SessionOut, AnswerOut

router = APIRouter()

@router.post("/start", response_model=SessionOut)
async def start_interview(
    payload: InterviewStart,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    try:
        import json
        from app.models.analysis import AnalysisResult
        analysis = db.query(AnalysisResult).filter(AnalysisResult.analysis_id == payload.analysis_id).first()
        context_data = {"skills": analysis.skills_json if analysis else []}
        context_str = json.dumps(context_data)
        
        questions_data = await generate_questions(
            role=payload.target_role,
            context=context_str,
            count=5
        )
    except Exception as e:
        print(f"Error starting interview: {e}")
        # Graceful fallback if Ollama is unreachable
        questions_data = get_fallback_questions(payload.target_role)


    session = InterviewSession(
        user_id=user_id,
        analysis_id=payload.analysis_id,
        target_role=payload.target_role,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Store questions in DB
    qa_records = []
    for i, q_text in enumerate(questions_data):
        qa = InterviewQA(session_id=session.session_id, question_text=q_text)
        db.add(qa)
        db.flush()
        qa_records.append({"id": qa.qa_id, "text": q_text})

    db.commit()

    return {
        "session_id": session.session_id,
        "questions": qa_records,
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

    qa = db.query(InterviewQA).filter(
        InterviewQA.qa_id == payload.question_id,
        InterviewQA.session_id == payload.session_id,
    ).first()
    if not qa:
        raise HTTPException(404, detail="Question not found")

    try:
        result = await evaluate_answer(
            question=qa.question_text,
            answer=payload.answer,
        )
    except Exception:
        result = {
            "score": 5,
            "feedback": "Could not connect to AI coach. Please check Ollama is running.",
            "ideal_answer": "N/A",
        }

    # Persist result
    qa.user_answer = payload.answer
    qa.similarity_score = result["score"]
    qa.llm_feedback = result["feedback"]
    qa.ideal_answer = result.get("ideal_answer", "")
    db.commit()

    return result


def get_fallback_questions(role: str) -> list[str]:
    """Static fallback questions when Ollama is unreachable."""
    base = [
        f"What is your strongest technical skill relevant to {role}?",
        f"Describe a challenging project you completed as a {role}.",
        "How do you handle tight deadlines and competing priorities?",
        "What does good code quality mean to you?",
        "Where do you see yourself in 3 years?",
    ]
    return base
