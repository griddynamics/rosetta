---
name: api-qa-flow-test-correction
description: Phase 7 of QA workflow - Test Corrections (USER APPROVAL REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<api_qa_flow_test_correction>

<description_and_purpose>
Fix identified API test failures based on the Phase 6 execution report. Prepares proposed changes, requires explicit user approval before applying, then applies them incrementally with lint checks and hands re-testing back to the user.
</description_and_purpose>

<workflow_context>
- Phase 7 of 8 in `api-qa-flow`
- Input: execution report from Phase 6 (`agents/api-qa/{IDENTIFIER}/execution-report.md`; resolve `{IDENTIFIER}` from `agents/api-qa-state.md`)
- Output: corrected test code, ready for re-testing
- Prerequisite: Phase 6 complete
- HITL: explicit user approval required before applying any change (a domain-specific specialization of `hitl`)
- In-scope file set (single SSoT): test files + shared test-utility files only. Writes outside this set are refused and escalated.
- Skills: `coding` (authors the proposed/applied edits), `debugging` (root-cause alignment), `qa-knowledge` (proposed-change approval block + correction discipline)
</workflow_context>

<correction_contract>
The phase OWNS the iteration cap and the escalation contract. The proposed-change approval block is the shared asset `qa-knowledge/assets/proposed-change-template.md` — ACQUIRE FROM KB at step 7.2 and present one block per change BEFORE any write. Flow parameters for the asset: **change-type enum** = `assertion-fix | auth-fix | data-setup | request-shape | wait-strategy | other`; **root-cause reference** = execution-report entry id (e.g. `ERR-3`); **state file** = `agents/api-qa-state.md`; on retry-cap, loop back to Phase 6. Verified by `<validation_checklist>` independent of skill internals.
</correction_contract>

<phase_steps>
1. Prepare proposed corrections (step 7.1 — preparation-only)
2. Present changes for approval (step 7.2)
3. Apply approved changes (step 7.3)
4. Update state (step 7.4)
</phase_steps>

<execute_corrections step="7.1" subagent="engineer" role="Test correction engineer">
**Preparation-only:** nothing in this block modifies workspace files until step 7.3 after explicit approval in 7.2. "Preparation-only" means proposed edits paired with before/after evidence — no writes to test or product source files.
1. USE SKILL `debugging` to align each proposed edit with a confirmed Phase 6 root cause (no symptom-only fixes).
2. USE SKILL `coding` to author each proposed edit (preparation-only — before/after evidence, no writes). The present → approve → apply discipline is owned by this phase: `<present_for_approval>` (7.2) + `<apply_changes>` (7.3). Bindings grouped by owner: proposed-change source = `agents/api-qa/{IDENTIFIER}/execution-report.md`; proposed-change template + state file + iteration cap + loop target = `<correction_contract>`; in-scope file set = `<workflow_context>`; approval-token set = step 7.2.
3. Produce one Proposed Change record per fix per the `<correction_contract>` template, citing the matching execution-report entry id (e.g. `ERR-3`). Do NOT apply anything yet.
</execute_corrections>

<present_for_approval step="7.2">
1. Present all proposed changes with before/after code per the template.
2. **Approval gate:** ACQUIRE `qa-knowledge/assets/approval-gate.md` FROM KB and apply it over the presented changes (closed-token discipline · loose-phrasing rejection · max-retry escalation · partial approval · change/reject handling). Bindings: closed token list = `approved` / `approve` / `yes`; re-present step = 7.2; full-reject revisit target = Phase 6. The token list is this phase's authoritative specialization.
</present_for_approval>

<apply_changes step="7.3">
1. Apply approved changes one at a time (or in named approved batches).
2. Validate linting/format after each change. On lint failure: revert that change (never leave the file broken), re-prepare a corrected version, and re-present that single change via `<present_for_approval>`.
3. Verify each applied change addresses its root cause by cross-referencing it to the matching entry in `agents/api-qa/{IDENTIFIER}/execution-report.md` (cite the entry id, e.g. `ERR-3`). On root-cause mismatch: return to step 7.1 with a note in `agents/api-qa-state.md`; do not leave unmapped changes applied.
4. **Max retries:** cap step 7.3 in-phase retries at 3 cycles per failing change. After 3 failed cycles on the same change, stop, record `Phase 7 blocked: in-phase apply retry cap reached` in `agents/api-qa-state.md`, and escalate to the user.
</apply_changes>

<update_state step="7.4">
1. Update `agents/api-qa-state.md`:
   - Issues Fixed: [count]
   - Changes Applied: [count]
   - User Approval: [datetime + exact token]
   - Files Modified: [list]
   - Status: Ready for re-testing
   - Phase 7 completion timestamp
2. Mark Phase 7 complete.
3. Inform the user to re-run tests (provide the exact command).
4. If tests still fail: return to Phase 6.
</update_state>

<validation_checklist>
- Phase 6 analysis reviewed; each proposed change linked to a confirmed root cause (execution-report entry id cited)
- Proposed changes prepared with before/after code per the `<correction_contract>` template
- User approval explicitly received per the exact closed token set (no inferred approval); partial approval applied only to named hunks
- All approved changes applied; only in-scope files touched
- Linting/format checked and fixed after each change (lint failure reverted + re-presented, never left broken)
- Changes address identified root causes; iteration cap honored, escalation recorded if reached
- State updated without auto-looping; re-run instruction provided
</validation_checklist>

<failure_handling>
- **Execution report absent/empty:** if `agents/api-qa/{IDENTIFIER}/execution-report.md` does not exist or has no failure entries, stop Phase 7, record `Phase 7 blocked: Phase 6 execution report missing/empty` in `agents/api-qa-state.md`, and return to Phase 6 — never fabricate proposed changes against a missing report.
- **`agents/api-qa-state.md` missing or `{IDENTIFIER}` unresolvable:** stop Phase 7, record the failure in chat output, ask the user to restore the state file; do not auto-recreate it and do not guess `{IDENTIFIER}` (every input/output path depends on it).
- **Proposed-change asset ACQUIRE returns zero documents** (step 7.2): stop — do NOT present a correction block authored from memory. Report the failed ACQUIRE and ask the user to fix Rosetta/KB access.
- **No change maps to a confirmed root cause:** if `debugging` (step 7.1.1) cannot align a proposed edit to a confirmed Phase 6 root cause, do not propose it; record the unmapped failure and return to Phase 6 for deeper analysis rather than applying a symptom-only fix.
</failure_handling>

</api_qa_flow_test_correction>
