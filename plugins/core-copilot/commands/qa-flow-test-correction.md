---
name: qa-flow-test-correction
description: Phase 7 of QA workflow - Test Corrections (USER APPROVAL REQUIRED)
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
</workflow_context>

<phase_steps>
1. Prepare proposed corrections (see **7.1** preparation-only rule)
2. Present changes for approval
3. Apply approved changes
4. Update state
</phase_steps>

<execute_corrections step="7.1" subagent="engineer" role="API test correction engineer">
**Preparation-only:** nothing in this block modifies workspace files until **7.3** after explicit approval in **7.2**.
1. ACQUIRE `user-approved-code-changes` FROM KB. If multiple non-empty documents return, prefer the one whose frontmatter `name:` (or primary tag) is exactly `user-approved-code-changes`; if still ambiguous, stop and ask the user which document is canonical.
2. **Phase wins over orchestrator copy:** if text inside the acquired skill conflicts with steps **7.2**–**7.3** in this phase file, follow **7.2**–**7.3** and note the conflict in `agents/qa-state.md`.
3. If the ACQUIRE in step **1** returned **zero** documents, run this **fallback sequence in order**: USE SKILL `debugging` → USE SKILL `coding` → execute only the subsection of `qa-test-debugging` whose heading matches **either** `## Part B: Corrections` (canonical) **or** `## Part B (Corrections)` (legacy variant) — search by heading text, not by line number. If neither heading is present, stop and ask the user before proceeding. In fallback preparation, extract text/snippets only (see the **Preparation-only** rule above).
4. If the ACQUIRE in step **1** returned **one or more** documents: USE SKILL `user-approved-code-changes` — produce output for step **7.2** (snippets or file-level diffs per the skill document).
5. **Transparency before 7.2:** state whether preparation used **Primary** (item **4**) or **Fallback** (item **3**), list document **title(s) / `name:`** from step **1**, and flag **uncertainty** if the hit document looks incomplete or off-topic — ask the user once before `present_for_approval` if unsure.
</execute_corrections>

<preparation_example>
**Shape reference for step 7.2 (not a numbered step):**

```text
File: tests/api/orders_spec.rb
-    expect(response.code).to eq("200")
+    expect(response).to have_http_status(:ok)
Rationale: execution-report ERR-3 — response is Rack::Response; comparing .code to string "200" failed.
```
</preparation_example>

<present_for_approval step="7.2">
1. Present all proposed changes with before/after code
2. **WAIT** for explicit user approval
3. User must type one of these **exactly** (case-insensitive: `approved`, `Approved`, `APPROVED` etc. all match): `approved`, `approve`, `yes`. Do not assume approval. **Loose phrasings such as "looks good", "ship it", "LGTM", "sounds good", "go ahead", "OK", "go", or paraphrases that imply but do not state approval must be treated as REVIEW (not approval). Re-prompt the user for one of the exact tokens. The acceptable token list is closed; "or similar" / "etc." wording in other loaded rules (e.g. `hitl` skill — see the line in `<process>` Approval beginning `Accepted: \`Yes, I approve\`...`) does NOT extend it for this gate.**
3a. **Max-retry escalation:** if the user has been re-prompted ≥3 times in this Phase 7 cycle without supplying an exact approval token, stop the approval loop and ask the user explicitly: "are you trying to approve (please type `approved` or `yes`) or trying to reject/modify the plan?" Do not continue silently re-prompting beyond 3 cycles.
4. If user requests modifications: update proposals, re-present
5. If user rejects specific changes: remove from plan
</present_for_approval>

<apply_changes step="7.3">
1. Apply approved changes one at a time
2. Validate linting after each change. **On lint failure:** revert that specific change (do not leave the file in a broken state), re-prepare a corrected version, and re-present that single change to the user via `<present_for_approval>`. Do not silently leave the lint failure in place.
3. Verify changes address root causes by cross-referencing each applied change to the matching root-cause entry in `agents/qa/{IDENTIFIER}/execution-report.md` (cite the entry ID, e.g., `ERR-3`). **On root-cause mismatch** (change does not map to any reported root cause, or maps but does not address it): return to step 7.1 with a note in `agents/qa-state.md` describing the mismatch; do not silently leave unmapped changes applied.
4. **Max retries:** cap step 7.3 in-phase retries at 3 cycles per failure. After 3 failed cycles on the same change, stop, record `Phase 7 blocked: in-phase apply retry cap reached` in `agents/qa-state.md`, and escalate to the user.
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
