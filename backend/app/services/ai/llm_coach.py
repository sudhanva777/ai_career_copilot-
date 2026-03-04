import httpx
import json
import re
from app.core.config import settings

_TIMEOUT = 30.0  # seconds — prevents hanging if Ollama is slow


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers that Ollama sometimes adds."""
    return re.sub(r"```(?:json)?\s*([\s\S]*?)```", r"\1", text).strip()


_VALID_CATEGORIES = {"Technical", "Behavioral", "Situational", "Problem Solving", "Communication"}


async def generate_questions(role: str, context: str, count: int = 5) -> list[dict]:
    prompt = (
        f"System Instruction: Generate {count} interview questions for a {role} role. "
        "Return EXACTLY a JSON array of objects. Each object must have exactly two keys: "
        "\"question\" (string) and "
        "\"category\" (one of: Technical, Behavioral, Situational, Problem Solving, Communication). "
        "Example: [{\"question\": \"Explain RESTful API design.\", \"category\": \"Technical\"}] "
        "Do not include any other text or keys.\n\n"
        f"User Message: Given these sanitized data fields: {context} produce the questions."
    )

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={"model": "llama3", "prompt": prompt, "stream": False, "format": "json"},
            )
    except httpx.ConnectError:
        raise RuntimeError("ai_unavailable: Could not connect to AI service.")
    except httpx.TimeoutException:
        raise RuntimeError("ai_timeout: AI service timed out.")

    if response.status_code != 200:
        raise RuntimeError(f"ai_error: Ollama returned HTTP {response.status_code}")

    try:
        raw = response.json().get("response", "[]")
    except Exception:
        raise RuntimeError("ai_malformed: AI response could not be parsed as JSON.")

    # Strip markdown fences then extract JSON array
    cleaned = _strip_markdown_fences(raw)
    start = cleaned.find("[")
    end = cleaned.rfind("]") + 1
    if start == -1 or end == 0:
        raise RuntimeError("ai_malformed: No JSON array found in AI response.")

    try:
        questions = json.loads(cleaned[start:end])
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"ai_malformed: {exc}")

    result = []
    for i, item in enumerate(questions):
        if isinstance(item, str):
            # Backwards compat: old format was array of strings
            result.append({"id": i + 1, "text": item, "category": "Technical"})
        elif isinstance(item, dict):
            text = str(item.get("question", item.get("text", f"Question {i + 1}"))).strip()
            category = str(item.get("category", "Technical")).strip()
            if category not in _VALID_CATEGORIES:
                category = "Technical"
            result.append({"id": i + 1, "text": text, "category": category})
    return result


async def generate_rewrite_suggestions(
    resume_text: str,
    gap_skills: list[str],
) -> list[dict]:
    """Generate concrete resume improvement suggestions for each gap skill and key sections.

    Returns a list of dicts: {section, severity, current, improved, reason}
    Falls back to template-based suggestions if Ollama is unreachable.
    """
    # Truncate resume to keep prompt within token budget (~2000 chars is safe for llama3 8B)
    truncated_resume = resume_text[:2000].strip()
    gap_skills_str = ", ".join(gap_skills) if gap_skills else "none identified"

    data_str = json.dumps({
        "resume_text": truncated_resume,
        "gap_skills": gap_skills,
    })

    prompt = (
        "System Instruction: You are a professional resume writer. "
        "Generate concrete resume improvement suggestions. "
        "Return EXACTLY a JSON array. Each element must have these exact string keys: "
        "\"section\" (one of: Summary, Skills, Experience, Projects, Education), "
        "\"severity\" (one of: high, medium, low), "
        "\"current\" (the exact current text from the resume, or \"Not present\" if missing), "
        "\"improved\" (complete ready-to-paste improved text; for Experience or Projects "
        "begin with a bullet symbol •), "
        "\"reason\" (one sentence explaining why this change improves ATS or readability). "
        "Rules: generate 5-8 suggestions total. "
        "For EACH gap skill listed, include at least one suggestion showing a concrete bullet point. "
        "Good example improved text: "
        "\"• Containerised a microservices application using Docker and Kubernetes, "
        "cutting deployment time by 35% and eliminating environment inconsistencies.\" "
        "Bad example: \"Add Docker to your resume.\" "
        "severity=high means it directly adds a missing ATS keyword. "
        "Do not include any text outside the JSON array.\n\n"
        f"User Message: Given these sanitized data fields: {data_str} produce the suggestions."
    )

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={"model": "llama3", "prompt": prompt, "stream": False, "format": "json"},
            )
    except httpx.ConnectError:
        raise RuntimeError("ai_unavailable: Could not connect to AI service.")
    except httpx.TimeoutException:
        raise RuntimeError("ai_timeout: AI service timed out.")

    if response.status_code != 200:
        raise RuntimeError(f"ai_error: Ollama returned HTTP {response.status_code}")

    try:
        raw = response.json().get("response", "[]")
    except Exception:
        raise RuntimeError("ai_malformed: AI response could not be parsed.")

    cleaned = _strip_markdown_fences(raw)

    # The response may be a top-level object like {"suggestions": [...]} or a bare array
    start_arr = cleaned.find("[")
    start_obj = cleaned.find("{")
    if start_arr != -1 and (start_obj == -1 or start_arr < start_obj):
        end = cleaned.rfind("]") + 1
        json_str = cleaned[start_arr:end]
    else:
        # Try to find an array inside an object
        inner_start = cleaned.find("[", start_obj)
        inner_end = cleaned.rfind("]") + 1
        if inner_start != -1:
            json_str = cleaned[inner_start:inner_end]
        else:
            raise RuntimeError("ai_malformed: No JSON array found in rewrite suggestions response.")

    try:
        suggestions = json.loads(json_str)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"ai_malformed: {exc}")

    if not isinstance(suggestions, list):
        raise RuntimeError("ai_malformed: Expected a JSON array for rewrite suggestions.")

    # Normalise and validate each suggestion dict
    valid = []
    allowed_sections = {"Summary", "Skills", "Experience", "Projects", "Education"}
    allowed_severities = {"high", "medium", "low"}
    for item in suggestions:
        if not isinstance(item, dict):
            continue
        section = str(item.get("section", "Experience")).strip().title()
        if section not in allowed_sections:
            section = "Experience"
        severity = str(item.get("severity", "medium")).lower().strip()
        if severity not in allowed_severities:
            severity = "medium"
        valid.append({
            "section": section,
            "severity": severity,
            "current": str(item.get("current", "Not present")).strip(),
            "improved": str(item.get("improved", "")).strip(),
            "reason": str(item.get("reason", "")).strip(),
        })

    return valid


def _fallback_rewrite_suggestions(gap_skills: list[str]) -> list[dict]:
    """Static suggestions when Ollama is unreachable — one per gap skill (up to 6)."""
    templates = [
        "• Applied {skill} in a production environment to build scalable, maintainable systems, directly improving team delivery speed.",
        "• Designed and implemented a solution leveraging {skill}, resulting in measurable improvements to performance and reliability.",
        "• Integrated {skill} into the development workflow, enabling the team to automate repetitive tasks and reduce manual errors.",
        "• Built and deployed a feature using {skill} that served thousands of users, improving user satisfaction and system uptime.",
        "• Collaborated with cross-functional teams to adopt {skill}, contributing to a 30% reduction in operational overhead.",
        "• Used {skill} to solve a complex technical problem, delivering the project on time with zero critical defects.",
    ]
    suggestions = []
    for i, skill in enumerate(gap_skills[:6]):
        suggestions.append({
            "section": "Experience",
            "severity": "high",
            "current": "Not present",
            "improved": templates[i % len(templates)].format(skill=skill),
            "reason": f"{skill} was not detected in your resume but is a key requirement for your target role.",
        })
    # Add a generic Skills section suggestion if gap skills exist
    if gap_skills:
        top_skills = ", ".join(gap_skills[:4])
        suggestions.append({
            "section": "Skills",
            "severity": "medium",
            "current": "Skills section may be missing key terms",
            "improved": f"Technical Skills: {top_skills} (and others relevant to your target role)",
            "reason": "Adding these skills explicitly to a Skills section improves ATS keyword matching.",
        })
    return suggestions


async def evaluate_answer(question: str, user_answer: str) -> dict:
    data_str = json.dumps({"question": question, "answer": user_answer})
    prompt = (
        "System Instruction: Evaluate this interview answer. "
        "Return EXACTLY a JSON object with keys: "
        "'score' (number 0-10), "
        "'feedback' (string with brief evaluation and 3 actionable tips), "
        "'ideal_answer' (string). No markdown blocks or extra text.\n\n"
        f"User Message: Given these sanitized data fields: {data_str} produce the evaluation."
    )

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={"model": "llama3", "prompt": prompt, "stream": False, "format": "json"},
            )
    except httpx.ConnectError:
        raise RuntimeError("ai_unavailable")
    except httpx.TimeoutException:
        raise RuntimeError("ai_timeout")

    if response.status_code != 200:
        raise RuntimeError(f"ai_error: HTTP {response.status_code}")

    try:
        raw = response.json().get("response", "{}")
    except Exception:
        raise RuntimeError("ai_malformed")

    cleaned = _strip_markdown_fences(raw)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"ai_malformed: {exc}")

    return {
        "score": float(parsed.get("score", 5.0)),
        "feedback": parsed.get("feedback", "No feedback provided."),
        "ideal_answer": parsed.get("ideal_answer", "No ideal answer provided."),
        "ai_available": True,
    }
