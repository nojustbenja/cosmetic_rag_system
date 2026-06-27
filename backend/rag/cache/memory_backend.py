"""Backend de caché semántico en memoria (proceso).

Pensado como prueba del desacople y para entornos sin Chroma (tests, demos
efímeras). No persiste entre reinicios. La similitud se calcula con coseno
puro sobre los embeddings guardados, particionando por ``skin_type`` igual
que el backend de Chroma.

Sirve también de plantilla mínima para implementar un backend Redis/DB:
basta replicar `lookup`/`store` contra el almacén correspondiente.
"""

from __future__ import annotations

import asyncio
import logging
import math
import threading

from rag.cache.base import SemanticCacheBackend

logger = logging.getLogger(__name__)


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


class InMemorySemanticCache(SemanticCacheBackend):
    name = "memory"

    def __init__(self) -> None:
        # partición skin_type -> lista de (embedding, response_data)
        self._store: dict[str, list[tuple[list[float], dict]]] = {}
        self._lock = threading.Lock()

    async def lookup(
        self,
        query_embedding: list[float],
        profile: dict,
        threshold: float,
    ) -> dict | None:
        skin_type = profile.get("skin_type") or "todas"
        with self._lock:
            entries = list(self._store.get(skin_type, []))
        best: dict | None = None
        best_score = threshold
        for embedding, data in entries:
            score = _cosine(query_embedding, embedding)
            if score >= best_score:
                best_score = score
                best = data
        return best

    async def store(
        self,
        query: str,
        query_embedding: list[float],
        profile: dict,
        response_data: dict,
    ) -> None:
        skin_type = profile.get("skin_type") or "todas"
        with self._lock:
            self._store.setdefault(skin_type, []).append(
                (query_embedding, response_data)
            )

    async def clear(self) -> int:
        with self._lock:
            count = sum(len(v) for v in self._store.values())
            self._store.clear()
        return count

    async def size(self) -> int:
        with self._lock:
            return sum(len(v) for v in self._store.values())
