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
</workflow_context>

<phase_steps>
1. Execute selector implementation (Part B of skill)
2. Validate implementation
3. Update state
</phase_steps>

<execute_implementation step="5.1" subagent="engineer" role="Selector implementation specialist">
1. USE SKILL `aqa-selector-management`
2. Execute Part B (Selector Implementation) only
3. Extend existing page objects and create new ones as needed
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
- Implementations follow project conventions exactly
- Helper methods added as needed
- Linting errors checked and fixed
</validation_checklist>

</aqa_flow_selector_implementation>
