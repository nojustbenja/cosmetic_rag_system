# Apply Progress

- **Phase 1 (RAG Pipeline Fix):** Completed. `pick` logic in `backend/rag/pipeline.py` updated to use regex word boundaries and check for exact matches. The exact chip strings have been added to mapping dictionaries (`skin_type`, `category`, `concern`, etc.).
- **Phase 2 (Orchestrator Prompt Adjustment):** Completed. Created `orchestrator_patch.md` with instructions and content for updating the `gentle-ai:sdd-orchestrator` rule globally.
- All tasks are checked off.

## Next steps
Review `orchestrator_patch.md` to update IDE settings, and test the new exact chip recognition functionality for RAG.
