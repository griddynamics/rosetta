---
name: ui-qa-clarification-templates
description: UI-QA Phase 2 templates — gap entry, clarification questions message, and the test-plan clarification section (typed Explicit Assertions).
---

<ui-qa-clarification-templates>

**Completeness dimensions** (the gap-entry `Dimension` field): **D1** steps clarity · **D2** result measurability · **D3** test data · **D4** edge cases · **D5** success criteria. (Full catalog is owned by the `requirements-use` gap_analysis mode; this gloss anchors the template so it is self-contained.)

**Prerequisite + inputs:** the test plan at `plans/ui-qa-<test-name>.md` must be populated (Test Steps + Expected Overall Result) before these templates apply. If the plan is absent or a dimension cannot be evaluated, STOP and report to the caller before creating gap entries.

**Router:** use only the section your current step needs — **Gap entry** (record a gap), **Clarification questions message** (the user-facing ask), or **Test-plan clarification section** (write results back to the plan).

**Done when:** all gap entries are written + prioritized, the clarification message has been sent, user responses are documented in the plan, and `### Explicit Assertions` is populated. After populating Explicit Assertions, verify each gap entry's `Derived assertion` appears in the list (one-to-one — no silent drop).

## Gap entry

Each gap is recorded as one entry; if all five dimensions are satisfied, emit the single line `No gaps identified — all five completeness dimensions (D1–D5) satisfied by the Phase 1 plan.`

```markdown
### G-N: [Brief gap title]
- **Dimension:** D1 | D2 | D3 | D4 | D5
- **Priority:** Critical (blocks test design) | Should (impairs quality) | Optional
- **Confidence:** High (clearly a gap) | Low (borderline — flag for prioritization)
- **Context:** [What is unclear/missing; cite section/step number when possible]
- **Derived assertion (if applicable):** [Concrete measurable form, e.g. `response.statusCode == 200` or `page.title == "Order Confirmed"`. Blank if none derivable from the plan as written.]
```

Specificity expectation for the downstream question (exact-text-vs-contains, timing budget, single-decision-per-question) is owned by the questioning step — e.g. *"After Logout, assert exact text `'Success!'` OR that the message **contains** `'Success'` (case-insensitive)? Acceptable wait window — 2s, 5s, or match existing similar tests?"* Vague *"is the user logged out?"* questions are forbidden.

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

`### Explicit Assertions` is **mandatory** — every assertion listed here MUST be implemented OR recorded as Uncovered in the implementation record (no silent drops). Carry every `Derived assertion` from the gap entries into the typed list; zero derived assertions → emit the None-clause, never omit the section. Add this section to `plans/ui-qa-<test-name>.md`:

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
- [Each declined or unanswered question — `declined by user — <reason>` or `unanswered (Edge/Optional)` — citing the question. If none: `None — all questions answered.`]

### Explicit Assertions (mandatory — transcribed from step 2.1 gap analysis)

Each assertion carries a **type** (Presence / State / Content / Behavioral) and a **subject** (UI element or system observable). One bullet per assertion; do NOT collapse multiple assertions into one line. This clarification step writes **only** typed bullets here (no status field); the `### Uncovered Assertions` section is owned and written by the downstream implementation step — this step never pre-marks status.

- **Presence:** [element/observable] is [present | absent | visible | hidden] after [trigger condition].
- **State:** [element] is [enabled | disabled | selected | unselected | loading | settled] after [trigger].
- **Content:** [element] displays/contains [exact value or pattern] after [trigger].
- **Behavioral:** [action] produces [observable result] within [timing constraint, if any].
- (If the gap analysis derived zero assertions: `None — no observable behavior derivable from current clarifications; the implementation step will surface this as Uncovered`.)
```

**Filled-in worked example** (the exact-vs-contains specificity distinction is the most error-prone field for this type):

```markdown
- **Content:** `#login-toast` displays exact text `"Login successful"` (not `contains "successful"`) after clicking the **Sign In** button.
- **Content:** `#error-banner` contains substring `"network"` (case-insensitive) after a request timeout (do NOT assert exact text — the upstream service formats the rest of the message).
```

Apply the same shape (typed prefix → subject → exact-or-contains qualifier → trigger) to every assertion.

</ui-qa-clarification-templates>
