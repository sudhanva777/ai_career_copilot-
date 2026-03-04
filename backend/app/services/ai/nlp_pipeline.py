import spacy
from app.services.embedding_service import embedding_service

# Mock Ontology for Prototype
SKILL_ONTOLOGY = [
    # Programming
    "Python", "Java", "C++", "JavaScript", "SQL",

    # Web
    "React", "Node.js", "HTML", "CSS", "FastAPI",

    # DevOps
    "Docker", "Kubernetes", "AWS", "CI/CD", "Linux",

    # Data
    "Machine Learning", "Deep Learning",
    "Pandas", "NumPy", "Spark",
    "ETL", "Data Warehousing",

    # Database
    "PostgreSQL", "MySQL", "MongoDB",

    # Business / Non-Tech
    "Excel", "Power BI", "Tableau",
    "Business Analysis", "Market Research",
    "Product Strategy", "Stakeholder Management",
    "Digital Marketing", "Operations Management",
    "Communication", "Presentation Skills"
]

SKILL_EMBEDDINGS = {
    skill: embedding_service.encode(skill)
    for skill in SKILL_ONTOLOGY
}
ROLE_REQUIREMENTS = {

    # Engineering Roles
    "Software Engineer": [
        "Python", "Java", "C++", "SQL", "JavaScript"
    ],

    "Frontend Engineer": [
        "JavaScript", "React", "HTML", "CSS"
    ],

    "Backend Engineer": [
        "Python", "Node.js", "SQL", "PostgreSQL", "FastAPI"
    ],

    # Data Roles
    "Data Scientist": [
        "Python", "Machine Learning", "Pandas", "NumPy", "SQL"
    ],

    "Data Engineer": [
        "Python", "Spark", "ETL", "Data Warehousing", "SQL"
    ],

    # DevOps
    "DevOps Engineer": [
        "Docker", "Kubernetes", "AWS", "CI/CD", "Linux"
    ],

    # Non-Tech Roles
    "Business Analyst": [
        "Excel", "SQL", "Power BI",
        "Business Analysis", "Communication"
    ],

    "Product Manager": [
        "Product Strategy", "Market Research",
        "Stakeholder Management", "Communication"
    ],

    "Marketing Analyst": [
        "Excel", "Power BI",
        "Market Research", "Digital Marketing"
    ],

    "Operations Executive": [
        "Operations Management",
        "Excel", "Communication"
    ]
}

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    raise RuntimeError(
        "SpaCy model 'en_core_web_sm' is not installed. "
        "Install it before running the server."
    )

def extract_jd_skills(jd_text: str) -> list[str]:
    """Extract skills from a job description using the same embedding pipeline as resume analysis.

    Compares the full JD text embedding against every skill in the ontology.
    Falls back to keyword matching if the embedding model is unavailable.
    """
    if not jd_text:
        return []
    try:
        jd_vector = embedding_service.encode(jd_text)
        matched = []
        for skill, skill_vector in SKILL_EMBEDDINGS.items():
            similarity = embedding_service.cosine_similarity(jd_vector, skill_vector)
            if similarity > 0.35:
                matched.append(skill)
        return matched
    except Exception:
        return [s for s in SKILL_ONTOLOGY if s.lower() in jd_text.lower()]


def compare_resume_to_jd(resume_skills: list[str], jd_skills: list[str]) -> dict:
    """Compare resume skill names against JD skill names.

    Args:
        resume_skills: skill names already extracted from the stored analysis.
        jd_skills: skill names extracted from the job description.

    Returns:
        {match_score: float 0-100, matched_skills: List[str], missing_skills: List[str]}
    """
    resume_set = set(resume_skills)
    jd_set = set(jd_skills)
    matched = sorted(resume_set & jd_set)
    missing = sorted(jd_set - resume_set)
    match_score = round((len(matched) / len(jd_set)) * 100, 1) if jd_set else 0.0
    return {
        "match_score": match_score,
        "matched_skills": matched,
        "missing_skills": missing,
    }


def analyze_resume(raw_text: str) -> dict:
    if not raw_text:
        return {
            "ats_score": 0,
            "extracted_skills": [],
            "predicted_roles": [],
            "gap_skills": []
        }
        
    try:
        resume_vector = embedding_service.encode(raw_text)

        extracted_skills = []

        for skill, skill_vector in SKILL_EMBEDDINGS.items():
            similarity = embedding_service.cosine_similarity(
                resume_vector,
                skill_vector
            )

            if similarity > 0.35:
                extracted_skills.append({
                    "skill": skill,
                    "score": similarity
                })

        extracted_skills = sorted(
            extracted_skills,
            key=lambda x: x["score"],
            reverse=True
        )

    except Exception:
        # fallback to original keyword logic
        extracted_skills = []
        for skill in SKILL_ONTOLOGY:
            if skill.lower() in raw_text.lower():
                extracted_skills.append({
                    "skill": skill,
                    "score": 1.0
                })
            
    # Calculate ATS Score (mock logic based on number of skills matched)
    ats_score = min(100.0, len(extracted_skills) * 10.0)
    
    # Predict Roles based on skills matched
    role_scores = []
    for role, req_skills in ROLE_REQUIREMENTS.items():
        match_count = sum(
            1 for skill_obj in extracted_skills
            if skill_obj["skill"] in req_skills
        )
        score = (match_count / len(req_skills)) * 100 if req_skills else 0
        role_scores.append({"role": role, "score": score})
        
    # Sort roles by score descending
    predicted_roles = sorted(role_scores, key=lambda x: x["score"], reverse=True)
    
    # Gap Skills for the top role
    top_role = predicted_roles[0]["role"] if predicted_roles else "Software Engineer"
    top_role_reqs = ROLE_REQUIREMENTS.get(top_role, [])
    extracted_skill_names = [
        skill_obj["skill"] for skill_obj in extracted_skills
    ]
    
    gap_skills = [
        skill for skill in top_role_reqs
        if skill not in extracted_skill_names
    ]
    
    return {
        "ats_score": ats_score,
        "extracted_skills": extracted_skills,
        "predicted_roles": predicted_roles[:3],
        "gap_skills": gap_skills
    }
