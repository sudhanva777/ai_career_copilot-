from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List

MODEL_NAME = "all-MiniLM-L6-v2"


class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer(MODEL_NAME)

    def encode(self, text: str) -> List[float]:
        return self.model.encode(text)

    @staticmethod
    def cosine_similarity(vec1, vec2) -> float:
        """Compute cosine similarity; returns 0.0 if either vector is a zero vector."""
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0.0 or norm2 == 0.0:
            return 0.0
        return float(np.dot(vec1, vec2) / (norm1 * norm2))


# Singleton instance
embedding_service = EmbeddingService()
