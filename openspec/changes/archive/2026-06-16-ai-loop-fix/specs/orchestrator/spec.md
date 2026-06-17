# Delta Spec: Orchestrator

## MODIFIED Requirements

### SDD Orchestrator Setup Prompting
**Description:** The SDD Orchestrator's setup instructions MUST allow for necessary initialization questions without conflicting with the global persona rule of "ask at most one question", thereby avoiding an infinite setup loop.

**Scenarios:**

* **Scenario: Setup question bundling**
  * **Given** the orchestrator is required to ask multiple setup questions (e.g., execution mode, artifact store, delivery strategy)
  * **When** it begins the initialization sequence
  * **Then** the orchestrator MUST bundle the setup decisions into a single cohesive prompt.
  * **And** the orchestrator MUST NOT trigger the global "ask at most one question" rule in a way that restarts the loop.

* **Scenario: Multi-question setup exception**
  * **Given** the orchestrator is initializing the workspace
  * **When** it encounters the global "ask at most one question" rule
  * **Then** it MAY utilize an explicit exception for the setup phase to collect all required parameters before proceeding to normal operation.
