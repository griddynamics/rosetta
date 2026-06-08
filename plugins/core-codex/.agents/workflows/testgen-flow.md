---
name: testgen-flow
description: MUST apply when test case generation task is assigned. (e.g if a user asks to generate test cases for TICKET-123, create test scenarios from Jira, analyze requirements and generate tests, export tests to Test Management System)
alwaysApply: false
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<testgen_flow>

<description_and_purpose>

Systematic requirements analysis from Jira tickets and Confluence documentation to structured requirements and test scenarios. Extracts data, identifies gaps, clarifies unknowns via HITL, generates requirements document, and produces test cases with optional export to a Test Management System. Designed for BA/QA engineers and requirements engineers.

</description_and_purpose>

<workflow_phases>

- Rosetta prep steps completed.
- **ONE PHASE AT A TIME:** ACQUIRE phase file, execute, update state, move to next.
- **DO NOT SKIP PHASES:** Each builds on the previous. Skip gates: only with **explicit user instruction**, **or** when `testgen-state.md` marks the phase complete **and** its expected output file exists under `agents/testgen/{TICKET-KEY}/`; otherwise resume from the earliest incomplete phase.
- **Transition precedence** (the only place referenced from here): `<orchestration_and_escalation>` priority hierarchy.
- **STATE TRACKING:** Update `agents/testgen/{TICKET-KEY}/testgen-state.md` after each phase.
- **SELF-CHECK BETWEEN PHASES:** Before advancing, verify the state file row was updated, the expected output file exists and is non-empty, and any HITL approval (Phase 3, 6) is recorded.
- USE SKILL `orchestrator-contract` for the canonical implementation (ACQUIRE if not loaded). Inline bullets remain authoritative on skill load failure.
- MUST use todo tasks for tracking progress.
- MUST create output directory `agents/testgen/{TICKET-KEY}/` at start.
- **Canonical trigger prompt example** (one inline grounding instance so the agent has a reference before phase files load; additional formats per `testgen-flow-project-config-loading.md`): `Analyze requirements for PROJ-123` (also accepted: bare ticket key `PROJ-123`, full Jira URL).
- **Per-phase failure cases — owned by phase files** (verified anchors; the router is a thin coordinator):
  - *Jira ticket not found* → `testgen-flow-data-collection.md` + `discovery` skill `<failure_handling>` (Jira binding).
  - *No Confluence results* → `testgen-flow-data-collection.md` + `discovery` skill `<failure_handling>` (Confluence binding).
  - *User declines / does not answer questions* → `testgen-flow-question-generation.md` `<failure_handling>` "User explicitly declines to answer".
  - *Incomplete / missing requirements inputs* → `testgen-flow-requirements-document-generation.md` `<failure_handling>` "Missing or empty inputs".
  - *CQL search example + ranking rule* → the `discovery` Confluence binding (`references/confluence-binding.md`).
  - *Initial-prompt format examples* → `testgen-flow-project-config-loading.md`.
  - **Phase 6 80%-export-success threshold (measurable)** → `testgen-flow-test-case-export.md` (`Threshold (80%) met` field + `PARTIAL — N/M exported` state). The router does not duplicate the threshold.
  - **Phase 5 test-case-count guidance (10-30 typical)** → `testgen-flow-test-case-generation.md` `<validation_checklist>`.
- **Model tier vocabulary:**
  - `tier: complex` — heavy reasoning / multi-source synthesis / gap-and-contradiction analysis / requirements engineering. Current recommended: Anthropic Opus-class, OpenAI GPT high-tier.
  - `tier: workhorse` — structured execution / data extraction / test-case generation + export. Current recommended: Anthropic Sonnet-class, OpenAI GPT medium-tier.

<project_config_loading phase="0" subagent="discoverer" role="Project configuration analyst" subagent_recommended_model="tier: workhorse">

1. ACQUIRE `testgen-flow-project-config-loading.md` FROM KB
2. Execute phase instructions.
3. Input: user request with Jira ticket key/URL. Output: `agents/testgen/{TICKET-KEY}/initial-data.md`, project config file.
4. Recommended skills: `questioning`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</project_config_loading>

<data_collection phase="1" subagent="discoverer" role="Requirements data collector" subagent_recommended_model="tier: workhorse">

1. ACQUIRE `testgen-flow-data-collection.md` FROM KB
2. Execute phase instructions.
3. Input: initial user request, initial-data.md. Output: `agents/testgen/{TICKET-KEY}/raw-data.md` with Jira + Confluence data.
4. Recommended skills: `discovery`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</data_collection>

<gap_and_contradiction_analysis phase="2" subagent="architect" role="Requirements gap analyst" subagent_recommended_model="tier: complex">

1. ACQUIRE `testgen-flow-gap-and-contradiction-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: raw-data.md. Output: `agents/testgen/{TICKET-KEY}/analysis.md` with contradictions, gaps, ambiguities.
4. Recommended skills: `requirements-use`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</gap_and_contradiction_analysis>

<question_generation phase="3" subagent="architect" role="Requirements clarification analyst" subagent_recommended_model="tier: complex" type="HITL">

1. ACQUIRE `testgen-flow-question-generation.md` FROM KB
2. Execute phase instructions.
3. Input: analysis.md. Output: `agents/testgen/{TICKET-KEY}/questions.md`, `agents/testgen/{TICKET-KEY}/answers.md`.
4. **WAIT FOR USER** to fill answers in questions.md. Explicit approval required.
5. Recommended skills: `questioning`
6. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</question_generation>

<requirements_document_generation phase="4" subagent="architect" role="Requirements engineer" subagent_recommended_model="tier: complex">

1. ACQUIRE `testgen-flow-requirements-document-generation.md` FROM KB
2. Execute phase instructions.
3. Input: raw-data.md + analysis.md + answers.md. Output: `agents/testgen/{TICKET-KEY}/requirements.md`.
4. Recommended skills: `requirements-authoring`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</requirements_document_generation>

<test_case_generation phase="5" subagent="engineer" role="Test case design engineer" subagent_recommended_model="tier: workhorse">

1. ACQUIRE `testgen-flow-test-case-generation.md` FROM KB
2. Execute phase instructions.
3. Input: requirements.md. Output: `agents/testgen/{TICKET-KEY}/test-scenarios.md`
4. Recommended skills: `scenarios-generation`, `coding`
5. Apply `coding` per `<phase_5_6_standards_gate>`.
6. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</test_case_generation>

<test_case_export phase="6" subagent="engineer" role="Test case export specialist" subagent_recommended_model="tier: workhorse" type="HITL">

1. ACQUIRE `testgen-flow-test-case-export.md` FROM KB
2. Execute phase instructions.
3. Input: test-scenarios.md. Output: test cases exported to Test Management System **and** a local export receipt at `agents/testgen/{TICKET-KEY}/export-report.md` (TMS IDs/URLs, per-case status, timestamp). The local receipt is the on-disk evidence Phase 6 ran successfully.
4. **WAIT FOR USER** to provide target location and confirm export.
5. Recommended skills: `scenarios-generation`, `coding`
6. Apply `coding` per `<phase_5_6_standards_gate>`.
7. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</test_case_export>

</workflow_phases>

<orchestration_and_escalation>

- **Transition rules priority hierarchy** (highest priority NEVER overridden → lowest):
  1. **Safety / destructive confirmations** — file deletion, repo edits outside `agents/testgen/{TICKET-KEY}/`, TMS write scope changes, comparable irreversible actions. Includes `<phase_5_6_standards_gate>` outside-output-dir confirmation.
  2. **Phase 3 + Phase 6 HITL approval gates** — user MUST answer `questions.md` / confirm TMS target + export scope.
  3. **Per-phase USER CONFIRMATION** — every phase transition that is not the verification-failure resume case.
  4. **Verification-failure unilateral-start override** — narrow carve-out at the verification-failure gate only; subordinate to rules 1–3; defaults to ASK on ambiguity.

- **Verification-failure unilateral-start override** — subordinate to `bootstrap-hitl-questioning` + rules 1–3 above; the only no-ask deviation from rule 3.
  - **Trigger** (ALL three must hold): user asserted phase(s) complete this turn + `agents/testgen/{TICKET-KEY}/testgen-state.md` does not mark the asserted phases complete + the matching expected output file is absent under `agents/testgen/{TICKET-KEY}/`.
  - **Action:** print one line naming failing conditions, log the override into `agents/testgen/{TICKET-KEY}/testgen-state.md` `## Verification-Failure Overrides` (timestamp + asserted-complete claim + failing conditions + phase started), start the earliest incomplete phase in the same turn — do NOT call `AskUserQuestion`.
  - **Default:** uncertainty (partial state, ambiguous assertion, stale output) → fall back to normal HITL ask.

</orchestration_and_escalation>

<phase_5_6_standards_gate>
- Applies to phases 5-6: apply `coding` when a phase writes any file outside `agents/testgen/{TICKET-KEY}/`.
- **mixed outputs** means one phase writes both inside and outside `agents/testgen/{TICKET-KEY}/`.
- **missing/partial repo-edit confirmation** means the user did not explicitly confirm repository edit scope in chat for that phase.
- Default behavior: if confirmation is missing/partial or outputs are mixed, apply the skill.
- Examples: apply when writing `cypress/e2e/login.spec.ts`; skip when writing only `agents/testgen/JIRA-123/test-scenarios.md`.
</phase_5_6_standards_gate>

<state_file>

Create/update `agents/testgen/{TICKET-KEY}/testgen-state.md` after each phase:

```markdown
# Test Generation State - <Ticket ID>

**Last Updated**: [DateTime]
**Current Phase**: [0-6 or COMPLETE]
**Jira Ticket**: [TICKET-KEY]

## Phase Completion Status

- [x] Phase 0: Project Config Loading - Completed [Date]
- [ ] Phase 1: Data Collection - Not started
- [ ] Phase 2: Gap Analysis - Not Started
- [ ] Phase 3: Question Generation - Not Started
- [ ] Phase 4: Requirements Generation - Not Started
- [ ] Phase 5: Test Scenarios - Not Started
- [ ] Phase 6: Test Case Export - Not Started

## Phase Details

### Phase 1
- Completed: [DateTime]
- Jira Ticket: [KEY]
- Files Created: [List]
- Confluence Pages: [Count]
- Notes: [Any relevant notes]

[Add sections for each completed phase]

## Verification-Failure Overrides

[Append a row each time the `<orchestration_and_escalation>` verification-failure unilateral-start override fires. If never fired, write: `None — no overrides applied.`]

- **[ISO timestamp]** — User asserted phases complete: `[user's verbatim claim]`. Failing conditions: `[which preconditions were unmet — state row missing / output file absent / etc.]`. Phase started: `[earliest incomplete phase id]`.
```

</state_file>

<output_directory>

All phase outputs stored in `agents/testgen/{TICKET-KEY}/`:

```
agents/testgen/{TICKET-KEY}/
├── testgen-state.md        # State tracking (updated each phase)
├── initial-data.md         # Phase 0: Initial user input + project config ref
├── raw-data.md             # Phase 1: Jira + Confluence data
├── analysis.md             # Phase 2: Gap analysis
├── questions.md            # Phase 3: Generated questions
├── answers.md              # Phase 3: User answers (HITL)
├── requirements.md         # Phase 4: Final requirements
├── test-scenarios.md       # Phase 5: Test cases
└── export-report.md        # Phase 6: TMS export receipt (IDs/URLs, per-case status, timestamp)
```

</output_directory>

<references>

Subagents:
- `discoverer` (Lightweight): external MCP data gathering, project setup
- `architect` (Full): gap analysis, question generation, requirements engineering
- `engineer` (Full): test case generation, TMS export

Skills:
- `questioning`, `requirements-authoring`, `scenarios-generation`
- `orchestrator-contract`, `coding`
- `discovery`
- `requirements-use`

MCPs:
- `Atlassian Jira` — ticket data extraction
- `Atlassian Confluence` — documentation retrieval
- `TestRail` — test case export (Phase 6, when TMS is TestRail)
- `Google Drive` — additional documentation (if configured)

</references>

<best_practices>

- Sequential execution only: each phase builds on the previous
- No assumptions: document all unknowns, ask user via HITL gates
- Evidence-based: all requirements reference actual Jira/Confluence content
- Traceability: link requirements to source and test cases to requirements

</best_practices>

<validation_checklist>

- Each phase has corresponding output file in output directory
- State file reflects accurate phase completion status
- HITL gates (Phase 3, 6) have explicit user approval evidence
- Requirements trace back to Jira/Confluence sources
- Test cases trace back to requirements

</validation_checklist>

<pitfalls>

- Skipping Phase 3 HITL gate leads to assumptions in requirements
- Confluence child pages often contain critical detail — always check for children
- TMS MCP may lack container creation — user may need to create target locations manually in TMS UI
- Merging redundant test cases too aggressively can lose coverage

</pitfalls>

</testgen_flow>
