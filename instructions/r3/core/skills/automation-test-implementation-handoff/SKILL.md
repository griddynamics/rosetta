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
- ACQUIRE `repository-implementation-standards/SKILL.md` FROM KB and USE SKILL `repository-implementation-standards`
- ACQUIRE `coding/SKILL.md` FROM KB and USE SKILL `coding`
- ACQUIRE `testing/SKILL.md` FROM KB and USE SKILL `testing`
- ACQUIRE `coding-agents-prompt-authoring/SKILL.md` FROM KB and USE SKILL `coding-agents-prompt-authoring`
- The **domain test implementation skill** MUST be named by the parent workflow phase (e.g. `aqa-test-authoring`, `qa-test-implementation`). This skill never silently proceeds with only `coding` + `testing` when the parent intended a domain skill — see step 4.

</core_concepts>

<input_contract>

The parent workflow phase file supplies all inputs below. This skill does not infer them — missing values trigger the GATEs in `<process>`.

| Input | Source | Required content |
|---|---|---|
| Approved upstream artifact (spec / plan) | Parent workflow phase file | Path to the spec/plan that was approved by the user upstream (e.g. `agents/plans/aqa-<test-name>.md` for AQA; `agents/qa/{TICKET-KEY}/test-specs.md` for QA). Must exist, be non-empty, and carry an approval signal (state-file row, approval token, or timestamp recorded by the parent's HITL step). |
| Approval signal | Parent workflow (state file row, explicit token, or workflow-defined evidence) | Explicit evidence the upstream artifact is approved. Inferring "looks approved" is forbidden. |
| Domain test implementation skill name | Parent workflow phase file (e.g. `aqa-test-authoring`, `qa-test-implementation`) | Exact KB identifier this skill ACQUIREs at step 4 alongside `coding-agents-prompt-authoring`. Missing → step 4 GATE asks the parent (or ACQUIREs the conventional `<workflow>-test-authoring` / `<workflow>-test-implementation` skill if the parent's KB convention is discoverable); never silently proceed without it. |
| Workflow state file | Parent workflow (e.g. `agents/aqa-state.md`, `agents/qa-state.md`) | Path where step 10 records the state update. |
| Execution command source | Parent workflow OR repo docs (`README.md`, `package.json` scripts, `Makefile`, `CONTRIBUTING.md`) | Used by step 7 to give the user a concrete copy-pasteable command. |

**Pre-check (runs as step 1.0 GATE before step 1):**
- Approved spec/plan exists at the supplied path AND is non-empty. If missing/empty: stop, report `automation-test-implementation-handoff: approved spec/plan missing/empty at <path>` to the parent workflow. Do NOT proceed to implementation.
- Approval signal is present and explicit. If missing/stale: stop, report `automation-test-implementation-handoff: approval signal missing — parent workflow's HITL step must complete before implementation`. Do NOT infer approval.
- Domain test implementation skill name is supplied OR a conventional skill name is discoverable. If neither: stop at step 4 (see process).

</input_contract>

<process>

1. ACQUIRE `repository-implementation-standards/SKILL.md` FROM KB and USE SKILL `repository-implementation-standards` unless the parent workflow state/artifact for this run already records it as completed for the current implementation phase; if that proof is missing, apply it by default.
2. ACQUIRE `coding/SKILL.md` FROM KB and USE SKILL `coding` for implementation work.
3. ACQUIRE `testing/SKILL.md` FROM KB and USE SKILL `testing` for test design constraints (isolation, idempotency, mocking policy) as applicable to this suite type.
4. ACQUIRE `coding-agents-prompt-authoring/SKILL.md` FROM KB and USE SKILL `coding-agents-prompt-authoring`. Also apply the **domain test implementation skill** the parent workflow phase named (e.g. `aqa-test-authoring`, `qa-test-implementation`) per `<input_contract>`.
   - **GATE — domain skill required:** If the parent did NOT name a domain skill AND no conventional name is discoverable from the parent workflow's identifier (e.g. parent `aqa-flow-*` → try `aqa-test-authoring`; parent `qa-flow-*` → try `qa-test-implementation`), STOP. Report `automation-test-implementation-handoff: no domain test implementation skill named by parent and no conventional fallback discoverable` to the parent workflow and ask the user/parent to supply the name. **Do NOT silently proceed with only `coding` + `testing`** — the domain skill carries the workflow-specific authoring patterns (selectors, page objects, ATC traceability, etc.) and skipping it produces weaker tests than intended.
   - If a conventional name is discoverable but the ACQUIRE returns zero documents, follow `<failure_handling>` "zero-doc ACQUIRE on domain skill".
   - Do NOT substitute a different domain skill silently. If the named domain skill cannot be loaded, stop per `<failure_handling>`.
5. Validate: project formatter/linter commands run clean; tests compile or parse; obvious import/path errors fixed. If a lint/compile error is unresolvable, follow `<failure_handling>` "unresolvable lint/compile error" — do NOT proceed to step 6.
6. GATE: enumerate created or changed file paths and primary entry test files.
7. Tell the user implementation is complete; provide the exact command to run tests for this repository (per `<output_format>` "user-facing handoff message" template).
8. **STOP AND WAIT** for the user to execute tests and confirm completion before any execution-analysis phase begins.
9. GATE: do not mark the overall parent workflow COMPLETE in state — only mark this implementation phase complete.
10. Update the workflow state file (path supplied by parent per `<input_contract>`) per `<output_format>` "state-update template".

</process>

<output_format>

Two deliverables: a user-facing handoff message (step 7) and a state-file update (step 10). The parent workflow may override the state-update template; this is the default.

**User-facing handoff message (step 7):**

```markdown
Implementation complete for <phase or feature name>.

**Files created/changed:**
- <path/to/test/file>
- <path/to/helper/file>

**To run the tests:**

```
<exact copy-pasteable command — examples by stack:
- Playwright TS:   npx playwright test tests/checkout/payment.spec.ts
- pytest:          uv run pytest tests/api/users_test.py -v
- Jest:            npm test -- tests/api/users.test.ts
- Java/JUnit+Mvn:  mvn -Dtest=UserEndpointsTest test
- Karate:          mvn test -Dkarate.options="--tags @smoke"
>
```

If the run is flaky on this infra: <one-line note, or "no known flakiness">.

When the run completes, paste the result (report path or pass/fail summary) so the next phase can begin.
```

Do NOT emit a generic framework name only (e.g. just "run Playwright" or "use pytest") — the command MUST be the literal string the user can copy.

**State-update template (step 10):**

```markdown
## <phase name> (Implementation)
- **Status:** Ready for execution
- **Timestamp:** <YYYY-MM-DD HH:MM>
- **Files created:** <count>
- **Files modified:** <count>
- **Paths:**
  - <path/to/test/file>
  - <path/to/helper/file>
- **Utilities added:** <list, or `None`>
- **Domain authoring skill applied:** <skill name>
- **Execution command provided to user:** `<the literal command from the handoff message>`
- **Parent workflow status:** in progress (do NOT mark COMPLETE here — only this phase)
```

</output_format>

<failure_handling>

- **Approved spec/plan missing / empty** (per `<input_contract>` pre-check): stop, report to parent workflow, do not implement.
- **Approval signal missing / stale:** stop, report; do not infer approval from prose.
- **Zero-doc ACQUIRE on a foundational skill** (`repository-implementation-standards`, `coding`, `testing`, `coding-agents-prompt-authoring` at steps 1–4): stop, report `automation-test-implementation-handoff: KB returned zero documents for <skill-name>` to the parent workflow, ask the user to fix Rosetta/KB access. Do NOT proceed without the foundational skill.
- **Zero-doc ACQUIRE on domain skill** (step 4 — parent-named OR conventional fallback): stop, report `automation-test-implementation-handoff: KB returned zero documents for domain skill <name>` and ask the parent to confirm the correct name or fix the KB. Do NOT substitute `coding` alone.
- **Domain skill name not supplied AND no conventional fallback discoverable:** stop at step 4 GATE — ask the parent workflow / user to name the domain skill. Silent fallback to generic `coding` is forbidden.
- **Unresolvable lint / compile error** at step 5 (e.g., a third-party dependency missing, a TS type the agent cannot resolve, an import path that the project layout does not support): record the exact error in the state file, surface it to the user, ask whether to (a) install the missing dependency, (b) accept the imperfection and proceed with a recorded gap, or (c) roll back the change. Do NOT proceed to step 6 with unresolved compile-blocking errors.
- **Repo has no discoverable execution command** (no README script, no `package.json` test script, no Makefile target, no CI config): step 7 asks the user once for the project's run command before STOP-AND-WAIT at step 8. Do NOT emit a generic framework name.
- **User-reported execution result before STOP-AND-WAIT** (user pastes results before being asked): treat as the step 8 completion signal; proceed to the parent's next phase per the parent's instructions. Do NOT re-prompt.

</failure_handling>

<validation_checklist>

- Approved upstream artifact (spec/plan) was referenced during implementation per `<input_contract>` pre-check
- Approval signal was present and explicit, not inferred
- Domain test implementation skill was loaded (parent-named OR conventional fallback) — silent fallback to `coding` only is a validation failure
- Lint/format (or repo equivalent) ran with no unresolved errors on touched files; any unresolved error follows `<failure_handling>` and is recorded
- User received a concrete, copy-pasteable test command — not a generic framework name only (per `<output_format>` handoff template)
- State file updated per `<output_format>` state-update template — fields populated, no `TBD`
- State shows implementation phase complete while parent workflow remains in progress
- Execution was not assumed from partial user messages

</validation_checklist>

<best_practices>

- Keep the first execution command copy-pasteable from repo docs or scripts. Example (Playwright TS, one test file): `npx playwright test tests/checkout/payment.spec.ts`. Example (pytest, with verbose): `uv run pytest tests/api/users_test.py -v`. Always emit the literal command the user can paste.
- If flaky infrastructure is known, say so before the user runs tests
- When the parent names a domain skill, load it BEFORE writing test code so its authoring patterns inform the implementation — not after, as a post-hoc check

</best_practices>

<pitfalls>

- Proceeding to failure triage without user-confirmed test run completion when the workflow requires it
- Marking the whole workflow done because tests "should" pass
- Silently proceeding when the parent did not name a domain skill — load the domain skill or stop at step 4 GATE
- Emitting a generic framework name (e.g. "run Playwright") instead of a copy-pasteable command
- Inferring approval from prose ("looks good") instead of an explicit signal recorded by the parent's HITL step

</pitfalls>

<resources>

- skill `hitl` — wait/approve rules and assumption handling
- skill `repository-implementation-standards` — doc-first alignment
- skill `coding`, skill `testing` — shared implementation and test quality rules
- Parent workflow phase file — approved-artifact path, approval signal, domain skill name, state file path

</resources>

</automation_test_implementation_handoff>
