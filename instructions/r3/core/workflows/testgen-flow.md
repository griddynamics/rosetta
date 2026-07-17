---
name: testgen-flow
description: "Workflow for generating test cases from requirements (Issue Tracker / Wiki sources), exporting to a Test Management System, etc."
alwaysApply: false
tags: ["workflow"]
user-invocable: true
baseSchema: docs/schemas/workflow.md
---

<testgen_flow>

<description_and_purpose>

Systematic requirements analysis from Issue Tracker tickets and Wiki documentation to structured requirements and test scenarios. Extracts data, identifies gaps, clarifies unknowns via HITL, generates requirements document, and produces test cases with export to a Test Management System (Phase 6, user-triggered — the user may choose not to trigger it, but it is a fully-specified phase, not informally skippable). Designed for BA/QA engineers and requirements engineers.

Prerequisite: Rosetta Prep Steps.

**Terminology.** External systems are named by role throughout this workflow and its phases: **Issue Tracker**, **Wiki**, and **Test Management System (TMS)**. Jira, Confluence, and TestRail are canonical examples only — adapt identifiers, URLs, requests, calls, and query syntax to the systems resolved for the current project (from repository-root `gain.json`, explicit user input, recognizable URLs/handles, and available integrations).

</description_and_purpose>

<workflow_phases>

- All Rosetta prep steps MUST be FULLY completed, SKILL `load-project-context` loaded and fully executed.
- **ONE PHASE AT A TIME:** APPLY PHASE the phase file, execute, update state, move to next.
- **DO NOT SKIP PHASES:** Each builds on the previous. Skip gates: only with **explicit user instruction**, **or** when `testgen-state.md` marks the phase complete **and** its expected output file exists under `plans/testgen-{TICKET-KEY}/`; otherwise resume from the earliest incomplete phase. The **explicit user instruction** skip NEVER applies to the Phase 3 / Phase 6 HITL gates (rule 2 of `<orchestration_and_escalation>`) nor the Phase 4 / Phase 5 `hitl`-delegated approval gates (rule 3) — none of these four are ever overridden.
- **Phase-file load failure:** if APPLY PHASE for a phase file returns nothing, retry once, then HALT and report — do not improvise the phase.
- **Transition precedence:** `<orchestration_and_escalation>` priority hierarchy.
- **STATE TRACKING:** Update `plans/testgen-{TICKET-KEY}/testgen-state.md` after each phase.
- **SELF-CHECK BETWEEN PHASES (hard precondition, including for auto-continue):** Before advancing — auto-continue included, not just explicit gates — verify the state row was updated, the expected output file exists and is non-empty, the phase's `## Metrics` count is populated (a thin `0`/`1` → re-check the artifact), any HITL/`hitl`-delegated approval (Phase 3, 4, 5, 6) is recorded — all four are mandatory, never a silent clear.
- When a phase delegates work to subagents, dispatch per USE SKILL `orchestration`.
- MUST use todo tasks for tracking progress.
- MUST create output directory `plans/testgen-{TICKET-KEY}/` at start.
- **Trigger prompt example:** `Analyze requirements for PROJ-123` (also: bare key `PROJ-123`, full ticket URL). Ticket-only and ticket+Wiki input formats are enumerated in `testgen-flow-project-config-loading.md` step 0.1.
- **Per-phase failure cases — owned by phase files:**
  - *Ticket not found* → `testgen-flow-data-collection.md` + the `data-collection` skill's Issue Tracker failure handling.
  - *No Wiki results* → `testgen-flow-data-collection.md` + the `data-collection` skill's Wiki failure handling.
  - *User declines / does not answer questions* → `testgen-flow-question-generation.md` `<failure_handling>` "User explicitly declines to answer".
  - *Incomplete / missing requirements inputs* → `testgen-flow-requirements-document-generation.md` `<failure_handling>` "Missing or empty inputs".
  - *Documentation search query example + ranking rule* → the `data-collection` skill's documentation-binding search/ranking behavior.
  - *Initial-prompt format examples* → `testgen-flow-project-config-loading.md`.
  - **Phase 6 80%-export-success threshold** → `testgen-flow-test-case-export.md` (`Threshold (80%) met` field + `PARTIAL — N/M exported` state).
  - **Phase 5 test-case-count guidance** → `testgen-flow-test-case-generation.md` `<validation_checklist>`.
- **Model tiers** (phase `subagent_required_model`): `tier: complex` = heavy reasoning / multi-source synthesis / requirements engineering (Opus-class / GPT high-tier); `tier: workhorse` = structured execution / extraction / generation + export (Sonnet-class / GPT mid-tier).

<project_config_loading phase="0" subagent="discoverer" role="Project configuration analyst" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra">

- APPLY PHASE `testgen-flow-project-config-loading.md`
- Input: user request with an Issue Tracker ticket key/URL. Output: `plans/testgen-{TICKET-KEY}/initial-data.md`, project config file.
- Required skills: `sensitive-data` (config / initial-data redaction pre-write gate)
- Recommended skills: `questioning`
- Update `testgen-state.md`; Phase 0 is not complete until its output spot-check passes.

</project_config_loading>

<data_collection phase="1" subagent="discoverer" role="Requirements data collector" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro, grok-4.5, gpt-5.6-terra">

- APPLY PHASE `testgen-flow-data-collection.md`
- Input: initial user request, initial-data.md. Output: `plans/testgen-{TICKET-KEY}/raw-data.md` with Issue Tracker + Wiki data.
- Required skills: `data-collection`
- Update `testgen-state.md`; Phase 1 is not complete until its output spot-check passes.

</data_collection>

<gap_and_contradiction_analysis phase="2" subagent="architect" role="Requirements gap analyst" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol">

- APPLY PHASE `testgen-flow-gap-and-contradiction-analysis.md`
- Input: raw-data.md. Output: `plans/testgen-{TICKET-KEY}/analysis.md` with contradictions, gaps, ambiguities.
- Required skills: `qa-knowledge` (`gap_analysis` mode)
- Update `testgen-state.md`; Phase 2 is not complete until its output spot-check passes.

</gap_and_contradiction_analysis>

<question_generation phase="3" subagent="architect" role="Requirements clarification analyst" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol" type="HITL">

- APPLY PHASE `testgen-flow-question-generation.md`
- Input: analysis.md. Output: `plans/testgen-{TICKET-KEY}/questions.md`, `plans/testgen-{TICKET-KEY}/answers.md`.
- **WAIT FOR USER** to fill answers in questions.md. Explicit approval required.
- Recommended skills: `questioning`
- Update `testgen-state.md`; Phase 3 is not complete until its output spot-check passes.

</question_generation>

<requirements_document_generation phase="4" subagent="architect" role="Requirements engineer" subagent_required_model="claude-opus-4-8, gpt-5.5-high, gemini-3.1-pro-high, gpt-5.6-sol">

- APPLY PHASE `testgen-flow-requirements-document-generation.md`
- Input: raw-data.md + analysis.md + answers.md. Output: `plans/testgen-{TICKET-KEY}/requirements.md`.
- Present a summary of `requirements.md` (phase-file step 4.4); the hand-off to Phase 5 is a mandatory `hitl` design/spec-review approval gate — always pauses, never an automatic continue.
- Required skills: `qa-knowledge` (`synthesis` mode)
- Update `testgen-state.md`; Phase 4 is not complete until its output spot-check passes.

</requirements_document_generation>

<test_case_generation phase="5" subagent="engineer" role="Test case design engineer" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra">

- APPLY PHASE `testgen-flow-test-case-generation.md`
- Input: requirements.md. Output: `plans/testgen-{TICKET-KEY}/test-scenarios.md`
- Present a summary of `test-scenarios.md` (phase-file step 5.9); the hand-off is a mandatory `hitl` test-case-spec approval gate — always pauses. Separately, Phase 6 is invoked on demand (not auto-entered) regardless of that approval, and carries its own HITL gate — see the `<orchestration_and_escalation>` Gate-type convention.
- Required skills: `qa-knowledge` (`scenario_design` mode + config-resolved TMS FORMAT binding).
- Update `testgen-state.md`; Phase 5 is not complete until its output spot-check passes.
- `coding` is NOT used for the default manual-scenario output (writes stay under `plans/testgen-{TICKET-KEY}/`); apply it only if a write targets tracked repo files outside that folder, per `<phase_5_6_standards_gate>`.

</test_case_generation>

<test_case_export phase="6" subagent="engineer" role="Test case export specialist" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra" type="HITL">

- APPLY PHASE `testgen-flow-test-case-export.md`
- Input: test-scenarios.md. Output: test cases exported to Test Management System **and** a local export receipt at `plans/testgen-{TICKET-KEY}/export-report.md` (TMS IDs/URLs, per-case status, timestamp). The local receipt is the on-disk evidence Phase 6 ran successfully.
- **WAIT FOR USER** to provide target location and confirm export.
- Required skills: `qa-knowledge` (`scenario_design` mode + config-resolved TMS EXPORT binding).
- Update `testgen-state.md`; Phase 6 is not complete until its output spot-check passes.
- `coding` is NOT used for the default flow (TMS export + receipt under `plans/testgen-{TICKET-KEY}/`); apply it only if a write targets tracked repo files outside that folder (e.g. embedding TMS IDs into a version-controlled file), per `<phase_5_6_standards_gate>`.

</test_case_export>

</workflow_phases>

<orchestration_and_escalation>

- **Skip-without-agreement / falsified-skip refusal** (this workflow owns the rule; subordinate to the `hitl` skill): a skip asserted but contradicted by `testgen-state.md` / disk evidence is refused — announce the specific missing state row / absent artifact, then start the earliest incomplete phase the same turn.
- **Priority (highest never overridden → lowest):** (1) safety / destructive confirmations — incl. `<phase_5_6_standards_gate>` outside-output-dir confirmation; (2) Phase 3 + Phase 6 HITL gates (answer `questions.md` / confirm TMS target + export scope) — never skipped by user instruction; (3) Phase 4 + Phase 5 `hitl`-delegated mandatory approval gates (`requirements.md` / `test-scenarios.md` review, per `hitl` rule 15) — always pause, never skipped by silence; (4) per-phase informational status update (no stop) for Phases 0, 1, 2; (5) the verification-failure override below.
- **Gate-type convention:** type="HITL" phase headers (3, 6) are the workflow's structurally-tagged, never-overridable stops. Phase 4 and Phase 5 are ALSO mandatory stops — delegated through `USE SKILL hitl` (per its rule 15/32: explicit approval required for spec/design artifacts before the next phase, no next phase without it) rather than tagged with the attribute — and always pause for explicit approval; they never clear silently. Regardless of Phase 5's approval, Phase 6 (TMS export) remains invoked on demand, never auto-entered — it is a separate, structurally-tagged HITL gate of its own. Do not invent any OTHER bespoke phase-level "ready to proceed?" logic beyond these four gates — except Phase 2's zero-issues branch, a distinct skip-permission decision, not a progress ask. Phases 0, 1, 2 carry no type= attribute and have no artifact requiring review: continuing is the default, expected action, so each ends with a one-line status update and continues automatically to the next phase. Ordinary mid-flow user feedback (a question or correction raised in the same turn) is normal conversation to handle and continue past, not a phase gate.
- **Testgen binding for the override** (skip-verification gate only): the trigger is the user asserting a phase complete while `testgen-state.md` does not mark it AND the expected output is absent. Action — if `testgen-state.md` is missing, create it from the Phase 0 `<state_file_template>` first; log a row into its `## Verification-Failure Overrides` (row format owned by that template); then start the earliest incomplete phase the same turn without invoking the `hitl` ask path. Uncertainty (partial state, ambiguous assertion) → fall back to the `hitl` ask.
- Load failure for a required phase file or skill: retry once, stop, record in `testgen-state.md`, ask the user; never substitute silently.

</orchestration_and_escalation>

<phase_5_6_standards_gate>
- Phases 5-6: apply `coding` whenever the phase writes any file outside `plans/testgen-{TICKET-KEY}/` — including "mixed outputs" (writes both inside and outside) or when repository edit scope was not explicitly confirmed in chat. When in doubt, apply.
- Examples: apply for `cypress/e2e/login.spec.ts`; skip when writing only `plans/testgen-{TICKET-KEY}/test-scenarios.md`.
</phase_5_6_standards_gate>

<state_and_outputs>

`testgen-state.md` (sections `## Phase Completion Status`, `## Phase Details`, `## Metrics`, `## Verification-Failure Overrides`) and the per-ticket output-directory layout are **initialized and owned by Phase 0** (`testgen-flow-project-config-loading.md`) — see it for the canonical layout. Each subsequent phase updates the state file per `<workflow_phases>` and writes its output (paths in each phase block) under `plans/testgen-{TICKET-KEY}/`.

Expected per-ticket artifact set (one validation can confirm all phases ran): `initial-data.md` + project config (Phase 0) · `raw-data.md` (1) · `analysis.md` (2) · `questions.md` + `answers.md` (3) · `requirements.md` (4) · `test-scenarios.md` (5) · `export-report.md` (6) · `testgen-state.md` (all). Full schema/layout owned by Phase 0.

</state_and_outputs>

<references>

Subagents: `discoverer` · `architect` · `engineer`.

Cross-phase skills: `qa-knowledge` (gap analysis, synthesis, scenario design + TMS bindings — loads its own assets at point of use); `data-collection` (Issue Tracker + Wiki collection); `questioning`; `sensitive-data` (redaction — Phase 0 config/initial-data pre-write gate; Phase 1 collection runs it via `data-collection`); `coding` (conditional — only for writes to tracked repo files outside `plans/testgen-{TICKET-KEY}/`, per `<phase_5_6_standards_gate>`).

Integrations: Issue Tracker (ticket data extraction), Wiki (documentation retrieval), TMS (Phase 6 export), and additional documentation stores (e.g. Google Drive) when configured — per `<description_and_purpose>` Terminology.

</references>

<best_practices>

- Sequential execution only: each phase builds on the previous
- No assumptions: document all unknowns, ask user via HITL gates
- Evidence-based: all requirements reference actual Issue Tracker / Wiki content
- Traceability: link requirements to source and test cases to requirements
- On completion: link `requirements.md` + exported cases back to the source ticket (attachment/comment) and archive `testgen-state.md` + outputs for traceability

</best_practices>

<validation_checklist>

- Each phase has corresponding output file in output directory
- State file reflects accurate phase completion status
- HITL / `hitl`-delegated gates (Phase 3, 4, 5, 6) all have explicit user approval evidence recorded — none clear silently
- Requirements trace back to Issue Tracker / Wiki sources
- Test cases trace back to requirements

</validation_checklist>

<pitfalls>

- Skipping Phase 3 HITL gate leads to assumptions in requirements
- Wiki child pages often contain critical detail — always check for children
- TMS MCP may lack container creation — user may need to create target locations manually in TMS UI
- Merging redundant test cases too aggressively can lose coverage

</pitfalls>

</testgen_flow>
