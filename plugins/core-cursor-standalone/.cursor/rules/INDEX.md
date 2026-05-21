# Rosetta Rules Index

All paths are relative to Rosetta Plugin Path.

- `rules/bootstrap-core-policy.mdc`: Bootstrap prerequisites, request routing, and process-level operating constraints.
- `rules/bootstrap-execution-policy.mdc`: Defines planning, task execution, validation, orchestration, and memory behavior for bootstrap flow.
- `rules/bootstrap-guardrails.mdc`: Global guardrails for transparency, scope control, safety, risk mitigation, and context safety before execution.
- `rules/bootstrap-hitl-questioning.mdc`: Rules for human-in-the-loop (HITL), user communication, questioning, approvals, and coordination during agent execution.
- `rules/bootstrap-rosetta-files.mdc`: Defines workspace rosetta files.
- `rules/coding-iac-best-practices.mdc`: Rules for authoring reliable IaC artifacts.
- `rules/plugin-files-mode.mdc`: Rosetta bootstrap rule, top SKILL to understand user request and properly work on it
- `rules/prompt-best-practices.mdc`: Rules for authoring reliable, minimal, and clear prompts for AI agents. Apply when creating, refactoring, reviewing, or validating any prompt artifact.
- `rules/requirements-best-practices.mdc`: Rules for authoring reliable, explicit, and traceable requirements with mandatory user back-and-forth and per-unit approval.
- `rules/requirements-use-best-practices.mdc`: Rules for consuming requirements with strict traceability, explicit approvals, and no unapproved scope.
- `rules/speckit-integration-policy.mdc`: Invoke if directly requested, provides integration with the speckit
