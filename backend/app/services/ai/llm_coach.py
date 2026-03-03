import httpx
import json
import asyncio
from app.core.config import settings

async def generate_questions(role: str, context: str, count: int = 5) -> list[dict]:
    prompt = f"System Instruction: Generate {count} interview questions for a {role} role. Return EXACTLY a JSON array of strings containing the questions. Do not include any other text.\n\nUser Message: Given these sanitized data fields: {context} produce the questions."
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": "llama3",
                    "prompt": prompt,
                    "stream": False
                }
            )
            if response.status_code == 200:
                text = response.json().get("response", "[]")
                start = text.find("[")
                end = text.rfind("]") + 1
                if start != -1 and end != -1:
                    questions = json.loads(text[start:end])
                    return [{"id": i+1, "text": q} for i, q in enumerate(questions)]
    except Exception as e:
        print(f"Error generating questions from Ollama: {e}")
    
    # Fallback
    return [{"id": 1, "text": f"Tell me about your experience as a {role}?"}, {"id": 2, "text": "What are your core strengths?"}]

async def evaluate_answer(question: str, user_answer: str) -> dict:
    import json
    data = json.dumps({"question": question, "answer": user_answer})
    prompt = f"System Instruction: Evaluate this interview answer. Return EXACTLY a JSON object with keys: 'score' (number 0-10), 'feedback' (string with brief evaluation and 3 actionable tips), 'ideal_answer' (string). No markdown blocks or extra text.\n\nUser Message: Given these sanitized data fields: {data} produce the evaluation."
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": "llama3",
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                }
            )
            if response.status_code == 200:
                data = json.loads(response.json().get("response", "{}"))
                return {
                    "score": float(data.get("score", 5.0)),
                    "feedback": data.get("feedback", "No feedback provided."),
                    "ideal_answer": data.get("ideal_answer", "No ideal answer provided.")
                }
    except Exception as e:
        print(f"Error evaluating answer with Ollama: {e}")
            
    return {
        "score": 5.0,
        "feedback": "Unable to evaluate at this time due to AI generation error.",
        "ideal_answer": "Standard ideal answer for the question."
    }
