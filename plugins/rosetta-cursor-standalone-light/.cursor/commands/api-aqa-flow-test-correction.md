---
name: api-aqa-flow-test-correction
description: "Phase 7 Test Corrections of api-aqa-flow (USER APPROVAL REQUIRED)"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<api_aqa_flow_test_correction>

<description_and_purpose>
Fix identified API test failures based on the Phase 6 execution report. Prepares proposed changes, requires explicit user approval before applying, then applies them incrementally with lint checks and hands re-testing back to the user.
</description_and_purpose>

<workflow_context>
- Phase 7 of 8 in `api-aqa-flow`
- Input: execution report from Phase 6 (`plans/api-aqa-{IDENTIFIER}/execution-report.md`; resolve `{IDENTIFIER}` from `agents/TEMP/<FEATURE>/api-aqa-state.md`)
- Output: corrected test code, ready for re-testing
- Prerequisite: Phase 6 complete
- HITL: explicit user approval required before applying any change (a domain-specific specialization of `hitl`)
- In-scope file set (single SSoT): test files + shared test-utility files only. Writes outside this set are refused and escalated.
- Required skills: `qa-knowledge` (`correction` mode — proposed-change block + approval gate + correction discipline), `qa-structure` (run paths + `api-aqa-state.md`)
- Recommended skills: `coding` (authors the proposed/applied edits), `debugging` (root-cause alignment), `hitl` (explicit approval)
</workflow_context>

<correction_contract>
The phase OWNS the iteration cap and the escalation contract. The proposed-change approval block is `qa-knowledge`'s shared proposed-change template (the skill loads its own asset at step 7.1) — present one block per change BEFORE any write. Flow parameters for the template: **change-type enum** = `assertion-fix | auth-fix | data-setup | request-shape | wait-strategy | other`; **root-cause reference** = execution-report entry id (e.g. `ERR-3`); **state file** = `agents/TEMP/<FEATURE>/api-aqa-state.md`; on retry-cap, loop back to Phase 6. Verified by `<validation_checklist>` independent of skill internals.
</correction_contract>

<phase_steps>
1. Prepare proposed corrections (step 7.1 — preparation-only)
2. Present changes for approval (step 7.2)
3. Apply approved changes (step 7.3)
4. Update state (step 7.4)
</phase_steps>

<execute_corrections step="7.1" subagent="engineer" role="Test correction engineer">
**Preparation-only:** nothing in this block modifies workspace files until step 7.3 after explicit approval in 7.2. "Preparation-only" means proposed edits paired with before/after evidence — no writes to test or product source files.
1. USE SKILL `qa-structure` to resolve run paths/`api-aqa-state.md`. USE SKILL `debugging` to align each proposed edit with a confirmed Phase 6 root cause (no symptom-only fixes).
2. USE SKILL `qa-knowledge` (`correction` mode) and USE SKILL `coding` to author each proposed edit (preparation-only — before/after evidence, no writes). The present → approve → apply discipline is owned by this phase: `<present_for_approval>` (7.2) + `<apply_changes>` (7.3). Bindings grouped by owner: proposed-change source = `plans/api-aqa-{IDENTIFIER}/execution-report.md`; proposed-change template + state file + iteration cap + loop target = `<correction_contract>`; in-scope file set = `<workflow_context>`; approval-token set = step 7.2.
3. Produce one Proposed Change record per fix per the `<correction_contract>` template, citing the matching execution-report entry id (e.g. `ERR-3`). Do NOT apply anything yet.
</execute_corrections>

<present_for_approval step="7.2">
1. Present all proposed changes with before/after code per the template.
2. **Approval gate:** USE SKILL `qa-knowledge` to run its shared approval gate; USE SKILL `hitl`. Approval = an exact token from the closed list `approved` / `approve` / `yes` (case-insensitive), scoped to the named changes — no `"or equivalent"` / `"or similar"` phrasing extends it. Comments, questions, suggestions, edits, and partial review are REVIEW, not approval. Partial approval applies only to named changes/hunks; re-present changed proposals (re-present step = 7.2); full rejection returns to Phase 6.
</present_for_approval>

<apply_changes step="7.3">
1. Apply approved changes one at a time (or in named approved batches).
2. Validate linting/format after each change. On lint failure: revert that change (never leave the file broken), re-prepare a corrected version, and re-present that single change via `<present_for_approval>`.
3. Verify each applied change addresses its root cause by cross-referencing it to the matching entry in `plans/api-aqa-{IDENTIFIER}/execution-report.md` (cite the entry id, e.g. `ERR-3`). On root-cause mismatch: return to step 7.1 with a note in `agents/TEMP/<FEATURE>/api-aqa-state.md`; do not leave unmapped changes applied.
4. **Max retries:** apply the `<correction_contract>` iteration cap — on the 3rd failed cycle for the same change, stop, record `Phase 7 blocked: in-phase apply retry cap reached` in `api-aqa-state.md`, escalate to the user.
</apply_changes>

<update_state step="7.4">
1. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`:
   - Issues Fixed: [count]
   - Changes Applied: [count]
   - User Approval: [datetime + exact approval statement + approved IDs/hunks]
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
- User approval explicitly received per `<present_for_approval>` (no inferred approval); partial approval applied only to named changes/hunks
- All approved changes applied; only in-scope files touched
- Linting/format checked and fixed after each change (lint failure reverted + re-presented, never left broken)
- Changes address identified root causes; iteration cap honored, escalation recorded if reached
- State updated without auto-looping; re-run instruction provided
</validation_checklist>

<failure_handling>
- **Execution report absent/empty:** if `plans/api-aqa-{IDENTIFIER}/execution-report.md` does not exist or has no failure entries, stop Phase 7, record `Phase 7 blocked: Phase 6 execution report missing/empty` in `agents/TEMP/<FEATURE>/api-aqa-state.md`, and return to Phase 6 — never fabricate proposed changes against a missing report.
- **`agents/TEMP/<FEATURE>/api-aqa-state.md` missing or `{IDENTIFIER}` unresolvable:** stop Phase 7, record the failure in chat output, ask the user to restore the state file; do not auto-recreate it and do not guess `{IDENTIFIER}` (every input/output path depends on it).
- **Required skill, approval gate, or proposed-change template unavailable** (`qa-structure`, `debugging`, `qa-knowledge`, `coding`, or `hitl` fails to load at step 7.1/7.2): retry once, then stop — do NOT present a correction block or run the approval gate from memory. Report the failed load and ask the user to fix Rosetta access.
- **No change maps to a confirmed root cause:** if `debugging` (step 7.1.1) cannot align a proposed edit to a confirmed Phase 6 root cause, do not propose it; record the unmapped failure and return to Phase 6 for deeper analysis rather than applying a symptom-only fix.
</failure_handling>

</api_aqa_flow_test_correction>
