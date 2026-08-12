---
name: arrange-workspace-flow-business-context
description: "Phase 3 Business context of arrange-workspace-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["arrangement", "workspace", "context", "phase"]
baseSchema: docs/schemas/phase.md
---

<arrange_workspace_business_context>

<description_and_purpose>
Close `CONTEXT.md` gaps, resolve contradictions, mine undocumented process — one continuous exploratory pass.
</description_and_purpose>

<workflow_context>
- Phase 3 of 6 in `arrange-workspace-flow`
- Input: existing `docs/CONTEXT.md`
- Output: updated `docs/CONTEXT.md` 
</workflow_context>

<phase_steps>
1. Find gaps, contradictions, tacit knowledge vs required topics
2. Interview user on findings only
3. Update `CONTEXT.md`
</phase_steps>

<business_context_topics>
Read and record the non-technical and engineering behavior facts about the project in `docs/CONTEXT.md`:

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
- Example DoD: ACs fully met, all builds are without errors and warnings, changes covered with unit+integration+e2e tests at 85%+, database correct and migration present, backend starts and succeeds with expected responses for affected areas validated directly, frontend/mobile/app starts and affected areas fully functional validated directly, validation perform using manual QA by AI using fresh subagent.
</business_context_topics>

<find_findings step="3.2">
1. Read existing `docs/CONTEXT.md` if present
2. Compare existing `docs/CONTEXT.md` and repo evidence against `business_context_topics`.
3. Note which topics are already covered vs missing or partial.
</find_findings>

<interview_findings step="3.3">
1. Interview only on findings (gaps, contradictions, tacit knowledge); skip fully covered topics.
</interview_findings>

<context_contract>
- Bulleted business context, purpose, domain — stakeholder perspective
- No technical details
- Limit to 100 lines, if there is MORE => keep CONTEXT.md with core CONTEXT plus index to per-feature <FEATURE>-CONTEXT.md files with a set of terms what it contains.
</context_contract>

<edit_context step="3.4">
1. Follow `context_contract` to update `docs/CONTEXT.md` according to user answers.
2. Update `arrange-state.md`
</edit_context>

<validation_checklist>
- `docs/CONTEXT.md` exists and is non-empty.
- `docs/CONTEXT.md` is <=100 lines, or it is an index to `docs/*-CONTEXT.md` files.
- `arrange-state.md` is updated
</validation_checklist>

<pitfalls>
- Re-interviewing topics already covered in `docs/CONTEXT.md`.
- Mixing business context with technical architecture.
- Editing `docs/CONTEXT.md` before findings coverage is complete.
</pitfalls>

</arrange_workspace_business_context>
