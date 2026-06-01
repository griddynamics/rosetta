---
name: aqa-flow-selector-identification
description: Phase 4 of AQA workflow - Selector Identification (USER INTERACTION CONDITIONALLY REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_selector_identification>

<description_and_purpose>
Identify missing selectors from frontend source code or page source HTML. Conditionally requests page source from user.
</description_and_purpose>

<workflow_context>
- Phase 4 of 8 in `aqa-flow`
- Input: test plan with assertions; Phase 3 code analysis report at `agents/plans/aqa-<test-name>-code-analysis.md`
- Output: complete selector map with values and strategy
- Prerequisite: Phases 1-3 complete
- HITL: conditional — only if frontend code unavailable or selectors not found
</workflow_context>

<input_resolution>
`<test-name>` matches the Phase 1 plan `agents/plans/aqa-<test-name>.md`; use `agents/aqa-state.md` if the slug is unclear. **Example:** `agents/plans/aqa-login-redirect-code-analysis.md` → `<test-name>` = `login-redirect`.
</input_resolution>

<failure_handling>
If the code-analysis file is missing, the slug stays ambiguous in `agents/aqa-state.md`, or more than one plausible `agents/plans/aqa-*-code-analysis.md` exists: stop Phase 4, record the gap in `agents/aqa-state.md`, ask the user once for the canonical `<test-name>` or to re-run Phase 3 — do not guess.
</failure_handling>

<phase_steps>
1. Resolve `<test-name>` and verify the Phase 3 code-analysis file (see `<input_resolution>` / `<failure_handling>`)
2. Execute selector identification (Part A of skill)
3. Handle page source request if needed
4. Update state
</phase_steps>

<resolve_inputs step="4.0">
1. Resolve `<test-name>` per `<input_resolution>`.
2. Verify `agents/plans/aqa-<test-name>-code-analysis.md` exists and is the single canonical input for this run.
3. If verification fails: apply `<failure_handling>`.
</resolve_inputs>

<execute_identification step="4.1" subagent="engineer" role="Selector identification specialist">
1. USE SKILL `aqa-selector-management`
2. Execute Part A (Selector Identification) only
3. If all selectors found in frontend code, skip step 4.2
</execute_identification>

<handle_page_source step="4.2" condition="selectors still missing">
1. Create directory `agents/plans/aqa-<test-name>-page-sources/` (using the same `<test-name>` slug resolved in step 4.0 per `<input_resolution>`)
2. Provide clear instructions to user for capturing HTML
3. **WAIT** for user to add page source files
4. Verify files exist, then continue Part A analysis
</handle_page_source>

<update_state step="4.3">
1. Update `agents/aqa-state.md`:
   - Total Selectors Needed: [count]
   - Existing: [count]
   - Found in Frontend: [count]
   - Page Source Required: [yes/no]
   - Selector Strategy: [preferred method]
   - Phase 4 completion timestamp
2. Mark Phase 4 complete, Phase 5 current
</update_state>

<validation_checklist>
- All required UI interactions mapped
- Existing selectors checked in page objects
- Frontend source code searched first (if available)
- Missing selectors identified from page source (if needed)
- Selector strategy documented
</validation_checklist>

</aqa_flow_selector_identification>
