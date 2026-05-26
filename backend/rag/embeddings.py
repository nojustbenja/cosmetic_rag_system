from __future__ import annotations

import hashlib
import logging
import os
from functools import lru_cache

import numpy as np

from config import settings

if not settings.allow_embedding_download:
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class HashEmbeddingModel:
    def __init__(self, dimensions: int) -> None:
        self.dimensions = dimensions

    def encode(self, texts: str | list[str], normalize_embeddings: bool = True):
        single_input = isinstance(texts, str)
        values = [texts] if single_input else texts
        embeddings = np.array([self._embed(str(text)) for text in values], dtype=np.float32)

        if normalize_embeddings:
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            embeddings = embeddings / np.maximum(norms, 1e-12)

        return embeddings[0] if single_input else embeddings

    def _embed(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        tokens = text.lower().split()
        for token in tokens or [text.lower()]:
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=16).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign
        return vector


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer | HashEmbeddingModel:
    try:
        return SentenceTransformer(settings.embedding_model, local_files_only=True)
    except Exception as exc:
        if settings.allow_embedding_download:
            return SentenceTransformer(settings.embedding_model)
        logger.warning(
            "Embedding model %s is not available locally; using hash fallback. "
            "Set ALLOW_EMBEDDING_DOWNLOAD=true to download it.",
            settings.embedding_model,
            exc_info=exc,
        )
        return HashEmbeddingModel(settings.embedding_fallback_dimensions)


def embed_text(text: str) -> list[float]:
    embedding = get_embedding_model().encode(text, normalize_embeddings=True)
    return embedding.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    embeddings = get_embedding_model().encode(texts, normalize_embeddings=True)
    return embeddings.tolist()
