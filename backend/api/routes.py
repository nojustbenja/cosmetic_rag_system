from __future__ import annotations

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from api.models import (
    ChatRequest,
    ReasonRequest,
    ProductActionRequest,
    ProductCreateRequest,
    AiAssistRequest,
    OrderCreateRequest,
    CsvImportRequest,
    ProductUpdateRequest,
    ProviderConfigRequest,
)
from rag.pipeline import (
    extract_client_profile,
    generate_product_action,
    retrieve_context,
    generate_product_reason,
)
from rag.retriever import get_all_products_from_db
from ingestion.ingest_csv import add_product_to_csv, import_csv_content, ingest_products, update_product_in_csv
from rag.llm_client import LLMClient
from rag.provider_config import public_provider_config, save_provider_config, validate_provider_payload
from config import settings


router = APIRouter()
sessions: dict[str, list[dict]] = {}
ORDERS_PATH = Path(__file__).resolve().parents[1] / "data" / "orders.json"


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/provider-config")
async def get_provider_config() -> dict:
    return public_provider_config(settings)


@router.put("/provider-config")
async def update_provider_config(request: ProviderConfigRequest) -> dict:
    try:
        return save_provider_config(settings, request.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/provider-config/validate")
async def validate_provider_config(request: ProviderConfigRequest) -> dict:
    return validate_provider_payload(settings, request.model_dump())


@router.get("/products")
async def products() -> list[dict]:
    return get_all_products_from_db()


@router.post("/chat")
async def chat(request: ChatRequest) -> EventSourceResponse:
    history = sessions.get(request.session_id, [])

    async def event_generator():
        response = ""
        try:
            from rag.pipeline import analyze_intent, generate_profiler_response, generate_recommender_response
            has_profile = await analyze_intent(request.message, history)
            profile = extract_client_profile(request.message, history)
            yield {"event": "profile", "data": json.dumps(profile)}

            if not has_profile:
                # Emit empty context_done first to prevent UI waiting for products
                yield {
                    "event": "context_done",
                    "data": json.dumps({"guides": [], "total": 0}),
                }
                async for token in generate_profiler_response(request.message, history):
                    response += token
                    yield {"event": "token", "data": json.dumps({"token": token})}
            else:
                context_payload, retrieved_items = await retrieve_context(request.message)

                # Emit each product individually so the frontend can show them progressively
                products = context_payload.get("products", [])
                guides = context_payload.get("guides", [])
                for idx, product in enumerate(products):
                    product_with_index = {**product, "product_index": idx + 1}
                    yield {"event": "product", "data": json.dumps(product_with_index)}

                # Emit guides + total count as a summary event
                yield {
                    "event": "context_done",
                    "data": json.dumps({"guides": guides, "total": len(products)}),
                }

                async for token in generate_recommender_response(request.message, history, retrieved_items):
                    response += token
                    yield {"event": "token", "data": json.dumps({"token": token})}

            sessions[request.session_id] = (history + [
                {"role": "user", "content": request.message},
                {"role": "assistant", "content": response},
            ])[-8:]
            yield {"event": "done", "data": json.dumps({"ok": True})}
        except Exception as exc:
            yield {"event": "error", "data": json.dumps({"error": str(exc)})}

    return EventSourceResponse(event_generator())


@router.post("/chat/reason")
async def get_product_reason(request: ReasonRequest) -> dict[str, str]:
    try:
        reason = await generate_product_reason(request.message, request.product)
        return {"reason": reason}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/chat/product-action")
async def product_action(request: ProductActionRequest) -> dict[str, object]:
    try:
        catalog = get_all_products_from_db()
        return generate_product_action(
            request.message,
            request.product,
            request.action,
            request.profile,
            catalog,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/products")
async def create_product(product: ProductCreateRequest) -> dict[str, str]:
    try:
        # Guardar en productos.csv
        add_product_to_csv(product.model_dump())
        # Re-ingestar en ChromaDB
        ingest_products()
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/products")
async def update_product(request: ProductUpdateRequest) -> dict[str, str]:
    try:
        # Actualizar en productos.csv
        success = update_product_in_csv(request.original_name, request.model_dump())
        if not success:
            raise HTTPException(status_code=404, detail="Product not found in catalog.")
        # Re-ingestar en ChromaDB
        ingest_products()
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))



@router.post("/products/import-csv")
async def import_products_csv(request: CsvImportRequest) -> dict[str, object]:
    try:
        # Guardar e integrar CSV
        count = import_csv_content(request.csv_content, request.mode)
        # Re-ingestar en ChromaDB
        ingest_products()
        return {"status": "ok", "count": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/products/ai-assist")
async def ai_assist(request: AiAssistRequest) -> dict[str, object]:
    try:
        llm = LLMClient()
        system_prompt = (
            "Eres un experto analista y formulador de productos de cosmética premium de lujo.\n"
            "Tu tarea es generar la ficha técnica completa en formato JSON para un producto dado su nombre y marca.\n"
            "Debes devolver ÚNICAMENTE un objeto JSON válido con los siguientes campos exactos y ningún otro texto ni formato adicional:\n"
            "{\n"
            '  "descripcion": "Una descripción comercial atractiva y de alta gama del producto (1-2 frases).",\n'
            '  "ingredientes": "3 a 5 ingredientes de lujo separados por coma (ej: \'ácido hialurónico, vitamina B5, escualano\').",\n'
            '  "beneficios": "3 a 4 beneficios clave separados por coma (ej: \'hidratación profunda, luminosidad inmediata, no reseca\').",\n'
            '  "precio": un entero realista en pesos chilenos (ej: 48000), acorde a la marca y tipo de producto,\n'
            '  "stock": un entero por defecto (ej: 30),\n'
            '  "tags": "3 a 5 tags cortas separadas por coma, ideales para búsqueda RAG (ej: \'piel-seca,hidratación,glow,día\').",\n'
            '  "tipo_piel": "una lista de tipos de piel separados por coma (opciones: \'seca\', \'grasa\', \'mixta\', \'sensible\', \'normal\', \'todas\'), o \'todas\'",\n'
            '  "categoria": "la categoría que mejor encaje. Debe ser exactamente una de estas: \'cuidado_facial\', \'proteccion_solar\', \'maquillaje\', \'limpieza\', \'fragancias\', \'cabello\'"\n'
            "}"
        )
        
        user_message = f"Nombre: {request.name}\nMarca: {request.brand}"
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]

        response_text = ""
        async for token in llm.stream_completion(messages):
            response_text += token

        # Limpiar respuesta para parsear JSON
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned.split("```json", 1)[1]
        if "```" in cleaned:
            cleaned = cleaned.split("```", 1)[0]
        cleaned = cleaned.strip()

        try:
            data = json.loads(cleaned)
            return data
        except json.JSONDecodeError as exc:
            # Fallback en caso de que falle el parseo JSON
            print(f"Error parseando JSON de IA: {exc}. Respuesta original: {response_text}")
            return {
                "descripcion": f"Fórmula exclusiva de {request.brand} diseñada para realzar la belleza natural.",
                "ingredientes": "ingredientes activos botánicos, vitaminas esenciales",
                "beneficios": "nutrición profunda, aporta suavidad, mejora la apariencia general",
                "precio": 38000,
                "stock": 50,
                "tags": "glow,belleza,natural",
                "tipo_piel": "todas",
                "categoria": "cuidado_facial"
            }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/orders")
async def get_orders() -> list[dict]:
    try:
        if not ORDERS_PATH.exists() or ORDERS_PATH.stat().st_size == 0:
            return []
        with ORDERS_PATH.open("r", encoding="utf-8") as file:
            return json.load(file)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/orders")
async def create_order(order: OrderCreateRequest) -> dict[str, object]:
    try:
        orders: list[dict] = []
        if ORDERS_PATH.exists() and ORDERS_PATH.stat().st_size > 0:
            with ORDERS_PATH.open("r", encoding="utf-8") as file:
                try:
                    orders = json.load(file)
                except json.JSONDecodeError:
                    orders = []

        new_order = order.model_dump()
        orders.append(new_order)

        # Asegurar directorio exista
        ORDERS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with ORDERS_PATH.open("w", encoding="utf-8") as file:
            json.dump(orders, file, indent=2, ensure_ascii=False)

        return {"status": "ok", "order": new_order}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/orders/{ticket_number}")
async def delete_order(ticket_number: str) -> dict[str, object]:
    try:
        if not ORDERS_PATH.exists() or ORDERS_PATH.stat().st_size == 0:
            raise HTTPException(status_code=404, detail="No orders found.")

        with ORDERS_PATH.open("r", encoding="utf-8") as file:
            try:
                orders = json.load(file)
            except json.JSONDecodeError:
                orders = []

        order_to_delete = next((order for order in orders if order.get("ticket_number") == ticket_number), None)
        if not order_to_delete:
            raise HTTPException(status_code=404, detail="Order not found.")
        if order_to_delete.get("status") != "pendiente":
            raise HTTPException(status_code=409, detail="Only pending orders can be deleted.")

        remaining_orders = [order for order in orders if order.get("ticket_number") != ticket_number]
        with ORDERS_PATH.open("w", encoding="utf-8") as file:
            json.dump(remaining_orders, file, indent=2, ensure_ascii=False)

        return {"status": "ok", "ticket_number": ticket_number}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/orders/{ticket_number}/status")
async def update_order_status(ticket_number: str, payload: dict) -> dict[str, object]:
    try:
        new_status = payload.get("status", "pendiente")
        if not ORDERS_PATH.exists() or ORDERS_PATH.stat().st_size == 0:
            raise HTTPException(status_code=404, detail="No orders found.")
        
        with ORDERS_PATH.open("r", encoding="utf-8") as file:
            try:
                orders = json.load(file)
            except json.JSONDecodeError:
                orders = []
            
        found = False
        for order in orders:
            if order.get("ticket_number") == ticket_number:
                order["status"] = new_status
                found = True
                break
                
        if not found:
            raise HTTPException(status_code=404, detail="Order not found.")
            
        with ORDERS_PATH.open("w", encoding="utf-8") as file:
            json.dump(orders, file, indent=2, ensure_ascii=False)
            
        return {"status": "ok", "ticket_number": ticket_number, "new_status": new_status}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
