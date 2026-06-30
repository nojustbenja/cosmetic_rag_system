"""Backend de caché semántico sobre ChromaDB.

Es la implementación por defecto y preserva EXACTAMENTE el comportamiento del
caché que antes vivía embebido en `rag/retriever.py`:

  * Colección Chroma ``semantic_cache`` con espacio coseno.
  * Partición por ``skin_type`` del perfil (``"todas"`` si no hay).
  * ``response_data`` serializado a JSON en la metadata.
  * Umbral de similitud por defecto 0.95.

Al mantener el mismo esquema, las entradas ya escritas en ``chroma_db`` siguen
siendo válidas tras la refactorización (no hay que re-poblar nada).
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid

from rag.cache.base import SemanticCacheBackend
from rag.retriever import _client

logger = logging.getLogger(__name__)

_COLLECTION_NAME = "semantic_cache"


class ChromaSemanticCache(SemanticCacheBackend):
    name = "chroma"

    def _collection(self):
        return _client().get_or_create_collection(
            name=_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    async def lookup(
        self,
        query_embedding: list[float],
        profile: dict,
        threshold: float,
    ) -> dict | None:
        def _sync_query() -> dict | None:
            collection = self._collection()
            if collection.count() == 0:
                return None

            skin_type = (profile.get("skin_type") or "todas").strip().lower()
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=1,
                include=["documents", "metadatas", "distances"],
                where={"skin_type": skin_type},
            )

            distances = results.get("distances", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]

            if distances:
                score = 1 - float(distances[0])
                if score >= threshold:
                    try:
                        return json.loads(metadatas[0].get("response_data", "{}"))
                    except Exception:  # noqa: BLE001 — metadata corrupta => miss
                        return None
            return None

        try:
            return await asyncio.to_thread(_sync_query)
        except Exception as exc:  # noqa: BLE001 — el caché nunca rompe el flujo
            logger.warning("ChromaSemanticCache.lookup falló: %s", exc)
            return None

    async def store(
        self,
        query: str,
        query_embedding: list[float],
        profile: dict,
        response_data: dict,
    ) -> None:
        def _sync_save() -> None:
            collection = self._collection()
            skin_type = (profile.get("skin_type") or "todas").strip().lower()
            collection.add(
                ids=[str(uuid.uuid4())],
                embeddings=[query_embedding],
                documents=[query],
                metadatas=[
                    {
                        "skin_type": skin_type,
                        "response_data": json.dumps(response_data, ensure_ascii=False),
                    }
                ],
            )

        try:
            await asyncio.to_thread(_sync_save)
        except Exception as exc:  # noqa: BLE001
            logger.warning("ChromaSemanticCache.store falló: %s", exc)

    async def clear(self) -> int:
        def _sync_clear() -> int:
            client = _client()
            try:
                existing = client.get_or_create_collection(
                    name=_COLLECTION_NAME,
                    metadata={"hnsw:space": "cosine"},
                )
                count = existing.count()
                client.delete_collection(name=_COLLECTION_NAME)
            except Exception:  # noqa: BLE001
                return 0
            # Recrear vacía para que el siguiente lookup no falle.
            client.get_or_create_collection(
                name=_COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
            )
            return count

        try:
            return await asyncio.to_thread(_sync_clear)
        except Exception as exc:  # noqa: BLE001
            logger.warning("ChromaSemanticCache.clear falló: %s", exc)
            return 0

    async def size(self) -> int:
        def _sync_size() -> int:
            try:
                return self._collection().count()
            except Exception:  # noqa: BLE001
                return 0

        try:
            return await asyncio.to_thread(_sync_size)
        except Exception:  # noqa: BLE001
            return 0
