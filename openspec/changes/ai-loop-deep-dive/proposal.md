# Proposal: ai-loop-deep-dive

## Intent
Fix a state persistence bug in the backend `chat` endpoint that causes a repetitive question loop by improperly overwriting newly extracted profile data with stale frontend state.

## Scope
**In Scope:**
- Modifying the profile merging/updating logic in the backend chat routes.
- Ensuring the newly extracted profile data takes precedence over or properly merges with the incoming request profile.

**Out of Scope:**
- Modifying the frontend state management.
- Changes to the LLM prompt or profile extraction logic itself.

## Capabilities
**New Capabilities:** 
- None.

**Modified Capabilities:** 
- The chat system will properly remember user answers and progress the conversation instead of repeating questions.

## Approach
1. Locate the `profile.update(request.profile)` logic in `backend/api/routes.py`.
2. Adjust the logic so that `request.profile` acts as the base state, and any new attributes extracted during the current turn override or extend this base state. This prevents the older frontend state from wiping out new extractions.
3. Validate that the returned profile correctly reflects the most up-to-date state.

## Affected Areas
- `backend/api/routes.py`

## Risks
- The frontend might temporarily be out of sync if it strictly depends on its sent state being preserved exactly without overrides.
- Potential edge cases in dictionary merging (e.g., partial nested updates if the profile structure is complex).

## Rollback Plan
Revert the changes to `backend/api/routes.py` to restore the previous `profile.update(request.profile)` behavior using standard Git revert procedures.

## Dependencies
- None.

## Success Criteria
- The chat endpoint properly retains newly extracted user profile attributes across conversational turns.
- The AI correctly recognizes updated profile fields and stops asking questions for which the user has already provided an answer.
