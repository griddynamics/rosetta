---
name: aqa-codebase-analysis
description: Analyze test automation project architecture — framework, page objects, similar tests, utilities, user instructions — to inform test implementation decisions. Produces a structured code-analysis report at the path the calling workflow expects.
tags: []
baseSchema: docs/schemas/skill.md
---

<aqa-codebase-analysis>

<role>Test automation architecture analyst</role>

<when_to_use_skill>
Understand existing test project structure, patterns, and reusable components before implementing new tests. Produces a code-analysis report consumed by downstream phases (page-object work, test authoring).
</when_to_use_skill>

<prerequisites>
- Test plan exists at the path supplied by the calling workflow (default: `agents/plans/aqa-<test-name>.md`)
- Project description discoverable at `project_description.md` (or the path the calling workflow supplies)
- Test automation codebase is readable
</prerequisites>

<input_contract>

The calling workflow supplies paths. Defaults this skill recognizes when paths are not provided:

| Input | Default path | Required content |
|---|---|---|
| Test plan | `agents/plans/aqa-<test-name>.md` | Test name + clarified assertions; resolves `<test-name>` per the workflow's naming convention |
| Project description | `project_description.md` (repo root or workflow-supplied) | Framework, language, project structure, coding standards |
| Optional repo docs | `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md` | Architecture, conventions — read when present |
| Optional user instructions | `agents/user-instructions/` | Test creation guidelines, custom matchers, style preferences |
| Optional frontend source | repo-specific (e.g. `RefSrc/<repo-name>/`) | Component files for selector discovery |
| Output destination | `agents/plans/aqa-<test-name>-code-analysis.md` | This skill writes the report here unless the calling workflow specifies otherwise |

Existence + readability validation runs as process step 1 GATE.

**Path precedence on conflict.** When this skill's extracted standards (from `project_description.md`, user instructions) conflict with the authoritative repo docs (`CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`), **repo docs win**. Record the conflict in the report's `## Conflicts and Precedence` subsection — do not silently overwrite either side.

</input_contract>

<process>

## 1. Validate Inputs (GATE)

Before any analysis:

- **Test plan exists and is non-empty** at the workflow-supplied path. If missing/empty: stop, report `aqa-codebase-analysis: test plan missing/empty at <path>`.
- **Project description exists OR an authoritative repo doc** (`CONTEXT.md` / `ARCHITECTURE.md` / `IMPLEMENTATION.md`) exists at the repo root. If none: stop, report `aqa-codebase-analysis: no project description or architecture doc found — cannot determine framework/structure`.
- **Codebase root is readable** (at least the test directory is enumerable). If unreadable: stop, report the IO error to the calling workflow. Do NOT fabricate analysis from an unreadable codebase.
- **Resolve `<test-name>`** from the test plan filename per the workflow's naming convention. This value drives the output report's path.

## 2. Read Project Description

Read `project_description.md` (and any repo docs supplied by the calling workflow) and extract:
- Test framework (Playwright, Selenium, Cypress, etc.)
- Language (Python, TypeScript, Java, etc.)
- Project structure (test dirs, page object dirs, utility dirs)
- Coding standards (naming, formatting, imports, comments)
- Test patterns (AAA, Given-When-Then, setup/teardown)
- Dependencies

If multiple sources name the same field with different values, repo docs win — record the conflict in the report.

## 3. Read Common User Instructions

If `agents/user-instructions/` exists, read all files and extract:
- Test creation guidelines
- Code style preferences
- Assertion patterns and custom matchers
- Setup/teardown requirements
- Naming conventions
- Error handling patterns

Categorize: **Must Follow** | **Should Follow** | **Nice to Have**.

If directory is missing or empty: record `User instructions: not available` in the report's coverage block (epistemic-honesty rule, step 7).

## 4. Analyze Frontend Source Code (if available)

If a frontend source path is supplied by the workflow or discoverable in the repo:
- Search components for the feature under test
- Identify `data-testid`, `data-test`, `test-id` attributes
- Note component hierarchy and props
- Document API calls and data models
- Record available test identifiers

If absent: record `Frontend source: not available` in the report's coverage block.

## 5. Identify Existing Page Objects

Search codebase for page object files using globs (adjust to project language conventions):
- `**/pages/**`, `**/page-objects/**`, `**/*Page.*`, `**/*page.*`

For each match record:
- What page/component each represents
- Available selectors and methods
- Naming and organization patterns
- Which are relevant to this test
- Which need extension vs creation

## 6. Search for Similar Tests + Decide Location

Find tests covering similar features and record:
- Test structure patterns used
- Import and utility patterns
- Assertion styles
- File organization

**Test location decision rule:**
- **Add to existing file** if (a) feature under test is a direct extension of an existing test class/describe, AND (b) the existing file would remain under ~400 lines after addition
- **Create new file** if (a) feature is a new area, OR (b) existing file would exceed ~400 lines, OR (c) existing file's structure does not fit the new test's setup/teardown shape

**Worked example.** Existing file `tests/checkout/payment.spec.ts` is 280 lines and covers credit-card flows. New test under analysis is `tests/checkout/wallet-payment` (Apple Pay / Google Pay). Decision: **add to existing file** — same feature area (payment), same setup needed (cart + checkout navigation), resulting file ~370 lines (still under threshold). Recorded in the report's **Test Location** section with this rationale.

Counter-example. Existing file `tests/checkout/payment.spec.ts` is 380 lines. New test under analysis is `tests/checkout/refund`. Decision: **new file** `tests/checkout/refund.spec.ts` — adding would push past 400 lines, and refund flow has its own setup (existing-order precondition) distinct from payment setup.

## 7. Identify Reusable Utilities

Search utility dirs (`**/utils/**`, `**/helpers/**`, `**/lib/**`, `**/fixtures/**`):
- Setup helpers (login, navigation, data creation)
- Assertion utilities (custom matchers, wait helpers)
- Data generators
- Configuration utilities

## 8. Write Code Analysis Report

Write the report to **`agents/plans/aqa-<test-name>-code-analysis.md`** (resolving `<test-name>` per step 1) — or to the path the calling workflow specified.

Use this structure:

```markdown
# Code Analysis — <test-name>

**Generated:** <YYYY-MM-DD>
**Test plan:** agents/plans/aqa-<test-name>.md
**Sources:**
- project_description.md: [read | missing]
- CONTEXT.md / ARCHITECTURE.md / IMPLEMENTATION.md: [list of read | missing]
- agents/user-instructions/: [N files read | not available]
- Frontend source: [path | not available]

## 1. Framework and Standards
- **Framework:** Playwright | Selenium | Cypress | ...
- **Language:** ...
- **Project structure:** ...
- **Coding standards:** ...
- **Test patterns:** ...

## 2. User Instructions (categorized)
**Must Follow:** ...
**Should Follow:** ...
**Nice to Have:** ...
(or `not available — see Coverage section`)

## 3. Frontend Analysis
(or `not available — see Coverage section`)

## 4. Page Object Inventory
| File | Page/Component | Selectors | Relevant to this test | Action |
|---|---|---|---|---|
| ... | ... | ... | yes/no | reuse / extend / new |

## 5. Similar Tests and Patterns
- ...

## 6. Test Location Decision
- **Decision:** add-to-existing | new-file
- **Path:** tests/...
- **Rationale:** (cite the rule from step 6)

## 7. Reusable Utilities
- ...

## 8. Conflicts and Precedence
- (List every place this skill's extracted standards conflicted with authoritative repo docs. Resolution: repo docs won. If none: `None — sources consistent.`)

## 9. Coverage and Confidence
- **Project description:** [read | missing — low confidence on framework/structure]
- **User instructions:** [N files | not available — style guidance unverified]
- **Frontend source:** [available | not available — test identifiers may need page-source capture]
- **Optional inputs absent:** list each with the downstream-impact note
```

Then update the test plan's `## Code Analysis` section with a one-paragraph summary that links to the full report — do NOT duplicate the report contents into the test plan.

</process>

<output_format>

The skill's deliverables:

**On-disk:**
- New file: `agents/plans/aqa-<test-name>-code-analysis.md` (full report; structure per step 8)
- Modified file: `agents/plans/aqa-<test-name>.md` — one-paragraph `## Code Analysis` summary linking to the report

**Hand-off summary** returned to the calling workflow:

```markdown
## aqa-codebase-analysis deliverable
- Report path: agents/plans/aqa-<test-name>-code-analysis.md
- Framework detected: <name>
- Page objects: <count existing> / <count to extend> / <count new>
- Test location decision: add-to-existing | new-file at <path>
- Optional inputs missing: <list or "None">
- Conflicts recorded: <count or "None">
```

</output_format>

<safety_boundaries>

This skill is **analysis-only**. The only files it writes are the code-analysis report and the test plan's `## Code Analysis` summary subsection. It does **not**:

- Edit page objects, test files, source under analysis, or any other codebase content
- Create new test files, fixtures, or utilities (those belong to later phases)
- Modify `project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`, or user-instructions files
- Run tests, lint, or build commands

If a finding implies code work is needed, surface it in the report's relevant section (e.g., "Page object X needs extension") and stop. The calling workflow owns follow-up actions.

</safety_boundaries>

<failure_handling>

- **Test plan missing / empty** at the workflow-supplied path: stop, report to calling workflow, do not analyze.
- **`project_description.md` missing AND no `CONTEXT.md` / `ARCHITECTURE.md` / `IMPLEMENTATION.md`:** stop, report `cannot determine framework/structure from any authoritative source`. Do not infer framework from incidental file extensions.
- **Codebase root unreadable:** stop with the IO error path.
- **Test plan exists but no `<test-name>` resolvable** (filename does not match the workflow's naming convention): stop, ask the calling workflow to supply the test name explicitly.
- **Partial reads** (e.g., one repo doc parses, another is corrupt): proceed with the readable sources, record the unreadable ones in the Coverage section, mark affected findings with a `Partial source: <what was missing>` note.
- **Optional inputs absent** (no `agents/user-instructions/`, no frontend source): proceed; record `not available` in the Coverage section and lower confidence on the dependent findings per step 7's epistemic-honesty rule.
- **Output path already exists** with content: do NOT silently overwrite. Append a `<!-- regenerated YYYY-MM-DD -->` marker and replace the report; surface the regeneration in the hand-off summary so the calling workflow can decide whether the prior report's state mattered.

</failure_handling>

<validation_checklist>

Run before declaring complete. All items must hold:

- **Report file written** at `agents/plans/aqa-<test-name>-code-analysis.md` (or workflow-supplied path) and is non-empty.
- **Test plan summary added.** The test plan now contains a `## Code Analysis` section linking to the report.
- **All 9 report sections populated** per step 8 — Framework, User Instructions, Frontend, Page Objects, Similar Tests, Test Location, Utilities, Conflicts, Coverage. No section blank or `TBD`.
- **Test location decision is one of `add-to-existing` or `new-file`** with explicit rationale citing the rule from step 6.
- **Coverage section enumerates every optional input** with `available` or `not available — <impact>` — no silent omission.
- **Conflicts subsection populated** — either lists conflicts with `repo docs won` resolution, or explicit `None — sources consistent.`
- **No source files were modified** outside the report and the test plan summary (safety boundary).
- **Hand-off summary emitted** per `<output_format>` with all fields populated.

</validation_checklist>

<pitfalls>
- Writing analysis into the test plan instead of the dedicated report file — the calling workflow validates the report path, not the test plan
- Skipping project description / architecture docs — leads to pattern inconsistency
- Inferring framework from file extensions when no authoritative doc names it — fabrication
- Ignoring user-instructions files when present
- Creating new page objects when existing ones can be extended
- Not searching for similar tests — misses established patterns
- Assuming project structure without verification
- Silently omitting absent optional inputs from the Coverage section — downstream phases misread missing-data as no-issues
- Overwriting an existing report without surfacing the regeneration
- Modifying source files during "analysis" — the only writes are the report and the test plan's summary subsection
</pitfalls>

</aqa-codebase-analysis>
