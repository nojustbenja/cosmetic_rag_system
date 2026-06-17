# Tasks: ai-loop-fix

## Review Workload Forecast
- **Estimated Lines of Code (LoC):** ~15 lines
- **Decision needed before apply:** No
- **Chained PRs recommended:** No
- **Budget Risk:** Low. Targeted bug fix spanning one python file and one orchestrator configuration update.

## Phase 1: RAG Pipeline Fix
**Objective:** Fix string matching logic to securely parse exact UI chip inputs in `extract_client_profile`.

- [x] In `backend/rag/pipeline.py`, locate the `extract_client_profile()` function.
- [x] Update the `pick` function's logic. Ensure that when adding short chip terms (e.g. `"seca"`), it matches cleanly (for instance, by checking if the whole message matches the word exactly, or using regex word boundaries `\b`, or by adding the exact words to the dictionary mapping).
- [x] Add the exact chip words (`"seca"`, `"sensible"`, `"grasa"`, `"mixta"`, `"normal"`) to the `skin_type` mapping array so they can be matched correctly without relying on substrings of longer terms.
- [x] Verify that other mappings (`category`, `usage_moment`, `concern`, `fragrance_family`) are robust enough to safely handle exact chip values. Update them similarly if needed.

## Phase 2: Orchestrator Prompt Adjustment
**Objective:** Resolve the infinite loop caused by the conflict between the global "ask at most one question" rule and the setup sequence.

- [x] Modify the SDD Orchestrator configuration. (If it exists as a local file or inside `.gemini/antigravity-cli/`, update it).
- [x] Add an explicit instruction for the orchestrator to bundle setup decisions into a single prompt. For example: *"Exception to the 'one question' rule: During the SDD setup phase, you MUST bundle all required configuration questions (Execution Mode, Artifact Store Mode, Delivery Strategy) into a single prompt to prevent initialization loops."*
- [x] If the rule is strictly managed by an external IDE configuration (e.g. `gentle-ai:persona` in IDE global prompts), generate a clear Markdown patch with the above instruction and present it to the user so they can paste it into their settings.
