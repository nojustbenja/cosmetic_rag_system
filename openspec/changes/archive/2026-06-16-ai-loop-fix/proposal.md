# Proposal: ai-loop-fix

## Intent
Resolve the infinite loop in the bot experience caused by a prompt instruction conflict and a string-matching logic bug in the profile extraction pipeline.

## Scope
**In Scope:**
- Update the SDD Orchestrator setup prompt or global persona rules to resolve the 3-question setup vs. 1-question limit conflict.
- Fix `extract_client_profile` logic to correctly parse short, exact chip replies (e.g., "seca").

**Out of Scope:**
- Structural changes to the RAG pipeline or embeddings.
- Other persona or instruction prompt updates unrelated to the initialization loop.

## Capabilities
**New Capabilities:** None.
**Modified Capabilities:**
- The SDD Orchestrator will initialize smoothly without looping over required setup questions.
- The RAG pipeline will correctly extract profile data from single-word/chip user inputs, allowing it to advance to product recommendations.

## Approach
1. **Prompt Resolution:** Adjust the SDD orchestrator instructions to bundle setup decisions into a single prompt or allow multi-question setup, preventing the global "ask at most one question" rule from causing a loop.
2. **Extraction Logic Fix:** Update `extract_client_profile` in `backend/rag/pipeline.py` to handle exact or partial short matches (e.g., "seca" mapping to "piel seca") securely, avoiding false negatives on UI chip selections.

## Affected Areas
- `backend/rag/pipeline.py`
- SDD Orchestrator instruction/prompt files (e.g., `.agents/` or `.atl/` config)

## Risks
- Relaxing string matching for profile extraction might trigger false positives if user inputs mention overlapping terms.

## Rollback Plan
Revert `backend/rag/pipeline.py` and the orchestrator instruction files to their prior git commits.

## Dependencies
- None.

## Success Criteria
- The orchestrator successfully completes initialization questions without looping.
- The Lumi bot correctly identifies short UI chip responses (like "seca") as valid profile parameters.
- The bot successfully proceeds to recommend products instead of asking for the same profile parameter repeatedly.
