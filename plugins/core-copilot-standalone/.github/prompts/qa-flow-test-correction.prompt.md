---
name: qa-flow-test-correction
description: Phase 7 of QA workflow - Test Corrections (USER APPROVAL REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_test_correction>

<description_and_purpose>
Fix identified API test failures based on the Phase 6 execution report. Prepares proposed changes, requires explicit user approval before applying, then applies them incrementally with lint checks and hands re-testing back to the user.
</description_and_purpose>

<workflow_context>
- Phase 7 of 8 in `qa-flow`
- Input: execution report from Phase 6 (`agents/qa/{IDENTIFIER}/execution-report.md`; resolve `{IDENTIFIER}` from `agents/qa-state.md`)
- Output: corrected test code, ready for re-testing
- Prerequisite: Phase 6 complete
- HITL: explicit user approval required before applying any change (a domain-specific specialization of `hitl`)
- In-scope file set (single SSoT): test files + shared test-utility files only. Writes outside this set are refused and escalated.
</workflow_context>

<recommended_skills>
- `coding` — approved-apply mode prepares proposals, gates on approval, applies incrementally with lint, hands off re-verification.
- `debugging` — aligns each proposed edit with a confirmed Phase 6 root cause before it is proposed.
- `qa-knowledge` — the shared proposed-change approval block + correction discipline (ACQUIRE its asset at the cited step).
</recommended_skills>

<correction_contract>
The phase OWNS the iteration cap and the escalation contract. The proposed-change approval block is the shared asset `qa-knowledge/assets/proposed-change-template.md` — ACQUIRE FROM KB at step 7.2 and present one block per change BEFORE any write. Flow parameters for the asset: **change-type enum** = `assertion-fix | auth-fix | data-setup | request-shape | wait-strategy | other`; **root-cause reference** = execution-report entry id (e.g. `ERR-3`); **state file** = `agents/qa-state.md`; on retry-cap, loop back to Phase 6. Verified by `<validation_checklist>` independent of skill internals.
</correction_contract>

<phase_steps>
1. Prepare proposed corrections (step 7.1 — preparation-only)
2. Present changes for approval (step 7.2)
3. Apply approved changes (step 7.3)
4. Update state (step 7.4)
</phase_steps>

<execute_corrections step="7.1" subagent="engineer" role="API test correction engineer">
**Preparation-only:** nothing in this block modifies workspace files until step 7.3 after explicit approval in 7.2. "Preparation-only" means proposed edits paired with before/after evidence — no writes to test or product source files.
1. USE SKILL `debugging` to align each proposed edit with a confirmed Phase 6 root cause (no symptom-only fixes).
2. USE SKILL `coding` (approved-apply mode) with the parent-supplied bindings: proposed-change source = `agents/qa/{IDENTIFIER}/execution-report.md`; proposed-change template = `<correction_contract>`; in-scope file set = `<workflow_context>`; approval-token set = step 7.2; state file = `agents/qa-state.md`; iteration cap = `<correction_contract>`; loop target = Phase 6.
3. Produce one Proposed Change record per fix per the `<correction_contract>` template, citing the matching execution-report entry id (e.g. `ERR-3`). Do NOT apply anything yet.
</execute_corrections>

<present_for_approval step="7.2">
1. Present all proposed changes with before/after code per the template.
2. **WAIT** for explicit user approval.
3. The user must type one of exactly `approved`, `approve`, or `yes` (case-insensitive). Do not assume approval. **Loose phrasings such as "looks good", "ship it", "LGTM", "sounds good", "go ahead", "OK", "go", or paraphrases that imply but do not state approval are treated as REVIEW (not approval). Re-prompt for one of the exact tokens. The token list is closed; any "or similar" / "etc." extension language present in other loaded rules does NOT extend it for this gate — this phase's token list is authoritative here.** (Approval vocabulary is governed by `hitl`; this gate's closed token list is the phase-specific specialization.)
3a. **Max-retry escalation:** if the user has been re-prompted ≥3 times in this Phase 7 cycle without supplying an exact approval token, stop the loop and ask explicitly: "are you trying to approve (type `approved` or `yes`) or trying to reject/modify the plan?" Do not continue silently re-prompting beyond 3 cycles.
4. Partial approval (`apply Change 1 and Change 3`) applies ONLY the named hunks.
5. If the user requests modifications: update proposals, re-present. If the user rejects specific changes: remove them.
</present_for_approval>

<apply_changes step="7.3">
1. Apply approved changes one at a time (or in named approved batches).
2. Validate linting/format after each change. On lint failure: revert that change (never leave the file broken), re-prepare a corrected version, and re-present that single change via `<present_for_approval>`.
3. Verify each applied change addresses its root cause by cross-referencing it to the matching entry in `agents/qa/{IDENTIFIER}/execution-report.md` (cite the entry id, e.g. `ERR-3`). On root-cause mismatch: return to step 7.1 with a note in `agents/qa-state.md`; do not leave unmapped changes applied.
4. **Max retries:** cap step 7.3 in-phase retries at 3 cycles per failing change. After 3 failed cycles on the same change, stop, record `Phase 7 blocked: in-phase apply retry cap reached` in `agents/qa-state.md`, and escalate to the user.
</apply_changes>

<update_state step="7.4">
1. Update `agents/qa-state.md`:
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
- **Execution report absent/empty:** if `agents/qa/{IDENTIFIER}/execution-report.md` does not exist or has no failure entries, stop Phase 7, record `Phase 7 blocked: Phase 6 execution report missing/empty` in `agents/qa-state.md`, and return to Phase 6 — never fabricate proposed changes against a missing report.
- **`agents/qa-state.md` missing or `{IDENTIFIER}` unresolvable:** stop Phase 7, record the failure in chat output, ask the user to restore the state file; do not auto-recreate it and do not guess `{IDENTIFIER}` (every input/output path depends on it).
- **Proposed-change asset ACQUIRE returns zero documents** (step 7.2): stop — do NOT present a correction block authored from memory. Report the failed ACQUIRE and ask the user to fix Rosetta/KB access.
- **No change maps to a confirmed root cause:** if `debugging` (step 7.1.1) cannot align a proposed edit to a confirmed Phase 6 root cause, do not propose it; record the unmapped failure and return to Phase 6 for deeper analysis rather than applying a symptom-only fix.
</failure_handling>

</qa_flow_test_correction>
