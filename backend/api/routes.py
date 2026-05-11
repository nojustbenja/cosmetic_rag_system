from __future__ import annotations

import json

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from api.models import ChatRequest
from rag.pipeline import generate_response, retrieve_context


router = APIRouter()
sessions: dict[str, list[dict]] = {}


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/chat")
async def chat(request: ChatRequest) -> EventSourceResponse:
    history = sessions.get(request.session_id, [])

    async def event_generator():
        response = ""
        try:
            context_payload, retrieved_items = retrieve_context(request.message)
            yield {"event": "context", "data": json.dumps(context_payload)}
            async for token in generate_response(request.message, history, retrieved_items):
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
