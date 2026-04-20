---
name: init-workspace-flow-questions
description: "Phase 7 of init-workspace-flow, contains reflective gap-filling, user verification, and file updates."
tags: ["init", "workspace", "questions", "hitl", "phase"]
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_questions>

<description_and_purpose>

Problem: Automated analysis leaves gaps — ambiguous domain logic, unstated conventions, missing rationale.
Validation: Every accumulated gap has a resolution; each answer traces to at least one file update.

</description_and_purpose>

<workflow_context>

- Phase 7 of 8 in init-workspace-flow
- Input: all docs from Phases 1–6, accumulated gaps from state
- Output: answers integrated into docs, affected files updated via subagents

</workflow_context>

<phase_steps>

1. Read state and accumulated gaps
2. Review all created docs for gaps and contradictions
3. Ask user reflective questions (bootstrap-hitl-questioning rules)
4. Map answers to affected files
5. Spawn one built-in subagent per affected file: answer content, target path, update instructions, preserve-human-content
6. Verify subagent updates
7. Update state — clear resolved gaps, note unresolved

</phase_steps>

<pitfalls>

- Do not re-ask questions answered as in-phase blockers — check state
- Unanswered questions: log as deferred gap, do not guess

</pitfalls>

</init_workspace_flow_questions>
