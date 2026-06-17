# Review Workload Forecast

- **Estimated lines changed:** ~100-150
- **400-line budget risk:** Low
- **Decision needed before apply:** No
- **Chained PRs recommended:** No

# Tasks

## Phase 1: Foundation (Pipeline Utilities)

1. [x] **Implement `requires_catalog_search`**:
   - In `backend/rag/pipeline.py`, add `requires_catalog_search(message: str, history: list[dict]) -> bool`.
   - Create an LLM prompt that classifies whether the user message requires product catalog information or is just conversational small talk.
   - Default to `True` on exceptions to safely fall back to standard RAG behavior.

2. [x] **Implement `generate_contextual_query`**:
   - In `backend/rag/pipeline.py`, add `generate_contextual_query(message: str, history: list[dict], profile: dict) -> str`.
   - Implement an LLM call to rewrite the query into a standalone search string by resolving context and pronouns from the `history` and `profile`.
   - Return the raw `message` as a fallback if the generation fails.

## Phase 2: Core Integration (Slicing & Routing)

3. [x] **Update Window Slicing in `pipeline.py`**:
   - In `backend/rag/pipeline.py`, modify `generate_profiler_response` and `generate_recommender_response` to slice history as `[-20:]` instead of `[-8:]`.

4. [x] **Update `chat` Endpoint in `routes.py`**:
   - In `backend/api/routes.py`, update the `chat` endpoint's history slicing to `[-20:]`.
   - Integrate the Intent Guard: call `requires_catalog_search` before retrieval.
   - If `False`, skip `retrieve_context` and generate a response directly (e.g., passing an empty list for retrieved items).
   - If `True`, call `generate_contextual_query`, then pass the returned optimized query to `retrieve_context` instead of the raw message.

## Phase 3: Validation

5. [x] **Verify Scenarios**:
   - Run/write tests ensuring `request.history[-20:]` correctly retains larger contexts.
   - Test that small-talk queries accurately return `False` from `requires_catalog_search` and bypass the vector search step.
   - Test that follow-up queries (e.g., "¿Tienes alguna más barata?") are correctly rewritten with full context and passed to the retriever.
