---
name: aqa-flow-code-analysis
description: "Phase 3 Code Analysis of aqa-flow"
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
- Output artifact path (single SSoT — referenced by other sections): `plans/aqa-<test-name>-code-analysis.md` (resolve `<test-name>` per `qa-structure` `aqa-layout` slug rules)
- Prerequisite: Phases 1 and 2 complete
- Read-only scope (single SSoT — referenced by other sections as "the read-only scope"): read project description, page objects, similar tests, utilities; produce the report + a one-paragraph `## Code Analysis` summary in the test plan. NO edits to page objects, test files, source under analysis, `project_description.md`, or repo docs; NO running tests/lint/build. A finding that implies code work is surfaced in the report, not acted on.
- Skills: `reverse-engineering` (test-automation architecture analysis mode), `sensitive-data` (redaction), `qa-structure` (slug + report path), `qa-knowledge` (code-analysis report skeleton + redaction scope)
</workflow_context>

<input_contract>
The phase supplies these paths to the skill; defaults apply when not configured:

| Input | Default path | Required content |
|---|---|---|
| Test plan | `plans/aqa-<test-name>.md` | Test name + clarified assertions |
| Project description | `project_description.md` (repo root) | Framework, language, structure, coding standards |
| Optional repo docs | `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md` | Architecture, conventions — read when present |
| Optional user instructions | `agents/user-instructions/` | Test guidelines, custom matchers, style |
| Optional frontend source | repo-specific (e.g. `RefSrc/<repo>/`) | Component files for selector / test-id discovery |
| Output | `plans/aqa-<test-name>-code-analysis.md` | The report (this phase's contract, below) |

**Input GATE.** Before analysis: test plan exists and is non-empty; project description OR one authoritative repo doc (`CONTEXT.md`/`ARCHITECTURE.md`/`IMPLEMENTATION.md`) exists; codebase root is readable. Any miss → stop Phase 3, record the gap in `agents/aqa-state.md`, ask the user. Do NOT infer framework from incidental file extensions.

**Path precedence on conflict.** When extracted standards (from `project_description.md`, user instructions) conflict with authoritative repo docs, **repo docs win** — record the conflict in the report's `## Conflicts and Precedence` section; never silently overwrite either side.
</input_contract>

<code_analysis_report_contract>
`aqa-<test-name>-code-analysis.md` is **tracked + downstream-fed** (consumed by page-object and test-authoring phases) — treat as **PUBLIC by default**; redact captured values BEFORE writing per `qa-knowledge/references/redaction-scope.md`, not after. **Pre-emit gate (MANDATORY): MUST ACQUIRE that reference FROM KB and run its grep list against the rendered artifact — emit is FORBIDDEN until the scan has run. Fail-closed: if the ACQUIRE returns zero documents (KB unavailable), STOP and report — never emit unscanned.** The report's 9-section structure and the test-location decision rule are the asset `qa-knowledge/assets/code-analysis-report-template.md` (ACQUIRE FROM KB) — every section present (empty optional section says `not available — see Coverage section`).

After writing the report, update the test plan's `## Code Analysis` section with a one-paragraph summary linking to it — do NOT duplicate report contents into the plan. This is the **phase contract**, verified by `<validation_checklist>` independent of skill internals.
</code_analysis_report_contract>

<phase_steps>
1. Execute codebase analysis (reads project description, page objects, similar tests)
2. Validate findings
3. Update state
</phase_steps>

<execute_analysis step="3.1" subagent="discoverer" role="Test architecture analyst">
1. Run the `<input_contract>` Input GATE. On any miss: stop per the `qa-structure` `aqa-layout` guards / `<input_contract>`.
2. **ACQUIRE `qa-knowledge/assets/code-analysis-report-template.md` FROM KB first** — the bound `reverse-engineering` skill disowns the section list, so the template is load-bearing for the `discoverer`. Then USE SKILL `reverse-engineering` (test-automation architecture analysis mode) with the phase-supplied bindings: inputs + defaults = `<input_contract>`; report structure + the test-location decision rule = the `code-analysis-report-template` asset; output path = `plans/aqa-<test-name>-code-analysis.md`. USE SKILL `sensitive-data` to redact any captured source/selector/config values before writing.
3. **Conditional-input else-paths** (anchored here so a phase-only reader sees the behavior when an optional input is absent):
   - If `agents/user-instructions/` is **absent or empty**: record `not available — see Coverage section` in report section 2 and `not available` in section 9; Phase 3 **continues**, does not stop.
   - If a **frontend source path is not discoverable** (no project-config reference, no `RefSrc/<repo>/`): skip frontend analysis, record the gap in section 9 per the coverage epistemic-honesty rule; Phase 3 **continues**.
4. Do not fabricate framework, page objects, or pass/fail data. Honor the read-only scope (`<workflow_context>`).
5. **Post-analysis verification:** confirm the report exists with every section from the `code-analysis-report-template` asset and the test plan's `## Code Analysis` summary is added. If missing/incomplete: re-run once with the same bindings; if still failing, stop Phase 3, record `Phase 3 blocked: code-analysis report not produced/incomplete` in `agents/aqa-state.md`, ask the user.
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
- Input GATE passed (test plan non-empty; project description or authoritative repo doc present; codebase readable)
- All 9 sections of the `code-analysis-report-template` asset present and non-empty (empty optional → `not available — see Coverage section`)
- Framework and standards documented; relevant page objects inventoried; similar tests and patterns documented; reusable utilities identified
- Test location decided as `add-to-existing` or `new-file` with rationale citing the asset's test-location decision rule
- Coverage section (9) lists every optional input as `available` / `not available — <impact>` — no silent omission
- Conflicts and Precedence section populated (conflicts with `repo docs won`, or `None — sources consistent.`)
- Redaction pre-emit gate ran — the `qa-knowledge/references/redaction-scope.md` grep list was executed against the rendered artifact before writing (fail-closed)
- No source files modified outside the report and the test plan's `## Code Analysis` summary (read-only scope)
- Report written to `plans/aqa-<test-name>-code-analysis.md` (`<test-name>` per `qa-structure` `aqa-layout`), non-empty; test plan summary added
</validation_checklist>

</aqa_flow_code_analysis>
