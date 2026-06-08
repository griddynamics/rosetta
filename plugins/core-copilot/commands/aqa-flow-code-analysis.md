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
- Output artifact path (single SSoT — referenced by other sections): `agents/plans/aqa-<test-name>-code-analysis.md` (resolve `<test-name>` per `<naming_convention>`)
- Prerequisite: Phases 1 and 2 complete
- Read-only scope (single SSoT — referenced by other sections as "the read-only scope"): read project description, page objects, similar tests, utilities; produce the report + a one-paragraph `## Code Analysis` summary in the test plan. NO edits to page objects, test files, source under analysis, `project_description.md`, or repo docs; NO running tests/lint/build. A finding that implies code work is surfaced in the report, not acted on.
</workflow_context>

<recommended_skills>
- `reverse-engineering` (test-automation architecture analysis mode) — performs the read-only architecture analysis below: framework/standards, page-object inventory, similar tests, reusable utilities, and the test-location decision.
- `sensitive-data` — redaction authority for any captured source/selectors/config values before they are written to the report.
</recommended_skills>

<input_contract>
The phase supplies these paths to the skill; defaults apply when not configured:

| Input | Default path | Required content |
|---|---|---|
| Test plan | `agents/plans/aqa-<test-name>.md` | Test name + clarified assertions |
| Project description | `project_description.md` (repo root) | Framework, language, structure, coding standards |
| Optional repo docs | `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md` | Architecture, conventions — read when present |
| Optional user instructions | `agents/user-instructions/` | Test guidelines, custom matchers, style |
| Optional frontend source | repo-specific (e.g. `refsrc/<repo>/`) | Component files for selector / test-id discovery |
| Output | `agents/plans/aqa-<test-name>-code-analysis.md` | The report (this phase's contract, below) |

**Input GATE.** Before analysis: test plan exists and is non-empty; project description OR one authoritative repo doc (`CONTEXT.md`/`ARCHITECTURE.md`/`IMPLEMENTATION.md`) exists; codebase root is readable. Any miss → stop Phase 3, record the gap in `agents/aqa-state.md`, ask the user. Do NOT infer framework from incidental file extensions.

**Path precedence on conflict.** When extracted standards (from `project_description.md`, user instructions) conflict with authoritative repo docs, **repo docs win** — record the conflict in the report's `## Conflicts and Precedence` section; never silently overwrite either side.
</input_contract>

<code_analysis_report_contract>
`aqa-<test-name>-code-analysis.md` is **tracked + downstream-fed** (consumed by page-object and test-authoring phases) — treat as **PUBLIC by default**; redact captured values via `sensitive-data` BEFORE writing, not after. Structural content (framework names, file paths, selector attribute names, schema/field names) stays verbatim; redaction targets sensitive **values** only.

The report MUST be non-empty and use this **9-section structure** (every section present; empty optional section says `not available — see Coverage section`):

```markdown
# Code Analysis — <test-name>

**Generated:** <YYYY-MM-DD>
**Test plan:** agents/plans/aqa-<test-name>.md
**Sources:**
- project_description.md: [read | missing]
- CONTEXT.md / ARCHITECTURE.md / IMPLEMENTATION.md: [list read | missing]
- agents/user-instructions/: [N files read | not available]
- Frontend source: [path | not available]

## 1. Framework and Standards
- **Framework:** Playwright | Selenium | Cypress | ...
- **Language:** ... · **Project structure:** ... · **Coding standards:** ... · **Test patterns:** ...

## 2. User Instructions (categorized)
**Must Follow:** ... · **Should Follow:** ... · **Nice to Have:** ...
(or `not available — see Coverage section`)

## 3. Frontend Analysis
(test-ids / selectors / component hierarchy, or `not available — see Coverage section`)

## 4. Page Object Inventory
| File | Page/Component | Selectors | Relevant to this test | Action |
|---|---|---|---|---|
| ... | ... | ... | yes/no | reuse / extend / new |

## 5. Similar Tests and Patterns
- ...

## 6. Test Location Decision
- **Decision:** add-to-existing | new-file · **Path:** tests/... · **Rationale:** (cite the rule below)

## 7. Reusable Utilities
- ...

## 8. Conflicts and Precedence
- (every conflict with authoritative repo docs; resolution: repo docs won. If none: `None — sources consistent.`)

## 9. Coverage and Confidence
- Each optional input listed `available` or `not available — <downstream impact>`. Silent omission forbidden — downstream phases misread missing-data as no-issues.
```

**Test-location decision rule** (the phase owns this; the skill applies it):
- **Add to existing file** if (a) the feature is a direct extension of an existing test class/describe, AND (b) the file stays under ~400 lines after addition.
- **Create new file** if (a) it's a new area, OR (b) the file would exceed ~400 lines, OR (c) the existing setup/teardown shape doesn't fit.

Worked pair — *add-to-existing*: `tests/checkout/payment.spec.ts` is 280 lines (credit-card); new `wallet-payment` is same area + same cart/checkout setup, resulting ~370 lines → add. *New-file*: same file at 380 lines, new `refund` flow has its own existing-order precondition and would push past 400 → new file `tests/checkout/refund.spec.ts`.

After writing the report, update the test plan's `## Code Analysis` section with a one-paragraph summary linking to it — do NOT duplicate report contents into the plan. This is the **phase contract**, verified by `<validation_checklist>` independent of skill internals.
</code_analysis_report_contract>

<naming_convention>
**Slug format:** lowercase ASCII kebab-case — letters, digits, hyphens only; no spaces or paths. **Max length 80 characters.** **Reserved names rejected:** `state`, `index`, `aqa-state` (collide with existing agent state files); if the user supplies one, treat as a non-conforming slug per `<plan_path_guards>`.

**`<test-name>` slug:** parse from Phase 1 plan filename `agents/plans/aqa-<test-name>.md` (segment after `aqa-` and before `.md`). If missing or ambiguous, read `agents/aqa-state.md` or ask the user once for the canonical slug before writing Phase 3 outputs.

**User-supplied slug:** must match the slug format above. If the user refuses, gives a non-conforming slug, or ambiguity persists after one attempt, stop Phase 3 per `<plan_path_guards>`.

**Priority if sources disagree:** when the Phase 1 plan file exists, its filename slug is **authoritative**. If `agents/aqa-state.md` disagrees, prefer the plan filename, record the mismatch in `agents/aqa-state.md`, then continue. If the plan file is missing, use `agents/aqa-state.md` or the user's answer.

**Worked example:** `agents/plans/aqa-login-happy-path.md` → `<test-name>` = `login-happy-path` → report `agents/plans/aqa-login-happy-path-code-analysis.md`.
</naming_convention>

<plan_path_guards>
If the Phase 1 plan path is still missing after resolving `<test-name>`, or `<test-name>` cannot be resolved to a valid slug per `<naming_convention>` (including after a user attempt): stop Phase 3, record the gap in `agents/aqa-state.md`, and ask the user to restore or re-run Phase 1 before continuing.

**Disclosure requirement:** if `<test-name>` is resolved with any caveat (slug mismatch between Phase 1 plan filename and `agents/aqa-state.md`, ambiguity resolved via fallback, user override of a malformed slug), surface this in the Phase 3 user-facing summary before continuing — name the chosen slug, the rejected alternative, and the source that won the tie-break.
</plan_path_guards>

<phase_steps>
1. Execute codebase analysis (reads project description, page objects, similar tests)
2. Validate findings
3. Update state
</phase_steps>

<execute_analysis step="3.1" subagent="discoverer" role="Test architecture analyst">
1. Run the `<input_contract>` Input GATE. On any miss: stop per `<plan_path_guards>` / `<input_contract>`.
2. USE SKILL `reverse-engineering` (test-automation architecture analysis mode) with the phase-supplied bindings: inputs + defaults = `<input_contract>`; report structure, output path, and the test-location decision rule = `<code_analysis_report_contract>`; output path = `agents/plans/aqa-<test-name>-code-analysis.md`. USE SKILL `sensitive-data` to redact any captured source/selector/config values before writing.
3. **Conditional-input else-paths** (anchored here so a phase-only reader sees the behavior when an optional input is absent):
   - If `agents/user-instructions/` is **absent or empty**: record `not available — see Coverage section` in report section 2 and `not available` in section 9; Phase 3 **continues**, does not stop.
   - If a **frontend source path is not discoverable** (no project-config reference, no `refsrc/<repo>/`): skip frontend analysis, record the gap in section 9 per the coverage epistemic-honesty rule; Phase 3 **continues**.
4. Do not fabricate framework, page objects, or pass/fail data. Honor the read-only scope (`<workflow_context>`).
5. **Post-analysis verification:** confirm the report exists with every `<code_analysis_report_contract>` section and the test plan's `## Code Analysis` summary is added. If missing/incomplete: re-run once with the same bindings; if still failing, stop Phase 3, record `Phase 3 blocked: code-analysis report not produced/incomplete` in `agents/aqa-state.md`, ask the user.
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
- All 9 `<code_analysis_report_contract>` sections present and non-empty (empty optional → `not available — see Coverage section`)
- Framework and standards documented; relevant page objects inventoried; similar tests and patterns documented; reusable utilities identified
- Test location decided as `add-to-existing` or `new-file` with rationale citing the `<code_analysis_report_contract>` rule
- Coverage section (9) lists every optional input as `available` / `not available — <impact>` — no silent omission
- Conflicts and Precedence section populated (conflicts with `repo docs won`, or `None — sources consistent.`)
- Redaction scan ran via `sensitive-data` before writing
- No source files modified outside the report and the test plan's `## Code Analysis` summary (read-only scope)
- Report written to `agents/plans/aqa-<test-name>-code-analysis.md` (`<test-name>` per `<naming_convention>`), non-empty; test plan summary added
</validation_checklist>

</aqa_flow_code_analysis>
