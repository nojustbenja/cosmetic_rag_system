from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from config import settings

# Configura el logging raíz a INFO para que los mensajes de observabilidad
# del modo caché (✅ CACHE HIT / ❌ CACHE MISS / 🚫 CACHE BYPASS / 💾 STORE)
# sean visibles en los logs del servidor. Respeta LOG_LEVEL si está definido.
# `force=True` evita que una configuración previa de uvicorn lo silencie.
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    force=True,
)

logger = logging.getLogger(__name__)


def _warmup() -> None:
    """Precarga el modelo de embeddings y las colecciones de Chroma para
    que el PRIMER mensaje del usuario no pague el coste de cold-start
    (cargar SentenceTransformer + abrir el índice HNSW de Chroma)."""
    try:
        from rag.embeddings import embed_text
        from rag.retriever import _client

        # Forzar la carga del modelo de embeddings (lazy lru_cache).
        embed_text("warmup")
        # Forzar apertura de las colecciones (carga el índice en memoria).
        client = _client()
        for name in ("productos", "guias"):
            client.get_or_create_collection(
                name=name, metadata={"hnsw:space": "cosine"}
            ).count()
        logger.info("Warmup RAG completado: embeddings + Chroma listos.")
    except Exception as exc:  # noqa: BLE001 — el warmup nunca debe tumbar el server
        logger.warning("Warmup RAG falló (se cargará on-demand): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ejecutar el warmup en un hilo para no bloquear el arranque del event loop.
    asyncio.create_task(asyncio.to_thread(_warmup))
    yield


app = FastAPI(title="Sistema RAG Cosmetica", lifespan=lifespan)

origins = set(settings.frontend_origins) | {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
