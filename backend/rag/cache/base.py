"""Contrato del backend de caché semántico.

Esta interfaz es el punto de desacople que pide el roadmap: el resto del
sistema (pipeline, routes) habla SIEMPRE contra esta abstracción a través del
servicio (`rag.cache.service`), nunca contra una implementación concreta.

Para cambiar el almacén del caché en el futuro (memoria, Redis, Postgres,
pgvector, etc.) basta con:
  1. Implementar esta clase en un módulo nuevo (ej. `redis_backend.py`).
  2. Registrarlo en `rag.cache.service._build_backend`.
No hay que tocar el pipeline ni los endpoints.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class SemanticCacheBackend(ABC):
    """Almacén intercambiable para respuestas RAG ya generadas.

    La clave del caché es semántica: un *embedding* de la consulta más el
    `skin_type` del perfil como partición. Cada backend decide cómo persistir
    y cómo medir la similitud, pero todos respetan el mismo contrato.
    """

    #: Nombre legible del backend, usado en logs y en la respuesta de la API.
    name: str = "base"

    @abstractmethod
    async def lookup(
        self,
        query_embedding: list[float],
        profile: dict,
        threshold: float,
    ) -> dict | None:
        """Devuelve la respuesta cacheada equivalente o ``None`` (cache miss).

        Debe devolver ``None`` cuando no haya ninguna entrada con similitud
        coseno ``>= threshold`` para la partición del perfil. Nunca debe
        lanzar: ante un error interno, registra y devuelve ``None`` para que
        el pipeline siga con el flujo normal.
        """

    @abstractmethod
    async def store(
        self,
        query: str,
        query_embedding: list[float],
        profile: dict,
        response_data: dict,
    ) -> None:
        """Guarda una respuesta recién generada. No debe lanzar nunca."""

    async def clear(self) -> int:
        """Vacía el caché. Devuelve cuántas entradas se eliminaron.

        Opcional: los backends que no lo soporten devuelven 0.
        """
        return 0

    async def size(self) -> int:
        """Número de entradas almacenadas (0 si no se puede determinar)."""
        return 0
