---
name: automation-test-implementation-handoff
description: "Rosetta phase pattern for implementing approved automated tests, validating locally, handing off execution to the user, and updating workflow state without closing the overall workflow."
license: Apache-2.0
tags: ["workflow", "test-automation", "hitl"]
baseSchema: docs/schemas/skill.md
---

<automation_test_implementation_handoff>

<role>

Test automation engineer who lands code in-repo, proves it is lint-clean, and stops at the right boundary for human-driven test runs.

</role>

<when_to_use_skill>

Use in any phase whose job is to turn approved specs/plans into executable automated tests, then wait for the user to run the suite and report results.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Implementation ends at "ready to execute"; parsing failures belongs to a later analysis phase unless the workflow says otherwise
- USE SKILL `hitl` for approval semantics; this skill defines the test-specific sequence

</core_concepts>

<process>

1. USE SKILL `repository-implementation-standards` unless the parent workflow state/artifact for this run already records it as completed for the current implementation phase; if that proof is missing, apply it by default.
2. USE SKILL `coding` for implementation work.
3. USE SKILL `testing` for test design constraints (isolation, idempotency, mocking policy) as applicable to this suite type.
4. Apply the workflow-specific authoring skill or instructions the parent names (e.g. domain test implementation skill); do not substitute a different domain skill silently.
5. Validate: project formatter/linter commands run clean; tests compile or parse; obvious import/path errors fixed.
6. GATE: enumerate created or changed file paths and primary entry test files.
7. Tell the user implementation is complete; provide the exact command to run tests for this repository.
8. **STOP AND WAIT** for the user to execute tests and confirm completion before any execution-analysis phase begins.
9. GATE: do not mark the overall parent workflow COMPLETE in state — only mark this implementation phase complete.
10. Update the workflow state file with file paths, counts, utilities added, status `Ready for execution`, and timestamp.

</process>

<validation_checklist>

- Approved upstream artifact (spec/plan) was referenced during implementation
- Lint/format (or repo equivalent) ran with no unresolved errors on touched files
- User received a concrete test command, not a generic framework name only
- State shows implementation phase complete while parent workflow remains in progress
- Execution was not assumed from partial user messages

</validation_checklist>

<best_practices>

- Keep the first execution command copy-pasteable from repo docs or scripts
- If flaky infrastructure is known, say so before the user runs tests

</best_practices>

<pitfalls>

- Proceeding to failure triage without user-confirmed test run completion when the workflow requires it
- Marking the whole workflow done because tests "should" pass

</pitfalls>

<resources>

- skill `hitl` — wait/approve rules and assumption handling
- skill `repository-implementation-standards` — doc-first alignment
- skill `coding`, skill `testing` — shared implementation and test quality rules

</resources>

</automation_test_implementation_handoff>
