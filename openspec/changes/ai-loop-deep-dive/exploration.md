## Exploration: AI Loop Deep Dive
### Current State
Despite the recent fixes to `extract_client_profile` passing unit tests, the chatbot gets stuck in a repetitive loop ("haz todo de nuevo") in the real app, continually asking profiling questions even after the user provides the required information.

### Affected Areas
- **State Persistence (`backend/api/routes.py`)**: The `chat` endpoint logic that merges the newly extracted profile with the frontend state.
- **Profile Extraction (`backend/rag/pipeline.py`)**: The `extract_client_profile` function already manages state merging internally.

### Approaches
The bug is localized in `backend/api/routes.py`:
```python
profile = extract_client_profile(request.message, history, frontend_profile=request.profile)
if request.profile:
    profile.update(request.profile) # <--- FATAL BUG
has_profile = not profile.get("missing_fields")
yield {"event": "profile", "data": json.dumps(profile)}
```
When `extract_client_profile` runs, it correctly calculates the new profile state by merging the `request.profile` (the previous turn's state sent by the frontend) and the newly extracted data from the user's message. It returns a new `profile` dictionary with updated `skin_type`, `concern`, and an updated, empty `missing_fields` list.

Immediately after, `profile.update(request.profile)` executes. This forcibly overwrites the newly extracted profile data with the stale data from the previous turn!
Because the stale `request.profile` contains the previous turn's `missing_fields` (e.g., `["tipo de piel", "objetivo"]`), it clobbers the freshly computed `missing_fields: []`.
As a result, `has_profile` will always evaluate to `False`, forcing the system to route to `generate_profiler_response` on every turn. The LLM, seeing that the system insists on asking more profiling questions despite the history already containing the answers, gets confused and starts inventing new questions (e.g., about age, allergies, etc.), creating the infinite loop.

### Recommendation
Remove the `if request.profile: profile.update(request.profile)` block in `backend/api/routes.py`.
The `extract_client_profile` function already handles merging frontend state inside its implementation (using `frontend_profile.get(...) or extracted_value`), making the `update()` call in the router both redundant and destructive.

### Risks
- **Low Risk**: Removing the `update()` call allows the RAG system to properly recognize when the profile is complete, breaking the loop and proceeding to `retrieve_context`. The frontend UI form overrides will still work perfectly because `extract_client_profile` respects the `frontend_profile` overrides natively.

### Ready for Proposal
Yes, the root cause is definitively identified and trivially fixable. We are ready to proceed with the implementation.
