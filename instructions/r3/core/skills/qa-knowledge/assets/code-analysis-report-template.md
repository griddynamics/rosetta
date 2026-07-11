# UI-QA code-analysis report template

UI-QA code-analysis report skeleton (9 sections) plus the test-location decision rule.

<code-analysis-report-template>

`plans/ui-qa-<test-name>/code-analysis.md` -- non-empty, this **9-section structure** (every section present; empty optional → `not available -- see Coverage section`). Structure (framework names, file paths, selector attribute names, schema/field names) stays verbatim; redact sensitive **values** only, via `sensitive-data`.

```markdown
# Code Analysis -- <test-name>

**Generated:** <YYYY-MM-DD>
**Test plan:** plans/ui-qa-<test-name>/test-plan.md
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
(or `not available -- see Coverage section`)

## 3. Frontend Analysis
(test-ids / selectors / component hierarchy, or `not available -- see Coverage section`)

## 4. Page Object Inventory
| File | Page/Component | Selectors | Relevant to this test | Action |
|---|---|---|---|---|
| ... | ... | ... | yes/no | reuse / extend / new |

## 5. Similar Tests and Patterns
- ...

## 6. Test Location Decision
- **Decision:** add-to-existing | new-file · **Path:** tests/... · **Rationale:** (cite the test-location decision rule below)

## 7. Reusable Utilities
- ...

## 8. Conflicts and Precedence
- (every conflict with authoritative repo docs; resolution: repo docs won. If none: `None -- sources consistent.`)

## 9. Coverage and Confidence
- Each optional input listed `available` or `not available -- <downstream impact>`. Silent omission forbidden -- downstream phases misread missing-data as no-issues.
```

**How to apply Test-location decision rule**:
- **Add to existing file** if (a) the feature is a direct extension of an existing test class/describe, AND (b) the file stays under ~400 lines after addition.
- **Create new file** if (a) it's a new area, OR (b) the file would exceed ~400 lines, OR (c) the existing setup/teardown shape doesn't fit.

Worked pair -- *add-to-existing*: `tests/checkout/payment.spec.ts` is 280 lines (credit-card); new `wallet-payment` is same area + same cart/checkout setup, resulting ~370 lines → add. *New-file*: same file at 380 lines, new `refund` flow has its own existing-order precondition and would push past 400 → new file `tests/checkout/refund.spec.ts`.

</code-analysis-report-template>
