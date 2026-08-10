<arrangement_workspace_business_context>

<description_and_purpose>
Close `CONTEXT.md` gaps through one continuous gap-analysis and gap-only interview pass.
</description_and_purpose>

<workflow_context>
Phase 3 of 6 in `arrangement-workspace-flow`. HITL; interview covers gaps only.
</workflow_context>

<phase_steps>
1. Find gaps against required topics in `CONTEXT.md`
2. Interview user on gaps only
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

<find_gaps step="3.2">
1. Read existing `docs/CONTEXT.md` if present
2. Compare existing `docs/CONTEXT.md` and repo evidence against `business_context_topics`.
3. Note which topics are already covered vs missing or partial.
</find_gaps>

<interview_gaps step="3.3">
1. USE SKILL `hitl`.
2. USE SKILL `questioning`.
3. Interview only on missing or partial topics; skip covered topics.
</interview_gaps>

<context_contract>
- Bulleted business context, purpose, domain — stakeholder perspective
- No technical details
- Limit to 100 lines, if there is MORE => keep CONTEXT.md with core CONTEXT plus index to per-feature <FEATURE>-CONTEXT.md files with a set of terms what it contains.
</context_contract>

<edit_context step="3.4">
1. Follow `context_contract` to update `docs/CONTEXT.md` according to user answers.
2. Update `arrangement-state.md`
</edit_context>

<validation_checklist>
- `docs/CONTEXT.md` exists and is non-empty.
- `docs/CONTEXT.md` is <=100 lines, or it is an index to `docs/*-CONTEXT.md` files.
- `arrangement-state.md` is updated
</validation_checklist>

<pitfalls>
- Re-interviewing topics already covered in `docs/CONTEXT.md`.
- Mixing business context with technical architecture.
- Editing `docs/CONTEXT.md` before gap coverage is complete.
</pitfalls>

</arrangement_workspace_business_context>
