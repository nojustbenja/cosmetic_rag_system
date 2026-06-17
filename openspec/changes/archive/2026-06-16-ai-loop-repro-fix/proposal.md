# Proposal: ai-loop-repro-fix

## Intent
The intent of this change is to fix a known issue where the AI repetitively asks the user for their profile information even when it has already been provided. We will achieve this through a test-driven approach: first creating comprehensive failing test cases that accurately simulate real conversational states and profile extraction attempts, and then applying a robust fix to the core logic.

## Scope
**In Scope:**
- Creation of comprehensive unit/integration tests mimicking real chat flows with profile specification.
- Verification that new tests accurately reproduce the AI question loop.
- Refactoring the profile extraction and validation logic to prevent redundant questioning.

**Out of Scope:**
- Expanding the AI's profile parameters beyond what currently exists.
- General refactoring of the LLM provider configurations.
- Enhancing unrelated parts of the RAG pipeline.

## Capabilities
**New Capabilities:**
- Reliable testing harness for conversational state retention.
- Resilient dialogue management aware of previously fulfilled profile requirements.

**Modified Capabilities:**
- The prompt assembly and conditional logic determining when to prompt for user profile data will be stabilized.

## Approach
1. **Test Driven Simulation:** Write failing test cases in `backend/tests/test_chat_logic.py` utilizing actual prompts and simulated conversation structures.
2. **Analysis:** Review the failures to understand exactly why the existing naive string matching fallback failed.
3. **Robust Fix:** Implement a more reliable context-tracking mechanism (modifying `backend/rag/pipeline.py` and potentially `backend/api/routes.py`) to correctly identify extracted profiles from chat history instead of relying solely on exact text matches.
4. **Validation:** Run the test suite to ensure the tests pass and verify that no regressions have been introduced into the general retrieval loop.

## Affected Areas
- `backend/tests/test_chat_logic.py`
- `backend/rag/pipeline.py`
- `backend/api/routes.py`
- `backend/rag/prompt_templates.py`

## Risks
- The fix might inadvertently cause the AI to never ask for a profile, even when actually needed.
- Complex chat history parsing might increase latency if not optimized.

## Rollback Plan
- Revert the code changes in `pipeline.py` and `routes.py` to restore the naive string matching behavior. The tests can remain as `xfail` or be skipped until a better fix is deployed.

## Dependencies
- `pytest` for test execution.
- Testing infrastructure setup to evaluate conversation turns accurately.

## Success Criteria
- The newly written test suite covering profile extraction successfully fails (reproducing the issue) and then passes (confirming the fix).
- The AI correctly stops asking for the profile once specified in the conversational flow.
- Existing tests for general RAG functionality continue to pass without regression.
