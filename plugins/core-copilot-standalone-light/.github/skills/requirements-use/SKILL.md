---
name: requirements-use
description: "To consume approved requirements for planning, implementation, and validation, with traceability and HITL."
license: Apache-2.0
argument-hint: request, requirements-set?, target-scope?, constraints?, delivery-goal?
context: default
agent: requirements-engineer, reviewer
metadata:
  version: "1.0"
  category: "requirements-engineering"
  tags: "requirements usage traceability implementation validation hitl"
tags:
  - requirements-use
  - requirements-traceability
  - requirements
  - skills
---

<requirements-use>

<role>

You are expert in using requirements as execution contract.

</role>

<when_to_use_skill>
Triggers: implementing from approved requirements; planning work from requirement IDs; auditing requirement-to-delivery traceability. Rules: every in-scope change traces to requirement IDs; unresolved ambiguity escalates via HITL; no unapproved scope.
</when_to_use_skill>

<dependencies>

- Use approved requirements as source of truth.
- Use CONTEXT, ARCHITECTURE, IMPLEMENTATION docs.
- If requirements are missing or unclear, USE SKILL `questioning`.

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
2. Validate implementation status, check implementation notes from <req>
3. Map each in-scope requirement ID to planned tasks
4. Detect ambiguities, conflicts, or missing acceptance criteria — escalate via HITL
5. Execute with continuous matrix updates (do not batch)
6. Update implementation status and implementation notes
7. Report coverage gaps and over-implementation risks
8. Run validation rubric before claiming completion
9. HITL: get final coverage approval

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
- Requirements are always referenced and only via code comments

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

- READ SKILL FILE `assets/ru-traceability-matrix.md`
- READ SKILL FILE `assets/ru-change-log.md`

</resources>

<requirement_unit_template>

Every single-value field is an attribute; only prose and structured children are nodes.
Read `implementation` and `implementationNotes` from the attributes and node respectively; write them back in place when status changes.

```xml
<req id="FR-[AREA]-####" type="FR|NFR|INT|DATA" level="System|Subsystem|Component"
     subsystem="[name; required when level is Subsystem or Component; otherwise fill when known]"
     component="[name; required when level is Component; otherwise fill when known]"
     ticketId="[tracker key]" classification="business|technical"
     source="User|Inferred|Sources|Documentation"
     priority="Must|Should|Could|Wont" verification="Test|Analysis|Inspection|Demo"
     status="Draft|Approved|Deprecated|Removed" approved_by="[login or user name of the approver]" changed="[YYYY-MM-DD]"
     depends="[comma-separated IDs]"
     implementation="NotStarted|Implemented|Planned|ToBeModified|ToBeRemoved">
  <title>[the single outcome this unit governs; noun phrase, unique within the area]</title>
  <statement>[the governing rule: what shall hold, over which cases, with its limits and explicit exclusions. NOT an EARS sentence, NOT a restatement of the criteria]</statement>
  <rationale>[why this shape and not another: basis for each threshold, actor and boundary; alternatives rejected and why rejected]</rationale>
  <evidence>[reverse-engineering only: path:line-range per source location]</evidence>
  <acceptance>
    <criteria id="[req-id].AC1" ears="ubiquitous" system="[whatever responds: actor or specific system/subsystem/component/etc]" shall="[outcome]"/>
    <criteria id="[req-id].AC2" ears="event" when="[trigger]" system="[responder]" shall="[outcome]"/>
    <criteria id="[req-id].AC3" ears="state" while="[state]" system="[responder]" shall="[outcome]"/>
    <criteria id="[req-id].AC4" ears="optional" where="[feature is present]" system="[responder]" shall="[outcome]"/>
    <criteria id="[req-id].AC5" ears="unwanted" if="[fault]" system="[responder]" shall="[mitigation]"/>
  </acceptance>
  <implementationNotes>[CONCISE: Implemented: aggregated files affected, NotStarted/Planned/ToBeRemoved: nothing, ToBeModified: what was originally documented but now dropped]</implementationNotes>
  <notes>[anything else; the rejection reason when status is Removed]</notes>
</req>
```

Coverage queries this shape enables: `implementation="NotStarted"` for unbuilt scope, `implementation="ToBeModified"` for spec-vs-code drift, `status="Draft"` for anything not yet approved to build against.

</requirement_unit_template>

</requirements-use>
