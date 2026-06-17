# Delta Spec: Dialogue Management

## Context
This specification defines the behavior for preventing the AI from redundantly asking for user profile information after it has already been provided, implementing a resilient dialogue management mechanism aware of previously fulfilled profile requirements.

## MODIFIED
- `backend/rag/pipeline.py` and `backend/api/routes.py`: The logic for determining when to ask for a user profile MUST check the parsed conversational state and chat history, rather than relying solely on naive exact text matches.
- `backend/rag/prompt_templates.py`: The prompt assembly MUST conditionally include the profile request only if the user profile state is not yet marked as fulfilled.

## ADDED
- `backend/tests/test_chat_logic.py`: New test cases MUST be added to simulate conversational state retention and verify that profile questions are not looped.

## Scenarios

### Scenario 1: User provides profile information
**Given** the user has not yet provided their profile
**When** the user sends a message containing their profile information
**Then** the system MUST extract the profile information
**And** the system MUST mark the profile requirement as fulfilled in the conversational state
**And** the AI response MUST NOT ask for the user profile again.

### Scenario 2: User provides profile information but system previously failed to recognize it in naive approach
**Given** the user previously provided their profile information
**When** the user sends a subsequent message
**Then** the system MUST recognize the profile from the chat history or maintained state
**And** the system MUST NOT include the profile request prompt in the context
**And** the AI response MUST address the user's query directly without asking for the profile again.

### Scenario 3: User has not provided profile information
**Given** the user has not provided their profile
**When** the user asks a question
**Then** the system MUST identify that the profile requirement is unfulfilled
**And** the system MUST include the profile request prompt
**And** the AI response MUST ask the user for their profile information.
