# Populated Output Example — repository-implementation-standards

Loaded on demand from SKILL.md `<output_format>` at process step 6 (when actually writing the `## Repository Standards Alignment` section into the parent-supplied phase artifact). The base SKILL.md keeps the blank template inline (decision-time content for what subsections to emit); this file holds the **filled-in worked example** the agent uses for shape-and-grounding questions at write time.

Same lazy-loading pattern `qa-project-config/references/templates.md` and `mcp-testrail-data-collection/references/redaction.md` already use.

---

## Populated example — Playwright project

The example below shows the four required subsections filled in for a Playwright TypeScript project with a Docs-vs-code conflict resolution. Use it when authoring the first alignment record of a new project or when a subsection-shape question arises during write.

```markdown
## Repository Standards Alignment

### Docs read
- project_description.md: ./project_description.md
- CONTEXT.md: not present
- ARCHITECTURE.md: ./ARCHITECTURE.md
- IMPLEMENTATION.md: not present
- Substitute standards: N/A

### Rules extracted
- **Test layout:** Playwright specs under `tests/e2e/<feature>/<scenario>.spec.ts`; page objects under `tests/pages/`.
- **Naming:** `kebab-case.spec.ts` for tests; `PascalCase` for page-object classes.
- **Fixtures / helpers / page objects:** `tests/fixtures/auth.ts` for token acquisition; reuse `BasePage` from `tests/pages/base.page.ts` for navigation.
- **Auth / session handling:** Bearer token from env var `E2E_AUTH_TOKEN`; helper `AuthHelper.adminToken()` for admin tests.
- **Logging:** Playwright's built-in `test.info().annotations` — no custom logger.
- **Lint / format commands:** `npm run lint` (ESLint) + `npm run format` (Prettier).
- **Forbidden patterns:** Not documented — no explicit list.

### Reference example files (closest existing patterns)
- `tests/e2e/checkout/payment.spec.ts` — used as template for: test layout + describe/test structure.
- `tests/pages/checkout.page.ts` — used as template for: page-object shape.
- `tests/fixtures/auth.ts` — used as template for: auth helper.

### Conflicts and resolutions
- `IMPLEMENTATION.md` is absent but `tests/e2e/checkout/payment.spec.ts` uses `test.describe.serial(...)` while `ARCHITECTURE.md` says "tests should be parallelizable" — surfaced to user; user directed: keep `serial` for the new test (matches existing pattern), record as assumption.
```

The same shape transfers to non-Playwright projects (pytest / Jest / JUnit / etc.) — adapt the rule values and file paths to the target framework; keep the four subsections and the `Not documented — <impact>` / `None — <reason>` empty-field convention.
