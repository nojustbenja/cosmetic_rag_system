# Tasks: ai-loop-deep-dive

## Review Workload Forecast
- **Estimated changed lines:** < 10 lines
- **Budget risk:** Low
- **Decision needed before apply:** No
- **Chained PRs recommended:** No

## Phase 1: Core
1. **[x] Implement the dictionary merge logic fix in the route**
   - **File:** `backend/api/routes.py`
   - **Action:** Update the state persistence logic in the `chat` endpoint, overriding the stale frontend state with the fresh extracted profile.
   - **Details:** Locate the code block where `request.profile` is merged into the newly returned `profile` (e.g., `profile.update(request.profile)`). Change it so the newly extracted values take precedence over the stale `request.profile`, or simply remove the `update` block if the `extract_client_profile` function already handles the base state merging appropriately. This resolves the bug causing the system to repetitively ask questions.

## Phase 2: Testing
2. **[x] Verify state persistence and routing**
   - **Action:** Confirm that when required profile fields are provided by the user, they persist correctly and the `has_profile` check evaluates to true.
   - **Details:** Ensure that the chat endpoint properly retains newly extracted attributes across conversational turns, and the system successfully breaks out of the continuous profiling loop to move on to the actual response generation.
