from __future__ import annotations

from functools import lru_cache

from sentence_transformers import SentenceTransformer

from config import settings


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    try:
        return SentenceTransformer(settings.embedding_model, local_files_only=True)
    except Exception:
        return SentenceTransformer(settings.embedding_model)


def embed_text(text: str) -> list[float]:
    embedding = get_embedding_model().encode(text, normalize_embeddings=True)
    return embedding.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    embeddings = get_embedding_model().encode(texts, normalize_embeddings=True)
    return embeddings.tolist()
