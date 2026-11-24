---
name: ui-aqa-flow-selector-implementation
description: "Phase 5 Selector Implementation of ui-aqa-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<ui_aqa_flow_selector_implementation>

<description_and_purpose>
Add the selectors identified in Phase 4 to page objects, following project conventions and patterns. Writes page-object files only.
</description_and_purpose>

<workflow_context>
- Phase 5 of 8 in `ui-aqa-flow`
- Input: the `## Selector Management` Part A inventory from Phase 4 (in the test plan); page-object inventory from Phase 3
- Output: page objects extended/created with all required selectors; the Part B Implementation subsection recorded
- Prerequisite: Phases 1-4 complete
- Write boundary (single SSoT): writes ONLY page-object files (and the test plan's `## Selector Management` → Implementation subsection). No test files, fixtures, or frontend source.
- Required skills: `qa-knowledge` (`implementation_modes` — selector mode Part B), `qa-structure` (`<test-name>` paths + state shape)
- Recommended skills: `coding` (general repo hygiene), `testing`
</workflow_context>

<skill_precedence>
If repository general hygiene and the selector-mode page-object rules disagree: follow the selector mode (per `qa-knowledge` `implementation_modes`) for selector locators, page-object accessor/getter/method conventions, and UI-specific patterns; follow `coding` for general repo hygiene (formatting, shared helpers, import order) where it does not override those selector decisions. Repo docs win on general-hygiene conflicts.

**Resolved example (positive):** repo standard prefers `camelCase` private helpers, but selector mode mandates `getSubmitButton()`-style accessors for elements touched by tests → use **`getSubmitButton()`** for page-object element access; keep **`camelCase`** for unrelated utilities (e.g. string builders) that are not selector accessors.

**Anti-pattern (negative):** renaming `getSubmitButton()` to `submitBtn()` "to match repo naming" for a mapped selector — **wrong**; that overrides the selector rules and must be reverted per the rule above.
</skill_precedence>

<part_a_inventory_gate>
The Phase 4 Part A inventory (the test plan's `## Selector Management` section) MUST exist and be non-empty before any page-object write. If absent/empty: stop Phase 5, record `Phase 5 blocked: Part A selector inventory missing — Phase 4 must run first` in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, and ask the user. Do NOT re-run Part A identification inside this phase — that is a phase-scope violation.
</part_a_inventory_gate>

<load_failure>
If `qa-structure`, `qa-knowledge`, `testing`, or `coding` cannot be loaded: retry once; if it still fails, stop, record the failed skill in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, and ask the user. Do not author page objects from memory.
</load_failure>

<phase_steps>
1. Execute selector implementation (step 5.1)
2. Validate implementation (step 5.2)
3. Update state (step 5.3)
</phase_steps>

<execute_implementation step="5.1" subagent="engineer" role="Selector implementation specialist">
1. USE SKILL `qa-structure` to resolve run paths/state. Apply `<part_a_inventory_gate>` — stop if the Part A inventory is missing.
2. USE SKILL `coding` to read the repository standards as authority for general hygiene before touching page objects; repo docs beat model defaults.
3. USE SKILL `qa-knowledge` (`implementation_modes` — selector mode, Part B: implement) and USE SKILL `testing` with the parent-supplied bindings: Part A inventory source = the test plan's `## Selector Management` section; write boundary = page-object files only (`<workflow_context>`); output = the Implementation subsection.
4. Extend existing page objects (match existing patterns exactly: access modifiers, naming, formatting, helper-method shape) and create new ones as needed (use existing page objects as structural templates). Do not introduce new patterns from this workflow; resolve hygiene-vs-selector conflicts per `<skill_precedence>`.
5. **Fragile-selector gate:** any selector Phase 4 flagged as fragile is NOT committed silently — replace it with a stable alternative agreed with the user, or surface it for explicit approval first. Record approval evidence in the Implementation subsection.
6. **Implementation report:** Part B writes the `### Implementation (Part B only)` subsection in the test plan's `## Selector Management` section (Page Objects Modified, Page Objects Created, Selectors Added, Methods Added, Fragile selectors implemented after approval). Step 5.3 echoes these into `agents/TEMP/<FEATURE>/ui-aqa-state.md`.
7. **Conditional doc-style match:** add JSDoc/TSDoc on new selectors/methods ONLY if existing page objects in the same file/module already use it. Match the existing style; do not introduce doc comments to a module that lacks them.
</execute_implementation>

<validate step="5.2">
1. Check linting/format on all modified/created files; fix errors.
2. Verify all selectors from the Phase 4 Part A map are implemented (or flagged-and-handled per the fragile-selector gate).
3. Verify no files outside the page-object layer were modified.
</validate>

<update_state step="5.3">
1. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md` (mirrors the Implementation subsection — canonical shape in the test plan; this is the state-file echo):
   - Page Objects Modified: [list with paths]
   - Page Objects Created: [list with paths]
   - Total Selectors Added: [count]
   - Helper Methods Added: [count]
   - Fragile Selectors Implemented (with approval): [list or None]
   - Linting: [clean/resolved]
   - Phase 5 completion timestamp
2. Mark Phase 5 complete, Phase 6 current
</update_state>

<validation_checklist>
- All missing selectors from the Phase 4 map implemented (or flagged-and-handled per the fragile-selector gate)
- New page objects created if needed, using existing page objects as templates
- General repo hygiene applied (formatting, shared helpers) and selector-mode rules applied for selector/page-object conventions — no conflicting shortcuts (see Resolved example / Anti-pattern in `<skill_precedence>`)
- Implementations follow project conventions exactly
- Helper methods added as needed; doc-style matched only where the module already uses it
- No fragile selector committed without recorded approval
- No files outside the page-object layer modified (write boundary)
- Linting/format checked and fixed; Implementation subsection recorded
</validation_checklist>

</ui_aqa_flow_selector_implementation>
