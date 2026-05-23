---
name: qa-flow-test-correction
description: Phase 7 of API QA workflow - Test Corrections (USER APPROVAL REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_test_correction>

<description_and_purpose>
Fix identified test failures based on Phase 6 analysis. Requires explicit user approval before applying changes.
</description_and_purpose>

<workflow_context>
- Phase 7 of 8 in `qa-flow`
- Input: execution report from Phase 6
- Output: corrected test code, ready for re-testing
- Prerequisite: Phase 6 complete
- HITL: explicit user approval required before applying changes
- Primary orchestration skill: `user-approved-code-changes` — KB ACQUIRE tag and USE SKILL name are both `user-approved-code-changes`.
</workflow_context>

<phase_steps>
1. Execute correction preparation (Part B of skill)
2. Present changes for approval
3. Apply approved changes
4. Update state
</phase_steps>

<execute_corrections step="7.1" subagent="engineer" role="API test correction engineer">
1. ACQUIRE `user-approved-code-changes` FROM KB.
2. If the ACQUIRE in step 1 returned **zero** documents, run this **fallback sequence in order** (all preparation-only; no file writes until step 7.3): USE SKILL `debugging` → USE SKILL `coding` → execute `qa-test-debugging` Part B (Corrections) preparation only.
3. If the ACQUIRE in step 1 returned **one or more** documents: USE SKILL `user-approved-code-changes` — produce **preparation-only** output for step 7.2: proposed edits with before/after snippets or file-level diffs per the skill document; **no** file writes until step 7.3.

**Preparation-only shape (concrete example for step 7.2):**

```text
File: tests/api/orders_spec.rb
-    expect(response.code).to eq("200")
+    expect(response).to have_http_status(:ok)
Rationale: execution-report ERR-3 — response is Rack::Response; comparing .code to string "200" failed.
```
4. Do NOT apply file changes yet.
5. If orchestrator guidance conflicts with steps 7.2–7.3 below, follow 7.2–7.3.
</execute_corrections>

<present_for_approval step="7.2">
1. Present all proposed changes with before/after code
2. **WAIT** for explicit user approval
3. User must type "approved" or "yes" — do not assume approval
4. If user requests modifications: update proposals, re-present
5. If user rejects specific changes: remove from plan
</present_for_approval>

<apply_changes step="7.3">
1. Apply approved changes one at a time
2. Validate linting after each change
3. Verify changes address root causes
</apply_changes>

<update_state step="7.4">
1. Update `agents/qa-state.md`:
   - Issues Fixed: [count]
   - Changes Applied: [count]
   - User Approval: [datetime]
   - Files Modified: [list]
   - Status: Ready for re-testing
   - Phase 7 completion timestamp
2. Mark Phase 7 complete
3. Inform user to re-run tests
4. If tests still fail: return to Phase 6
</update_state>

<validation_checklist>
- Phase 6 analysis reviewed
- Proposed changes prepared with before/after code
- User approval explicitly received
- All approved changes applied
- Linting errors checked and fixed
- Changes address identified root causes
</validation_checklist>

</qa_flow_test_correction>
