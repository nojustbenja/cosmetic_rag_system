from __future__ import annotations

import asyncio
import threading
import chromadb

from config import settings
from rag.embeddings import embed_text

_client_lock = threading.Lock()
_shared_client: chromadb.PersistentClient | None = None


def _client() -> chromadb.PersistentClient:
    global _shared_client
    if _shared_client is None:
        with _client_lock:
            if _shared_client is None:
                _shared_client = chromadb.PersistentClient(path=settings.chroma_path)
    return _shared_client


def _format_results(results: dict) -> list[dict]:
    ids = results.get("ids", [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    formatted: list[dict] = []

    for id_, document, metadata, distance in zip(ids, documents, metadatas, distances):
        formatted.append(
            {
                "id": id_,
                "text": document,
                "metadata": metadata,
                "score": 1 - float(distance),
            }
        )
    return formatted


def _matches_skin_type(metadata: dict, skin_type: str) -> bool:
    val = str(metadata.get("skin_types", "")).lower()
    if "todas" in val:
        return True
    return skin_type in val


async def retrieve_products(
    query_embedding: list[float],
    filters: dict | None = None,
    top_k: int = 6,
) -> list[dict]:
    def _sync_query():
        collection = _client().get_or_create_collection(
            name="productos",
            metadata={"hnsw:space": "cosine"},
        )
        if collection.count() == 0:
            return []
        skin_type = (filters or {}).get("skin_type")
        category = (filters or {}).get("category")
        allergies = (filters or {}).get("allergies", [])

        where_clause = {}
        if category:
            where_clause["category"] = category

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(max(top_k * 3, top_k), collection.count()),
            include=["documents", "metadatas", "distances"],
            where=where_clause if where_clause else None
        )
        formatted = _format_results(results)

        if skin_type:
            formatted = [item for item in formatted if _matches_skin_type(item["metadata"], skin_type)]

        if allergies:
            safe_items = []
            for item in formatted:
                ingredients = str(item["metadata"].get("ingredients", "")).lower()
                has_allergen = any(allergy.lower() in ingredients for allergy in allergies)
                if not has_allergen:
                    safe_items.append(item)
            formatted = safe_items

        formatted = sorted(formatted, key=lambda item: item["score"], reverse=True)

        return formatted[:top_k]

    return await asyncio.to_thread(_sync_query)


async def retrieve_guides(query_embedding: list[float], top_k: int = 4) -> list[dict]:
    def _sync_query():
        collection = _client().get_or_create_collection(
            name="guias",
            metadata={"hnsw:space": "cosine"},
        )
        if collection.count() == 0:
            return []
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )
        return _format_results(results)

    return await asyncio.to_thread(_sync_query)


def _is_negated(text: str, idx: int, window: int = 20) -> bool:
    prefix = text[max(0, idx - window):idx]
    return any(neg in prefix for neg in ("no ", "sin ", "para nada", "nada de"))


def infer_filters(query: str) -> dict | None:
    normalized = query.lower()

    skin_type = None
    for candidate in ("seca", "grasa", "mixta", "sensible", "normal"):
        for pattern in (f"piel {candidate}", candidate):
            idx = normalized.find(pattern)
            if idx != -1 and not _is_negated(normalized, idx):
                skin_type = candidate
                break
        if skin_type:
            break

    category_aliases = {
        "facial": "cuidado_facial",
        "rostro": "cuidado_facial",
        "crema": "cuidado_facial",
        "serum": "cuidado_facial",
        "sérum": "cuidado_facial",
        "mascarilla": "cuidado_facial",
        "contorno de ojos": "cuidado_facial",
        "tonico": "cuidado_facial",
        "tónico": "cuidado_facial",
        "exfoliante": "cuidado_facial",
        "solar": "proteccion_solar",
        "protector": "proteccion_solar",
        "bloqueador": "proteccion_solar",
        "maquillaje": "maquillaje",
        "base liquida": "maquillaje",
        "base líquida": "maquillaje",
        "labial": "maquillaje",
        "pestañas": "maquillaje",
        "sombras": "maquillaje",
        "iluminador": "maquillaje",
        "limpiador": "limpieza",
        "limpieza": "limpieza",
        "desmaquillante": "limpieza",
        "agua micelar": "limpieza",
        "perfume": "fragancias",
        "fragancia": "fragancias",
        "eau de": "fragancias",
        "cabello": "cabello",
        "pelo": "cabello",
        "champu": "cabello",
        "champú": "cabello",
        "shampoo": "cabello",
        "aceite capilar": "cabello",
        "corporal": "cuidado_corporal",
        "cuerpo": "cuidado_corporal",
        "exfoliante corporal": "cuidado_corporal",
        "crema corporal": "cuidado_corporal",
        "brocha": "accesorios",
        "brochas": "accesorios",
        "esponja": "accesorios",
        "accesorio": "accesorios",
    }
    # (idx, -len(alias), category): el índice prioriza el alias más cercano y,
    # ante un empate de posición, el alias más largo gana (más específico),
    # p. ej. "crema corporal" → cuidado_corporal en vez de "crema" → cuidado_facial.
    matches: list[tuple[int, int, str]] = []
    for alias, candidate_category in category_aliases.items():
        idx = normalized.find(alias)
        if idx != -1:
            matches.append((idx, -len(alias), candidate_category))

    category = None
    if matches:
        # Si hay un verbo de necesidad ("necesito", "busco", etc.), la categoría
        # buscada suele ser el alias más cercano que aparece DESPUÉS de ese verbo
        # (evita que palabras mencionadas de paso, ej. "maquillaje" al hablar de
        # removerlo, se confundan con el producto que el cliente realmente pide).
        anchor_idx = None
        for anchor in ("necesito", "busco", "quiero", "quisiera", "recomi", "dame", "ocupo"):
            i = normalized.find(anchor)
            if i != -1 and (anchor_idx is None or i < anchor_idx):
                anchor_idx = i

        candidates = matches
        if anchor_idx is not None:
            after_anchor = [m for m in matches if m[0] >= anchor_idx]
            if after_anchor:
                candidates = after_anchor

        category = min(candidates, key=lambda m: (m[0], m[1]))[2]

    if not skin_type and not category:
        return None
    return {"skin_type": skin_type, "category": category}


async def retrieve_all(queries: str | list[str], filters: dict | None = None) -> list[dict]:
    query_list = [queries] if isinstance(queries, str) else queries
    original_query = query_list[0]
    active_filters = filters if filters is not None else infer_filters(original_query)
    
    # Generar embeddings concurrentemente
    embed_tasks = [asyncio.to_thread(embed_text, q) for q in query_list]
    embeddings = await asyncio.gather(*embed_tasks)
    
    search_tasks = []
    for emb in embeddings:
        search_tasks.append(retrieve_products(emb, active_filters, top_k=20))
        search_tasks.append(retrieve_guides(emb, top_k=10))
        
    search_results = await asyncio.gather(*search_tasks)
    
    all_results = []
    seen_ids = set()
    for res_list in search_results:
        for item in res_list:
            item_id = item.get("id")
            if item_id not in seen_ids:
                seen_ids.add(item_id)
                all_results.append(item)
                
    results = all_results
    if not results:
        return []
        
    try:
        import re
        from rank_bm25 import BM25Okapi

        def _tokenize(text: str) -> list[str]:
            return re.findall(r"\w+", text.lower())

        skin_type_pattern = re.compile(r"tipo de piel:[^.]*\.", re.IGNORECASE)
        corpus = [skin_type_pattern.sub("", item["text"]) for item in results]
        tokenized_corpus = [_tokenize(doc) for doc in corpus]
        bm25 = BM25Okapi(tokenized_corpus)

        tokenized_query = _tokenize(original_query)
        bm25_scores = bm25.get_scores(tokenized_query)
        
        max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
        normalized_bm25 = [score / max_bm25 for score in bm25_scores]
        
        for item, bm_score in zip(results, normalized_bm25):
            dense_score = item.get("score", 0.0)
            item["score"] = (0.7 * dense_score) + (0.3 * bm_score)
            
    except ImportError:
        pass
        
    # Ordenar por el score híbrido inicial
    results = sorted(results, key=lambda item: item["score"], reverse=True)
    
    # RERANKING con CrossEncoder
    if getattr(settings, "reranking_enabled", True):
        try:
            from sentence_transformers import CrossEncoder
            import logging
            import os
            from config import settings
            logger = logging.getLogger(__name__)
            
            # Cargar el reranker de forma lazy. Podés cambiar el modelo por uno en español si es necesario
            # e.g. "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"
            model_name = "cross-encoder/ms-marco-MiniLM-L-6-v2"
            
            def _get_reranker():
                if not hasattr(_get_reranker, "model"):
                    if not settings.allow_embedding_download:
                        os.environ.setdefault("HF_HUB_OFFLINE", "1")
                        os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
                    try:
                        _get_reranker.model = CrossEncoder(model_name, local_files_only=True, device="cpu")
                    except Exception as e:
                        if settings.allow_embedding_download:
                            _get_reranker.model = CrossEncoder(model_name, device="cpu")
                        else:
                            raise e
                return _get_reranker.model

            def _sync_rerank():
                reranker = _get_reranker()
                # Preparar pares (original_query, documento)
                pairs = [[original_query, item["text"]] for item in results]
                scores = reranker.predict(pairs)
                
                # Actualizar scores con la predicción del CrossEncoder
                for item, score in zip(results, scores):
                    item["score"] = float(score)
                
                # Reordenar basado en el score del Reranker
                return sorted(results, key=lambda item: item["score"], reverse=True)
                
            # Ejecutar reranking en thread separado para no bloquear el loop
            results = await asyncio.to_thread(_sync_rerank)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Reranking no ejecutado, se usará el ranking híbrido original. Error: {e}")
            pass
    else:
        import logging
        logging.getLogger(__name__).info("Reranking desactivado en la configuración; omitiendo rerank CrossEncoder.")
        
    return results[:10]


def get_all_products_from_db() -> list[dict]:
    client = _client()
    collection = client.get_or_create_collection(
        name="productos",
        metadata={"hnsw:space": "cosine"},
    )
    if collection.count() == 0:
        return []
    results = collection.get(include=["documents", "metadatas"])
    
    ids = results.get("ids", [])
    documents = results.get("documents", [])
    metadatas = results.get("metadatas", [])
    
    formatted: list[dict] = []
    for id_, doc, meta in zip(ids, documents, metadatas):
        formatted.append({
            "id": id_,
            "name": meta.get("product_name") or "Producto",
            "brand": meta.get("brand", ""),
            "price": float(meta.get("price") or 0),
            "category": meta.get("category", ""),
            "skin_types": [item.strip() for item in str(meta.get("skin_types", "")).split(",") if item.strip()],
            "description": meta.get("description") or doc,
            "source": "catalog",
            "image_url": meta.get("image_url", ""),
            "stock": int(meta.get("stock") or 0),
            "tags": [item.strip() for item in str(meta.get("tags", "")).split(",") if item.strip()],
            "ingredients": meta.get("ingredients") or "",
            "benefits": [item.strip() for item in str(meta.get("benefits", "")).split(",") if item.strip()],
        })
    return formatted

# --------------------------------------------------------------------------
# Caché semántico (compatibilidad hacia atrás)
#
# La lógica del caché se movió al paquete desacoplado `rag.cache`. Estas dos
# funciones se conservan como *shims* delgados para no romper imports
# existentes; ahora delegan en el servicio, que honra el flag on/off del modo
# caché y registra explícitamente cada CACHE HIT / CACHE MISS.
#
# El import es perezoso a propósito: el backend de Chroma importa `_client`
# desde este módulo, así que importar `rag.cache` en el top-level crearía un
# ciclo.
# --------------------------------------------------------------------------
async def check_semantic_cache(
    query_embedding: list[float], profile: dict, threshold: float = 0.95
) -> dict | None:
    from rag.cache import lookup_cached_response

    return await lookup_cached_response(query_embedding, profile)


async def save_to_semantic_cache(
    query: str, query_embedding: list[float], profile: dict, response_data: dict
) -> None:
    from rag.cache import store_response

    await store_response(query, query_embedding, profile, response_data)

