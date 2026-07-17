---
name: ui-aqa-flow-code-analysis
description: "Phase 3 Code Analysis of ui-aqa-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<ui_aqa_flow_code_analysis>

<description_and_purpose>
Understand existing test architecture, identify reusable components, and determine where new test should be integrated.
</description_and_purpose>

<workflow_context>
- Phase 3 of 8 in `ui-aqa-flow`
- Input: test plan with assertions and clarifications
- Output artifact path (single SSoT — referenced by other sections): `plans/ui-aqa-<test-name>/code-analysis.md` (resolve `<test-name>` per `qa-structure`'s UI layout slug rules)
- Prerequisite: Phases 1 and 2 complete
- Read-only scope (single SSoT — referenced by other sections as "the read-only scope"): read project description, configured project context, page objects, similar tests, utilities; produce the report + a one-paragraph `## Code Analysis` summary in the test plan. NO edits to page objects, test files, source under analysis, `project_description.md`, `gain.json`, or repo docs; NO running tests/lint/build. A finding that implies code work is surfaced in the report, not acted on.
- Required skills: `qa-knowledge` (`code_analysis` mode), `reverse-engineering` (test-automation architecture analysis), `sensitive-data` (redaction), `qa-structure` (slug + report path)
</workflow_context>

<input_contract>
The phase supplies these paths to the skill; defaults apply when not configured:

| Input | Default path | Required content |
|---|---|---|
| Test plan | `plans/ui-aqa-<test-name>/test-plan.md` | Test name + clarified assertions |
| Project setup | repository-root `gain.json` | SDLC configuration + any file-location overrides |
| Project description | `project_description.md` (repo root) | Framework, language, structure, coding standards — read when present |
| Project context | configured paths; canonical `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `agents/IMPLEMENTATION.md` | Architecture and conventions — read when present |
| Optional user instructions | `agents/user-instructions/` | Test guidelines, custom matchers, style |
| Optional frontend source | repo-specific (e.g. `RefSrc/<repo>/`) | Component files for selector / test-id discovery |
| Output | `plans/ui-aqa-<test-name>/code-analysis.md` | The report (this phase's contract, below) |

**Input GATE.** Before analysis: test plan exists and is non-empty; `project_description.md`, `gain.json`, or one authoritative project-context file exists; codebase root is readable. Resolve file locations from `gain.json`, falling back to the canonical paths above. Any miss → stop Phase 3, record the gap in `ui-aqa-state.md`, ask the user. Do NOT infer framework from incidental file extensions.

**Path/content precedence.** `gain.json` wins for file locations. For engineering conventions, authoritative repo docs win over `project_description.md`, user-instruction files, and examples; record conflicts in `## Conflicts and Precedence`.
</input_contract>

<code_analysis_report_contract>
`plans/ui-aqa-<test-name>/code-analysis.md` is **tracked + downstream-fed** — PUBLIC by default. USE SKILL `sensitive-data`: scan the rendered artifact BEFORE writing, **fail-closed** (no scan → no emit). The report's 9-section structure and the test-location decision rule are `qa-knowledge`'s code-analysis report template — every section present (empty optional section says `not available — see Coverage section`).

After writing the report, update the test plan's `## Code Analysis` section with a one-paragraph summary linking to it — do NOT duplicate report contents into the plan.
</code_analysis_report_contract>

<phase_steps>
1. Execute codebase analysis (reads project description + resolved project context, page objects, similar tests)
2. Validate findings
3. Update state
</phase_steps>

<execute_analysis step="3.1" subagent="discoverer" role="Test architecture analyst">
1. USE SKILL `qa-structure` to resolve run paths. Run the `<input_contract>` Input GATE.
2. USE SKILL `reverse-engineering` and USE SKILL `qa-knowledge` (`code_analysis` mode — test-automation architecture analysis) with the phase-supplied bindings: inputs + defaults = `<input_contract>`; report structure + test-location rule = the skill's code-analysis report template; output path = `plans/ui-aqa-<test-name>/code-analysis.md`. USE SKILL `sensitive-data` before writing.
3. **Conditional-input else-paths:**
   - If `agents/user-instructions/` is **absent or empty**: record `not available — see Coverage section` in report section 2 and `not available` in section 9; Phase 3 **continues**, does not stop.
   - If a **frontend source path is not discoverable** (no `gain.json`/configured source reference, no `RefSrc/<repo>/`): skip frontend analysis, record the gap in section 9 per the coverage epistemic-honesty rule; Phase 3 **continues**.
4. Do not fabricate framework, page objects, or pass/fail data. Honor the read-only scope (`<workflow_context>`).
5. **Post-analysis verification:** confirm the report exists with every section from the code-analysis report template and the test plan's `## Code Analysis` summary is added. If missing/incomplete: re-run once with the same bindings; if still failing, stop Phase 3, record `Phase 3 blocked: code-analysis report not produced/incomplete` in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, ask the user.
</execute_analysis>

<validate_findings step="3.2">
1. Confirm `project_description.md` (when present), `gain.json`, and available configured project-context files read
2. Confirm user instructions extracted (if directory exists)
3. Confirm page objects inventoried
4. Confirm test location decided
</validate_findings>

<update_state step="3.3">
1. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`:
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
- Input GATE passed (test plan non-empty; `project_description.md`, `gain.json`, or authoritative project-context file present; codebase readable)
- All 9 sections of the code-analysis report template present and non-empty (empty optional → `not available — see Coverage section`)
- Framework and standards documented; relevant page objects inventoried; similar tests and patterns documented; reusable utilities identified
- Test location decided as `add-to-existing` or `new-file` with rationale citing the template's test-location decision rule
- Coverage section (9) lists every optional input as `available` / `not available — <impact>` — no silent omission
- Conflicts and Precedence section populated (conflicts with `repo docs won`, or `None — sources consistent.`)
- Redaction pre-emit gate ran — the `sensitive-data` scan was executed against the rendered artifact before writing (fail-closed)
- No source files modified outside the report and the test plan's `## Code Analysis` summary (read-only scope)
- Report written to `plans/ui-aqa-<test-name>/code-analysis.md` (`<test-name>` per `qa-structure`), non-empty; test plan summary added
</validation_checklist>

</ui_aqa_flow_code_analysis>
