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
- **This skill does NOT drive skill loading.** Per the Rosetta isolation model, the calling workflow is responsible for recommending + loading the foundational skills this skill applies discipline from. See `<recommended_foundational_skills>` below — this skill only **verifies presence** at the relevant gates and applies the discipline; it does NOT itself ACQUIRE/USE other skills.
- The **domain test implementation skill** is required and MUST be named by the parent workflow phase (e.g. `aqa-test-authoring`, `qa-test-implementation`). Canonical "domain-skill-required + no-silent-fallback" rule lives in **step 2 GATE**.

</core_concepts>

<recommended_foundational_skills>

The calling workflow is expected to have already recommended + loaded these foundational skills before invoking this skill — see `<core_concepts>` for the verify-don't-load contract. Each is the canonical source for one slice of discipline this skill applies.

| Skill | Discipline this skill applies | Verified at | If not loaded |
|---|---|---|---|
| `repository-implementation-standards` | Doc-first alignment with `project_description.md` / `CONTEXT.md` / `ARCHITECTURE.md` / `IMPLEMENTATION.md` | Step 1 | Apply `<failure_handling>` "foundational skill not loaded" |
| `coding` | General implementation patterns + project style | Step 1 | Same |
| `testing` | Test design constraints (isolation, idempotency, mocking policy) | Step 1 | Same |
| **Domain test implementation skill** (parent-named, e.g. `aqa-test-authoring` / `qa-test-implementation`) | Workflow-specific authoring patterns (selectors, page objects, ATC traceability) | Step 2 GATE | Stop per step 2 GATE |
| `hitl` | Wait/approve semantics for the STOP-AND-WAIT at step 6 | Step 6 | Apply `<failure_handling>` "foundational skill not loaded" |

</recommended_foundational_skills>

<input_contract>

The parent workflow phase file supplies all inputs below. This skill does not infer them — missing values trigger the GATEs in `<process>`.

| Input | Source | Required content |
|---|---|---|
| Approved upstream artifact (spec / plan) | Parent workflow phase file | Path to the spec/plan that was approved by the user upstream (e.g. `agents/plans/aqa-<test-name>.md` for AQA; `agents/qa/{TICKET-KEY}/test-specs.md` for QA). Must exist, be non-empty, and carry an approval signal (state-file row, approval token, or timestamp recorded by the parent's HITL step). |
| Approval signal | Parent workflow (state file row, explicit token, or workflow-defined evidence) | Explicit evidence the upstream artifact is approved. Inferring "looks approved" is forbidden. |
| Domain test implementation skill name | Parent workflow phase file (e.g. `aqa-test-authoring`, `qa-test-implementation`) | Exact KB identifier the calling workflow MUST have loaded (per `<recommended_foundational_skills>`); step 2 GATE verifies presence. Missing → step 2 GATE governs. |
| Workflow state file | Parent workflow (e.g. `agents/aqa-state.md`, `agents/qa-state.md`) | Path where step 8 records the state update. |
| Execution command source | Parent workflow OR repo docs (`README.md`, `package.json` scripts, `Makefile`, `CONTRIBUTING.md`) | Used by step 5 to give the user a concrete copy-pasteable command. |

**Pre-check (runs as step 1.0 GATE before step 1):**
- Approved spec/plan exists at the supplied path AND is non-empty. If missing/empty: stop, report `automation-test-implementation-handoff: approved spec/plan missing/empty at <path>` to the parent workflow. Do NOT proceed to implementation.
- Approval signal is present and explicit. If missing/stale: stop, report `automation-test-implementation-handoff: approval signal missing — parent workflow's HITL step must complete before implementation`. Do NOT infer approval.
- Domain test implementation skill name is supplied OR a conventional skill name is discoverable. If neither: stop at step 2 (see process).

</input_contract>

<process>

1. **Verify foundational skills loaded** per the `<recommended_foundational_skills>` table — `repository-implementation-standards` (doc-first alignment), `coding` (implementation patterns), `testing` (isolation / idempotency / mocking policy). The table's `Verified at` + `If not loaded` columns carry per-skill detail; any absent → `<failure_handling>` "foundational skill not loaded". Apply each loaded skill's discipline as the implementation pass proceeds.

2. **Verify the parent-named domain test implementation skill is loaded** (per `<recommended_foundational_skills>` + `<input_contract>`; e.g. `aqa-test-authoring`, `qa-test-implementation`) and apply its workflow-specific authoring patterns.

   - **GATE — domain skill required (canonical).** If the parent did NOT name a domain skill AND no conventional name is discoverable from the parent workflow's identifier (e.g. parent `aqa-flow-*` → try `aqa-test-authoring`; parent `qa-flow-*` → try `qa-test-implementation`), STOP. Report `automation-test-implementation-handoff: no domain test implementation skill named by parent and no conventional fallback discoverable` to the parent workflow and ask the user/parent to supply the name. **Silent fallback to `coding` + `testing` alone is forbidden** — the domain skill carries the workflow-specific authoring patterns (selectors, page objects, ATC traceability, etc.) and skipping it produces weaker tests than intended.
   - If a conventional name was named but the skill is not loaded in context, follow `<failure_handling>` "domain skill named but not loaded".
   - Do NOT substitute a different domain skill silently. If the named domain skill cannot be loaded by the parent, stop per `<failure_handling>`.

3. **Validate the authored test code statically** — project formatter/linter commands run clean; tests **compile or parse** as source code (TS/Java/etc. type-check OK; Python/Ruby/etc. import + AST-parse OK); obvious import/path errors fixed. **Scope clarification:** this is a **static** check on the **authored test code** — distinct from the execution-report parsing that the later analysis phase owns per `<core_concepts>` "parsing failures belongs to a later analysis phase". If a lint/compile error is unresolvable, follow `<failure_handling>` "unresolvable lint/compile error" — do NOT proceed to step 4.

4. GATE: enumerate created or changed file paths and primary entry test files.

5. Tell the user implementation is complete; provide the exact command to run tests for this repository (per the user-facing handoff message template — see `<output_format>`).

6. **STOP AND WAIT** for the user to execute tests and confirm completion before any execution-analysis phase begins.

7. GATE: do not mark the overall parent workflow COMPLETE in state — only mark this implementation phase complete.

8. Update the workflow state file (path supplied by parent per `<input_contract>`) per the state-update template — see `<output_format>`.

</process>

<output_format>

Two deliverables: a user-facing handoff message (step 5) and a state-file update (step 8). **Verbatim templates + per-stack command examples** live in [references/templates.md](references/templates.md) — load on demand at step 5 / step 8 when actually emitting.

**Operational rule (always-loaded):** the test-execution command MUST be the literal copy-pasteable string for the project's stack — **never** a generic framework name (e.g. just "run Playwright" or "use pytest"). The per-stack examples in the references file are the canonical shape catalog.

</output_format>

<failure_handling>

- **Approved spec/plan missing / empty** (per `<input_contract>` pre-check): stop, report to parent workflow, do not implement.
- **Approval signal missing / stale:** stop, report; do not infer approval from prose.
- **Foundational skill not loaded** (`repository-implementation-standards`, `coding`, `testing`, or `hitl` is not present in context at the verifying step's gate): stop, report `automation-test-implementation-handoff: foundational skill <name> not loaded by calling workflow — see <recommended_foundational_skills>` to the parent workflow, ask the parent / user to recommend + load it. Do NOT load it from this skill.
- **Domain skill named but not loaded** (step 2 — parent named the domain skill OR a conventional fallback name was discoverable, but the skill is not present in context): stop, report `automation-test-implementation-handoff: domain skill <name> named but not loaded by calling workflow` and ask the parent per **step 2 GATE**. Do NOT load it from this skill.
- **Domain skill name not supplied AND no conventional fallback discoverable:** stop at **step 2 GATE**.
- **Unresolvable lint / compile error** at step 3 (e.g., a third-party dependency missing, a TS type the agent cannot resolve, an import path that the project layout does not support): record the exact error in the state file, surface it to the user, ask whether to (a) install the missing dependency, (b) accept the imperfection and proceed with a recorded gap, or (c) roll back the change. Do NOT proceed to step 4 with unresolved compile-blocking errors.
- **Repo has no discoverable execution command** (no README script, no `package.json` test script, no Makefile target, no CI config): step 5 asks the user once for the project's run command before STOP-AND-WAIT at step 6. Do NOT emit a generic framework name.
- **User-reported execution result before STOP-AND-WAIT** (user pastes results before being asked): treat as the step 6 completion signal; proceed to the parent's next phase per the parent's instructions. Do NOT re-prompt.

</failure_handling>

<validation_checklist>

Outcomes verified after step 5 (gate-preconditions like spec/approval/domain-skill presence are enforced earlier by `<process>` GATEs and not re-checked here):

- Lint/format (or repo equivalent) ran with no unresolved errors on touched files; any unresolved error follows `<failure_handling>` and is recorded
- User received a concrete, copy-pasteable test command — not a generic framework name only (per `<output_format>` handoff template)
- State file updated per `<output_format>` state-update template — fields populated, no `TBD`
- State shows implementation phase complete while parent workflow remains in progress
- Execution was not assumed from partial user messages

</validation_checklist>

<best_practices>

- Keep the first execution command copy-pasteable from repo docs or scripts. Example (Playwright TS, one test file): `npx playwright test tests/checkout/payment.spec.ts`. Example (pytest, with verbose): `uv run pytest tests/api/users_test.py -v`. Always emit the literal command the user can paste.
- If flaky infrastructure is known, say so before the user runs tests
- When the parent names a domain skill, the calling workflow should have it loaded BEFORE this skill writes test code so the domain skill's authoring patterns inform the implementation — not as a post-hoc check

</best_practices>

<resources>

- skill `hitl` — wait/approve rules and assumption handling
- skill `repository-implementation-standards` — doc-first alignment
- skill `coding`, skill `testing` — shared implementation and test quality rules
- Parent workflow phase file — approved-artifact path, approval signal, domain skill name, state file path

</resources>

</automation_test_implementation_handoff>
