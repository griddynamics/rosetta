---
name: init-workspace-flow-questions
description: "Phase 8 Questions of init-workspace-flow"
tags: ["init", "workspace", "questions", "hitl", "phase"]
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_questions>

<description_and_purpose>

Problem: Automated analysis leaves gaps — ambiguous domain logic, unstated conventions, missing rationale.
Validation: Every accumulated gap has a resolution; each answer traces to at least one file update.

</description_and_purpose>

<workflow_context>

- Phase 8 of 9 in init-workspace-flow
- Input: all docs from Phases 1–7, accumulated gaps from state
- Output: answers integrated into docs, affected files updated directly
- These are intentional questions to the USER, auto mode / no approvals / etc ARE NOT APPLICABLE

</workflow_context>

<phase_steps>

1. Read state and accumulated gaps
2. Review all created docs for gaps and contradictions
3. Ask user reflective questions
4. Map answers to affected files
5. Update affected files
6. Ask critical/high/major impact questions
7. Prioritize by impact: scope > security/privacy > UX > technical
8. Ask few independent questions at a time, if question can be searched, checked in code, do that first
9. Adjust and interview user **relentlessly** about every aspect of the workspace until you reach a full shared understanding
10. User is allowed to skip and leave items unresolved, but this must be highly discouraged
11. Keep facts, document concise, valuable, highly compressed, cut wording, use terms and common patterns
12. Update state — clear resolved gaps, note unresolved

</phase_steps>

<pitfalls>

- Auto mode classifier defers user questions
- Do not re-ask questions answered as in-phase blockers — check state
- Unanswered questions: log as deferred gap, do not guess

</pitfalls>

</init_workspace_flow_questions>
