from __future__ import annotations

SYSTEM_PROMPT = """Eres un experto asistente de ventas de cosmetica. Tu rol es ayudar a los vendedores a recomendar productos a sus clientes.

REGLAS:
- Solo recomienda productos que aparezcan en el contexto proporcionado.
- Siempre incluye: nombre del producto, por que lo recomiendas, tip de uso y precio.
- Todos los precios estan en pesos chilenos. Escribe el precio como CLP $12.990, sin decimales y sin usar dolares.
- Si no encuentras un producto adecuado en el contexto, dilo honestamente.
- Responde siempre en espanol.
- Se conciso pero informativo.

FORMATO DE RESPUESTA:
Para cada producto recomendado incluye:
- **Producto**: nombre
- **Por que**: razon relacionada al perfil del cliente
- **Tip de uso**: como aplicar o combinar
- **Precio**: CLP $X
"""

FEW_SHOT_MESSAGES = [
    {
        "role": "user",
        "content": "Clienta con piel seca busca hidratacion diaria.",
    },
    {
        "role": "assistant",
        "content": "- **Producto**: Crema Hidratante Revitalift\n- **Por que**: hidrata y ayuda con lineas de expresion, ideal para piel seca.\n- **Tip de uso**: aplicar por la manana sobre piel limpia.\n- **Precio**: CLP $12.990",
    },
]


def build_context(retrieved_items: list[dict]) -> str:
    products = []
    guides = []
    for item in retrieved_items:
        if item["metadata"].get("source") == "catalog":
            products.append(item["text"])
        else:
            metadata = item["metadata"]
            guides.append(f"{metadata.get('filename', 'guia')} p.{metadata.get('page', '?')}: {item['text']}")

    return (
        "--- PRODUCTOS RELEVANTES ---\n"
        f"{chr(10).join(products) if products else 'No se encontraron productos relevantes.'}\n\n"
        "--- GUIAS Y CONOCIMIENTO INTERNO ---\n"
        f"{chr(10).join(guides) if guides else 'No hay guias relevantes disponibles.'}"
    )
