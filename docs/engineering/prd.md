# Product Requirements Document (PRD) - AI Career Copilot

## 1. Product Overview
AI Career Copilot is an intelligent career development platform designed to bridge the gap between job seekers and employers. It automates resume analysis, identifies skill gaps, and provides an AI-powered mock interview coaching experience to help candidates prepare for real-world interviews.

## 2. Target Users
*   **Job Seekers (Major Actor):** Final-year students and early professionals seeking resume optimization and interview practice.
*   **Admins (Secondary Actor):** System administrators responsible for user management and platform maintenance.

## 3. Functional Features List
*   **User Authentication:** Secure registration and login using JWT.
*   **Resume Upload:** Support for PDF and DOCX formats with validation.
*   **NLP Resume Analysis:** Extraction of skills, experience, and education via spaCy and BERT.
*   **ATS Scoring:** Weighted scoring function (0-100 scale).
*   **Job Role Prediction:** Top 3 role matches using Random Forest/SVM.
*   **Skill Gap Analysis:** Comparing candidate skills vs job role requirements.
*   **AI Interview Coach:** Interactive sessions using Llama 3 via Ollama.
*   **Semantic Answer Evaluation:** Sentence-transformer cosine similarity scoring.
*   **Performance Dashboard:** Skill radars, ATS score charts, and interview highlights.
*   **Report Generation:** Downloadable PDF reports.
*   **User Management:** Admin capability to manage users (extends core system).

## 4. User Stories
*   **As a job seeker**, I want to upload my resume so that I can see how well it matches my target job roles.
*   **As a job seeker**, I want to know my ATS score so that I can optimize my resume for automated screening.
*   **As a job seeker**, I want to practice interviews with an AI coach so that I can gain confidence and receive feedback on my answers.
*   **As a job seeker**, I want to see a list of skills I'm missing so that I can focus my learning efforts effectively.
*   **As an admin**, I want to manage system users so that I can ensure platform security and support.

## 5. Acceptance Criteria (GIVEN-WHEN-THEN)
*   **Resume Analysis:**
    *   **GIVEN** a user has uploaded a valid PDF resume.
    *   **WHEN** the system processes the file.
    *   **THEN** it should display an ATS score and a list of extracted skills within 10 seconds.
*   **Interview Coaching:**
    *   **GIVEN** a user starts an interview session for a "Software Engineer" role.
    *   **WHEN** the AI generates questions.
    *   **THEN** the questions must be relevant to software engineering and the user's extracted skills.
*   **Report Download:**
    *   **GIVEN** a completed resume analysis.
    *   **WHEN** the user clicks "Download Report".
    *   **THEN** a PDF file containing the analysis summary must be generated and downloaded.

## 6. Success Metrics
| Metric | Target |
|--------|--------|
| ATS Score accuracy vs human HR | ≥75% correlation |
| Resume skill extraction F1 | ≥80% |
| Role prediction accuracy | ≥75% |
| Interview feedback quality (user rating) | ≥4/5 stars |
| API response time (non-AI) | <500ms |
| System uptime | ≥99% |

## 7. Non-Functional Goals
*   **Performance:** Non-AI API responses should be under 500ms; AI tasks should complete within 15 seconds.
*   **Security:** Passwords must be hashed; all API endpoints must be protected by JWT.
*   **Usability:** The interface must be responsive and follow a clean, modern design.
*   **Scalability:** The system should handle concurrent resume uploads and interview sessions.
