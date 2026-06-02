# Code Analysis Report Template + Test-Location Examples — aqa-codebase-analysis

Loaded on demand from `SKILL.md`:

- **Step 6** loads this file to consult the **worked example + counter-example pair** for the test-location decision rule.
- **Step 8** loads this file to consult the **full 9-section report template** when writing `agents/plans/aqa-<test-name>-code-analysis.md`.

The base `SKILL.md` keeps the 8 process steps, the step-1 GATE, the `<input_contract>`, `<output_format>`, `<safety_boundaries>`, `<failure_handling>`, `<validation_checklist>`, and `<pitfalls>`. The heavier illustrative material (the report template + the worked example pair) lives here so the resident-prompt cost in `SKILL.md` shrinks while the contracts remain available when authoring.

---

## Test-Location Decision — Worked Example Pair (referenced from SKILL step 6)

The two examples below illustrate the test-location rule:

- **Add to existing file** if (a) feature under test is a direct extension of an existing test class/describe, AND (b) the existing file would remain under ~400 lines after addition
- **Create new file** if (a) feature is a new area, OR (b) existing file would exceed ~400 lines, OR (c) existing file's structure does not fit the new test's setup/teardown shape

### ✅ Worked example (add-to-existing)

Existing file `tests/checkout/payment.spec.ts` is 280 lines and covers credit-card flows. New test under analysis is `tests/checkout/wallet-payment` (Apple Pay / Google Pay). **Decision: add to existing file** — same feature area (payment), same setup needed (cart + checkout navigation), resulting file ~370 lines (still under threshold). Recorded in the report's **Test Location** section with this rationale.

### ❌ Counter-example (new file)

Existing file `tests/checkout/payment.spec.ts` is 380 lines. New test under analysis is `tests/checkout/refund`. **Decision: new file** `tests/checkout/refund.spec.ts` — adding would push past 400 lines, AND refund flow has its own setup (existing-order precondition) distinct from payment setup.

---

## Code Analysis Report Template (referenced from SKILL step 8)

Write the report to `agents/plans/aqa-<test-name>-code-analysis.md` (or the path the calling workflow specified) using this 9-section structure verbatim:

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

After writing the full report, update the test plan's `## Code Analysis` section with a one-paragraph summary that links to the full report — do **not** duplicate the report contents into the test plan.
