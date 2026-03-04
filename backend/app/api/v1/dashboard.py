from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user_id
from app.models.resume import Resume
from app.models.analysis import AnalysisResult
from app.models.job_match import JobMatch
from app.models.interview import InterviewSession

router = APIRouter()


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # ── Fetch all user data ───────────────────────────────────────
    resumes = (
        db.query(Resume)
        .filter(Resume.user_id == user_id)
        .order_by(Resume.upload_date.desc())
        .all()
    )
    latest_resume = resumes[0] if resumes else None

    latest_analysis = None
    if latest_resume:
        latest_analysis = (
            db.query(AnalysisResult)
            .filter(AnalysisResult.resume_id == latest_resume.resume_id)
            .order_by(AnalysisResult.analysis_id.desc())
            .first()
        )

    job_matches = (
        db.query(JobMatch)
        .filter(JobMatch.user_id == user_id)
        .order_by(JobMatch.created_at.desc())
        .all()
    )

    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.started_at.desc())
        .all()
    )

    # ── Derived scalars ───────────────────────────────────────────
    ats_score = latest_analysis.ats_score if latest_analysis else None
    skills_detected = (
        len(latest_analysis.skills_json)
        if latest_analysis and latest_analysis.skills_json else 0
    )
    gaps_count = (
        len(latest_analysis.gaps_json)
        if latest_analysis and latest_analysis.gaps_json else 0
    )
    top_role = (
        latest_analysis.role_pred_json[0]["role"]
        if latest_analysis and latest_analysis.role_pred_json else None
    )

    scored_sessions = [s.overall_score for s in sessions if s.overall_score is not None]
    interview_avg = (
        round(sum(scored_sessions) / len(scored_sessions), 1)
        if scored_sessions else None
    )

    scored_matches = [m.match_score for m in job_matches if m.match_score is not None]
    best_match_score = round(max(scored_matches), 1) if scored_matches else None

    # ── Career Health Score (composite 0–100) ─────────────────────
    # ATS 40% | Interview avg (×10) 35% | Best job match 25%
    weighted_sum = 0.0
    total_weight = 0.0
    if ats_score is not None:
        weighted_sum += ats_score * 0.40
        total_weight += 0.40
    if interview_avg is not None:
        weighted_sum += (interview_avg * 10) * 0.35
        total_weight += 0.35
    if best_match_score is not None:
        weighted_sum += best_match_score * 0.25
        total_weight += 0.25
    career_health = round(weighted_sum / total_weight) if total_weight > 0 else 0

    for threshold, label in [(80, "Excellent"), (65, "Good"), (45, "Fair")]:
        if career_health >= threshold:
            career_health_label = label
            break
    else:
        career_health_label = "Needs Work"

    # ── Unified recent activity ───────────────────────────────────
    activity = []
    for r in resumes[:5]:
        activity.append({
            "type": "resume",
            "label": r.filename,
            "date": r.upload_date.isoformat() if r.upload_date else None,
            "score": None,
            "url": "/resumes",
        })
    for m in job_matches[:5]:
        preview = ""
        if m.jd_text:
            lines = [ln.strip() for ln in m.jd_text.splitlines() if ln.strip()]
            preview = lines[0][:60] if lines else ""
        activity.append({
            "type": "job_match",
            "label": preview or "Job Match",
            "date": m.created_at.isoformat() if m.created_at else None,
            "score": m.match_score,
            "url": "/jobs",
        })
    for s in sessions[:5]:
        activity.append({
            "type": "interview",
            "label": s.target_role,
            "date": s.started_at.isoformat() if s.started_at else None,
            "score": s.overall_score,
            "url": (
                f"/interview/summary/{s.session_id}"
                if s.overall_score is not None else "/interview"
            ),
        })
    activity.sort(key=lambda x: x["date"] or "", reverse=True)
    activity = activity[:6]

    # ── Next Steps ────────────────────────────────────────────────
    next_steps = []
    if not resumes:
        next_steps.append({
            "label": "Upload your first resume",
            "desc": "Start by uploading a resume to get your ATS score and skill analysis.",
            "url": "/upload",
            "priority": "high",
        })
    else:
        if ats_score is not None and ats_score < 75:
            next_steps.append({
                "label": "Improve your ATS score",
                "desc": f"Your score is {round(ats_score)}. Apply rewrite suggestions to close skill gaps.",
                "url": f"/rewrite/{latest_resume.resume_id}",
                "priority": "high",
            })
        if not job_matches:
            next_steps.append({
                "label": "Try job description matching",
                "desc": "Paste a job description to see exactly how well your skills match.",
                "url": "/jobs",
                "priority": "medium",
            })
        elif best_match_score is not None and best_match_score < 70:
            next_steps.append({
                "label": "Improve your job match score",
                "desc": f"Your best match is {round(best_match_score)}%. Use rewrite suggestions to close the gap.",
                "url": f"/rewrite/{latest_resume.resume_id}",
                "priority": "medium",
            })
        if not sessions:
            next_steps.append({
                "label": "Practice interviewing",
                "desc": "Prepare for your next interview with AI-powered mock sessions.",
                "url": "/interview",
                "priority": "medium",
            })
        elif interview_avg is not None and interview_avg < 7.0:
            next_steps.append({
                "label": "Sharpen your interview skills",
                "desc": f"Your avg score is {interview_avg}/10. Keep practising to reach 7+.",
                "url": "/interview",
                "priority": "medium",
            })
    if len(next_steps) < 2:
        next_steps.append({
            "label": "Upload an updated resume",
            "desc": "Track your progress over time by uploading improved versions.",
            "url": "/upload",
            "priority": "low",
        })

    return {
        "career_health": career_health,
        "career_health_label": career_health_label,
        "ats_score": round(ats_score, 1) if ats_score is not None else None,
        "interview_avg": interview_avg,
        "best_match_score": best_match_score,
        "total_resumes": len(resumes),
        "total_sessions": len(sessions),
        "total_matches": len(job_matches),
        "skills_detected": skills_detected,
        "gaps_count": gaps_count,
        "top_role": top_role,
        "recent_activity": activity,
        "next_steps": next_steps[:3],
    }
