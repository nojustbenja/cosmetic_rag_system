# Exploration: AI Conversational Loop Issue

## Current State
The user reported that the AI repeats the same question in different ways and ends up in an endless questioning loop without providing recommendations ("la ia repitio la misma pregunta 2 veces de diferente manera y solo pregunta termina no recomendando nada").
Investigation reveals two distinct issues causing this symptom:
1. **SDD Orchestrator Prompt Conflict**: The Antigravity Orchestrator is instructed to ask three separate setup questions upon initialization (Execution Mode, Artifact Store Mode, Delivery Strategy). However, the `user_global` persona rule strictly enforces: *"Ask at most one question at a time. After asking it, STOP and wait."* The LLM attempts to comply by asking one question, but due to statelessness, loses track in subsequent turns and either repeats the same question or gets stuck asking configuration questions instead of delegating to the recommendation phase (`sdd-explore`/`sdd-propose`).
2. **Lumi Bot Logic Bug**: In the `Sistema Rag` project, `backend/rag/pipeline.py` contains a bug in `extract_client_profile`. When a user clicks a chip like "Seca", the system checks if the needle `"piel seca"` is in the text `"seca"`, which evaluates to `False`. The profile remains incomplete, causing the Lumi bot to infinitely re-ask for the user's skin type without ever recommending a product.

## Affected Areas
- **Agent System Instructions**: The `sdd-orchestrator` initialization flow vs. the `user_global` conversational rules.
- **Project Codebase**: `backend/rag/pipeline.py` (`extract_client_profile` function).

## Approaches

### 1. Group Initialization Questions (Orchestrator)
Update the `user_global` or `sdd-orchestrator` rules to allow grouping the SDD initialization questions into a single structured prompt, explicitly overriding the "one question at a time" rule during setup.
- **Pros**: Keeps user control over settings.
- **Cons**: Initial message remains heavy.

### 2. Default Without Asking (Orchestrator)
Modify the Orchestrator instructions to use safe defaults (`Interactive` mode, auto-detected artifact store, `ask-on-risk` delivery) instead of asking the user.
- **Pros**: Immediately unblocks the AI, jumping straight to `sdd-explore` to provide value. Completely eliminates the conversational loop risk.
- **Cons**: Users must know how to opt into other modes via explicit commands.

### 3. Fix String Matching Heuristic (Sistema Rag Backend)
Add exact chip values (`"seca"`, `"grasa"`, `"mixta"`, `"normal"`) to the `needles` array in `extract_client_profile()`.
- **Pros**: Resolves the infinite profiling loop in the actual product.
- **Cons**: Does not fix the Orchestrator prompt conflict.

## Recommendation
We recommend a dual approach:
- **For the Orchestrator**: Implement **Approach 2**. Defaulting configuration eliminates the clash with the persona's "one question" rule and prevents LLM confusion across turns.
- **For the Codebase**: Implement **Approach 3**. Fix the `extract_client_profile` needles so Lumi can successfully extract the profile and proceed to the recommendation phase.

## Risks
- Silently defaulting SDD configuration might confuse power users who expect to choose their Execution Mode. A brief notification of the chosen defaults could mitigate this.
- If the Lumi bot chips are changed in the future, the heuristic matching in `pipeline.py` might break again.

## Ready for Proposal
Yes.
