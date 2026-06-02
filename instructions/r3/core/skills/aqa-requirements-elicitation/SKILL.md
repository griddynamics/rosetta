---
name: aqa-requirements-elicitation
description: Identify and structure gaps, ambiguities, and missing measurable assertions in an AQA test plan so the parent phase can ask the user clarifying questions. Analysis-only; does not generate user-facing questions or modify the plan beyond appending a gap-analysis section.
tags: ["aqa", "skill"]
baseSchema: docs/schemas/skill.md
---

<aqa-requirements-elicitation>

<role>AQA test requirements gap analyst</role>

<when_to_use_skill>
Use during AQA Phase 2 (Requirements Clarification) to systematically identify what is missing, ambiguous, or unmeasurable in the Phase 1 test plan, and produce a structured gaps artifact that the parent phase's questioning step consumes.

**Scope:** gap identification and structuring only. **Do NOT** generate user-facing questions, call `AskUserQuestion`, modify the test plan beyond appending the gap-analysis section, or fabricate requirements — those are the parent phase's responsibility (`<ask_questions step="2.2">` uses the `questioning` skill).
</when_to_use_skill>

<prerequisites>
- Phase 1 (Data Collection) complete
- Test plan file `agents/plans/aqa-<test-name>.md` exists and is non-empty
- `<test-name>` slug resolved per `aqa-flow-code-analysis.md` `<naming_convention>` (parsed from Phase 1 plan filename or read from `agents/aqa-state.md`)
</prerequisites>

<input_contract>
- **Required input file:** `agents/plans/aqa-<test-name>.md` (the Phase 1 test plan)
- **Required sections** in input: at minimum a Test Steps section, an Expected Result section, and a Preconditions section
- **`<test-name>` derivation:** same slug used by Phase 1; if unresolved, stop per `<failure_handling>`
- **Existence + non-empty check** runs as process step 1 before any analysis begins
</input_contract>

<process>

1. **Validate input.** Verify `agents/plans/aqa-<test-name>.md` exists and is non-empty. If missing or empty: stop per `<failure_handling>`.

2. **Evaluate each completeness dimension** — all five MUST be assessed before step 3 can begin (this is the self-validation gate):
   - **D1 — Steps clarity:** are test steps clear and unambiguous (concrete actor, action, target)?
   - **D2 — Result measurability:** are expected results specific and measurable (concrete observable values, not "works correctly" / "as expected")?
   - **D3 — Test data:** is test data defined (values, sources, lifecycle)?
   - **D4 — Edge cases:** are edge cases identified (boundary values, error paths, concurrency, empty/null inputs)?
   - **D5 — Success criteria:** are success criteria explicit (pass/fail thresholds, completion signals)?

3. **Produce the structured gaps artifact.** For each gap / ambiguity / missing assertion found in step 2, record an entry tagged with:
   - **Dimension:** D1, D2, D3, D4, or D5
   - **Priority:** `Critical` (blocks test design), `Should` (impairs test quality), `Optional` (nice-to-have)
   - **Confidence:** `High` (clearly a gap) or `Low` (borderline — possibly resolvable by re-reading the plan; flag for parent-phase prioritization)
   - **Context:** what is unclear/missing, with file/line reference if possible
   - **Derived assertion (if applicable):** when a gap can be expressed as a concrete measurable assertion (e.g., `response.statusCode == 200`, `page.title == "Order Confirmed"`), record the assertion in the same entry. Otherwise leave blank — **do not fabricate**.

4. **No-gaps branch.** If all five dimensions evaluate to zero gaps, emit a single entry: `No gaps identified — all five completeness dimensions (D1–D5) satisfied by the Phase 1 plan.` This is a valid output; do NOT pad with manufactured gaps to look thorough.

5. **Write the artifact.** Append a `## Gap Analysis` section to `agents/plans/aqa-<test-name>.md` using the `<output_format>` template. The append is the only write this skill performs; the rest of the plan body is read-only.

6. **Handoff.** The structured gaps artifact is the input to the parent phase's `<ask_questions step="2.2">` step (which uses the `questioning` skill). This skill does NOT generate user-facing questions itself.

</process>

<output_format>

The structured gaps list is appended to `agents/plans/aqa-<test-name>.md` under a new `## Gap Analysis` section (added once; on re-run, replace the prior section in-place, do not stack duplicates). Per-entry template:

````markdown
## Gap Analysis

[For each gap, one entry. If no gaps found, emit a single "No gaps identified — all five completeness dimensions (D1–D5) satisfied by the Phase 1 plan." line and skip the entry template.]

### G-N: [Brief gap title]
- **Dimension:** D1 | D2 | D3 | D4 | D5
- **Priority:** Critical | Should | Optional
- **Confidence:** High | Low
- **Context:** [What is unclear/missing in the plan; cite section/step number when possible]
- **Derived assertion (if applicable):** [Concrete measurable form, e.g., `response.statusCode == 200` or `page.title == "Order Confirmed"`. Leave blank if no measurable form is derivable from the plan as written.]
````

**Worked example** (one gap entry from a hypothetical login-flow plan, showing both the gap content + a concrete sample question for downstream `questioning`-style use):

````markdown
### G-1: Logout step omits observable post-condition
- **Dimension:** D2
- **Priority:** Should
- **Confidence:** High
- **Context:** Phase 1 plan step 4 says "user clicks Logout" with no expected post-condition. The test cannot verify success.
- **Sample question for the clarification phase** (illustrates **specificity expectation** — exact-vs-contains, timing, single-decision-per-question): *"After Logout, should the test assert exact text `'Success!'` is visible, OR just verify the success message **contains** `'Success'` (case-insensitive)? And what is the acceptable wait window — 2s, 5s, or whatever the existing similar tests use?"* — this kind of specificity (exact-match vs contains + timing budget) is what step 2.2 of `aqa-flow-requirements-clarification` aims for; vague *"is the user logged out?"* questions surface lower-quality answers and are forbidden by the `questioning` skill's rules.
- **Derived assertion:** After Logout click, page URL ends with `/login` AND `text("Welcome back")` is visible within 2s. (This is the typed Behavioral assertion form step 2.4 of the clarification phase transcribes verbatim into the test plan's `### Explicit Assertions` subsection.)
````

</output_format>

<validation_checklist>

Before declaring this skill complete, all of the following must hold:

- All five completeness dimensions (D1–D5) were explicitly evaluated; the assessment is recorded for each (either as a gap entry or as part of the "all five dimensions satisfied" no-gaps line)
- Every recorded gap is tagged with **Dimension + Priority + Confidence** — no partial tagging
- Every gap that can be expressed as a measurable assertion has the assertion recorded in the same entry; gaps without derivable assertions have the field left blank rather than padded
- Borderline ambiguities are tagged `Confidence: Low` so the parent phase's questioning step can prioritize them
- The `## Gap Analysis` section was appended (or, on re-run, replaced in-place) — no duplicate sections, no unrelated edits to the plan body
- No user-facing questions were generated by this skill, and no calls to `AskUserQuestion` were made — that is the parent phase's job

</validation_checklist>

<failure_handling>

- **Missing test plan file** (`agents/plans/aqa-<test-name>.md` does not exist): stop, report `aqa-requirements-elicitation: required input missing — agents/plans/aqa-<test-name>.md` to the parent phase, do not proceed.
- **Empty test plan file:** treat as missing — stop and report as above.
- **`<test-name>` unresolved or ambiguous:** stop, ask the parent phase to resolve the slug per `aqa-flow-code-analysis.md` `<naming_convention>`, do not guess.
- **Plan exists but lacks required sections** (no Test Steps / Expected Result / Preconditions): record this as a single `G-N` entry under Dimension D1 with `Priority: Critical, Confidence: High`, then proceed with whatever partial analysis the remaining content supports.
- **Plan content unreadable** (binary / corrupted / parse error): stop, report the read error, do not proceed.

</failure_handling>

<safety_boundaries>

This skill is **analysis-only**:

- Do NOT modify the test plan body. The only allowed write is appending (or in-place replacing on re-run) the `## Gap Analysis` section.
- Do NOT fabricate requirements, invent measurable values, or paraphrase the plan into requirements that weren't there. If a gap has no derivable assertion, leave the assertion field blank.
- Do NOT generate user-facing questions, call `AskUserQuestion`, or otherwise solicit user input — the parent phase's `<ask_questions step="2.2">` (with the `questioning` skill) owns that.
- Do NOT decide whether a gap should be resolved by the user vs. deferred. Record the gap with priority/confidence and let the parent phase route it.
- Do NOT skip dimensions because the happy path looks clean. All five must be evaluated.

</safety_boundaries>

<pitfalls>

- Treating a vague step as "complete" because it's plausible — explicitness requires concrete values, not vibes.
- Skipping D4 (edge cases) because the happy path is well-documented — happy-path clarity does not imply edge-case coverage.
- Inventing measurable assertions to look thorough — only record assertions clearly derivable from the plan. Otherwise leave the assertion field blank and mark the gap.
- Generating questions for the user inside this skill — scope violation; route through the parent phase.
- Tagging every gap as `Confidence: High` to avoid the Low label — Low is a signal to the parent phase, not a failure mode.

</pitfalls>

</aqa-requirements-elicitation>
