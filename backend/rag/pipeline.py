from __future__ import annotations

from collections.abc import AsyncGenerator

from rag.llm_client import LLMClient

from config import settings
import asyncio
import logging

from rag.prompt_templates import FEW_SHOT_MESSAGES, PROFILER_SYSTEM_PROMPT, RECOMMENDER_SYSTEM_PROMPT, ANALYZER_SYSTEM_PROMPT, SUBAGENT_PROMPT, build_context
from rag.retriever import retrieve_all
import json

logger = logging.getLogger(__name__)

def _extract_field(text: str, label: str) -> str:
    marker = f"{label}: "
    if marker not in text:
        return ""
    after = text.split(marker, 1)[1]
    return after.split(". ", 1)[0].strip().rstrip(".")

def _split_csv(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in str(value).split(",") if item.strip()]

def _format_clp(value: object) -> str:
    try:
        amount = float(value or 0)
    except (TypeError, ValueError):
        return "$0"
    return f"${amount:,.0f}".replace(",", ".")

def _profile_signals(message: str) -> list[str]:
    lowered = message.lower()
    signals: list[str] = []
    checks = [
        ("piel seca", ["piel seca", "reseca", "tirantez", "descam"]),
        ("piel sensible", ["sensible", "irrita", "rojec", "rosacea"]),
        ("piel grasa", ["piel grasa", "brillo", "sebo", "oil control"]),
        ("piel mixta", ["piel mixta", "zona t"]),
        ("hidratacion", ["hidrata", "hidrat", "acido hialuronico"]),
        ("uso de noche", ["noche", "nocturna", "pm"]),
        ("uso de dia", ["dia", "mañana", "am", "spf", "solar"]),
        ("antiedad", ["antiedad", "arrugas", "lineas", "edad"]),
        ("acne o poros", ["acne", "granitos", "poros", "imperfecciones"]),
        ("aroma amaderado", ["amaderado", "madera", "cedro", "oud"]),
    ]
    for label, needles in checks:
        if any(needle in lowered for needle in needles):
            signals.append(label)
    return signals or ["necesidad descrita por el cliente"]

async def generate_product_reason(message: str, product: dict) -> str:
    # `product` here is the structured product item (not the raw item with `metadata`)
    # We reconstruct a simple text for the prompt
    benefits = _split_csv(product.get("benefits", []))
    skin_types = _split_csv(product.get("skin_types", []))
    tags = _split_csv(product.get("tags", []))
    ingredients = _split_csv(product.get("ingredients", []))
    signals = _profile_signals(message)
    prompt = (
        f"{SUBAGENT_PROMPT}\n\n"
        f"Requerimiento del usuario: {message}\n\n"
        f"Señales detectadas para orientar al vendedor: {', '.join(signals)}\n\n"
        f"Contexto del producto recuperado:\n"
        f"Nombre: {product.get('name', 'Producto')}\n"
        f"Marca: {product.get('brand', '')}\n"
        f"Categoría: {product.get('category', '')}\n"
        f"Tipo de piel sugerido: {', '.join(skin_types) if skin_types else 'no especificado'}\n"
        f"Beneficios: {', '.join(benefits) if benefits else 'no especificados'}\n"
        f"Ingredientes: {', '.join(ingredients) if ingredients else 'no especificados'}\n"
        f"Tags RAG: {', '.join(tags) if tags else 'no especificados'}\n"
        f"Precio: {_format_clp(product.get('price'))}\n"
        f"Stock: {product.get('stock', 'no especificado')}\n"
        f"Descripción: {product.get('description', '')}\n\n"
        f"Genera el argumento de venta:"
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


async def analyze_intent(message: str, session_history: list[dict]) -> bool:
    messages = [{"role": "system", "content": ANALYZER_SYSTEM_PROMPT}]
    messages.extend(session_history[-4:])
    messages.append({"role": "user", "content": message})
    client = LLMClient()
    try:
        response = await client.generate_completion(messages)
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned.split("```json", 1)[1]
        if "```" in cleaned:
            cleaned = cleaned.split("```", 1)[0]
        data = json.loads(cleaned.strip())
        return data.get("has_enough_profile", False)
    except Exception as e:
        logger.error(f"Error analizando intención: {e}")
        return True


async def _fallback_response(message: str, retrieved_items: list[dict]) -> AsyncGenerator[str, None]:
    products = [item for item in retrieved_items if item["metadata"].get("source") == "catalog"][:3]
    if not products:
        yield "No encontre productos adecuados en el catalogo ingresado. Ejecuta la ingesta o agrega productos al CSV."
        return

    yield "Modo local sin API key. Estas son recomendaciones basadas en el catalogo recuperado:\n\n"
    for item in products:
        metadata = item["metadata"]
        text = item["text"]
        price_str = _format_clp(metadata.get("price"))
        yield f"- **Producto**: {metadata.get('product_name', 'Producto')}\n"
        benefits = _extract_field(text, "Beneficios")
        skin_types = _extract_field(text, "Tipo de piel")
        signals = ", ".join(_profile_signals(message))
        reason = benefits or "sus atributos principales calzan con la necesidad detectada"
        if skin_types:
            reason += f" y esta orientado a piel {skin_types}"
        yield f"- **Por que venderlo**: responde a {signals}; {reason}.\n"
        yield "- **Frase para el cliente**: te lo recomiendo porque calza con lo que me contaste y ayuda a sostener la rutina sin complicarla.\n"
        yield "- **Tip de uso**: explicar frecuencia y momento de uso segun tolerancia, especialmente si la piel es sensible.\n"
        yield f"- **Precio**: {price_str}\n"
        yield f"- **Contexto**: {text}\n\n"

async def generate_profiler_response(
    message: str,
    session_history: list[dict],
) -> AsyncGenerator[str, None]:
    messages = [{"role": "system", "content": PROFILER_SYSTEM_PROMPT}]
    messages.extend(FEW_SHOT_MESSAGES)
    messages.extend(session_history[-8:])
    messages.append({"role": "user", "content": message})
    
    client = LLMClient()
    async for token in client.stream_completion(messages):
        yield token

async def generate_recommender_response(
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
    messages = [{"role": "system", "content": RECOMMENDER_SYSTEM_PROMPT}]
    messages.extend(session_history[-8:])
    messages.append({"role": "user", "content": message})
    async for token in client.stream_completion(messages):
        yield token
