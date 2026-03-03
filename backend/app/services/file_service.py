import os
import uuid
from pathlib import Path

UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

async def save_upload_file(filename: str, content: bytes) -> str:
    unique_filename = f"{uuid.uuid4()}_{filename.replace(' ', '_')}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as f:
        f.write(content)

    return str(file_path)
