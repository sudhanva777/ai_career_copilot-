import pytest
from app.db.session import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.models.resume import Resume
from app.models.analysis import AnalysisResult

Base.metadata.create_all(bind=engine)

def test_resume_cascade_delete():
    db = SessionLocal()
    # Create user
    user = User(email="test@cascade.com", name="Test Cascade", password_hash="hash", role="user")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create resume
    resume = Resume(user_id=user.user_id, filename="test.pdf", raw_text="...", file_path="...")
    db.add(resume)
    db.commit()
    db.refresh(resume)
    
    # Create analysis
    analysis = AnalysisResult(resume_id=resume.resume_id, ats_score=85.0, skills_json=[], role_pred_json=[], gap_skills_json=[])
    db.add(analysis)
    db.commit()
    
    analysis_id = analysis.analysis_id
    
    # Delete resume
    db.delete(resume)
    db.commit()
    
    # Verify analysis is deleted
    deleted_analysis = db.query(AnalysisResult).filter(AnalysisResult.analysis_id == analysis_id).first()
    assert deleted_analysis is None
    
    db.close()
