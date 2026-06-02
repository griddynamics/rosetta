---
name: testgen-flow-requirements-document-generation
description: Phase 4 of testgen-flow - Generate structured requirements document from all collected data
tags: ["testgen", "phase"]
baseSchema: docs/schemas/phase.md
---

<testgen_flow_requirements_document_generation>

<description_and_purpose>
Synthesize Jira data, Confluence documentation, and user answers into a comprehensive, structured requirements document with user stories, functional/non-functional requirements, constraints, and traceability.
</description_and_purpose>

<workflow_context>
- Phase 4 of 7 in `testgen-flow`
- Input: `raw-data.md`, `analysis.md`, `answers.md`
- Output: `requirements.md` — primary deliverable for test case generation
- Skills: `requirements-synthesis`
- Prerequisite: Phase 0-3 complete with validated user answers
- Priority order for source resolution: User answers > Jira > Confluence > Analysis insights
</workflow_context>

<phase_steps>
1. Load all source data
2. Synthesize requirements
3. Create requirements document
4. Update state file
</phase_steps>

<load_sources step="4.1">
1. Read all previous phase outputs:
   - `agents/testgen/{TICKET-KEY}/raw-data.md` — Jira + Confluence data
   - `agents/testgen/{TICKET-KEY}/analysis.md` — identified issues
   - `agents/testgen/{TICKET-KEY}/answers.md` — user clarifications
</load_sources>

<synthesize_requirements step="4.2" subagent="architect" role="Requirements engineer">
1. USE SKILL `requirements-synthesis`
2. Source priority: User answers (Phase 3) > Jira ticket > Confluence docs > Analysis insights
3. Resolve contradictions using user answers; fill gaps using user answers; flag unresolved items as assumptions
4. Generate: user stories (US-N), functional requirements (FR-N), non-functional requirements (NFR-N), constraints (C-N), dependencies (D-N), assumptions (A-N), risks (R-N)
5. Build traceability matrix linking requirements to Jira/Confluence sources
</synthesize_requirements>

<create_requirements_document step="4.3">

Create `agents/testgen/{TICKET-KEY}/requirements.md` using the output format from the `requirements-synthesis` skill (its `<output_format>` block defines the document-level skeleton; its `references/output-schemas.md` defines per-entry shapes).

**Canonical section list** (so the agent can self-verify completeness without re-reading the skill — these MUST all be present in the emitted `requirements.md`):

| # | Section | Per-entry shape from `requirements-synthesis` |
|---|---|---|
| Header | Document Control + Executive Summary | (Executive Summary extended below for testgen) |
| 1 | User Stories | `US-[N]` entries (user-stories schema) |
| 2 | Functional Requirements | `FR-[N]` entries (functional-requirements schema) |
| 3 | Non-Functional Requirements | `NFR-[N]` entries (non-functional-requirements schema) |
| 4 | Constraints | `C-[N]` entries (constraints-and-dependencies schema) |
| 5 | Dependencies | `D-[N]` entries (constraints-and-dependencies schema) |
| 6 | Out of Scope | Explicit exclusions with rationale |
| 7 | Assumptions | `A-[N]` entries (assumptions-and-risks schema) |
| 8 | Risks | `R-[N]` entries (assumptions-and-risks schema) |
| 9 | Traceability Matrix | (Extended below for testgen) |
| 10 | Glossary | Domain terms + acronyms |

If any section is absent from the emitted document, the artifact is incomplete — re-invoke the skill or repair before declaring step 4.3 complete.

**Testgen-specific additions** layered on top of the canonical structure:

Executive Summary must include:
```markdown
## Executive Summary

**Project**: [Project Name]
**Ticket**: [TICKET-KEY]
**Description**: [2-3 sentence overview]

**Scope Summary**:
- [Key capability 1]
- [Key capability 2]

**Sources**:
- Jira: [TICKET-KEY]
- Confluence: [N] pages
- User Clarifications: [N] questions answered

**Source Resolution**:
- Contradictions Resolved: [Count]
- Gaps Filled: [Count]
- Ambiguities Clarified: [Count]
```

Traceability Matrix must include Test Scenario placeholder column:
```markdown
| Requirement ID | Source | User Story | Test Scenario |
|----------------|--------|------------|---------------|
| FR-1 | Jira DESC | US-1 | To be generated (Phase 5) |
| NFR-1 | User Answer Q5 | - | To be generated (Phase 5) |
```

All requirements must follow SMART criteria: Specific, Measurable, Achievable, Relevant, Testable.

</create_requirements_document>

<update_state step="4.4">
1. Update `agents/testgen/{TICKET-KEY}/testgen-state.md` with Phase 4 complete and requirement counts (user stories, FRs, NFRs, constraints, dependencies, assumptions, risks)
2. Tell user: "Phase 4 complete. Generated [X] user stories, [Y] functional requirements, [Z] non-functional requirements."
3. Show document location: `agents/testgen/{TICKET-KEY}/requirements.md`
4. Ask: "Please review requirements.md. Ready to proceed to Phase 5 (Test Case Generation)?"
</update_state>

<validation_checklist>
- `requirements.md` created with all required sections
- Requirement counts **appropriate to ticket scope**: aim for at least 1 user story, 3 functional requirements, 2 non-functional requirements. **Escape clause for trivial tickets:** if the ticket genuinely warrants fewer (e.g., a config-only change, a typo fix, a single-endpoint patch), record the rationale in the Assumptions section and proceed with the smaller count. The minimums are guidance for default-scope tickets, not hard floors for trivial ones.
- All user answers from Phase 3 incorporated
- Unresolved items documented as assumptions with impact assessment
- Traceability matrix present linking requirements to sources
- State file updated with Phase 4 complete
</validation_checklist>

<failure_handling>
- **Missing or empty inputs** (`raw-data.md`, `analysis.md`, or `answers.md` absent or empty): stop Phase 4, record which input is missing in `testgen-state.md`, and announce which earlier phase to resume. Note: if Phase 3 was marked `SKIPPED — no questions`, an empty `answers.md` is acceptable; proceed without it.
- **Contradictions unresolved by user answers** (the requirements skill identifies a contradiction whose mapping question was either unanswered or whose answer is itself contradictory): record the unresolved contradiction as an explicit **Risk (R-N)** in `requirements.md` with full source citations (Jira quote, Confluence quote, user answer if any). Do not invent a resolution. Proceed with the rest of Phase 4 but flag the risk in the Executive Summary.
- **Skill execution failure** (`requirements-synthesis` errors or returns empty): re-invoke once with the same inputs; if still failing, stop, record the skill failure, and ask the user to verify input quality.
</failure_handling>

<pitfalls>
- Don't copy Jira/Confluence verbatim — synthesize and structure into proper requirements
- Don't use technical implementation details in user stories — focus on user/business value
- Acceptance criteria must be testable and objective, not subjective
- Each user story must be independently valuable
</pitfalls>

</testgen_flow_requirements_document_generation>
