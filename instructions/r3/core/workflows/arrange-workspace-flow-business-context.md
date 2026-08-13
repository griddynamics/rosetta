---
name: arrange-workspace-flow-business-context
description: "Phase 3 Business context of arrange-workspace-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["arrange", "workspace", "context", "phase"]
baseSchema: docs/schemas/phase.md
---

<arrange_workspace_business_context>

<description_and_purpose>
Interview user to gather non-technical and engineering behavior facts about the project not yet in `docs/CONTEXT.md`.
</description_and_purpose>

<phase_steps>
1. Interview user about what's missing in `docs/CONTEXT.md` — use `starter_topics`. Follow Questioning process in `hitl` SKILL.
2. Record new knowledge to `docs/CONTEXT.md` per `context_contract`
3. Update `arrange-state.md`.
</phase_steps>

<starter_topics>
Starter topics (non-exhaustive — add project-specific questions as needed):
- Its overall goal.
- What it does in the client's wider ecosystem.
- The source and the target of the work.
- The issue tracker you use.
- How a story goes from ticket to implemented.
- Who the users and key stakeholders are.
- Core business rules and domain constraints.
- Any compliance or regulatory requirements.
- Accepted SDLC, DoD, and processes related to the project.
- References to documentation and ways to access it (example, acli or mcp for atlassian).
- etc.
Example DoD: ACs fully met, all builds are without errors and warnings, changes covered with unit+integration+e2e tests at 85%+, database correct and migration present, backend starts and succeeds with expected responses for affected areas validated directly, frontend/mobile/app starts and affected areas fully functional validated directly, validation perform using manual QA by AI using fresh subagent.
</starter_topics>

<context_contract>
- Bulleted business context, purpose, domain — stakeholder perspective
- No technical details
- Limit to 100 lines, if there is MORE => keep CONTEXT.md with core CONTEXT plus index to per-feature <FEATURE>-CONTEXT.md files with a set of terms what it contains.
</context_contract>

<validation_checklist>
- `docs/CONTEXT.md` exists, non-empty, <=100 lines (or indexed).
- `arrange-state.md` updated.
</validation_checklist>

<pitfalls>
- Re-interviewing topics already covered in `docs/CONTEXT.md`.
- Mixing business context with technical architecture.
</pitfalls>

</arrange_workspace_business_context>
