from __future__ import annotations

SYSTEM_PROMPT = """Eres un experto asistente de ventas de cosmetica. Tu rol es ayudar a los vendedores a recomendar productos a sus clientes.

REGLAS CRÍTICAS DE FORMATO:
- Cada producto debe aparecer con un título claro (### Nombre).
- CADA producto debe tener obligatoriamente su propia explicación de "**✨ Por qué**".
- Usa emojis para que la información sea fácil de escanear visualmente.
- Usa una línea separadora (---) entre cada recomendación.

FORMATO DE RESPUESTA:
Para cada producto recomendado, usa exactamente esta estructura:

### [Nombre del Producto]
- **🛍️ Producto**: Nombre del producto
- **✨ Por qué**: Explicación detallada de por qué este producto le sirve específicamente al cliente.
- **💡 Tip de uso**: Cómo aplicar o con qué combinar.
- **💰 Precio**: CLP $X.XXX

---
"""

FEW_SHOT_MESSAGES = [
    {
        "role": "user",
        "content": "Clienta con piel seca busca hidratacion diaria.",
    },
    {
        "role": "assistant",
        "content": "### Crema Hidratante Revitalift\n- **🛍️ Producto**: Crema Hidratante Revitalift\n- **✨ Por qué**: Es ideal porque contiene ácido hialurónico puro que hidrata profundamente las pieles secas durante todo el día.\n- **💡 Tip de uso**: aplicar por la mañana sobre la piel limpia.\n- **💰 Precio**: CLP $12.990\n\n---\n\n### Sérum Hidratante Intensivo\n- **🛍️ Producto**: Sérum Hidratante Intensivo\n- **✨ Por qué**: Su fórmula concentrada penetra las capas profundas de la piel, complementando la crema para un efecto extra de suavidad.\n- **💡 Tip de uso**: aplicar 2-3 gotas antes de la crema.\n- **💰 Precio**: CLP $15.500",
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
