---
name: aqa-flow-code-analysis
description: Phase 3 of AQA workflow - Code Analysis and Architecture Understanding
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<aqa_flow_code_analysis>

<description_and_purpose>
Understand existing test architecture, identify reusable components, and determine where new test should be integrated.
</description_and_purpose>

<workflow_context>
- Phase 3 of 8 in `aqa-flow`
- Input: test plan with assertions and clarifications
- Output: code analysis report at `agents/plans/aqa-<test-name>-code-analysis.md` (architecture analysis, page object inventory, test location decision)
- Prerequisite: Phases 1 and 2 complete
</workflow_context>

<naming_convention>
**Slug format:** lowercase ASCII kebab-case — letters, digits, hyphens only; no spaces or paths.

**`<test-name>` slug:** parse from Phase 1 plan filename `agents/plans/aqa-<test-name>.md` (segment after `aqa-` and before `.md`). If missing or ambiguous, read `agents/aqa-state.md` or ask the user once for the canonical slug before writing Phase 3 outputs.

**User-supplied slug:** must match the slug format above. If the user refuses, gives a non-conforming slug, or ambiguity persists after one attempt, stop Phase 3 per `<plan_path_guards>`.

**Priority if sources disagree:** when the Phase 1 plan file exists, its filename slug is **authoritative**. If `agents/aqa-state.md` disagrees, prefer the plan filename, record the mismatch in `agents/aqa-state.md`, then continue. If the plan file is missing, use `agents/aqa-state.md` or the user's answer.

**Worked example:** `agents/plans/aqa-login-happy-path.md` → `<test-name>` = `login-happy-path` → report `agents/plans/aqa-login-happy-path-code-analysis.md`.
</naming_convention>

<plan_path_guards>
If the Phase 1 plan path is still missing after resolving `<test-name>`, or `<test-name>` cannot be resolved to a valid slug per `<naming_convention>` (including after a user attempt): stop Phase 3, record the gap in `agents/aqa-state.md`, and ask the user to restore or re-run Phase 1 before continuing.
</plan_path_guards>

<phase_steps>
1. Read project description
2. Execute codebase analysis
3. Validate findings
4. Update state
</phase_steps>

<execute_analysis step="3.1" subagent="discoverer" role="Test architecture analyst">
1. USE SKILL `aqa-codebase-analysis`
2. Verify test plan updated with architecture findings
</execute_analysis>

<validate_findings step="3.2">
1. Confirm project description read
2. Confirm user instructions extracted (if directory exists)
3. Confirm page objects inventoried
4. Confirm test location decided
</validate_findings>

<update_state step="3.3">
1. Update `agents/aqa-state.md`:
   - User Instructions: [found/not found]
   - Existing Page Objects: [count and list]
   - Page Objects to Create: [count and list]
   - Similar Tests: [paths]
   - Test Location: [directory/file]
   - Framework: [name]
   - Phase 3 completion timestamp
2. Mark Phase 3 complete, Phase 4 current
</update_state>

<validation_checklist>
- Project description read and standards documented
- User instructions extracted and categorized (if available)
- All relevant page objects identified
- Similar tests found and patterns documented
- Test location determined with rationale
- Reusable utilities identified
- Code analysis report written to `agents/plans/aqa-<test-name>-code-analysis.md` with `<test-name>` resolved per `<naming_convention>` and file non-empty
</validation_checklist>

</aqa_flow_code_analysis>
