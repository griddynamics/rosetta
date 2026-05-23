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
**`<test-name>` slug:** lowercase ASCII kebab-case, taken from the Phase 1 plan filename `agents/plans/aqa-<test-name>.md` (the segment after the `aqa-` prefix and before `.md`). If that file is missing or the slug is ambiguous, read the active test identifier from `agents/aqa-state.md` or ask the user once to pick the canonical slug before writing Phase 3 outputs.

**User-supplied slug:** any answer from the user MUST match the same lowercase ASCII kebab-case rule (letters, digits, hyphens only; no spaces or paths). If the user refuses, gives a non-conforming slug, or repeats ambiguity after one attempt, stop Phase 3 per `<plan_path_guards>`: record the gap in `agents/aqa-state.md` and ask the user to restore a valid plan filename or slug before continuing.

**Priority if sources disagree:** when the Phase 1 plan file exists, the slug parsed from its filename is **authoritative**. If `agents/aqa-state.md` disagrees, prefer the plan filename, record the mismatch in `agents/aqa-state.md`, then continue. If the plan file is missing, use `agents/aqa-state.md` or the user's answer as the tie-breaker.

**Worked example:** plan path `agents/plans/aqa-login-happy-path.md` → `<test-name>` = `login-happy-path` → Phase 3 report path `agents/plans/aqa-login-happy-path-code-analysis.md`.
</naming_convention>

<plan_path_guards>
If the Phase 1 plan path is still missing after resolving `<test-name>`, or `<test-name>` cannot be resolved to a valid lowercase ASCII kebab-case slug per `<naming_convention>` (including after a user attempt): stop Phase 3, record the gap in `agents/aqa-state.md`, and ask the user to restore or re-run Phase 1 before continuing.
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
