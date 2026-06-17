# Tasks: ai-loop-repro-fix

## Review Workload Forecast
- **Estimated changed lines:** ~150-250 lines
- **400-line budget risk:** Low
- **Chained PRs recommended:** No
- **Decision needed before apply:** No

## Phase 1: Test-Driven Reproduction
- [x] **[Scenario 1] Add test for initial profile provision:** Update or create `backend/tests/test_chat_logic.py`. Write a test simulating a user providing profile information in their first message. Assert that the AI extracts the profile and does not ask for it again.
- [x] **[Scenario 2] Add test for subsequent turns (The Loop):** Write a test where the profile was provided in a past turn. Assert that subsequent responses address the user's query directly and do not re-ask for the profile. This test should fail under the current logic.
- [x] **[Scenario 3] Add test for missing profile:** Write a baseline test where a user asks a question without providing a profile. Assert that the AI correctly prompts the user to provide it.
- [x] **Verify test failure:** Run the newly added test suite to confirm that Scenario 1 and Scenario 2 correctly reproduce the redundant asking (looping) bug.

## Phase 2: Implementation & Fix
- [x] 1. **Update state extraction logic:** Refactor `backend/rag/pipeline.py` to parse chat history and determine if the user's profile requirements have already been fulfilled, replacing the naive string-matching fallback.
- [x] 2. **Expose state in API routes:** Update `backend/api/routes.py` to ensure the newly determined profile fulfillment state is passed to the prompt assembly.
- [x] 3. **Make profile prompt conditional:** Modify `backend/rag/prompt_templates.py` to conditionally inject the profile request instructions *only* if the user profile state is unfulfilled.
- [x] 4. **Verify fix:** Execute `backend/tests/test_chat_logic.py` and confirm all tests added in Phase 1 now pass.
- [x] 5. **Regression check:** Run the entire backend test suite to ensure the general retrieval loop and existing features remain unaffected by the state tracking changes.
