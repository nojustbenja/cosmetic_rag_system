# Proposal: AI Memory Architecture

## Intent
Improve the conversational memory and retrieval accuracy of the RAG system by implementing a sliding window expansion, an intent guard for search delegation, and context-aware query rewriting.

## Scope

### In Scope
- Expand the sliding window chat history limit from `[-8:]` to `[-20:]`.
- Implement an Intent Guard to distinguish between queries requiring catalog search (RAG) and direct conversational responses.
- Develop a context-aware query rewriting function (`generate_contextual_query`) using a fast LLM to produce standalone search queries based on chat history and user profile.
- Integrate the rewritten query with the `retrieve_context` function.

### Out of Scope
- Changing the underlying LLM models or vector database structure.
- Modifying the frontend application.
- Advanced semantic cache mechanisms.

## Capabilities

### New Capabilities
- **Intent Guard**: Skips vector retrieval for small-talk or direct follow-ups, reducing latency and cost.
- **Context-Aware Query Rewriting**: Synthesizes history and user profile into a robust, context-independent search query for better RAG retrieval.

### Modified Capabilities
- **Sliding Window**: Context retention increased to handle longer interactions (last 20 messages).

## Approach
1. Modify `backend/api/routes.py` and `backend/rag/pipeline.py` to increase the slice index for chat history to `[-20:]`.
2. Add an Intent Guard step before RAG retrieval. This step will use a lightweight prompt to determine if the query requires product catalog information.
3. Implement `generate_contextual_query` in `backend/rag/pipeline.py` that takes the latest user query, `profile`, and conversational history, returning an optimized query string.
4. Wire the optimized query into the existing `retrieve_context` call instead of using the raw user message.

## Affected Areas
- `backend/api/routes.py`
- `backend/rag/pipeline.py`

## Risks
- **Increased Token Usage**: Processing larger history `[-20:]` and additional LLM calls for intent routing and query rewriting will increase token consumption and latency.
- **False Negatives in Intent Guard**: The intent guard might wrongly classify a product query as small-talk, omitting necessary catalog context.

## Rollback Plan
- Revert changes to `backend/api/routes.py` and `backend/rag/pipeline.py` via git. Restore the `[-8:]` slice and remove the `generate_contextual_query` and intent guard logic.

## Dependencies
- Availability of a fast LLM endpoint capable of routing and query rewriting with low latency.
- Existing `retrieve_context` function.

## Success Criteria
- The system correctly handles follow-up queries that depend on previous context.
- Small-talk bypasses the vector search step, decreasing latency for non-RAG queries.
- Chat history successfully retains up to 20 messages.
