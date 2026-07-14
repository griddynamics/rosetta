# UI-AQA clarification templates

UI-AQA requirements-clarification templates -- gap entry, clarification questions message, and the test-plan clarification section (typed Explicit Assertions).

<ui-aqa-clarification-templates>

**Completeness dimensions** (gap-entry `Dimension` field): **D1** steps clarity · **D2** result measurability · **D3** test data · **D4** edge cases · **D5** success criteria. (Full catalog: the `<gap_analysis>` mode's test-plan variant -- READ SKILL FILE `references/gap-analysis-catalogs.md`.)

**Prerequisite:** the plan `plans/ui-aqa-<test-name>/test-plan.md` must have Test Steps + Expected Overall Result before these templates apply. If it is absent or a dimension cannot be evaluated, STOP and report.

**Router:** use only the section your step needs: **Gap entry** (record a gap), **Clarification questions message** (user-facing ask), **Test-plan clarification section** (write results back).

**Done when:** all gap entries written + prioritized, clarification message sent, user responses documented in the plan, `### Explicit Assertions` populated. Verify each gap entry's `Derived assertion` appears there (one-to-one, no silent drop).

## Gap entry

Each gap is recorded as one entry; if all five dimensions are satisfied, emit the single line `No gaps identified -- all five completeness dimensions (D1–D5) satisfied by the test plan.`

```markdown
### G-N: [Brief gap title]
- **Dimension:** D1 | D2 | D3 | D4 | D5
- **Priority:** Critical (blocks test design) | Should (impairs quality) | Optional
- **Confidence:** High (clearly a gap) | Low (borderline -- flag for prioritization)
- **Context:** [What is unclear/missing; cite section/step number when possible]
- **Derived assertion (if applicable):** [Concrete measurable form, e.g. `response.statusCode == 200` or `page.title == "Order Confirmed"`. Blank if none derivable from the plan as written.]
```

Specificity expectation for the downstream question (exact-text-vs-contains, timing budget, single-decision-per-question) is owned by the questioning step -- e.g. *"After Logout, assert exact text `'Success!'` OR that the message **contains** `'Success'` (case-insensitive)? Acceptable wait window -- 2s, 5s, or match existing similar tests?"* Vague *"is the user logged out?"* questions are forbidden.

## Clarification questions message

```
I need clarification on the following to ensure accurate test implementation:

## Critical Questions (Must Answer)
1. [Question]
2. [Question]
...

## Edge Cases (Should Answer)
1. [Question]
2. [Question]
...

## Optional Details (Nice to Have)
1. [Question]
2. [Question]
...

Please provide answers so I can proceed with test implementation.
```

## Test-plan clarification section

`### Explicit Assertions` is **mandatory**: each listed assertion MUST be implemented OR recorded as Uncovered downstream (no silent drops). Carry every gap-entry `Derived assertion` into the typed list; zero derived → emit the None-clause, never omit the section. Add to `plans/ui-aqa-<test-name>/test-plan.md`:

```markdown
## Phase 2: Requirements Clarification

### Questions Asked
[List of questions]

### User Responses
[Documented answers]

### Edge Cases to Cover
- [Edge case 1]
- [Edge case 2]
...

### Test Data Requirements
- [Data requirement 1]
- [Data requirement 2]
...

### Open Questions
- [Each declined or unanswered question -- `declined by user -- <reason>` or `unanswered (Edge/Optional)` -- citing the question. If none: `None -- all questions answered.`]

### Explicit Assertions (mandatory -- transcribed from step 2.1 gap analysis)

Each assertion carries a **type** (Presence / State / Content / Behavioral) and a **subject** (UI element or system observable). One bullet per assertion; never collapse. Write **only** typed bullets here (no status field); `### Uncovered Assertions` is owned by the downstream implementation step -- never pre-mark status.

- **Presence:** [element/observable] is [present | absent | visible | hidden] after [trigger condition].
- **State:** [element] is [enabled | disabled | selected | unselected | loading | settled] after [trigger].
- **Content:** [element] displays/contains [exact value or pattern] after [trigger].
- **Behavioral:** [action] produces [observable result] within [timing constraint, if any].
- (If the gap analysis derived zero assertions: `None -- no observable behavior derivable from current clarifications; the implementation step will surface this as Uncovered`.)
```

**Worked example** (exact-vs-contains is the most error-prone field here):

```markdown
- **Content:** `#login-toast` displays exact text `"Login successful"` (not `contains "successful"`) after clicking the **Sign In** button.
- **Content:** `#error-banner` contains substring `"network"` (case-insensitive) after a request timeout (do NOT assert exact text -- the upstream service formats the rest of the message).
```

Apply the same shape (typed prefix → subject → exact-or-contains qualifier → trigger) to every assertion.

</ui-aqa-clarification-templates>
