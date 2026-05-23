---
name: aqa-flow-selector-implementation
description: Phase 5 of AQA workflow - Selector Implementation in Page Objects
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_selector_implementation>

<description_and_purpose>
Add identified selectors to page objects following project conventions and patterns.
</description_and_purpose>

<workflow_context>
- Phase 5 of 8 in `aqa-flow`
- Input: selector map from Phase 4, page object inventory from Phase 3
- Output: page objects extended/created with all required selectors
- Prerequisite: Phases 1-4 complete
- Skills (Rosetta KB tags — `ACQUIRE <tag> FROM KB` before USE): `repository-implementation-standards`, `aqa-selector-management`.
</workflow_context>

<skill_precedence>
If `repository-implementation-standards` and `aqa-selector-management` disagree: follow `aqa-selector-management` for selector locators, page object APIs, and AQA-specific patterns; follow `repository-implementation-standards` for general repo hygiene (formatting, shared helpers) where it does not override those AQA decisions.

**Resolved example (positive):** repo standard prefers `camelCase` private helpers, but `aqa-selector-management` mandates `getSubmitButton()`-style accessors for elements touched by tests → use **`getSubmitButton()`** (and other selector-skill accessors) for page-object element access; keep **`camelCase`** for unrelated utilities (e.g. string builders) that are not selector accessors.

**Anti-pattern (negative):** renaming `getSubmitButton()` to `submitBtn()` “to match repo naming” for a mapped selector — **wrong**; that shortcut overrides AQA selector rules and must be reverted per the rule above.
</skill_precedence>

<skill_acquire_failure>
If a **required** ACQUIRE in step **5.1** below returns **zero** documents: stop Phase 5 immediately, record the failure and the **skill tag** that failed in `agents/aqa-state.md`, notify the user to fix Rosetta/KB access, and **do not** run any later steps in 5.1.
</skill_acquire_failure>

<phase_steps>
1. Execute selector implementation (Part B of skill)
2. Validate implementation
3. Update state
</phase_steps>

<execute_implementation step="5.1" subagent="engineer" role="Selector implementation specialist">
1. ACQUIRE `repository-implementation-standards` FROM KB if not already loaded. If that ACQUIRE returns **zero** documents: apply `<skill_acquire_failure>`.
2. USE SKILL `repository-implementation-standards`
3. ACQUIRE `aqa-selector-management` FROM KB if not already loaded. If that ACQUIRE returns **zero** documents: apply `<skill_acquire_failure>`.
4. USE SKILL `aqa-selector-management`
5. Execute Part B (Selector Implementation) only
6. Extend existing page objects and create new ones as needed
</execute_implementation>

<validate step="5.2">
1. Check linting on all modified/created files
2. Fix any linting errors
3. Verify all selectors from Phase 4 map are implemented
</validate>

<update_state step="5.3">
1. Update `agents/aqa-state.md`:
   - Page Objects Modified: [list with paths]
   - Page Objects Created: [list with paths]
   - Total Selectors Added: [count]
   - Helper Methods Added: [count]
   - Linting: [clean/resolved]
   - Phase 5 completion timestamp
2. Mark Phase 5 complete, Phase 6 current
</update_state>

<validation_checklist>
- All missing selectors implemented
- New page objects created if needed
- `repository-implementation-standards` applied for repo hygiene (formatting, shared helpers) where relevant, and `aqa-selector-management` applied for selector/page-object rules — no conflicting shortcuts (see **Resolved example** / **Anti-pattern** in `<skill_precedence>`)
- Implementations follow project conventions exactly
- Helper methods added as needed
- Linting errors checked and fixed
</validation_checklist>

</aqa_flow_selector_implementation>
