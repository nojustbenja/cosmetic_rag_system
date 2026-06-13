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

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(max(top_k * 3, top_k), collection.count()),
            include=["documents", "metadatas", "distances"],
        )
        formatted = _format_results(results)

        if skin_type:
            formatted = [item for item in formatted if _matches_skin_type(item["metadata"], skin_type)]

        if category:
            for item in formatted:
                if str(item["metadata"].get("category", "")) == category:
                    item["score"] = min(1.0, item["score"] + 0.12)
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
    }
    matches: list[tuple[int, str]] = []
    for alias, candidate_category in category_aliases.items():
        idx = normalized.find(alias)
        if idx != -1:
            matches.append((idx, candidate_category))

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

        category = min(candidates, key=lambda m: m[0])[1]

    if not skin_type and not category:
        return None
    return {"skin_type": skin_type, "category": category}


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
        import re
        from rank_bm25 import BM25Okapi

        def _tokenize(text: str) -> list[str]:
            return re.findall(r"\w+", text.lower())

        # El campo "Tipo de piel" es una lista de etiquetas separadas por comas
        # (ej. "todas,sensible,seca,grasa,mixta"). Si se tokeniza junto al resto,
        # cualquier mención de un tipo de piel en la consulta hace match con
        # productos "todas" aunque no sean relevantes, distorsionando el ranking.
        # Se excluye del texto usado para BM25 (la búsqueda semántica y los
        # filtros de tipo de piel ya se encargan de eso).
        skin_type_pattern = re.compile(r"tipo de piel:[^.]*\.", re.IGNORECASE)
        corpus = [skin_type_pattern.sub("", item["text"]) for item in results]
        tokenized_corpus = [_tokenize(doc) for doc in corpus]
        bm25 = BM25Okapi(tokenized_corpus)

        tokenized_query = _tokenize(query)
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
