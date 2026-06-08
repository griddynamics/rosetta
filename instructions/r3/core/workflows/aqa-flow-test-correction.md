---
name: aqa-flow-test-correction
description: Phase 8 of AQA workflow - Test Corrections (USER APPROVAL REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_test_correction>

<description_and_purpose>
Fix identified test failures based on the Phase 7 failure analysis. Prepares proposed changes, requires explicit user approval before applying, then applies them incrementally with lint checks and hands re-testing back to the user.
</description_and_purpose>

<workflow_context>
- Phase 8 of 8 in `aqa-flow`
- Input: failure analysis from Phase 7 (`agents/plans/aqa-<test-name>-failure-analysis.md`)
- Output: corrected test code, ready for re-testing
- Prerequisite: Phase 7 complete
- HITL: explicit user approval required before applying any change (a domain-specific specialization of `hitl`)
- In-scope file set (single SSoT): test files only (and page-object files if the Phase 7 analysis identifies a selector fix). Writes outside this set are refused and escalated.
</workflow_context>

<recommended_skills>
- `coding` — approved-apply mode prepares proposals, gates on approval, applies incrementally with lint, hands off re-verification.
- `debugging` — aligns each proposed edit with a confirmed Phase 7 root cause before it is proposed.
</recommended_skills>

<correction_contract>
The phase OWNS the proposed-change template, the iteration cap, and the escalation contract. Verified by `<validation_checklist>` independent of skill internals.

**Proposed-change template** (one per change, presented at step 8.2 BEFORE any write; empty fields use `None`):

```markdown
### Proposed Change <N>: <one-line title>
- **Source root cause:** <Phase 7 analysis entry, e.g. failure-analysis.md F3 (selector-locator)>
- **File:** <path>
- **In-scope:** yes | no   (if `no`, STOP — escalate; outside the in-scope file set)
- **Change type:** selector-update | wait-strategy | assertion-fix | data-setup | other

**Before:**
```diff
- <removed line(s)>
```
**After:**
```diff
+ <added line(s)>
```

- **Reason:** <one-line — how this fix addresses the root cause>
- **Impact:** <only the cited test? other tests sharing the helper? page-object consumers?>
- **Risk:** Low | Medium | High
- **Approval status:** pending | approved (token: `<exact user token>`) | rejected | partial (hunks <list>)
```

**Worked example (approved state):**

```markdown
### Proposed Change 1: Update logout-button selector
- **Source root cause:** failure-analysis.md F3 (selector-locator, Confirmed)
- **File:** tests/auth/logout.spec.ts
- **In-scope:** yes
- **Change type:** selector-update

**Before:**
```diff
- await page.locator('[data-testid="logout-btn"]').click();
```
**After:**
```diff
+ await page.locator('[data-testid="logout-button"]').click();
```

- **Reason:** Frontend renamed the data-testid; page-source confirms the new value.
- **Impact:** logout.spec.ts only — no other test references the old selector.
- **Risk:** Low
- **Approval status:** approved (token: `approved`)
```

**Iteration cap + escalation:** cap in-phase apply retries at **3 cycles per failing change**. After 3 failed cycles on the same change, stop, record `Phase 8 blocked: in-phase apply retry cap reached` in `agents/aqa-state.md`, and escalate to the user. If tests still fail after corrections, return to Phase 7 — do not auto-loop.
</correction_contract>

<phase_steps>
1. Prepare proposed corrections (step 8.1 — preparation-only)
2. Present changes for approval (step 8.2)
3. Apply approved changes (step 8.3)
4. Update state (step 8.4)
</phase_steps>

<execute_corrections step="8.1" subagent="engineer" role="Test correction engineer">
**Guardrail:** all of step 8.1 is preparation-only; file writes are forbidden until step 8.3. "Preparation-only" means proposed edits paired with before/after evidence — no writes to test, page-object, or product source files.
1. USE SKILL `debugging` to align each proposed edit with a confirmed Phase 7 root cause (no symptom-only fixes).
2. USE SKILL `coding` (approved-apply mode) with the parent-supplied bindings: proposed-change source = `agents/plans/aqa-<test-name>-failure-analysis.md`; proposed-change template = `<correction_contract>`; in-scope file set = `<workflow_context>`; approval-token set = step 8.2; state file = `agents/aqa-state.md`; iteration cap = `<correction_contract>`; loop target = Phase 7.
3. Produce one Proposed Change record per fix per the `<correction_contract>` template. Do NOT apply anything yet.
</execute_corrections>

<present_for_approval step="8.2">
1. Present all proposed changes with before/after code per the template.
2. **WAIT** for explicit user approval.
3. The user must type `approved`, `approve`, or `yes` (case-insensitive). Do not assume approval. Loose phrasings ("looks good", "ship it", "LGTM", "go ahead", "OK") are treated as REVIEW, not approval — re-prompt for an exact token (approval vocabulary governed by `hitl`).
4. Partial approval (`apply Change 1 and Change 3`) applies ONLY the named hunks.
5. If the user requests modifications: update proposals, re-present. If the user rejects specific changes: remove them.
</present_for_approval>

<apply_changes step="8.3">
1. Apply approved changes one at a time (or in named approved batches).
2. Validate linting/format after each change. On lint failure: revert that change (never leave the file broken), re-prepare, and re-present that single change via `<present_for_approval>`.
3. Verify each applied change addresses its Phase 7 root cause (cite the analysis entry id). On root-cause mismatch: return to step 8.1 with a note in `agents/aqa-state.md`; do not leave unmapped changes applied.
4. Honor the iteration cap in `<correction_contract>` (3 cycles per change, then escalate).
</apply_changes>

<update_state step="8.4">
1. Update `agents/aqa-state.md`:
   - Issues Fixed: [count]
   - Changes Applied: [count]
   - User Approval: [datetime + exact token]
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
- User approval explicitly received per the exact token set (no inferred approval); partial approval applied only to named hunks
- All approved changes applied; only in-scope files touched
- Linting/format checked and fixed after each change (lint failure reverted + re-presented, never left broken)
- Changes address identified root causes; iteration cap honored, escalation recorded if reached
- State updated without auto-looping; re-run instruction provided
</validation_checklist>

</aqa_flow_test_correction>
</output>
