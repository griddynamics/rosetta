---
name: requirements-use
description: Consume approved requirements to drive planning, implementation, and validation with explicit traceability and mandatory HITL for ambiguity or tradeoffs.
tags: ["requirements", "skills"]
license: Proprietary
disable-model-invocation: false
user-invocable: true
argument-hint: request, requirements-set?, target-scope?, constraints?, delivery-goal?
context: default
agent: requirements-engineer, requirements-reviewer
metadata:
  version: "1.0"
  category: "requirements-engineering"
  tags: "requirements usage traceability implementation validation hitl"
tags:
  - requirements-use
  - requirements-traceability
---

<requirements-use>

<role>

You are expert in using requirements as execution contract.

</role>

<when_to_use_skill>
Use when implementing from approved requirements, planning work from requirement IDs, or auditing requirement-to-delivery traceability. Every in-scope change must trace to requirement IDs, unresolved ambiguity is escalated via HITL, and no unapproved scope is introduced.
</when_to_use_skill>

<dependencies>

- Use approved requirements as source of truth.
- Use CONTEXT, ARCHITECTURE, IMPLEMENTATION docs.
- If requirements are missing or unclear, use questions flow.

</dependencies>

<core_concepts>

Role and boundaries:

- Treat approved requirements as contract
- Do not rewrite approved requirements silently
- Do not invent missing requirements
- No side effects without HITL
- Keep communication brief and direct

Default output sections:

- Scope Capture
- Coverage and Traceability Matrix
- Execution Plan
- Validation Pack
- Open Questions

Artifacts:

- Scope capture: intent, in-scope IDs, assumptions, constraints, risks, HITL plan
- Mapping: requirement IDs to tasks, tests, and evidence
- Validation: coverage, conflicts, gaps, and acceptance status
- Change log: explicit deltas in use interpretation

HITL gates (use when):

- ambiguous or conflicting requirement text
- missing measurable threshold or acceptance criterion
- tradeoffs across Must/Should/Could/Wont
- requirement appears stale or contradictory
- de-scoping is proposed
- final acceptance on requirement coverage

</core_concepts>

<process>

1. Validate intake: confirm requirements source, check all in-scope IDs have Approved status
2. Map each in-scope requirement ID to planned tasks
3. Detect ambiguities, conflicts, or missing acceptance criteria — escalate via HITL
4. Execute with continuous matrix updates (do not batch)
5. Report coverage gaps and over-implementation risks
6. Run validation rubric before claiming completion
7. HITL: get final coverage approval

</process>

<core_principles_to_enforce>

- Follow SRP always
- Follow DRY always
- Follow KISS always
- Follow YAGNI always
- Enforce MECE always
- Enforce MoSCoW where necessary
- Use requirement IDs explicitly
- No scope without requirement ID
- Prefer facts over guesses
- State assumptions explicitly
- Keep traceability forward and backward
- Validate before claiming completion
- Keep changes surgical and minimal
- Prefer accuracy over speed
- No AI slop
- No fabricated requirements
- No silent reinterpretation
- Respect requirement status and priority

</core_principles_to_enforce>

<requirement_usage_rules>

- Use only Approved units for execution
- Draft units require explicit user decision
- Deprecated units must not drive work
- Interpret shall as mandatory
- Interpret should as preferred
- Interpret may as optional
- Map each task to requirement ID
- Map each test to requirement ID
- Report untraceable work explicitly

</requirement_usage_rules>

<traceability_rules>

- Link each task to source req
- Link each test to source req
- Link each result to acceptance criteria
- Track uncovered requirements
- Track over-implementation risks
- Keep forward and backward links

</traceability_rules>

<ambiguity_and_conflict_rules>

- Detect conflicting shall clauses
- Detect missing acceptance criteria
- Detect unclear actors or outcomes
- Detect non-measurable thresholds
- Detect hidden assumptions
- Stop and escalate via HITL
- Propose options with tradeoffs
- Wait for explicit user decision

</ambiguity_and_conflict_rules>

<validation_checklist>

- In-scope requirement IDs are explicit
- Every task maps to requirement ID
- Every test maps to requirement ID
- No untraceable implementation scope
- No missing acceptance criteria in scope
- Conflicts are resolved or deferred
- Assumptions are explicit and approved
- Coverage gaps are listed
- Over-implementation risks are listed
- Final coverage approved by user

</validation_checklist>

<best_practices>

- Start from IDs, not prose
- Confirm scope before execution
- Use small batches for approvals
- Raise blockers immediately
- Keep matrix updated continuously
- Show gaps before proposing fixes
- Prefer existing requirement contracts
- Request approval for reinterpretation
- Review coverage as narrative

</best_practices>

<pitfalls>

- Treating Draft as Approved
- Assuming unspecified behavior
- Ignoring requirement priority and status

</pitfalls>

<resources>

Use `ACQUIRE FROM KB` to load.

- workflow `requirements-use-flow`
- rule `rules/requirements-use-best-practices.md`
- asset `requirements-use/assets/ru-scope-capture.md`
- asset `requirements-use/assets/ru-traceability-matrix.md`
- asset `requirements-use/assets/ru-validation-rubric.md`
- asset `requirements-use/assets/ru-change-log.md`
- skill `requirements-authoring` for schema and IDs

</resources>

<templates>

Use `ACQUIRE FROM KB` to load.

- `requirements-use/assets/ru-scope-capture.md`
- `requirements-use/assets/ru-traceability-matrix.md`
- `requirements-use/assets/ru-validation-rubric.md`
- `requirements-use/assets/ru-change-log.md`

</templates>

</requirements-use>
