# Delta Spec: Profile State Merging

## MODIFIED Requirements

### Profile Update Logic
The system MUST merge the user profile during a chat turn by treating the incoming `request.profile` as the base state, and any newly extracted attributes MUST extend or override this base state.

*   **Scenario: Merging new profile extractions**
    *   **Given** an incoming chat request containing a `request.profile` with existing attributes (e.g., stale frontend state)
    *   **And** the extraction pipeline identifies new profile attributes from the user's current message
    *   **When** the backend merges the profile data
    *   **Then** the newly extracted attributes MUST overwrite any conflicting keys in the base `request.profile`
    *   **And** the non-conflicting keys from the `request.profile` MUST be preserved.

*   **Scenario: Preserving state to prevent repetition**
    *   **Given** the user provides information that answers a previously asked question
    *   **When** the turn completes and the response is generated
    *   **Then** the final profile returned by the endpoint MUST contain the newly extracted answers
    *   **And** the system SHALL use this updated profile in the next turn so the AI does not repeat the same question.
