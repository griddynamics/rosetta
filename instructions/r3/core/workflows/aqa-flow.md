---
name: aqa-flow
description: "Workflow for automated QA: integration and end-to-end UI test automation, page objects, etc."
alwaysApply: false
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<aqa_flow>

<description_and_purpose>

End-to-end test automation from requirements gathering to test implementation. Uses test cases, project documentation to create automated tests following existing architecture and coding standards.

</description_and_purpose>

<workflow_phases>

**Execution cadence:**
- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed.
- Execute every in-scope phase in strict 1-8 order (never skip without explicit HITL confirmation): ACQUIRE phase file → execute → update `agents/aqa-state.md` → next; never start a phase until the previous is marked done in state.
- Skip gates, transitions, and escalation → `<orchestration_and_escalation>`.
- MUST use todo tasks; prioritize ACCURACY over SPEED.

**No assumptions & state:**
- NO ASSUMPTIONS: never assume selectors, flows, or data — ask the user when information is missing.
- Update `agents/aqa-state.md` after each phase.

**Customization:**
- If the user gave no preferences, perform all steps except optional.
- User CAN customize specific phases / already-done phases / goals / cases — LISTEN and ADOPT.

**Authoritative rules (do not skim past):**
- USE SKILL `coding` before any work touching repository tests, page objects, or shared helpers (ACQUIRE if needed) — authoritative for conventions; repository docs win over skill snippets.
- Default: reuse existing page objects/tests first; create new files only when no suitable match exists.
- Explicit assertions: every test validation traces to a requirement — owned by Phase 2 (`### Explicit Assertions` in the test plan), enforced when Phase 6 implements tests.
- **Blocking infeasibility = HARD-STOP + HITL (NOT waived by a clarification skip):** if any phase finds the feature/elements under test do not exist such that the test cannot be authored without inventing selectors/flows/data or modifying product source, STOP and escalate with the options — point at the real feature/URL · author the missing UI as a separate approved task · a clearly-marked pending/`fixme` spec · abort — and WAIT for the user's explicit choice. "Skip clarification" waives clarification *questions* only; it never authorizes this feasibility/scope call.

<data_collection phase="1" applies="ALL" subagent="discoverer" role="AQA data collector">

1. ACQUIRE `aqa-flow-data-collection.md` FROM KB
2. Execute phase instructions.
3. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Output: test plan file created at `agents/plans/aqa-<test-name>.md`
4. Recommended skills: `discovery`
5. Update `agents/aqa-state.md`

</data_collection>

<requirements_clarification phase="2" applies="ALL" subagent="architect" role="Test requirements analyst" type="HITL">

1. ACQUIRE `aqa-flow-requirements-clarification.md` FROM KB
2. Execute phase instructions.
3. Input: user request + collected data from Phase 1. Output: clarified test requirements and scope in test plan file `agents/plans/aqa-<test-name>.md`
4. **WAIT FOR USER ANSWERS** to the clarifying questions before Phase 3.
5. Recommended skills: `requirements-use`, `questioning`
6. Update `agents/aqa-state.md`

</requirements_clarification>

<code_analysis phase="3" applies="ALL" subagent="discoverer" role="Test architecture analyst">

1. ACQUIRE `aqa-flow-code-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md` + test plan file `agents/plans/aqa-<test-name>.md`. Output: code analysis report at `agents/plans/aqa-<test-name>-code-analysis.md` (architecture patterns, existing page objects, test patterns).
4. Recommended skills: `reverse-engineering`
5. Update `agents/aqa-state.md`

</code_analysis>

<selector_identification phase="4" applies="ALL" subagent="engineer" role="Selector identification specialist" type="HITL-CONDITIONAL">

1. ACQUIRE `aqa-flow-selector-identification.md` FROM KB
2. Execute phase instructions.
3. Input: code analysis report `agents/plans/aqa-<test-name>-code-analysis.md` + frontend code (or user-provided page source). Output: identified selectors for test targets.
4. **WAIT FOR USER TO PROVIDE PAGE SOURCE** only if frontend code unavailable or selectors not found.
5. Recommended skills: `testing` (Part A)
6. Update `agents/aqa-state.md`

</selector_identification>

<selector_implementation phase="5" applies="ALL" subagent="engineer" role="Selector implementation specialist">

1. ACQUIRE `aqa-flow-selector-implementation.md` FROM KB
2. Execute phase instructions.
3. Input: identified selectors + existing page objects. Output: implemented/updated page object files with selectors.
4. Recommended skills: `testing` (Part B), `coding`
5. Update `agents/aqa-state.md`

</selector_implementation>

<test_implementation phase="6" applies="ALL" subagent="engineer" role="Test automation engineer" type="HITL">

1. ACQUIRE `aqa-flow-test-implementation.md` FROM KB
2. Execute phase instructions.
3. Input: page objects + clarified requirements + code analysis report `agents/plans/aqa-<test-name>-code-analysis.md`. Output: implemented test files.
4. **STOP AND WAIT** for user to execute test.
5. Recommended skills: `coding`, `testing` (test-implementation is done inline by this phase via `coding` + `testing`)
6. Update `agents/aqa-state.md`

</test_implementation>

<test_report_analysis phase="7" applies="ALL" subagent="engineer" role="Test failure analyst" type="HITL">

1. ACQUIRE `aqa-flow-test-report-analysis.md` FROM KB
2. Execute phase instructions.
3. Input: test execution report (user-provided or from `agents/user-instructions/`). Output: failure analysis with root causes and fix recommendations.
4. **WAIT FOR USER TO PROVIDE TEST REPORT** (if not in `agents/user-instructions/`).
5. Recommended skills: `debugging`, `sensitive-data` (read-only report-analysis triage, done inline by this phase)
6. Update `agents/aqa-state.md`

</test_report_analysis>

<test_corrections phase="8" applies="ALL" subagent="engineer" role="Test correction engineer" type="HITL">

1. ACQUIRE `aqa-flow-test-correction.md` FROM KB
2. Execute phase instructions.
3. Input: failure analysis + test files + page objects. Output: corrected test files and page objects.
4. **WAIT FOR USER APPROVAL** before applying changes; authoritative approval tokens and presentation rules are defined in `aqa-flow-test-correction.md` section `<present_for_approval>`.
5. Recommended skills: `debugging`, `coding`
6. Update `agents/aqa-state.md`

</test_corrections>

</workflow_phases>

<orchestration_and_escalation>
- USE SKILL `orchestrator-contract` (ACQUIRE FROM KB when needed) for skip gates and transition handling; its phase-execution loop owns the **skip-without-agreement / falsified-skip refusal** rule (announce the missing state row / absent artifact, then start the earliest incomplete phase the same turn) — single canonical home, subordinate to the `hitl` skill. This workflow does NOT restate that logic.
- **AQA bindings for that rule:**
  - State file: `agents/aqa-state.md`.
  - Verification artifacts: the spot-checks in `<workflow_success_criteria>`.
  - HITL carve-outs (never overridden): every phase header carrying `type="HITL"` / `type="HITL-CONDITIONAL"` — those `type=` attributes are the sole source of truth — plus safety/destructive confirmations.
- Audit-trail row → `agents/aqa-state.md` `## Verification-Failure Overrides` (template owned by the data-collection phase, `aqa-flow-data-collection.md`); `orchestrator-contract`'s skip-refusal rule defines when and what to log.
- Any skip outside `orchestrator-contract` gates requires explicit user confirmation (HITL).
- **HITL waits on delegated (subagent) phases are owned by the orchestrator.** A subagent cannot talk to the user: on a `type="HITL"` phase the subagent surfaces the question/blocker and returns; the **orchestrator** runs the gate with the user and only then resumes. A subagent never waits for, infers, or proceeds without the user's approval itself (critical on the destructive Phase 8).
- Zero-document ACQUIRE for a required dependency: stop, record in `agents/aqa-state.md`, ask the user; never substitute silently.
</orchestration_and_escalation>

<workflow_success_criteria>
- **Overall run complete** when every in-scope phase is marked done in `agents/aqa-state.md` and the artifacts those phases reference exist (e.g. `agents/plans/aqa-<test-name>.md`, `agents/plans/aqa-<test-name>-code-analysis.md` when Phase 3 ran, test file paths after Phase 6, failure analysis before Phase 8), and the user accepts the last test outcome or explicitly stops.
- **In-scope phase** means any phase required by default execution plus user-approved customization/skip decisions under `<orchestration_and_escalation>`.
- **Spot checks:** Phase 1 — plan file exists at the **user-confirmed** `<test-name>` slug (no fabricated/placeholder slug; user deletion of the slug respected); Phase 2 — `### Explicit Assertions` subsection present in the plan (≥1 typed bullet or the None-clause); Phase 3 — code analysis report path populated with architecture + page object inventory + test location; Phase 4 — `## Selector Management` Part A deliverables present in the plan (Interaction Map / Availability / Identified Selectors / Fragile Flagged); Phase 5 — every identified selector present in the updated page-object files and lint-clean; Phase 6 — test file path + lint-clean per phase doc (example: `tests/e2e/login.spec.ts` exists and lint passes as required by `aqa-flow-test-implementation.md`); Phase 7 — failure analysis recorded; Phase 8 — user-approved edits applied when that phase runs.
- If a required spot-check artifact is missing or partial, that phase is not done: record the gap in `agents/aqa-state.md`, flag uncertainty, and stop for user guidance before continuing.
</workflow_success_criteria>

<state_file>

`agents/aqa-state.md` — created/updated after each phase from the template **owned by `qa-structure`** (asset `qa-structure/assets/aqa-state-template.md`, ACQUIRE'd at Phase 1). It carries `## Phase Completion Status`, `## Key Artifacts & Facts` (the resume anchor — only what resume-after-compaction needs; full per-phase detail lives in each phase's own artifacts), and `## Verification-Failure Overrides`.

</state_file>

<references>

Logical names only — full descriptions live where each is consumed (subagent contracts in `orchestrator-contract` skill, skill semantics in each skill's `SKILL.md`, MCP setup in workspace config).

**Subagents:** `discoverer` · `architect` · `engineer`.

**Skills:** `orchestrator-contract` · `hitl` · `coding` · `questioning` · `testing` · `debugging` · `sensitive-data` · `requirements-use` · `reverse-engineering` · `discovery` · `qa-structure` · `qa-knowledge`.

**MCPs:** Test case management (default: `TestRail`) · Documentation (default: `Atlassian Confluence`) · Browser automation (default: `Playwright`).

</references>

</aqa_flow>
