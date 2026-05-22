from __future__ import annotations

from collections.abc import AsyncGenerator

from rag.llm_client import LLMClient

from config import settings
import asyncio
import logging

from rag.prompt_templates import FEW_SHOT_MESSAGES, SYSTEM_PROMPT, SUBAGENT_PROMPT, build_context

logger = logging.getLogger(__name__)

def _extract_field(text: str, label: str) -> str:
    marker = f"{label}: "
    if marker not in text:
        return ""
    after = text.split(marker, 1)[1]
    return after.split(". ", 1)[0].strip().rstrip(".")

async def generate_product_reason(message: str, product: dict) -> str:
    # `product` here is the structured product item (not the raw item with `metadata`)
    # We reconstruct a simple text for the prompt
    prompt = (
        f"{SUBAGENT_PROMPT}\n\n"
        f"Requerimiento del usuario: {message}\n\n"
        f"Contexto del producto recuperado:\n"
        f"Nombre: {product.get('name', 'Producto')}\n"
        f"Categoría: {product.get('category', '')}\n"
        f"Beneficios: {', '.join(product.get('benefits', []))}\n"
        f"Descripción: {product.get('description', '')}\n\n"
        f"Explica brevemente por qué hace match:"
    )
    messages = [{"role": "user", "content": prompt}]
    client = LLMClient()
    try:
        return await client.generate_completion(messages)
    except Exception as e:
        logger.error(f"Error generando razón para producto {product.get('name')}: {e}")
        return "Este producto coincide con las necesidades detectadas en tu consulta."

def _product_context_item(item: dict, message: str) -> dict:
    metadata = item["metadata"]
    text = item["text"]

    # Build a human-readable source label (filename > source > "catálogo")
    raw_filename = metadata.get("filename", "")
    raw_source = metadata.get("source", "catalog")
    if raw_filename:
        rag_source = raw_filename.replace("_", " ").replace("-", " ").strip()
    elif raw_source and raw_source != "catalog":
        rag_source = raw_source
    else:
        rag_source = "Catálogo de productos"

    return {
        "id": item.get("id") or metadata.get("product_name", "product").lower().replace(" ", "-"),
        "name": metadata.get("product_name") or _extract_field(text, "Producto") or "Producto",
        "brand": metadata.get("brand") or _extract_field(text, "Marca"),
        "price": metadata.get("price"),
        "category": metadata.get("category") or _extract_field(text, "Categoria"),
        "skin_types": _split_csv(metadata.get("skin_types") or _extract_field(text, "Tipo de piel")),
        "benefits": _split_csv(_extract_field(text, "Beneficios")),
        "ingredients": _split_csv(_extract_field(text, "Ingredientes")),
        "description": _extract_field(text, "Descripcion"),
        "reason": "", # Se llenará on-demand en el frontend
        "query": message,
        "rag_source": rag_source,
        "source": raw_source,
        "score": round(float(item.get("score", 0)), 4),
        "image_url": metadata.get("image_url", ""),
        "stock": int(metadata.get("stock") or 0),
        "tags": _split_csv(metadata.get("tags") or ""),
    }

def _guide_context_item(item: dict) -> dict:
    metadata = item["metadata"]
    return {
        "filename": metadata.get("filename", "guia"),
        "page": metadata.get("page"),
        "snippet": item["text"][:360],
        "source": metadata.get("source", "guide"),
        "score": round(float(item.get("score", 0)), 4),
    }

def build_retrieval_context(message: str, retrieved_items: list[dict]) -> dict:
    products = []
    guides = []
    
    for item in retrieved_items:
        if item["metadata"].get("source") == "catalog":
            products.append(_product_context_item(item, message))
        else:
            guides.append(_guide_context_item(item))
            
    return {"products": products[:6], "guides": guides[:4]}

async def retrieve_context(message: str) -> tuple[dict, list[dict]]:
    retrieved_items = await retrieve_all(message)
    context_data = build_retrieval_context(message, retrieved_items)
    return context_data, retrieved_items


def _build_messages(message: str, session_history: list[dict], context: str) -> list[dict]:
    messages = [{"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{context}"}]
    messages.extend(FEW_SHOT_MESSAGES)
    messages.extend(session_history[-8:])
    messages.append({"role": "user", "content": message})
    return messages


async def _fallback_response(message: str, retrieved_items: list[dict]) -> AsyncGenerator[str, None]:
    products = [item for item in retrieved_items if item["metadata"].get("source") == "catalog"][:3]
    if not products:
        yield "No encontre productos adecuados en el catalogo ingresado. Ejecuta la ingesta o agrega productos al CSV."
        return

    yield "Modo local sin API key. Estas son recomendaciones basadas en el catalogo recuperado:\n\n"
    for item in products:
        metadata = item["metadata"]
        text = item["text"]
        yield f"- **Producto**: {metadata.get('product_name', 'Producto')}\n"
        yield f"- **Por que**: coincide con la consulta \"{message}\" y aparece como relevante en el catalogo.\n"
        yield "- **Tip de uso**: usar segun la rutina recomendada y ajustar frecuencia segun tolerancia de la piel.\n"
        yield f"- **Precio**: {format_clp(metadata.get('price'))}\n"
        yield f"- **Contexto**: {text}\n\n"


async def generate_response(
    message: str,
    session_history: list[dict],
    retrieved_items: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    if retrieved_items is None:
        retrieved_items = await retrieve_all(message)
    if not settings.llm_api_key:
        async for token in _fallback_response(message, retrieved_items):
            yield token
        return

    client = LLMClient()
    messages = _build_messages(message, session_history, build_context(retrieved_items))
    async for token in client.stream_completion(messages):
        yield token
