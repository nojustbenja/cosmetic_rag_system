"""Fachada del modo caché — única puerta de entrada para el resto del sistema.

El pipeline y los endpoints SOLO usan estas funciones; nunca instancian un
backend ni leen la config directamente. Responsabilidades:

  1. Honrar el flag on/off en caliente (``rag.cache.config``).
     - OFF  -> ``lookup`` devuelve ``None`` siempre y ``store`` es no-op:
       el caché se ignora por completo y se ejecuta el flujo original.
     - ON   -> delega en el backend activo.
  2. Seleccionar y memoizar el backend activo (intercambiable).
  3. Documentar y registrar de forma explícita cada CACHE HIT / CACHE MISS,
     que es justo lo que pide el roadmap ("documentar dónde se produce un
     cache hit y un cache miss").

Contrato de no-romper-nada: ninguna función aquí lanza excepciones hacia el
pipeline. Ante cualquier fallo se registra y se trata como MISS (lookup) o
no-op (store), de modo que el flujo de generación normal siempre puede seguir.
"""

from __future__ import annotations

import logging

from rag.cache.base import SemanticCacheBackend
from rag.cache.config import resolve_cache_config

logger = logging.getLogger(__name__)

# Backend activo memoizado. Se reconstruye con `reset_backend()` cuando el
# BackOffice cambia el almacén seleccionado.
_backend: SemanticCacheBackend | None = None
_backend_name: str | None = None


def _build_backend(name: str) -> SemanticCacheBackend:
    """Fábrica de backends. Punto único donde registrar almacenes nuevos."""
    if name == "memory":
        from rag.cache.memory_backend import InMemorySemanticCache

        return InMemorySemanticCache()
    # Por defecto y para "chroma": almacén persistente sobre ChromaDB.
    from rag.cache.chroma_backend import ChromaSemanticCache

    return ChromaSemanticCache()


def get_backend() -> SemanticCacheBackend:
    global _backend, _backend_name
    desired = resolve_cache_config()["backend"]
    if _backend is None or _backend_name != desired:
        _backend = _build_backend(desired)
        _backend_name = desired
        logger.info("Backend de caché activo: %s", _backend.name)
    return _backend


def reset_backend() -> None:
    """Fuerza reconstrucción del backend en el próximo uso (cambio en caliente)."""
    global _backend, _backend_name
    _backend = None
    _backend_name = None


async def lookup_cached_response(
    query_embedding: list[float],
    profile: dict,
    *,
    query_preview: str = "",
) -> dict | None:
    """Busca una respuesta equivalente ya generada.

    Devuelve el ``response_data`` cacheado (CACHE HIT) o ``None`` (CACHE MISS
    o caché desactivado). Cuando el modo caché está OFF, ni siquiera consulta
    el backend: devuelve ``None`` de inmediato.
    """
    config = resolve_cache_config()
    if not config["enabled"]:
        logger.info("CACHE OFF — se ignora el caché y se ejecuta el flujo normal.")
        return None

    backend = get_backend()
    data = await backend.lookup(query_embedding, profile, config["threshold"])

    if data:
        logger.info(
            "✅ CACHE HIT [%s] query=%r — respuesta reutilizada (sin pipeline).",
            backend.name,
            query_preview[:60],
        )
        return data

    logger.info(
        "❌ CACHE MISS [%s] query=%r — se ejecuta el pipeline completo.",
        backend.name,
        query_preview[:60],
    )
    return None


async def store_response(
    query: str,
    query_embedding: list[float],
    profile: dict,
    response_data: dict,
) -> None:
    """Guarda una respuesta recién generada (no-op si el caché está OFF)."""
    config = resolve_cache_config()
    if not config["enabled"]:
        return

    backend = get_backend()
    await backend.store(query, query_embedding, profile, response_data)
    logger.info("💾 CACHE STORE [%s] query=%r — respuesta guardada.", backend.name, query[:60])


async def clear_cache() -> int:
    """Vacía el caché del backend activo. Devuelve cuántas entradas se borraron."""
    return await get_backend().clear()


async def cache_status() -> dict:
    """Estado del caché para la API: flag, backend, umbral y nº de entradas."""
    config = resolve_cache_config()
    entries = 0
    try:
        entries = await get_backend().size()
    except Exception:  # noqa: BLE001
        entries = 0
    return {
        "enabled": config["enabled"],
        "backend": config["backend"],
        "threshold": config["threshold"],
        "entries": entries,
    }
