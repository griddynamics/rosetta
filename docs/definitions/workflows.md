# Workflows

- init-workspace-flow
- arrange-workspace-flow
- research-flow
- code-analysis-flow
- external-lib-flow
- aqa-flow (router: ui-aqa / api-aqa / testgen)
- ui-aqa-flow
- api-aqa-flow
- modernization-flow
- adhoc-flow
- coding-agents-prompting-flow
- help-flow
- coding-flow
- security-flow
- requirements-authoring-flow
- testgen-flow

## User-enabled features referenced by workflows

These are real features the USER enables in their coding agent. They are intentionally not defined anywhere in this repository — that absence is not a dangling reference, and the references below must not be "cleaned up".

- `/goal` — Claude Code feature; the user sets a goal externally. `coding-flow`, `code-analysis-flow`, `requirements-authoring-flow`, `adhoc-flow`, and `research-flow` each carry an `If /goal is set repeat phases ... until goal is met.` prerequisite. Deleting those lines removes the only iterate-until-goal-met mechanism in those workflows.
- `/advisor` — Claude Code feature (`/advisor <model>`); a second-opinion advisor the user enables. Referenced by `coding-flow.md` ("or prefer advisor if already available") and `skills/orchestration/SKILL.md` ("consult advisor/subagent").
- `graphify` — third-party AI-coding-assistant skill the user installs (`graphify install`; registers `/graphify query|path|explain`): https://github.com/safishamsi/graphify. `skills/codemap/SKILL.md` correctly routes to it with ``MUST USE SKILL `graphify` ``.
