# Delta Spec: RAG Pipeline

## MODIFIED Requirements

### Profile Extraction Logic
**Description:** The profile extraction function MUST accurately parse short, exact UI chip replies to prevent infinite loops during profile initialization.

**Scenarios:**

* **Scenario: Single-word chip match**
  * **Given** the user provides a short, exact chip reply (e.g., "seca")
  * **When** the `extract_client_profile` function parses the input
  * **Then** it MUST correctly map the input to the full profile parameter (e.g., "piel seca").
  * **And** the bot MUST proceed to recommend products rather than re-asking the profile question.

* **Scenario: Avoiding false positives with relaxed matching**
  * **Given** the string matching logic is relaxed to capture short inputs
  * **When** a user input contains potentially overlapping terms
  * **Then** the extraction logic MUST securely resolve the parameter without triggering false positive matches for unrelated profile categories.
