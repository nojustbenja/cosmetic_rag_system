from __future__ import annotations

from collections.abc import AsyncGenerator

from rag.llm_client import LLMClient

from config import settings
import asyncio
import logging

from rag.prompt_templates import FEW_SHOT_MESSAGES, PROFILER_SYSTEM_PROMPT, RECOMMENDER_SYSTEM_PROMPT, SOFT_RECOMMENDER_SYSTEM_PROMPT, ANALYZER_SYSTEM_PROMPT, SUBAGENT_PROMPT, build_context
from rag.retriever import retrieve_all
from utils.timing import profile_time, profile_block
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

@profile_time
def extract_client_profile(message: str, session_history: list[dict] | None = None) -> dict:
    history_text = " ".join(str(item.get("content", "")) for item in (session_history or [])[-6:])
    text = f"{history_text} {message}".lower()

    def pick(label_map: dict[str, list[str]]) -> str:
        for label, needles in label_map.items():
            if any(needle in text for needle in needles):
                return label
        return ""

    skin_type = pick({
        "seca": ["piel seca", "reseca", "tirantez", "descam"],
        "sensible": ["piel sensible", "sensible", "irrita", "rojec", "rosacea"],
        "grasa": ["piel grasa", "brillo", "sebo", "oil control"],
        "mixta": ["piel mixta", "zona t"],
        "normal": ["piel normal"],
    })
    category = pick({
        "fragancias": ["perfume", "fragancia", "aroma", "amaderado", "floral"],
        "proteccion_solar": ["protector", "solar", "spf", "bloqueador", "after sun", "after-sun"],
        "limpieza": ["limpiador", "limpieza", "agua micelar", "desmaquillante"],
        "maquillaje": ["maquillaje", "base", "labial", "pestañas", "sombras"],
        "cabello": ["cabello", "pelo", "champú", "shampoo", "capilar"],
        "accesorios": ["brocha", "brochas", "esponja", "accesorio", "set de brochas"],
        "cuidado_corporal": ["corporal", "cuerpo", "body", "exfoliante corporal"],
        "cuidado_facial": ["crema", "serum", "sérum", "rutina", "rostro", "facial"],
    })
    usage_moment = pick({
        "dia": ["día", "dia", "mañana", "am", "spf", "solar"],
        "noche": ["noche", "nocturna", "pm"],
    })
    concern = pick({
        "hidratacion": ["hidrata", "hidrat", "acido hialuronico", "ácido hialurónico", "reseca"],
        "luminosidad": ["luminosidad", "glow", "brillo sano"],
        "antiedad": ["antiedad", "arrugas", "lineas", "líneas", "edad"],
        "acne": ["acne", "acné", "granitos", "poros", "imperfecciones"],
        "aroma amaderado": ["amaderado", "madera", "cedro", "oud"],
    })
    fragrance_family = pick({
        "amaderado": ["amaderado", "madera", "cedro", "oud"],
        "floral": ["floral", "flores", "jazmin", "rosa"],
        "fresco": ["fresco", "cítrico", "citrico", "limpio"],
    })

    budget_max = 0
    for marker in ["menos de", "hasta", "presupuesto", "máximo", "maximo"]:
        if marker in text:
            tail = text.split(marker, 1)[1]
            digits = "".join(ch for ch in tail[:18] if ch.isdigit())
            if digits:
                budget_max = int(digits)
                if budget_max < 1000:
                    budget_max *= 1000
                break

    missing_fields = []
    if not skin_type and category != "fragancias":
        missing_fields.append("tipo de piel")
    if not concern and category != "fragancias":
        missing_fields.append("objetivo")
    if not usage_moment and category in {"cuidado_facial", "proteccion_solar"}:
        missing_fields.append("día o noche")

    filled = sum(bool(value) for value in [skin_type, category, usage_moment, concern, fragrance_family, budget_max])
    return {
        "skin_type": skin_type,
        "concern": concern,
        "category": category,
        "budget_max": budget_max,
        "usage_moment": usage_moment,
        "sensitivity": skin_type == "sensible" or "sensible" in text,
        "fragrance_family": fragrance_family,
        "confidence": min(0.95, 0.35 + filled * 0.1),
        "missing_fields": missing_fields,
    }

def _normalize_product(product: dict) -> dict:
    return {
        **product,
        "price": float(product.get("price") or 0),
        "skin_types": _split_csv(product.get("skin_types") or product.get("tipo_piel") or []),
        "benefits": _split_csv(product.get("benefits") or product.get("beneficios") or []),
        "tags": _split_csv(product.get("tags") or []),
        "category": product.get("category") or product.get("categoria") or "",
    }

def _relevance_terms(product: dict) -> set[str]:
    terms: set[str] = set()
    for value in (*_split_csv(product.get("tags")), *_split_csv(product.get("benefits"))):
        terms.update(value.lower().replace("-", " ").split())
    return terms

def _product_matches_profile(candidate: dict, product: dict, profile: dict) -> bool:
    if candidate.get("id") == product.get("id"):
        return False
    product_category = product.get("category") or ""
    if product_category and candidate.get("category") != product_category:
        return False
    skin_type = (profile.get("skin_type") or "").lower()
    candidate_skins = [skin.lower() for skin in _split_csv(candidate.get("skin_types"))]
    if skin_type and candidate_skins and "todas" not in candidate_skins and skin_type not in candidate_skins:
        return False
    # Exige al menos un tag o beneficio en común para no ofrecer productos
    # de la misma categoria pero sin relacion real (ej. contorno de ojos vs exfoliante).
    target_terms = _relevance_terms(product)
    if target_terms and not (target_terms & _relevance_terms(candidate)):
        return False
    return True

_SKIN_LABELS = {
    "seca": "tu piel seca",
    "sensible": "tu piel sensible",
    "grasa": "tu piel grasa",
    "mixta": "tu piel mixta",
    "normal": "tu piel normal",
}

_CONCERN_LABELS = {
    "hidratacion": "la hidratación",
    "luminosidad": "la luminosidad",
    "antiedad": "el cuidado antiedad",
    "acne": "el control de acné e imperfecciones",
    "aroma amaderado": "un aroma amaderado",
}

_USAGE_LABELS = {
    "dia": "el día",
    "noche": "la noche",
}

def generate_product_action(message: str, product: dict, action: str, profile: dict, catalog: list[dict]) -> dict:
    normalized_product = _normalize_product(product)
    normalized_catalog = [_normalize_product(item) for item in catalog]
    current_price = float(normalized_product.get("price") or 0)
    candidates = [
        item for item in normalized_catalog
        if _product_matches_profile(item, normalized_product, profile)
    ]

    selected: dict | None = None
    title = "Por qué te lo recomiendo"
    if action == "cheaper":
        title = "Una opción más económica"
        cheaper = [item for item in candidates if float(item.get("price") or 0) < current_price]
        selected = sorted(cheaper, key=lambda item: float(item.get("price") or 0), reverse=True)[:1]
        selected = selected[0] if selected else None
    elif action == "premium":
        title = "Una opción premium"
        premium = [item for item in candidates if float(item.get("price") or 0) > current_price]
        selected = sorted(premium, key=lambda item: float(item.get("price") or 0))[:1]
        selected = selected[0] if selected else None

    target = selected or normalized_product
    benefits = ", ".join(_split_csv(target.get("benefits"))) or "sus beneficios principales"
    skin = _SKIN_LABELS.get(profile.get("skin_type"), "tu tipo de piel")
    concern = _CONCERN_LABELS.get(profile.get("concern"), "lo que buscas")
    usage = _USAGE_LABELS.get(profile.get("usage_moment"), "tu rutina")

    if action == "cheaper" and not selected:
        seller_note = "No tengo una alternativa más económica que mantenga el mismo enfoque para tu piel, pero esta opción ya está pensada para ajustarse a tu presupuesto."
    elif action == "premium" and not selected:
        seller_note = "No tengo una alternativa premium dentro de la misma línea, pero esta opción ya cubre muy bien lo que necesitas."
    elif action == "cheaper":
        seller_note = f"Si prefieres algo más accesible, {target.get('name')} mantiene el foco en {concern} a un precio menor."
    elif action == "premium":
        seller_note = f"Si quieres darte un upgrade, {target.get('name')} es una excelente opción dentro de la misma línea de cuidado."
    else:
        seller_note = f"Encaja con {skin} y con {concern}; destaca por {benefits}."

    return {
        "action": action,
        "title": title,
        "product": target if selected else None,
        "seller_note": seller_note,
        "customer_phrase": f"Te lo recomiendo porque encaja con lo que me contaste y funciona muy bien para {usage}.",
        "usage_tip": "Confirma la tolerancia y la frecuencia de uso; si tu piel es sensible, comienza de forma gradual.",
    }

async def generate_product_reason(message: str, product: dict) -> str:
    # `product` here is the structured product item (not the raw item with `metadata`)
    # We reconstruct a simple text for the prompt
    
    # Retrieve all items to give the subagent global context
    retrieved_items = await retrieve_all(message)
    global_context = build_context(retrieved_items)
    
    benefits = _split_csv(product.get("benefits", []))
    skin_types = _split_csv(product.get("skin_types", []))
    tags = _split_csv(product.get("tags", []))
    ingredients = _split_csv(product.get("ingredients", []))
    signals = _profile_signals(message)
    
    prompt = (
        f"{SUBAGENT_PROMPT}\n\n"
        f"Requerimiento del usuario: {message}\n\n"
        f"Señales detectadas para orientar al vendedor: {', '.join(signals)}\n\n"
        f"Contexto GLOBAL del RAG (otras opciones recuperadas):\n{global_context}\n\n"
        f"Contexto ESPECÍFICO del producto a justificar:\n"
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
        f"Genera tu respuesta para el cliente:"
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

@profile_time
async def retrieve_context(message: str) -> tuple[dict, list[dict]]:
    retrieved_items = await retrieve_all(message)
    context_data = build_retrieval_context(message, retrieved_items)
    return context_data, retrieved_items


@profile_time
async def analyze_intent(message: str, session_history: list[dict]) -> bool:
    profile = extract_client_profile(message, session_history)
    missing = profile.get("missing_fields", [])
    if missing:
        logger.info(f"Faltan campos: {missing}. Retornando perfil incompleto.")
        return False
    return True


async def _fallback_response(message: str, retrieved_items: list[dict]) -> AsyncGenerator[str, None]:
    products = [item for item in retrieved_items if item["metadata"].get("source") == "catalog"][:3]
    if not products:
        yield "Por ahora no encontré productos que calcen con lo que buscas. Cuéntame un poco más para poder ayudarte mejor."
        return

    yield "Estas son las opciones que mejor calzan con lo que me contaste:\n\n"
    for item in products:
        metadata = item["metadata"]
        text = item["text"]
        price_str = _format_clp(metadata.get("price"))
        yield f"- **{metadata.get('product_name', 'Producto')}** ({price_str})\n"
        benefits = _extract_field(text, "Beneficios")
        skin_types = _extract_field(text, "Tipo de piel")
        signals = ", ".join(_profile_signals(message))
        reason = benefits or "sus beneficios principales encajan con lo que buscas"
        if skin_types:
            reason += f" y está pensado para piel {skin_types}"
        yield f"  Te lo recomiendo porque responde a {signals}; {reason}.\n"
        yield "  Tip: ajusta la frecuencia y el momento de uso según tu tolerancia, sobre todo si tu piel es sensible.\n\n"

@profile_time
async def generate_profiler_response(
    message: str,
    session_history: list[dict],
) -> dict:
    messages = [{"role": "system", "content": PROFILER_SYSTEM_PROMPT}]
    messages.extend(FEW_SHOT_MESSAGES)
    messages.extend(session_history[-8:])
    messages.append({"role": "user", "content": message})
    
    client = LLMClient()
    try:
        response_text = await client.generate_completion(messages)
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned.split("```json", 1)[1]
        if "```" in cleaned:
            cleaned = cleaned.split("```", 1)[0]
        return json.loads(cleaned.strip())
    except Exception as e:
        logger.error(f"Error parseando JSON en Profiler: {e}")
        return {
            "message": "¿Me podrías dar un poco más de detalle para ayudarte mejor?", 
            "chips": ["Piel Seca", "Piel Grasa", "Piel Sensible"]
        }

async def generate_recommender_response(
    message: str,
    session_history: list[dict],
    retrieved_items: list[dict] | None = None,
    soft_match: bool = False,
) -> AsyncGenerator[str, None]:
    if retrieved_items is None:
        retrieved_items = await retrieve_all(message)
    if not settings.llm_api_key:
        async for token in _fallback_response(message, retrieved_items):
            yield token
        return

    # En modo "soft" (sin calce fuerte) usamos un prompt más flexible: Lumi reconoce
    # con honestidad que no hay un calce exacto y ofrece lo más cercano del catálogo,
    # en vez de una respuesta seca de "no tengo nada".
    system_prompt = SOFT_RECOMMENDER_SYSTEM_PROMPT if soft_match else RECOMMENDER_SYSTEM_PROMPT

    client = LLMClient()
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(session_history[-8:])

    context_text = build_context(retrieved_items)
    augmented_message = f"{message}\n\n{context_text}"
    messages.append({"role": "user", "content": augmented_message})

    async for token in client.stream_completion(messages):
        yield token
