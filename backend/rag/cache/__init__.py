"""Capa de caché de respuestas RAG (modo caché).

Diseño desacoplado en tres niveles:

    base.py          -> contrato `SemanticCacheBackend` (intercambiable)
    chroma_backend.py-> implementación por defecto (persistente, ChromaDB)
    memory_backend.py-> implementación en memoria (tests / demos)
    config.py        -> flag on/off runtime + selección de backend/umbral
    service.py       -> fachada: lo único que usa el pipeline

El resto del sistema importa SOLO desde aquí (o desde `service`):

    from rag.cache import lookup_cached_response, store_response
"""

from __future__ import annotations

from rag.cache.config import is_cache_enabled, resolve_cache_config, save_cache_config
from rag.cache.service import (
    cache_status,
    clear_cache,
    get_backend,
    lookup_cached_response,
    reset_backend,
    store_response,
)

__all__ = [
    "cache_status",
    "clear_cache",
    "get_backend",
    "is_cache_enabled",
    "lookup_cached_response",
    "reset_backend",
    "resolve_cache_config",
    "save_cache_config",
    "store_response",
]
