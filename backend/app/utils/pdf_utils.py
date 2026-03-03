import os
from PyPDF2 import PdfReader

def extract_text_from_pdf(file_path: str) -> str:
    if not os.path.exists(file_path):
        return ""
    text = ""
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            raw_text = page.extract_text()
            if raw_text:
                text += raw_text + "\n"
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
    return text
