---
name: automation-test-execution-analysis
description: "Rosetta phase pattern for obtaining test execution output, running Part-A style failure triage with debugging, and recording categorized root causes before correction work."
license: Apache-2.0
tags: ["workflow", "test-automation", "debugging"]
baseSchema: docs/schemas/skill.md
---

<automation_test_execution_analysis>

<role>

Test failure analyst who turns raw logs into structured, actionable findings for a follow-up correction phase.

</role>

<when_to_use_skill>

Use after automated tests were executed and the workflow needs execution evidence interpreted (logs, reports, CI artifacts), before proposing code changes.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Part A = analysis only; do not apply fixes in this skill unless the parent workflow explicitly merges phases
- Parent workflow names the domain analysis skill (e.g. `*-test-debugging` Part A); this skill orchestrates around it

</core_concepts>

<process>

1. Resolve report location: user message, workflow default path, or `agents/user-instructions/` per parent workflow.
2. GATE: if no report is available, ask once with a concrete file path or paste format; **WAIT** for user input.
3. USE SKILL `debugging` while interpreting failures.
4. USE the parent-specified domain analysis skill; execute only **Part A** (report analysis) when that skill defines A/B parts.
5. Categorize each failure: environment, data, product regression, test bug, flakiness, infra timeout, auth/session, selector/locator (UI flows), contract mismatch (API flows), unknown.
6. For each category, tie to evidence: log lines, stack snippets, or request/response identifiers — distinguish verified facts from hypotheses.
7. Produce or update the parent workflow's analysis artifact (path and template from phase file).
8. Update workflow state with counts, root-cause summary list, report path, and phase completion timestamp.
9. GATE: confirm recommendations are actionable for a correction phase (owner file, suspected fix type).

</process>

<validation_checklist>

- Execution input was actually read, not summarized from memory
- Every listed failure maps to evidence or is explicitly marked unknown with next data to collect
- Part B / code changes were not started unless the parent workflow authorizes combined phases
- State and analysis artifact both reflect the same run identifier or timestamp
- User was informed how to proceed (e.g. correction phase) per parent workflow

</validation_checklist>

<best_practices>

- Prefer stable identifiers (test case name, node id, request id) over page numbers in PDFs
- When multiple failures share one root cause, collapse them to reduce noise

</best_practices>

<pitfalls>

- Treating green CI from a different branch or stale run as current
- Confusing application bugs with outdated tests without evidence

</pitfalls>

<resources>

- skill `debugging` — systematic triage
- skill `hitl` — when user must supply missing logs or approve scope
- Parent workflow phase file — output path and domain skill name

</resources>

</automation_test_execution_analysis>
