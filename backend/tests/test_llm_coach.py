import pytest
import httpx
from unittest.mock import AsyncMock, patch
from app.services.ai.llm_coach import generate_questions

@pytest.mark.asyncio
async def test_generate_questions_timeout_fallback():
    # Mock httpx to raise a timeout exception
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.TimeoutException("Timeout")
        
        result = await generate_questions("Software Engineer", "{}", count=5)
        
        # Verify it hit the fallback list logic and returned hardcoded dictionaries
        assert isinstance(result, list)
        assert len(result) == 2
        assert "id" in result[0]
        assert "text" in result[0]
