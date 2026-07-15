---
name: testgen-flow-requirements-document-generation
description: "Phase 4 Requirements Document of testgen-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<testgen_flow_requirements_document_generation>

<description_and_purpose>
Synthesize Issue Tracker data, Wiki documentation, and user answers into a comprehensive, structured requirements document with user stories, functional/non-functional requirements, constraints, and traceability.
</description_and_purpose>

<workflow_context>
- Phase 4 of 7 in `testgen-flow`
- Input: `raw-data.md`, `analysis.md`, `answers.md`
- Output: `requirements.md` — primary deliverable for test case generation
- Required skills: `qa-knowledge` (`synthesis` mode)
- Prerequisite: Phase 0-3 complete with validated user answers
- Priority order for source resolution: User answers > Issue Tracker ticket > Wiki > Analysis insights
</workflow_context>

<phase_steps>
1. Load all source data
2. Synthesize requirements
3. Create requirements document
4. Update state file
</phase_steps>

<load_sources step="4.1">
1. Read all previous phase outputs:
   - `plans/testgen-{TICKET-KEY}/raw-data.md` — Issue Tracker + Wiki data
   - `plans/testgen-{TICKET-KEY}/analysis.md` — identified issues
   - `plans/testgen-{TICKET-KEY}/answers.md` — user clarifications
</load_sources>

<synthesize_requirements step="4.2" subagent="architect" role="Requirements engineer">
1. USE SKILL `qa-knowledge` (`synthesis` mode). The mode EMITS into this phase's `<create_requirements_document>` section contract; the phase OWNS the document skeleton and output path.
2. Source priority: User answers (Phase 3) > Issue Tracker ticket > Wiki docs > Analysis insights
3. Resolve contradictions using user answers; fill gaps using user answers; flag unresolved items as assumptions
4. Generate: user stories (US-N), functional requirements (FR-N), non-functional requirements (NFR-N), constraints (C-N), dependencies (D-N), assumptions (A-N), risks (R-N)
5. Build traceability matrix linking requirements to ticket/Wiki sources
</synthesize_requirements>

<create_requirements_document step="4.3">

Create `plans/testgen-{TICKET-KEY}/requirements.md`. The `qa-knowledge` `synthesis` mode emits per its synthesis rules and its synthesis output schemas (owned internally by the skill).

**Section contract (phase-owned SSoT)** — the table below is **the authoritative phase contract the synthesis mode MUST satisfy**, not a parallel restatement. The mode's document wrapper uses the same scheme (front-matter + 10 numbered sections). If the emitted skeleton drifts from this table, the phase fails verification and re-invokes rather than accepting a divergent shape; the phase **bounds the contract**, the skill is the implementation.

| # | Section | Per-entry shape (synthesis schema) |
|---|---|---|
| Front-matter | Document Control + Executive Summary | (Executive Summary extended below for testgen) |
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
- Ticket: [TICKET-KEY]
- Wiki: [N] pages
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
| FR-1 | Ticket DESC | US-1 | To be generated (Phase 5) |
| NFR-1 | User Answer Q5 | - | To be generated (Phase 5) |
```

Each **User Story (US-N)** carries a **Definition of Done** sub-block (testgen addition layered on the user-stories schema): a short done-conditions checklist (acceptance criteria satisfied, test scenarios defined, docs/config updated as applicable) so Phase 5 can derive coverage from explicit completion criteria.

All requirements must follow SMART criteria: Specific, Measurable, Achievable, Relevant, Testable.

**Compact SMART exemplar** (phase-level grounding so the agent emits measurable requirements rather than vague ones — full FR/NFR/US worked examples are owned by the `qa-knowledge` synthesis mode):

```markdown
### NFR-1: Performance - Login Response Time
**Category**: Performance
**Measurement**: p95 < 200ms for the `POST /api/v1/auth/login` endpoint, measured at the load balancer over a 5-minute window at 1000 concurrent users.
**Priority**: P0 Critical
**Source**: User Answer Q5 + Wiki page "SLO catalog"
```

The Measurement field carries the threshold (numeric + measurement window + load condition). A non-SMART form (`Login should be fast`) carries no threshold and would be moved to `assumptions-and-risks` per the synthesis mode's NFR-threshold rule.

**Coverage prompt** (systematic-discovery checklist — applied per the synthesis mode's Coverage-discipline rule "include only categories the sources actually specify; do not pad"):

- **FR capability classes** to scan against: auth, data management, business logic, integrations, reporting, notifications, admin/configuration, search, file handling. Cover each class only if the sources mention it.
- **NFR categories** to scan against: Performance, Security, Scalability, Usability, Reliability, Maintainability. Include an NFR only when the source data or user answers specify a constraint in that category.

</create_requirements_document>

<update_state step="4.4">
1. Update `plans/testgen-{TICKET-KEY}/testgen-state.md` with Phase 4 complete and requirement counts (user stories, FRs, NFRs, constraints, dependencies, assumptions, risks)
2. Tell user: "Phase 4 complete. Generated [X] user stories, [Y] functional requirements, [Z] non-functional requirements."
3. Show document location: `plans/testgen-{TICKET-KEY}/requirements.md`
4. Ask: "Please review requirements.md. Ready to proceed to Phase 5 (Test Case Generation)?"
5. **STOP AND WAIT** for explicit user confirmation before advancing to Phase 5. Do NOT auto-proceed on inferred approval or silence; treat ambiguous responses (questions, suggestions) as "not confirmed" and re-ask. This is a **priority-(3) per-phase confirmation** per `testgen-flow.md` `<orchestration_and_escalation>` — an explicit user instruction to skip it is honored there; it is **not** one of the never-overridable Phase 3 / Phase 6 HITL gates.
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
- **Contradictions unresolved by user answers** (the synthesis mode identifies a contradiction whose mapping question was either unanswered or whose answer is itself contradictory): record the unresolved contradiction as an explicit **Risk (R-N)** in `requirements.md` with full source citations (ticket quote, Wiki quote, user answer if any). Do not invent a resolution. Proceed with the rest of Phase 4 but flag the risk in the Executive Summary.
- **Skill execution failure** (`qa-knowledge` synthesis mode errors or returns empty): re-invoke once with the same inputs; if still failing, stop, record the skill failure, and ask the user to verify input quality. **No inline per-entry fallback exists, by design** — the synthesis mode is a hard dependency (canonical owner of the US/FR/NFR/C/D/A/R shapes, SMART/threshold/provenance discipline); requirement entries carry authoring discipline that does not transfer to an inline template. The phase **blocks** when the skill is unavailable; do NOT fabricate a partial requirements.md.

</failure_handling>

<pitfalls>
- Don't copy ticket/Wiki content verbatim — synthesize and structure into proper requirements
- Don't use technical implementation details in user stories — focus on user/business value
- Acceptance criteria must be testable and objective, not subjective
- Each user story must be independently valuable
</pitfalls>

</testgen_flow_requirements_document_generation>
