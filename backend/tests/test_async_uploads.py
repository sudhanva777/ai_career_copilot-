import pytest
import httpx
import asyncio
import os
from asgi_lifespan import LifespanManager
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_concurrent_uploads():
    # Setup dummy PDF
    dummy_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\n"
    pdf_path = "test_dummy.pdf"
    with open(pdf_path, "wb") as f:
        f.write(dummy_pdf)
        
    async with LifespanManager(app):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            async def upload():
                with open(pdf_path, "rb") as f:
                    r = await ac.post("/api/v1/resume/upload", files={"file": ("dummy.pdf", f, "application/pdf")})
                    # We expect 401 because we are not authenticated in this mock, but the main point
                    # is that the event loop remains responsive.
                    return r.status_code
                    
            tasks = [asyncio.create_task(upload()) for _ in range(5)]
            
            # While uploading, hit health check
            health_task = asyncio.create_task(ac.get("/health"))
            
            results = await asyncio.gather(*tasks, health_task, return_exceptions=False)
            
            health_response = results[-1]
            assert health_response.status_code == 200
            
    os.remove(pdf_path)
