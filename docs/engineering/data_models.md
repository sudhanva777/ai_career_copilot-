# Data Models - AI Career Copilot

## 1. SQLAlchemy Models (Database)

### User Model
```python
class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String)
    role = Column(String) # Admin or Job Seeker
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Resume Model
```python
class Resume(Base):
    __tablename__ = "resumes"
    resume_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    filename = Column(String)
    raw_text = Column(Text)
    file_path = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
```

### Analysis Result Model
```python
class AnalysisResult(Base):
    __tablename__ = "analysis"
    analysis_id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.resume_id"))
    ats_score = Column(Float)
    skills_json = Column(JSON)      # List of strings
    role_pred_json = Column(JSON)   # List of {role, score}
    gaps_json = Column(JSON)        # List of strings
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Interview Session Model
```python
class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    analysis_id = Column(Integer, ForeignKey("analysis.analysis_id"))
    target_role = Column(String)
    overall_score = Column(Float)
    started_at = Column(DateTime, default=datetime.utcnow)

class InterviewQA(Base):
    __tablename__ = "interview_qa"
    qa_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.session_id"))
    question_text = Column(Text)
    user_answer = Column(Text)
    ideal_answer = Column(Text)
    similarity_score = Column(Float)
    llm_feedback = Column(Text)
```

## 2. Pydantic Schemas (API Validation)

### Resume Analysis Output
```python
class AnalysisOutput(BaseModel):
    analysis_id: int
    ats_score: float
    extracted_skills: List[str]
    predicted_roles: List[Dict[str, float]]
    gap_skills: List[str]
```

### Interview Session Output
```python
class InterviewOutput(BaseModel):
    session_id: int
    questions: List[Dict[str, str]]
```

### ATS Score JSON Structure
```json
{
  "score": 85,
  "factors": {
    "keyword_match": 40,
    "formatting": 15,
    "experience_relevance": 20,
    "education_match": 10
  }
}
```
