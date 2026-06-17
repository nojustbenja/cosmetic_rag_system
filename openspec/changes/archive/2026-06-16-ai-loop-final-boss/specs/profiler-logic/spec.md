# Spec: Profiler Logic Update

## ADDED
- **Profiler Context Injection**: 
  - `generate_profiler_response` MUST accept `profile` (dictionary containing `missing_fields` and extracted properties) as an additional argument.
  - `backend/api/routes.py` MUST be updated to pass the extracted `profile` to `generate_profiler_response`.
  - The system prompt construction MUST append the known `profile` state to `PROFILER_SYSTEM_PROMPT`, explicitly stating the `missing_fields` the LLM should ask about.
  - The LLM MUST be instructed to formulate follow-up questions targeting ONLY the specified `missing_fields`, avoiding redundant questions for fields already present in the profile.

## MODIFIED
- **Profile Validation Rules**:
  - In `backend/rag/pipeline.py` -> `extract_client_profile`, the logic computing `missing_fields` MUST NOT require a `concern` ("objetivo") when the detected `category` is `"proteccion_solar"`.
  - The completeness condition for sun protection MUST pass as long as `skin_type` (and `usage_moment` if applicable) is provided, relaxing the previous strict requirement for `concern`.

## REMOVED
- N/A

## Scenarios

**Given** a user asks for sun protection and states their skin type is "mixta" but does not specify a concern
**When** the profile is extracted in `extract_client_profile`
**Then** the `missing_fields` MUST NOT include "objetivo" (concern) and the profile completeness check MUST pass.

**Given** the user profile is missing the "tipo de piel" field but already has "objetivo"
**When** `generate_profiler_response` is called with the profile
**Then** it MUST receive the `missing_fields` explicitly and the LLM MUST generate a context-aware follow-up question specifically targeting the skin type without asking about the objective.
