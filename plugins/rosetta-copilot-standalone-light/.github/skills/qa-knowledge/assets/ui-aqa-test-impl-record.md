# UI-AQA test-implementation record

UI-AQA Test Implementation record -- appended to the test plan after authoring.

<ui-aqa-test-impl-record>

**Append to** `plans/ui-aqa-<test-name>/test-plan.md` -- the test-plan file (same `<test-name>` slug used throughout the UI-AQA run).

**Inputs required:** the test plan's Explicit Assertions, the test file path, the page objects used, and any user-instruction-vs-repo-doc conflicts encountered.

**Constraints:** five subsections, ordered; empty → `None -- <reason>`, never blank; repo docs win on conflict; no plan assertion silently dropped (implement OR list under Uncovered Assertions). **Done when** all five carry a real value or `None -- …` and the Validation checklist is fully checked.

Template -- fill each subsection:

```markdown
### Test File
- Location: <path>
- New vs existing: <new | extended existing>
- Test name: <name>

### Implementation Summary
- Assertions implemented: <n> / <total>
- Assertions uncovered: <n> (see Uncovered Assertions)
- Page objects used: <list>
- Utilities used: <list, or None>

### Uncovered Assertions
- "<assertion>" -- reason: <…>
- (or `None -- every plan assertion implemented`)

### Conflicts and Precedence
- <user-instruction vs repo-doc conflict> → resolved in favor of repo docs: <what was applied>
- (or `None -- sources consistent`)

### Validation
- [ ] All plan assertions implemented or recorded as Uncovered
- [ ] No assertion silently dropped
- [ ] Page objects used (no raw-selector bypass)
- [ ] Conflicts and Precedence documented or marked None
- [ ] Test file path and name verified correct
- [ ] Lint / format clean on the touched test file
```

**Worked examples** (one line per subsection):

- **Test File:** `tests/e2e/checkout/refund.spec.ts` · extended existing · `refund-happy-path`
- **Implementation Summary:** 7/9 implemented · 2 uncovered · page objects `CheckoutPage, RefundPage` · utilities `None`
- **Uncovered Assertions:** "Confirmation email received after checkout" -- reason: no mail-inbox fixture in scope; the missing page-object method was escalated to the selector-implementation step for resolution.
- **Conflicts and Precedence:** user asked for `data-cy` selectors but `docs/ARCHITECTURE.md` mandates `data-testid` → applied `data-testid` (repo docs win).
- **Validation:** all boxes checked after the local lint + assertion-coverage pass.

</ui-aqa-test-impl-record>
