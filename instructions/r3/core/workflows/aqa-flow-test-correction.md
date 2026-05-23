---
name: aqa-flow-test-correction
description: Phase 8 of AQA workflow - Test Corrections (USER APPROVAL REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_test_correction>

<description_and_purpose>
Fix identified test failures based on Phase 7 analysis. Requires explicit user approval before applying changes.
</description_and_purpose>

<workflow_context>
- Phase 8 of 8 in `aqa-flow`
- Input: failure analysis from Phase 7
- Output: corrected test code, ready for re-testing
- Prerequisite: Phase 7 complete
- HITL: explicit user approval required before applying changes
- Primary orchestration skill: `user-approved-code-changes` — **HITL-gated** edit orchestration (preparation-only proposals, explicit user approval, then writes). Resolve the live skill body only via **ACQUIRE `user-approved-code-changes` FROM KB** (step 8.1); do not rely on hardcoded repository paths in this workflow file.
</workflow_context>

<phase_steps>
1. Execute correction preparation (Part B of skill)
2. Present changes for approval
3. Apply approved changes
4. Update state
</phase_steps>

<correction_output_shapes>
Minimal shapes for step 8.2 input (use what `user-approved-code-changes` prescribes; if unspecified, use **snippet** for small edits and **diff** for multi-hunk changes):
- **Snippet example:** `File: tests/e2e/login.spec.ts` — **Before:** `await expect(page).toHaveURL(/dashboard/)` — **After:** `await expect(page).toHaveURL(/home/)` — **Reason:** assertion matched obsolete route after rename.
- **Diff example:** one unified-diff hunk scoped to a single file, e.g. lines prefixed with `-`/`+` for that path only (full layout in the skill document returned by ACQUIRE `user-approved-code-changes`).
</correction_output_shapes>

<execute_corrections step="8.1" subagent="engineer" role="Test correction engineer">
1. ACQUIRE `user-approved-code-changes` FROM KB. If multiple non-empty documents return, prefer the one whose frontmatter `name:` (or primary tag) is exactly `user-approved-code-changes`; if still ambiguous, stop and ask the user which document is canonical.
2. If the ACQUIRE in step 1 returned **zero** documents, run this **fallback sequence in order** (all preparation-only; no file writes until step 8.3): USE SKILL `debugging` → USE SKILL `coding` → execute `aqa-test-debugging` Part B (Corrections) preparation only.
3. If the ACQUIRE in step 1 returned **one or more** documents: USE SKILL `user-approved-code-changes` — produce **preparation-only** output for step 8.2: proposed edits with before/after snippets or file-level diffs per the skill document (minimal shapes in `correction_output_shapes` above); **no** file writes until step 8.3.
4. Do NOT apply file changes yet.
5. If orchestrator guidance conflicts with steps 8.2–8.3 below, follow 8.2–8.3.
</execute_corrections>

<present_for_approval step="8.2">
1. Present all proposed changes with before/after code
2. **WAIT** for explicit user approval
3. User must type "approved" or "yes" — do not assume approval
4. If user requests modifications: update proposals, re-present
5. If user rejects specific changes: remove from plan
</present_for_approval>

<apply_changes step="8.3">
1. Apply approved changes one at a time
2. Validate linting after each change
3. Verify changes address root causes
</apply_changes>

<update_state step="8.4">
1. Update `agents/aqa-state.md`:
   - Issues Fixed: [count]
   - Changes Applied: [count]
   - User Approval: [datetime]
   - Files Modified: [list]
   - Status: Ready for re-testing
   - Phase 8 completion timestamp
2. Mark Phase 8 complete
3. Inform user to re-run tests
4. If tests still fail: return to Phase 7
</update_state>

<validation_checklist>
- Phase 7 analysis reviewed
- Proposed changes prepared with before/after code
- User approval explicitly received
- All approved changes applied
- Linting errors checked and fixed
- Changes address identified root causes
</validation_checklist>

</aqa_flow_test_correction>
