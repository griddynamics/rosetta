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

- Rosetta prep steps completed
- **ONE PHASE AT A TIME:** ACQUIRE phase file, execute, update state, move to next.
- **DO NOT SKIP PHASES:** Each builds on the previous. Skip gates: only with **explicit user instruction**, **or** when `testgen-state.md` marks the phase complete **and** its expected output file exists under `agents/testgen/{TICKET-KEY}/`; otherwise resume from the earliest incomplete phase.
- **Verification-failure resume:** see `<orchestration_and_escalation>` — single canonical home for the unilateral-start override; scope-locked to the missing-state + missing-output case. Does NOT override the per-phase USER CONFIRMATION below (happy path), the Phase 3 / Phase 6 HITL approval gates, or any safety/destructive confirmation.
- **STATE TRACKING:** Update `agents/testgen/{TICKET-KEY}/testgen-state.md` after each phase.
- **SELF-CHECK BETWEEN PHASES:** Before advancing, verify the state file row was updated, the expected output file exists and is non-empty, and any HITL approval (Phase 3, 6) is recorded.
- USE SKILL `sequential-workflow-execution` for the canonical implementation of the bullets above (ACQUIRE if not already loaded). The inline bullets remain authoritative if the SKILL fails to load.
- MUST FOLLOW THIS WORKFLOW ENTIRELY AND FULLY, ALL PHASES ARE SEQUENTIAL.
- **USER CONFIRMATION:** Wait for approval before next phase. (Happy-path governance — applies to every phase transition that is NOT the verification-failure resume case above; that single carve-out lives in `<orchestration_and_escalation>` and does not generalize.)
- MUST use todo tasks for tracking progress.
- MUST create output directory `agents/testgen/{TICKET-KEY}/` at start.
- **Per-phase failure cases + grounding examples — owned by phase files** (verification trail; router stays thin):
  - *Jira ticket not found* → `testgen-flow-data-collection.md` + `mcp-jira-data-collection` skill `<failure_handling>`
  - *No Confluence results* → `testgen-flow-data-collection.md` + `confluence-source-harvesting` skill `<failure_handling>`
  - *User declines / does not answer questions* → `testgen-flow-question-generation.md` `<failure_handling>` "User explicitly declines to answer"
  - *Incomplete / missing requirements inputs* → `testgen-flow-requirements-document-generation.md` `<failure_handling>` "Missing or empty inputs"
  - *CQL search example + ranking rule* → `mcp-confluence-data-collection/references/cql-and-redaction.md`
  - *Initial-prompt format examples* (PROJ-123, full Jira URL) → `testgen-flow-project-config-loading.md`
- **Model tier vocabulary** (centralized — phase headers reference tiers, not dated model IDs, so vendor/release churn does not rot the phase definitions):
  - `tier: complex` — heavy reasoning / multi-source synthesis / gap-and-contradiction analysis / requirements engineering. Current recommended: Anthropic Opus-class, OpenAI GPT high-tier.
  - `tier: workhorse` — structured execution / data extraction / test-case generation + export. Current recommended: Anthropic Sonnet-class, OpenAI GPT medium-tier.
  - The tier hint is the agent-agnostic anchor. Rosetta or the session bootstrap may override the concrete model mapping; phase headers should be edited only when adding a tier, not when models churn.

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
4. Recommended skills: `mcp-jira-data-collection`, `mcp-confluence-data-collection`, `confluence-source-harvesting`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</data_collection>

<gap_and_contradiction_analysis phase="2" subagent="architect" role="Requirements gap analyst" subagent_recommended_model="tier: complex">

1. ACQUIRE `testgen-flow-gap-and-contradiction-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: raw-data.md. Output: `agents/testgen/{TICKET-KEY}/analysis.md` with contradictions, gaps, ambiguities.
4. Recommended skills: `gap-and-contradiction-analysis`
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
4. Recommended skills: `requirements-synthesis`
5. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</requirements_document_generation>

<test_case_generation phase="5" subagent="engineer" role="Test case design engineer" subagent_recommended_model="tier: workhorse">

1. ACQUIRE `testgen-flow-test-case-generation.md` FROM KB
2. Execute phase instructions.
3. Input: requirements.md. Output: `agents/testgen/{TICKET-KEY}/test-scenarios.md`
4. Recommended skills: `testrail-test-case-authoring`, `repository-implementation-standards`
5. Apply `repository-implementation-standards` per `<phase_5_6_standards_gate>`.
6. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</test_case_generation>

<test_case_export phase="6" subagent="engineer" role="Test case export specialist" subagent_recommended_model="tier: workhorse" type="HITL">

1. ACQUIRE `testgen-flow-test-case-export.md` FROM KB
2. Execute phase instructions.
3. Input: test-scenarios.md. Output: test cases exported to Test Management System **and** a local export receipt at `agents/testgen/{TICKET-KEY}/export-report.md` (TMS IDs/URLs, per-case status, timestamp). The local receipt is the on-disk evidence Phase 6 ran successfully.
4. **WAIT FOR USER** to provide target location and confirm export.
5. Recommended skills: `testrail-test-case-export`, `repository-implementation-standards`
6. Apply `repository-implementation-standards` per `<phase_5_6_standards_gate>`.
7. Update `agents/testgen/{TICKET-KEY}/testgen-state.md`

</test_case_export>

</workflow_phases>

<orchestration_and_escalation>

- **Verification-failure unilateral-start override** (single-rule form):
  - **Deference (scope-lock).** This is the **only** sanctioned no-ask deviation from the per-phase USER CONFIRMATION rule in `<workflow_phases>` and from session-wide `hitl` skill defaults. It applies **only** when ALL three preconditions below hold AND **only** at this verification-failure gate. Do **NOT** generalize the no-ask behavior to any other branch. **Explicit carve-outs that remain in force at all times** — the override never suppresses these:
    - **Per-phase USER CONFIRMATION** (`<workflow_phases>` happy-path rule) — still governs every phase transition that is not the verification-failure resume case.
    - **Phase 3 HITL approval gate** — user MUST answer `questions.md`; this is genuine HITL, not a confirmation request that can be elided.
    - **Phase 6 HITL approval gate** — user MUST confirm target TMS location + export scope; this is genuine HITL.
    - **Safety / destructive confirmations** — any prompt before file deletion, repository edits outside `agents/testgen/{TICKET-KEY}/`, TMS write scope changes, or comparable destructive/irreversible actions. The `<phase_5_6_standards_gate>` confirmation discipline for outside-output-dir writes also remains in force.
  - **Precondition (ALL must be true):** (a) user has explicitly asserted phase(s) are complete in this turn, AND (b) `agents/testgen/{TICKET-KEY}/testgen-state.md` does NOT mark the asserted phases complete (row missing or `[ ]` unchecked), AND (c) the matching expected output file (per `<state_file>` / `<output_directory>`) is absent under `agents/testgen/{TICKET-KEY}/`.
  - **If precondition holds:** print one line naming the failing conditions (e.g., `skip refused: testgen-state.md row missing → starting at Phase 0`), then start the earliest incomplete phase in the **same turn** — do NOT call `AskUserQuestion`, present options, or pause for input. The verification result IS the decision at this specific gate.
  - **If any precondition is uncertain or only partially true** (state file partially present, ambiguous user assertion, output file present but stale): fall back to the normal HITL ask path. **Ambiguity defaults to ASK, not auto-start.**
  - **Scope:** applies ONLY at this verification-failure gate. Authority on ask-before-action elsewhere: the per-phase USER CONFIRMATION rule in `<workflow_phases>` for happy-path transitions, the `hitl` skill defaults for all other branches, the explicit carve-outs above for genuine HITL + safety confirmations.
  - *Rationale (one line): at this gate the verification result IS the decision — the user has already asserted; asking again creates a contradictory loop until artifacts exist.*

</orchestration_and_escalation>

<phase_5_6_standards_gate>
- Applies to phases 5-6: apply `repository-implementation-standards` when a phase writes any file outside `agents/testgen/{TICKET-KEY}/`.
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
- `questioning`, `requirements-synthesis`, `testrail-test-case-authoring`
- `sequential-workflow-execution`, `repository-implementation-standards`, `confluence-source-harvesting`
- `mcp-jira-data-collection`, `mcp-confluence-data-collection`
- `gap-and-contradiction-analysis`
- `testrail-test-case-export` 

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
