---
name: requirements-use
description: "Consume approved requirements to drive planning, implementation, and validation with explicit traceability and mandatory HITL for ambiguity or tradeoffs. Use when implementing from approved requirements, planning work from requirement IDs, or auditing requirement-to-delivery traceability."
license: Proprietary
disable-model-invocation: false
user-invocable: true
argument-hint: request, requirements-set?, target-scope?, constraints?, delivery-goal?
context: default
agent: requirements-engineer, requirements-reviewer
metadata:
  version: "1.0"
  category: "requirements-engineering"
tags:
  - requirements-use
  - requirements-traceability
  - requirements
  - skills
---

<requirements-use>

<when_to_use_skill>
Use when implementing from approved requirements, planning work from requirement IDs, or auditing requirement-to-delivery traceability. Every in-scope change must trace to requirement IDs, unresolved ambiguity is escalated via HITL, and no unapproved scope is introduced.
</when_to_use_skill>

<dependencies>

- Approved requirements as source of truth
- CONTEXT, ARCHITECTURE, IMPLEMENTATION docs
- If requirements are missing or unclear, use questions flow

</dependencies>

<workflow>

1. **Validate intake** — confirm requirements source; check all in-scope IDs have Approved status (Draft requires explicit user decision; Deprecated must not drive work)
2. **Map requirements to tasks** — link each in-scope requirement ID to planned tasks and tests
3. **Detect issues** — find ambiguities, conflicting shall clauses, missing acceptance criteria, unclear actors, non-measurable thresholds, hidden assumptions → escalate via HITL with options and tradeoffs
4. **Execute with continuous traceability** — update coverage matrix continuously (do not batch); map each result to acceptance criteria
5. **Report gaps** — list coverage gaps and over-implementation risks before proposing fixes
6. **Run validation rubric** — execute validation checklist before claiming completion
7. **HITL: final coverage approval** — get explicit user sign-off on requirement coverage

</workflow>

<core_concepts>

Boundaries:

- Treat approved requirements as contract — do not rewrite silently, do not invent missing requirements
- No side effects without HITL; no scope without requirement ID
- Modal interpretation: shall (mandatory), should (preferred), may (optional)
- Report untraceable work explicitly; request approval for any reinterpretation

Output artifacts:

- Scope capture: intent, in-scope IDs, assumptions, constraints, risks, HITL plan
- Traceability matrix: requirement IDs → tasks, tests, and evidence (forward and backward links)
- Validation pack: coverage, conflicts, gaps, and acceptance status
- Change log: explicit deltas in use interpretation

HITL gates — escalate when:

- Ambiguous or conflicting requirement text
- Missing measurable threshold or acceptance criterion
- Tradeoffs across Must/Should/Could/Wont priorities
- Requirement appears stale or contradictory
- De-scoping is proposed
- Final acceptance on requirement coverage

</core_concepts>

<core_principles>

- SRP, DRY, KISS, YAGNI, MECE — enforce always; MoSCoW where necessary
- Use requirement IDs explicitly; no scope without requirement ID
- Prefer facts over guesses; state assumptions explicitly
- Keep traceability forward and backward; validate before claiming completion
- Keep changes surgical and minimal; prefer accuracy over speed
- No AI slop, no fabricated requirements, no silent reinterpretation

</core_principles>

<validation_checklist>

- In-scope requirement IDs are explicit
- Every task and test maps to a requirement ID
- No untraceable implementation scope
- No missing acceptance criteria in scope
- Conflicts are resolved or deferred with rationale
- Assumptions are explicit and approved
- Coverage gaps and over-implementation risks are listed
- Final coverage approved by user

</validation_checklist>

<pitfalls>

- Treating Draft as Approved
- Assuming unspecified behavior
- Ignoring requirement priority and status
- Batching matrix updates instead of continuous tracking

</pitfalls>

<resources>

Use `ACQUIRE FROM KB` to load:

- workflow `requirements-use-flow`
- rule `rules/requirements-use-best-practices.md`
- skill `requirements-authoring` for schema and IDs
- assets: `requirements-use/assets/ru-scope-capture.md`, `ru-traceability-matrix.md`, `ru-validation-rubric.md`, `ru-change-log.md`

</resources>

</requirements-use>
