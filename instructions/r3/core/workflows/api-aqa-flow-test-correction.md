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
Fix Phase 6 API test failures: prepare proposed changes, gate on explicit user approval, apply incrementally with lint checks, hand re-testing back.
</description_and_purpose>

<workflow_context>
- Phase 7 of 8 in `api-aqa-flow`
- Input: `plans/api-aqa-{IDENTIFIER}/execution-report.md`; resolve `{IDENTIFIER}` from `agents/TEMP/<FEATURE>/api-aqa-state.md`
- Output: corrected test code, ready for re-testing
- Prerequisite: Phase 6 complete
- HITL: explicit user approval required before applying any change
- In-scope file set (single SSoT): test files + shared test-utility files only; writes outside refused and escalated.
- Required skills: `qa-knowledge` (`correction` mode), `qa-structure`
- Recommended skills: `coding`, `debugging`, `hitl`
</workflow_context>

<correction_contract>
One proposed-change block per fix BEFORE any write (USE SKILL `qa-knowledge` template). Flow params: **change-type enum** = `assertion-fix | auth-fix | data-setup | request-shape | wait-strategy | other`; **root-cause ref** = execution-report entry id (e.g. `ERR-3`); **state file** = `agents/TEMP/<FEATURE>/api-aqa-state.md`; retry-cap → return to Phase 6.
</correction_contract>

<phase_steps>
1. Prepare proposed corrections (step 7.1 — preparation-only)
2. Present changes for approval (step 7.2)
3. Apply approved changes (step 7.3)
4. Update state (step 7.4)
</phase_steps>

<execute_corrections step="7.1" subagent="engineer" role="Test correction engineer">
**Preparation-only:** no writes until step 7.3 (after explicit approval in 7.2); proposed edits = before/after evidence — no writes to test or product source files.
1. USE SKILL `qa-structure` → resolve run paths/`api-aqa-state.md`. USE SKILL `debugging` → align each edit to confirmed Phase 6 root cause; no symptom-only fixes.
2. USE SKILL `qa-knowledge` (`correction` mode) + USE SKILL `coding` → author each proposed edit. Source: `plans/api-aqa-{IDENTIFIER}/execution-report.md`. Discipline: `<present_for_approval>` (7.2) + `<apply_changes>` (7.3).
3. Produce one Proposed Change record per fix (per `<correction_contract>`), citing entry id (e.g. `ERR-3`). DO NOT apply anything yet.
</execute_corrections>

<present_for_approval step="7.2">
1. Present all proposed changes with before/after code.
2. **Approval gate:** USE SKILL `qa-knowledge` (approval gate); USE SKILL `hitl`. Approval = exact token `approved` / `approve` / `yes` (case-insensitive), scoped to named changes — no `"or equivalent"` / `"or similar"` extends it. Comments, questions, suggestions, edits, and partial review are REVIEW, not approval. Partial approval → named changes/hunks only; re-present at 7.2. Full rejection → Phase 6.
</present_for_approval>

<apply_changes step="7.3">
1. Apply approved changes one at a time (or in named approved batches).
2. Validate lint/format after each change. Lint failure → revert that change (never leave the file broken), re-prepare, re-present that single change via `<present_for_approval>`.
3. Cross-reference each change to `plans/api-aqa-{IDENTIFIER}/execution-report.md` (cite id, e.g. `ERR-3`). Root-cause mismatch → return to 7.1 with note in `agents/TEMP/<FEATURE>/api-aqa-state.md`; do not leave unmapped changes applied.
4. **Max retries:** `<correction_contract>` cap — 3rd failed cycle → stop, record `Phase 7 blocked: in-phase apply retry cap reached` in `api-aqa-state.md`, escalate to user.
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
3. Tell user to re-run tests (provide exact command).
4. If tests still fail: return to Phase 6.
</update_state>

<validation_checklist>
- Each change record cites an ERR-N root cause.
- Approval in state: datetime + token + approved IDs/hunks.
- `Files Modified` contains only test/shared-utility files.
- Each modified file passes lint.
- If cap hit: `Phase 7 blocked: in-phase apply retry cap reached` recorded in state.
- Phase 7 timestamp + re-run command in state.
</validation_checklist>

<failure_handling>
- **Execution report absent/empty:** `plans/api-aqa-{IDENTIFIER}/execution-report.md` missing/empty → record `Phase 7 blocked: Phase 6 execution report missing/empty` in `agents/TEMP/<FEATURE>/api-aqa-state.md`, return to Phase 6; never fabricate changes against a missing report.
- **`agents/TEMP/<FEATURE>/api-aqa-state.md` missing or `{IDENTIFIER}` unresolvable:** record failure in chat, ask user to restore; do not auto-recreate; do not guess `{IDENTIFIER}`.
- **Required skill/gate/template unavailable** (`qa-structure`, `debugging`, `qa-knowledge`, `coding`, or `hitl` fails to load at 7.1/7.2): retry once, then stop — do NOT present a correction block or run the approval gate from memory; report, ask user to fix Rosetta access.
- **No change maps to confirmed root cause:** `debugging` (step 7.1 item 1) cannot align edit to Phase 6 root cause → do not propose; record, return to Phase 6; no symptom-only fixes.
</failure_handling>

</api_aqa_flow_test_correction>
