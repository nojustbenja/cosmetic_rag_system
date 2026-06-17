# Specification: AI Memory Architecture (Backend)

## 1. Overview
This specification details modifications to the backend components (`routes.py` and `pipeline.py`) to support extended conversational memory, intent-based routing, and context-aware query rewriting. These changes aim to improve RAG accuracy for follow-up questions and lower latency for small-talk interactions.

## 2. Changes

### MODIFIED `backend/api/routes.py`
- **History Slicing**: The chat history slicing logic in the `chat` endpoint MUST be expanded from `[-8:]` to `[-20:]`.
- **Retrieval Pipeline Integration**: 
  - The endpoint MUST call the new `requires_catalog_search` function before executing `retrieve_context`.
  - If `requires_catalog_search` returns `False`, the endpoint MUST skip the vector retrieval step and yield a response directly (e.g., via `generate_recommender_response` with an empty `retrieved_items` list).
  - If `requires_catalog_search` returns `True`, the endpoint MUST call `generate_contextual_query` to obtain an optimized query string, and pass this rewritten query to `retrieve_context`.

### ADDED `backend/rag/pipeline.py`
- **`requires_catalog_search(message: str, history: list[dict]) -> bool`**:
  - MUST analyze the query and conversational history to detect if the user is asking for product recommendations, specific details, or catalog information.
  - MUST return `False` for small talk, greetings, or simple acknowledgments that do not require RAG.
- **`generate_contextual_query(message: str, history: list[dict], profile: dict) -> str`**:
  - MUST use an LLM call to rewrite the user's latest message into a standalone, self-contained search query.
  - MUST incorporate missing context (e.g., pronouns, references) by analyzing the `history` and user `profile`.
  - MUST return the raw message as a fallback if the LLM generation fails or times out.

### MODIFIED `backend/rag/pipeline.py`
- **History Slicing in Generators**: The history slicing inside `generate_profiler_response` and `generate_recommender_response` MUST be increased from `[-8:]` to `[-20:]` to match the router's expanded context window.

## 3. Scenarios

### Scenario 1: Extended History Handling
**Given** a user has exchanged 15 messages in the current session
**When** the user sends a new message
**Then** `request.history[-20:]` MUST retain all 15 previous messages to accurately extract profiles and context.

### Scenario 2: Intent Guard Bypasses RAG
**Given** a user sends a small-talk message like "¡Muchas gracias!"
**When** `requires_catalog_search` evaluates the input
**Then** it MUST return `False`
**And** the system MUST skip the vector search step
**And** the system MUST generate a conversational reply without injecting catalog context.

### Scenario 3: Query Rewriting for Pronouns/Follow-ups
**Given** a user previously asked about "cremas de noche para piel seca"
**And** the user follows up with "¿Tienes alguna más barata?"
**When** `requires_catalog_search` returns `True`
**Then** `generate_contextual_query` MUST resolve the context
**And** it MUST return a complete string like "crema de noche para piel seca más barata"
**And** `retrieve_context` MUST execute using the complete string instead of the raw input.
