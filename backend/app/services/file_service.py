import os
import uuid
from pathlib import Path
from app.core.config import settings

UPLOAD_DIR = Path(settings.UPLOAD_DIR) / "resumes"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_upload_file(original_filename: str, content: bytes) -> str:
    """Save uploaded bytes to disk with a UUID-only filename.

    The original filename is NEVER used in the file path to prevent path
    traversal attacks. It is stored separately in the DB for display.
    The extension is extracted safely to preserve file-type information.
    """
    # Extract extension from original name (safe: take only the suffix)
    suffix = Path(original_filename).suffix.lower()
    # Only allow known safe extensions — default to .bin for anything else
    if suffix not in {".pdf", ".docx"}:
        suffix = ".bin"

    unique_name = f"{uuid.uuid4()}{suffix}"
    file_path = UPLOAD_DIR / unique_name

    with open(file_path, "wb") as f:
        f.write(content)

    return str(file_path)
