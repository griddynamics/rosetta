---
name: aqa-clarification-templates
description: AQA Phase 2 templates — gap entry, clarification questions message, and the test-plan clarification section (typed Explicit Assertions).
---

<aqa-clarification-templates>

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

`### Explicit Assertions` is **mandatory** — Phase 6 validates that every assertion is implemented OR listed in Uncovered. Carry every `Derived assertion` from the gap entries into the typed list; zero derived assertions → emit the None-clause, never omit the section. Add this section to `plans/aqa-<test-name>.md`:

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

Each assertion carries a **type** (Presence / State / Content / Behavioral) and a **subject** (UI element or system observable). One bullet per assertion; do NOT collapse multiple assertions into one line. Phase 2 writes **only** typed bullets here (no status field); the `### Uncovered Assertions` section is owned and written by Phase 6 — Phase 2 never pre-marks status.

- **Presence:** [element/observable] is [present | absent | visible | hidden] after [trigger condition].
- **State:** [element] is [enabled | disabled | selected | unselected | loading | settled] after [trigger].
- **Content:** [element] displays/contains [exact value or pattern] after [trigger].
- **Behavioral:** [action] produces [observable result] within [timing constraint, if any].
- (If step 2.1 derived zero assertions: `None — no observable behavior derivable from current clarifications; Phase 6 will surface this as Uncovered`.)
```

**Filled-in worked example** (the exact-vs-contains specificity distinction is the most error-prone field for this type):

```markdown
- **Content:** `#login-toast` displays exact text `"Login successful"` (not `contains "successful"`) after clicking the **Sign In** button.
- **Content:** `#error-banner` contains substring `"network"` (case-insensitive) after a request timeout (do NOT assert exact text — the upstream service formats the rest of the message).
```

Apply the same shape (typed prefix → subject → exact-or-contains qualifier → trigger) to every assertion.

</aqa-clarification-templates>
