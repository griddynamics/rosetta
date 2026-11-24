---
name: ui-aqa-flow-test-correction
description: "Phase 8 Test Correction of ui-aqa-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<ui_aqa_flow_test_correction>

<description_and_purpose>
Fix identified test failures based on the Phase 7 failure analysis. Prepares proposed changes, requires explicit user approval before applying, then applies them incrementally with lint checks and hands re-testing back to the user.
</description_and_purpose>

<workflow_context>
- Phase 8 of 8 in `ui-aqa-flow`
- Input: failure analysis from Phase 7 (`plans/ui-aqa-<test-name>/failure-analysis.md`)
- Output: corrected test code, ready for re-testing
- Prerequisite: Phase 7 complete
- HITL: explicit user approval required before applying any change (a domain-specific specialization of `hitl`)
- In-scope file set (single SSoT): test files only (and page-object files if the Phase 7 analysis identifies a selector fix). Writes outside this set are refused and escalated.
- Required skills: `qa-knowledge` (`correction` mode — proposed-change block + approval gate + correction discipline), `qa-structure` (run paths + state)
- Recommended skills: `coding` (authors the proposed/applied edits), `debugging` (root-cause alignment), `hitl` (explicit approval)
</workflow_context>

<correction_contract>
The phase OWNS the iteration cap and the escalation contract. The proposed-change approval block is `qa-knowledge`'s shared proposed-change template (the skill loads its own asset at step 8.1) — present one block per change BEFORE any write. Flow parameters for the template: **change-type enum** = `selector-update | wait-strategy | assertion-fix | data-setup | other`; **root-cause reference** = Phase 7 failure-analysis entry id (e.g. `F3`); **state file** = `agents/TEMP/<FEATURE>/ui-aqa-state.md`; on retry-cap, loop back to Phase 7. Verified by `<validation_checklist>` independent of skill internals.
</correction_contract>

<phase_steps>
1. Prepare proposed corrections (step 8.1 — preparation-only)
2. Present changes for approval (step 8.2)
3. Apply approved changes (step 8.3)
4. Update state (step 8.4)
</phase_steps>

<execute_corrections step="8.1" subagent="engineer" role="Test correction engineer">
**Guardrail:** all of step 8.1 is preparation-only; file writes are forbidden until step 8.3. "Preparation-only" means proposed edits paired with before/after evidence — no writes to test, page-object, or product source files.
1. USE SKILL `qa-structure` to resolve run paths/state. USE SKILL `debugging` to align each proposed edit with a confirmed Phase 7 root cause (no symptom-only fixes).
2. USE SKILL `qa-knowledge` (`correction` mode) and USE SKILL `coding` to author each proposed edit (preparation-only — before/after evidence, no writes). The present → approve → apply discipline is owned by this phase: `<present_for_approval>` (8.2) + `<apply_changes>` (8.3). Bindings: proposed-change source = `plans/ui-aqa-<test-name>/failure-analysis.md`; proposed-change template = `<correction_contract>`; in-scope file set = `<workflow_context>`; approval-token set = step 8.2; state file = `agents/TEMP/<FEATURE>/ui-aqa-state.md`; iteration cap = `<correction_contract>`; loop target = Phase 7.
3. Produce one Proposed Change record per fix per the `<correction_contract>` template. Do NOT apply anything yet.
</execute_corrections>

<present_for_approval step="8.2">
1. Present all proposed changes with before/after code per the template.
2. **Approval gate:** USE SKILL `qa-knowledge` to run its shared approval gate; USE SKILL `hitl`. Approval = an exact token from the closed list `approved` / `approve` / `yes` (case-insensitive), scoped to the named changes — no `"or equivalent"` / `"or similar"` phrasing extends it. Comments, questions, suggestions, edits, and partial review are REVIEW, not approval. Partial approval applies only to named changes/hunks; re-present changed proposals; full rejection returns to Phase 7.
</present_for_approval>

<apply_changes step="8.3">
1. Apply approved changes one at a time (or in named approved batches).
2. Validate linting/format after each change. On lint failure: revert that change (never leave the file broken), re-prepare, and re-present that single change via `<present_for_approval>`.
3. Verify each applied change addresses its Phase 7 root cause (cite the analysis entry id). On root-cause mismatch: return to step 8.1 with a note in `agents/TEMP/<FEATURE>/ui-aqa-state.md`; do not leave unmapped changes applied.
4. **Max retries:** apply the `<correction_contract>` iteration cap — on the 3rd failed cycle for the same change, stop, record `Phase 8 blocked: in-phase apply retry cap reached` in `ui-aqa-state.md`, loop back to Phase 7 (do not auto-start a 4th cycle).
</apply_changes>

<update_state step="8.4">
1. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`:
   - Issues Fixed: [count]
   - Changes Applied: [count]
   - User Approval: [datetime + exact approval statement + approved IDs/hunks]
   - Files Modified: [list]
   - Status: Ready for re-testing
   - Phase 8 completion timestamp
2. Mark Phase 8 complete.
3. Inform the user to re-run tests (provide the exact command).
4. If tests still fail: return to Phase 7.
</update_state>

<validation_checklist>
- Phase 7 analysis reviewed; each proposed change linked to a confirmed root cause
- Proposed changes prepared with before/after code per the `<correction_contract>` template
- User approval explicitly received per `<present_for_approval>` (no inferred approval); partial approval applied only to named changes/hunks
- All approved changes applied; only in-scope files touched
- Linting/format checked and fixed after each change (lint failure reverted + re-presented, never left broken)
- Changes address identified root causes; iteration cap honored, escalation recorded if reached
- State updated without auto-looping; re-run instruction provided
</validation_checklist>

<failure_handling>
- **Phase 7 analysis absent/empty:** if `plans/ui-aqa-<test-name>/failure-analysis.md` does not exist or has no failure entries, stop Phase 8, record `Phase 8 blocked: Phase 7 failure analysis missing/empty` in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, and return to Phase 7 — never fabricate proposed changes against a missing analysis.
- **`agents/TEMP/<FEATURE>/ui-aqa-state.md` missing or `<test-name>` slug unresolvable:** stop Phase 8, record the failure in chat output, ask the user to restore the state file; do not auto-recreate it and do not guess the slug (every input/output path depends on it).
- **Required skill, approval gate, or proposed-change template unavailable** (`qa-structure`, `debugging`, `qa-knowledge`, `coding`, or `hitl` fails to load at step 8.1/8.2): retry once, then stop — do NOT present a correction block or run the approval gate from memory. Report the failed load and ask the user to fix Rosetta access.
- **No change maps to a confirmed root cause:** if `debugging` (step 8.1.1) cannot align a proposed edit to a confirmed Phase 7 root cause, do not propose it; record the unmapped failure and return to Phase 7 for deeper analysis rather than applying a symptom-only fix.
</failure_handling>

</ui_aqa_flow_test_correction>
