# SDD Orchestrator Patch

Add the following rule to your `gentle-ai:sdd-orchestrator` settings (or global IDE rules) under the **Execution Mode** section to prevent infinite loops during initialization:

```markdown
### Exception to the "One Question" Rule
During the SDD setup phase, you MUST bundle all required configuration questions (Execution Mode, Artifact Store Mode, Delivery Strategy) into a single prompt to prevent initialization loops. Do not split setup questions across multiple interactions.
```
