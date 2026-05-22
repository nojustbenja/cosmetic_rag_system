from __future__ import annotations

from collections.abc import AsyncGenerator

from rag.llm_client import LLMClient

from config import settings
from rag.prompt_templates import FEW_SHOT_MESSAGES, SYSTEM_PROMPT, build_context
from rag.retriever import retrieve_all


def format_clp(value: object) -> str:
    try:
        amount = int(float(str(value).replace(".", "").replace(",", ".")))
    except (TypeError, ValueError):
        return "N/D"
    return f"CLP ${amount:,}".replace(",", ".")


def _split_csv(value: object) -> list[str]:
    if value is None:
        return []
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _extract_field(text: str, label: str) -> str:
    marker = f"{label}: "
    if marker not in text:
        return ""
    after = text.split(marker, 1)[1]
    return after.split(". ", 1)[0].strip().rstrip(".")


def _build_product_reason(message: str, metadata: dict, text: str) -> str:
    """Build a human-readable, cause-effect explanation for a recommendation.

    Combines the original user query, matched product attributes and the
    document source to produce a specific (non-generic) reasoning string.
    """
    normalized = message.lower()

    # --- Collect matched attributes ---
    matched_skin: list[str] = []
    for skin_type in _split_csv(metadata.get("skin_types")):
        if skin_type.lower() in normalized or "todas" in skin_type.lower():
            matched_skin.append(f"piel {skin_type}")

    category = str(metadata.get("category") or "")
    category_label = category.replace("_", " ")
    category_hit = category and any(
        part in normalized for part in category_label.split()
    )

    benefits = _split_csv(_extract_field(text, "Beneficios"))
    matched_benefits: list[str] = []
    for benefit in benefits:
        terms = [t for t in benefit.lower().split() if len(t) > 4]
        if any(t in normalized for t in terms):
            matched_benefits.append(benefit)

    # --- Build the cause-effect sentence ---
    query_snippet = message[:60].strip()
    parts: list[str] = []

    if matched_skin:
        skin_str = ", ".join(list(dict.fromkeys(matched_skin))[:2])
        parts.append(f"Se ajusta a tu consulta de {skin_str}")
    elif category_hit:
        parts.append(f"Corresponde a la categoría {category_label} que buscas")
    else:
        parts.append(f'Recuperado por similitud semántica con "{query_snippet}"')

    if matched_benefits:
        benefit_str = ", ".join(list(dict.fromkeys(matched_benefits))[:2])
        parts.append(f"ofrece {benefit_str}")

    brand = metadata.get("brand", "")
    if brand:
        parts.append(f"de {brand}")

    sentence = " · ".join(parts) + "."
    return sentence


def _product_context_item(item: dict, message: str) -> dict:
    metadata = item["metadata"]
    text = item["text"]
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
        "reason": _build_product_reason(message, metadata, text),
        "source": metadata.get("source", "catalog"),
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
    return build_retrieval_context(message, retrieved_items), retrieved_items


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
