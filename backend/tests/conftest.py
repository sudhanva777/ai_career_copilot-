"""
Shared pytest configuration for the AI Career Copilot test suite.

pytest_configure() runs before ANY test module is collected, which is the
only way to inject sys.modules mocks when the app does heavy imports at
module level (SentenceTransformer singleton, spacy.load, etc.).
"""

import sys
import numpy as np
from unittest.mock import MagicMock
import pytest


# ── Pre-collection stubs ──────────────────────────────────────────────────────

def pytest_configure(config):
    """
    Stub out ML dependencies that are not installed in the local test env
    (sentence_transformers, torch) and prevent spacy from loading the model
    file. Must happen before test_integration.py is imported so that
    EmbeddingService() and nlp_pipeline module-level code don't crash.
    """
    # --- sentence_transformers -----------------------------------------------
    # EmbeddingService() calls SentenceTransformer(model_name) at module level.
    # Return a mock whose .encode() gives a deterministic numpy vector so that
    # the SKILL_EMBEDDINGS dict-comprehension at nlp_pipeline import time works.
    if "sentence_transformers" not in sys.modules:
        mock_st = MagicMock()
        mock_model_instance = MagicMock()
        mock_model_instance.encode.return_value = np.ones(384, dtype=np.float32)
        mock_st.SentenceTransformer.return_value = mock_model_instance
        sys.modules["sentence_transformers"] = mock_st

    # --- spacy.load -----------------------------------------------------------
    # spacy is installed but en_core_web_sm may not be downloaded.
    # Patch spacy.load so nlp_pipeline's module-level try/except succeeds.
    try:
        import spacy as _spacy
        _spacy.load = MagicMock(return_value=MagicMock())
    except ImportError:
        mock_spacy = MagicMock()
        mock_spacy.load.return_value = MagicMock()
        sys.modules.setdefault("spacy", mock_spacy)


# ── Per-test fixtures ─────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def disable_rate_limit():
    """
    Disable rate limiting for every test by toggling limiter.enabled = False.

    SlowAPIMiddleware.dispatch() checks this flag as its very first step:
        if not limiter.enabled:
            return await call_next(request)
    So no rate-limit state (view_rate_limit, headers) is ever touched, which
    avoids both the 429 throttle and the AttributeError from missing state keys.
    The same limiter instance is shared between app.state.limiter and the
    import in app.core.limiter, so toggling it here affects the running app.
    """
    from app.core.limiter import limiter
    original = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = original
