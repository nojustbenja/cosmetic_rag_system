from __future__ import annotations

import chromadb

from config import settings
from rag.embeddings import embed_text


def _client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path=settings.chroma_path)


def _format_results(results: dict) -> list[dict]:
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    formatted: list[dict] = []

    for document, metadata, distance in zip(documents, metadatas, distances):
        formatted.append(
            {
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
        if expected not in str(metadata.get(key, "")).lower():
            return False
    return True


def retrieve_products(
    query_embedding: list[float],
    filters: dict | None = None,
    top_k: int = 6,
) -> list[dict]:
    collection = _client().get_or_create_collection(name="productos")
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


def retrieve_guides(query_embedding: list[float], top_k: int = 4) -> list[dict]:
    collection = _client().get_or_create_collection(name="guias")
    if collection.count() == 0:
        return []
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )
    return _format_results(results)


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


def retrieve_all(query: str, filters: dict | None = None) -> list[dict]:
    query_embedding = embed_text(query)
    active_filters = filters if filters is not None else infer_filters(query)
    results = retrieve_products(query_embedding, active_filters) + retrieve_guides(query_embedding)
    return sorted(results, key=lambda item: item["score"], reverse=True)[:10]
