import httpx
import json
import re
from app.core.config import settings

_TIMEOUT = 30.0  # seconds — prevents hanging if Ollama is slow


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers that Ollama sometimes adds."""
    return re.sub(r"```(?:json)?\s*([\s\S]*?)```", r"\1", text).strip()


async def generate_questions(role: str, context: str, count: int = 5) -> list[dict]:
    prompt = (
        f"System Instruction: Generate {count} interview questions for a {role} role. "
        "Return EXACTLY a JSON array of strings containing the questions. "
        "Do not include any other text.\n\n"
        f"User Message: Given these sanitized data fields: {context} produce the questions."
    )

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={"model": "llama3", "prompt": prompt, "stream": False},
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

    return [{"id": i + 1, "text": str(q)} for i, q in enumerate(questions)]


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
