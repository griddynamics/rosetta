# Test Implementation Template — aqa-test-authoring

Loaded on demand from `SKILL.md` `<output_format>` when step 4 (validate and record) is appending the `## Test Implementation` section to the test plan. The base `SKILL.md` keeps the process orchestration, GATE, precedence rules, safety boundaries, failure handling, validation checklist, and pitfalls; this file holds only the verbatim template.

---

## `## Test Implementation` section — appended to the test plan

```markdown
## Test Implementation

### Test File
- Location: [path]
- Type: New file / Added to existing
- Test Name: [descriptive name]

### Implementation Summary
- Assertions implemented: [count]
- Assertions uncovered: [count]  (see Uncovered Assertions below)
- Page Objects Used: [list]
- Utilities Used: [list]

### Uncovered Assertions
- [Assertion text from plan] — reason: [missing page-object method | no UI signal | precondition unestablishable | other]
- (If none: `None — every assertion from the plan was implemented.`)

### Conflicts and Precedence
- [Where user-instruction guidance conflicted with repo docs; resolution: repo docs won; description of the override]
- (If none: `None — sources consistent.`)

### Validation
- [x] All assertions from plan implemented OR recorded in Uncovered Assertions
- [x] Page objects used correctly (no direct-selector bypass)
- [x] Project standards followed (repo docs win per `<input_contract>`)
- [x] Linting passed
- [x] No app source or page-object files were modified (safety boundary)
- [x] Ready for execution
```

Required subsections in this order: **Test File**, **Implementation Summary**, **Uncovered Assertions**, **Conflicts and Precedence**, **Validation**. Empty sections use the explicit `None — <reason>` line shown in the template — never left blank.

---

## Step 1.0 GATE — Existence + Scope Validation (referenced from SKILL.md `<input_contract>` step 1)

Loaded on demand at SKILL.md step 1. All must hold; on any failure stop and report which prerequisite is missing per `<failure_handling>`.

- **Test plan** exists and is non-empty at the workflow-supplied path (default: `agents/plans/aqa-<test-name>.md`).
- **Selector inventory complete:** the plan's selector management Implementation subsection lists page-object paths AND those page-object files actually exist with the selectors/methods Part A's inventory names. If any selector/method is missing, apply `<failure_handling>` "required selector/method missing".
- **Assertions list non-empty + concrete:** each entry is mappable to a test action (not "verifies behavior" with no acceptance criteria). If unmappable, apply `<failure_handling>` "unimplementable assertion".
- **`<test-name>` slug** resolves per `aqa-flow-code-analysis.md` `<naming_convention>`.

---

## Conflict Precedence Rank (referenced from SKILL.md `<input_contract>`)

Single source of truth for repo-docs-win precedence. SKILL.md `<safety_boundaries>` / `<failure_handling>` / `<validation_checklist>` / `<pitfalls>` reference this rank by name; do not restate it inline.

1. **Repo docs** — `project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`. **Win on every conflict** (the canonical "repo docs win" rule).
2. **User instructions** — `agents/user-instructions/`. Apply on top of repo docs only where repo docs are silent; **never override repo docs**.
3. **This skill's authoring patterns** — apply only where 1 and 2 are silent.
4. **Test plan's recorded decisions** (test location, file mapping, similar-test patterns) — informational; if they conflict with repo docs, repo docs win and the conflict is recorded in step 4's `### Conflicts and Precedence` section.

When a conflict between user instructions and repo docs is detected, follow repo docs and record the override in the implementation notes — do not silently apply either.
