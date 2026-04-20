---
name: requirements-best-practices
description: Rules for authoring reliable, explicit, and traceable requirements with mandatory user back-and-forth and per-unit approval.
alwaysApply: false
tags: ["requirements", "rules", "best practices"]
---

<requirements_best_practices>

Problem: Requirements degrade when scope is implicit, wording is ambiguous, traceability is missing, or approvals are skipped.

Validation: Each requirement is atomic, testable, implementation-free, and explicitly approved by user.

<must>

1. USE FLOW `requirements-flow` fully
2. Enforce all `core_principles_to_enforce`
3. Pass every `validation_checklist` item
4. Question user until intent is clear
5. Keep HITL back-and-forth active
6. Require explicit approval for each `<req>`
7. Keep unresolved items in `Draft`
8. Avoid scope creep and AI slop
9. Keep implementation details out
10. Review findings with user narrative

</must>

<should>

1. Use EARS for functional statements
2. Use ISO 25010 for NFR grouping
3. Prefer measurable thresholds and percentiles
4. Keep files small and split when needed

</should>

<core_principles_to_enforce>

- Follow SRP always
- Follow DRY always
- Follow KISS always
- Follow YAGNI always
- Enforce MECE always
- Enforce MoSCoW where necessary
- Requirement units are short and easy
- Prefer explicit over implicit
- Prefer root cause over symptoms
- Prefer facts over guesses
- Challenge new requirements reasonably
- Work with user, validate with user
- HITL back-and-forth is required
- Each requirement needs explicit approval
- No scope creep
- No AI slop
- Prefer accuracy over speed
- Think before writing
- Simplicity first
- Surgical changes
- Strong success criteria
- No implementation details unless requested

</core_principles_to_enforce>

<language_constructs>

- Use shall for mandatory
- Use should for preferred
- Use may for optional
- Use shall not to forbid
- Avoid will statements
- Use active voice and present tense
- Avoid vague adjectives
- Avoid and or constructs
- Avoid subjective qualifiers
- Avoid ambiguous time words
- Quantify thresholds explicitly
- Keep terminology consistent
- Specify outcomes, not designs

</language_constructs>

<validation_checklist>

- Scope and non-goals are explicit
- Actors and boundaries are explicit
- FRs and NFRs are separated
- Every `<req>` uses required schema
- IDs are unique and stable
- FR wording follows EARS pattern
- NFR metrics and thresholds exist
- Acceptance uses Given/When/Then
- Verification method exists per req
- Source, rationale, and priority exist
- Traceability links are complete
- Conflict checks pass
- Gap checks pass
- Each `<req>` has user decision
- Final approval is recorded

</validation_checklist>

<conflict_checks>

- Detect duplicate IDs
- Detect duplicate statements
- Detect contradictory shall clauses
- Detect incompatible thresholds
- Detect circular dependencies
- Detect mismatched terminology
- Detect actor responsibility mismatch
- Detect ambiguity
- Detect groupings that should be atomic requirements

</conflict_checks>

<gap_checks>

- Ensure each goal is traced
- Ensure each actor is covered
- Ensure each scenario is covered
- Ensure each interface is specified
- Ensure each data entity is defined
- Ensure each NFR is measurable
- Ensure each risk is recorded
- Ensure open questions are tracked

</gap_checks>

<pitfalls>

- Mixing requirements and implementation details
- Approving units without user confirmation
- Combining multiple behaviors in one req
- Using subjective or untestable wording
- Omitting traceability fields
- Skipping unhappy paths and boundaries
- Introducing unapproved requirements
- Leaving conflicts unresolved
- Treating requirement groupings as organization when they are requirements

</pitfalls>

</requirements_best_practices>
