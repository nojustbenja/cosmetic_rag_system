# Tasks: AI Loop Final Boss Fix

## Review Workload Forecast
- **Chained PRs recommended:** No
- **400-line budget risk:** Low
- **Estimated changed lines:** ~30-50 lines
- **Decision needed before apply:** No

## Phase 1: Core Profiler Validation
- [x] **Task 1.1: Relax `concern` requirement for Sun Protection**
  - **File:** `backend/rag/pipeline.py`
  - **Action:** Modify the validation logic inside `extract_client_profile` computing `missing_fields`.
  - **Details:** If the detected `category` is `"proteccion_solar"`, `"objetivo"` (`concern`) must not be added to `missing_fields`. The profile should pass completeness without it.
  - **Verification:** System considers sun protection profile complete with just `skin_type`.

## Phase 2: Prompt Context Injection
- [x] **Task 2.1: Update Profiler prompt logic**
  - **File:** `backend/rag/pipeline.py`
  - **Action:** Update `generate_profiler_response` to accept `profile` as a parameter.
  - **Details:** Append the known extracted fields and the remaining `missing_fields` to `PROFILER_SYSTEM_PROMPT`. Explicitly instruct the LLM to formulate follow-ups targeting only the missing fields.
  - **Verification:** System prompt construction clearly receives the state.

- [x] **Task 2.2: Pass profile from API routes**
  - **File:** `backend/api/routes.py`
  - **Action:** Update the invocation of `generate_profiler_response`.
  - **Details:** Pass the extracted `profile` object (containing `missing_fields` and known properties) to the function.
  - **Verification:** No runtime errors in the endpoint when interacting with the profiler.

## Phase 3: Testing & Verification
- [x] **Task 3.1: Sunscreen Scenario**
  - **Action:** Provide query "protector solar para piel mixta".
  - **Verification:** Must not ask for "objetivo" and should proceed directly to recommendations.

- [x] **Task 3.2: Redundant Prompt Scenario**
  - **Action:** Provide partial profile, and fulfill one missing field at a time.
  - **Verification:** The Profiler asks context-aware follow-up questions only for the remaining `missing_fields` and never repeats questions for known ones.
