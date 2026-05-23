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
- Input: test plan with assertions; Phase 3 code analysis report at `agents/plans/aqa-<test-name>-code-analysis.md` (architecture + page object inventory + test location; produced in Phase 3). `<test-name>` matches the Phase 1 plan `agents/plans/aqa-<test-name>.md`; use `agents/aqa-state.md` if the slug is unclear. **Resolved example:** `agents/plans/aqa-login-redirect-code-analysis.md` means `<test-name>` = `login-redirect` for this phase's inputs. **If the code-analysis file is missing, `agents/aqa-state.md` still leaves the slug ambiguous, or more than one plausible `agents/plans/aqa-*-code-analysis.md` exists:** stop Phase 4, record the gap in `agents/aqa-state.md`, and ask the user once for the canonical `<test-name>` or to re-run Phase 3 — do not guess a slug.
- Output: complete selector map with values and strategy
- Prerequisite: Phases 1-3 complete
- HITL: conditional — only if frontend code unavailable or selectors not found
</workflow_context>

<phase_steps>
1. Execute selector identification (Part A of skill)
2. Handle page source request if needed
3. Update state
</phase_steps>

<execute_identification step="4.1" subagent="engineer" role="Selector identification specialist">
1. USE SKILL `aqa-selector-management`
2. Execute Part A (Selector Identification) only
3. If all selectors found in frontend code, skip step 4.2
</execute_identification>

<handle_page_source step="4.2" condition="selectors still missing">
1. Create directory `agents/aqa/{TICKET-KEY}/page-sources/`
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
