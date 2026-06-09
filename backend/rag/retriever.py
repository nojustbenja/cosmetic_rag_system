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


def _split_filters(filters: dict | None) -> tuple[dict | None, dict[str, str]]:
    if not filters:
        return None, {}

    exact_filters: list[dict] = []
    contains_filters: dict[str, str] = {}
    filter_items = filters.get("$and", [filters])

    for item in filter_items:
        for key, value in item.items():
            if isinstance(value, dict) and "$contains" in value:
                contains_filters[key] = str(value["$contains"]).lower()
            else:
                exact_filters.append({key: value})

    if not exact_filters:
        return None, contains_filters
    if len(exact_filters) == 1:
        return exact_filters[0], contains_filters
    return {"$and": exact_filters}, contains_filters


def _matches_contains_filters(result: dict, contains_filters: dict[str, str]) -> bool:
    metadata = result["metadata"]
    for key, expected in contains_filters.items():
        val = str(metadata.get(key, "")).lower()
        if key == "skin_types" and "todas" in val:
            continue
        if expected not in val:
            return False
    return True


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
        exact_filters, contains_filters = _split_filters(filters)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(max(top_k * 3, top_k), collection.count()),
            where=exact_filters,
            include=["documents", "metadatas", "distances"],
        )
        formatted = _format_results(results)
        if contains_filters:
            formatted = [item for item in formatted if _matches_contains_filters(item, contains_filters)]
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


def infer_filters(query: str) -> dict | None:
    normalized = query.lower()
    filters: list[dict] = []
    for skin_type in ("seca", "grasa", "mixta", "sensible", "normal"):
        if f"piel {skin_type}" in normalized or skin_type in normalized:
            filters.append({"skin_types": {"$contains": skin_type}})

    category_aliases = {
        "facial": "cuidado_facial",
        "rostro": "cuidado_facial",
        "solar": "proteccion_solar",
        "protector": "proteccion_solar",
        "maquillaje": "maquillaje",
        "limpiador": "limpieza",
        "limpieza": "limpieza",
        "perfume": "fragancias",
        "fragancia": "fragancias",
        "cabello": "cabello",
        "pelo": "cabello",
        "champu": "cabello",
        "shampoo": "cabello",
        "aceite capilar": "cabello",
    }
    for alias, category in category_aliases.items():
        if alias in normalized:
            filters.append({"category": category})
            break

    if not filters:
        return None
    if len(filters) == 1:
        return filters[0]
    return {"$and": filters}


async def retrieve_all(query: str, filters: dict | None = None) -> list[dict]:
    # Generar embedding en un hilo separado para no bloquear el loop
    query_embedding = await asyncio.to_thread(embed_text, query)
    active_filters = filters if filters is not None else infer_filters(query)
    
    # Obtener más candidatos para el reranking híbrido
    products_task = retrieve_products(query_embedding, active_filters, top_k=15)
    guides_task = retrieve_guides(query_embedding, top_k=8)
    
    products, guides = await asyncio.gather(products_task, guides_task)
    
    results = products + guides
    if not results:
        return []
        
    try:
        from rank_bm25 import BM25Okapi
        corpus = [item["text"] for item in results]
        tokenized_corpus = [doc.lower().split() for doc in corpus]
        bm25 = BM25Okapi(tokenized_corpus)
        
        tokenized_query = query.lower().split()
        bm25_scores = bm25.get_scores(tokenized_query)
        
        max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
        normalized_bm25 = [score / max_bm25 for score in bm25_scores]
        
        for item, bm_score in zip(results, normalized_bm25):
            dense_score = item.get("score", 0.0)
            # RRF (Reciprocal Rank Fusion) style blending: 70% dense, 30% keyword
            item["score"] = (0.7 * dense_score) + (0.3 * bm_score)
    except ImportError:
        pass
        
    return sorted(results, key=lambda item: item["score"], reverse=True)[:10]


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
