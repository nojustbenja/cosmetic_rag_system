# Proposal: AI Loop Final Boss Fix

## Intent
Fix an AI conversational loop where the profiler repeatedly asks for already provided information (like skin type) when evaluating sun protection queries.

## Scope
**In Scope:**
- Passing explicitly known and missing profile fields to the profiler prompt.
- Relaxing the profile completeness requirements for the `proteccion_solar` category.

**Out of Scope:**
- Changes to product retrieval logic.
- Altering validation logic for other product categories like fragrances or makeup.

## Capabilities
**New Capabilities:** None.
**Modified Capabilities:**
- The Profiler now asks context-aware follow-up questions targeted specifically at missing profile data, rather than relying on generic few-shot examples.
- Sun protection queries no longer strictly require a user `concern` to be considered complete.

## Approach
1. **Dynamic Prompt Injection:** Modify `backend/rag/pipeline.py` to pass the current `profile` state (known fields) and `missing_fields` into `generate_profiler_response`. Update the `PROFILER_SYSTEM_PROMPT` so the LLM explicitly knows what information it already possesses and exactly what it needs to ask the user.
2. **Completeness Logic Relaxation:** Update the profile validation logic (used in `extract_client_profile`) to conditionally exclude `concern` from the required fields when the detected category is `proteccion_solar`.

## Affected Areas
- `/Users/benja/Proyects/Learning/Taller de inovacion/Sistema Rag/backend/rag/pipeline.py`
  - `generate_profiler_response`
  - Profile validation logic / `missing_fields` computation
  - `PROFILER_SYSTEM_PROMPT`

## Risks
- Adjusting the system prompt might slightly alter the conversational tone or formatting of the profiler.
- Making `concern` optional for sunscreens might result in slightly broader recommendations if the user actually had a specific concern but didn't mention it upfront.

## Rollback Plan
Revert the modifications in `backend/rag/pipeline.py` via git to restore the original `PROFILER_SYSTEM_PROMPT` and profile validation logic.

## Dependencies
- None.

## Success Criteria
- The system correctly registers "piel mixta" (or other skin types) and does not prompt for it again.
- For `proteccion_solar` queries, the system proceeds to product recommendations without demanding a `concern` if the skin type is already known.
- The LLM's follow-up questions directly address actual `missing_fields`.
