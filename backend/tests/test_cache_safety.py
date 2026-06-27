"""Tests de seguridad del modo caché frente a alergias.

Verifica la regla crítica: una respuesta cacheada para un perfil SIN alergias
nunca debe reutilizarse para un perfil CON alergias (podría recomendar un
producto contraindicado). La fachada `rag.cache.service` debe hacer bypass
total — lookup devuelve None y store es no-op — en cuanto el perfil declara
cualquier alergia.

Se usa el backend en memoria para no depender de ChromaDB y se fuerza el
modo caché a ON con monkeypatch sobre `resolve_cache_config`.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest

from rag.cache import service


@pytest.fixture
def memory_cache(monkeypatch):
    """Fuerza caché ON + backend en memoria limpio para cada test."""
    config = {"enabled": True, "backend": "memory", "threshold": 0.95}
    monkeypatch.setattr(service, "resolve_cache_config", lambda: config)
    # Backend en memoria fresco, aislado entre tests.
    service.reset_backend()
    from rag.cache.memory_backend import InMemorySemanticCache

    backend = InMemorySemanticCache()
    monkeypatch.setattr(service, "get_backend", lambda: backend)
    yield backend
    service.reset_backend()


# Embedding determinista: misma query => mismo vector, coseno == 1.0.
_EMBEDDING = [0.1, 0.2, 0.3, 0.4]
_QUERY = "Busco una crema hidratante de día"
_RESPONSE = {"products": [{"name": "Crema X"}], "guides": [], "response": "Te recomiendo Crema X."}


@pytest.mark.asyncio
async def test_profile_without_allergies_stores_and_hits(memory_cache):
    """Perfil sin alergias: store + HIT en la misma query."""
    profile = {"skin_type": "seca", "allergies": []}

    await service.store_response(_QUERY, _EMBEDDING, profile, _RESPONSE)
    assert await memory_cache.size() == 1, "la respuesta debió guardarse en caché"

    hit = await service.lookup_cached_response(_EMBEDDING, profile, query_preview=_QUERY)
    assert hit is not None, "debería haber CACHE HIT para un perfil sin alergias"
    assert hit == _RESPONSE


@pytest.mark.asyncio
async def test_profile_with_allergies_forces_miss(memory_cache):
    """MISMA query con alergias: MISS forzado aunque exista la entrada cacheada."""
    # 1. Poblamos el caché con un perfil SIN alergias (mismo skin_type/query).
    safe_profile = {"skin_type": "seca", "allergies": []}
    await service.store_response(_QUERY, _EMBEDDING, safe_profile, _RESPONSE)
    assert await memory_cache.size() == 1

    # 2. Un perfil CON alergia hace la MISMA consulta: debe ser bypass total.
    allergic_profile = {"skin_type": "seca", "allergies": ["retinol"]}
    result = await service.lookup_cached_response(
        _EMBEDDING, allergic_profile, query_preview=_QUERY
    )
    assert result is None, "con alergias el lookup debe hacer bypass (None) por seguridad"


@pytest.mark.asyncio
async def test_store_with_allergies_is_noop(memory_cache):
    """store con alergias no escribe nada en el caché."""
    allergic_profile = {"skin_type": "grasa", "allergies": ["ácido salicílico"]}

    await service.store_response(_QUERY, _EMBEDDING, allergic_profile, _RESPONSE)
    assert await memory_cache.size() == 0, "no debe guardarse caché para perfiles con alergias"
