---
name: requirements-use
description: "To consume approved requirements for planning, implementation, and validation, with traceability and HITL."
tags: ["requirements", "skills"]
license: Apache-2.0
disable-model-invocation: false
user-invocable: true
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
2. Validate implementation status, check implementation notes from <req>
3. Map each in-scope requirement ID to planned tasks
4. Detect ambiguities, conflicts, or missing acceptance criteria — escalate via HITL
5. Execute with continuous matrix updates (do not batch)
6. Update implementation status and implementation notes
7. Report coverage gaps and over-implementation risks
8. Run validation rubric before claiming completion
9. HITL: get final coverage approval

</process>

<gap_analysis>

Analysis-only mode: examine collected multi-source data (Jira, Confluence, TestRail, API spec, test cases, a test plan) for contradictions, gaps, ambiguities, and inconsistencies before downstream work. This mode EMITS categorized findings into the caller-supplied artifact — the caller owns the finding-entry template, section list, output path, and validation contract; this mode never invents the artifact shape or path. Detection catalogs (contradiction / gap / ambiguity / cross-reference probes, the three-tier risk scheme, per-finding authoring discipline) live in [references/gap-analysis-catalogs.md](references/gap-analysis-catalogs.md) — load on demand when classifying.

This mode is analysis-only: it does NOT act on findings, propose edits, fix gaps, or ask the user directly — it surfaces each as a finding and stops. It does NOT generate user-facing questions. Variants:

- **General multi-source variant** — find contradictions / gaps / ambiguities across all loaded sources; cross-reference the sources against each other.
- **Test-cases-vs-API-spec variant** — cross-reference each test step against the API analysis (endpoint/method/request/response/status/auth/error coverage); emit gaps where test inputs or assertions are unsupported by the spec.
- **Test-plan variant** — evaluate ALL five completeness dimensions (D1 steps, D2 measurability, D3 test data, D4 edge cases, D5 success criteria) of an UI-QA test plan; for each gap record a derived measurable assertion when one is cleanly derivable, otherwise leave it blank — never fabricate.

Process: (1) load every source completely — surface missing/empty/partial inputs, never fabricate; (2) classify findings against the catalogs, one finding per item, each with a verbatim source quote + citation, an impact, and exactly one risk tier; (3) cross-reference sources (skip-with-note when a single source); (4) redact sensitive values before quoting (→ USE SKILL `sensitive-data`); (5) write findings into the caller's artifact — produce the artifact even on a clean analysis (`No issues found` / "all dimensions satisfied"), never pad with manufactured findings.

</gap_analysis>

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
- `<gap_analysis>`: acting on findings, asking the user directly, or padding a clean analysis — all violate the analysis-only boundary

</pitfalls>

<resources>

Use `ACQUIRE FROM KB` to load.
- reference `requirements-use/references/gap-analysis-catalogs.md` (`<gap_analysis>` detection catalogs)
- asset `requirements-use/assets/ru-traceability-matrix.md`
- asset `requirements-use/assets/ru-change-log.md`

</resources>

<requirement_unit_template>

```xml
<req id="FR-AREA-0001" type="FR" level="System" ticketId="JIRA-0000" classification="business|technical">
  <title>...</title>
  <statement>...</statement>
  <rationale>...</rationale>
  <source>User|Inferred|Sources|Documentation</source>
  <priority>Must|Should|Could|Wont</priority>
  <status>Draft|Approved|Deprecated|Removed</status>
  <approved_by>[user login approved]</approved_by>
  <changed>[YYYY-MM-DD]</changed>
  <verification>Test|Analysis|Inspection|Demo</verification>
  <acceptance>
    <criteria>Given: A When: B Then: C.</criteria>
    <criteria>Given: X When: Y Then: Z.</criteria>
  </acceptance>
  <depends>FR-AREA-0000, NFR-0000, INT-AREA-0000</depends>
  <implementation>NotStarted|Implemented|Planned|ToBeModified|ToBeRemoved</implementation>
  <implementationNotes>[CONCISE: Implemented: aggregated files affected, NotStarted/Planned/ToBeRemoved: nothing, ToBeModified: what was originally documented but now dropped]</implementationNotes>
  <notes>...</notes>
</req>
```

</requirement_unit_template>

</requirements-use>
