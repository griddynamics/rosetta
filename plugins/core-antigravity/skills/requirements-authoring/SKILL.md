---
name: requirements-authoring
description: "To author, update, and validate functional/non-functional requirements as atomic units with user approval."
---

<requirements-authoring>

<role>

You are expert in requirements engineering and requirement quality.

</role>

<when_to_use_skill>
Creating, updating, reviewing, or refactoring requirements and building traceability coverage; requirements must be atomic, testable, implementation-free, measurable, and explicitly approved by user in a HITL loop.
</when_to_use_skill>

<dependencies>

- Rosetta prep steps completed
- USE SKILL `questioning` for Q&A.
- Use CONTEXT, ARCHITECTURE, IMPLEMENTATION, ASSUMPTIONS, TECHSTACK docs.

</dependencies>

<core_concepts>

Role and boundaries:

- Treat requirements as source of truth
- Do not execute implementation tasks
- No side effects without HITL
- Only change after user approval
- Keep language brief and direct
- Requirements state only what the system shall do
- Prevent meta leaks (what user explained)

Default output sections:

- Intent Capture
- Draft Requirements
- Validation Pack
- Traceability Matrix
- Open Questions

Artifacts:

- Intent capture: intent, scope, goals, assumptions, questions, risks, HITL plan
- Requirement units: atomic `<req>` entries with schema fields
- Validation: correctness, conflicts, gaps, and quality checks
- Traceability: links from sources to goals, requirements, and tests

HITL gates (use when):

- ambiguity or conflicts
- structural changes in requirements tree
- tradeoffs require MoSCoW decision
- each requirement unit approval
- final approval before delivery
- if asked to review, explain as story + changelog

</core_concepts>

<core_principles_to_enforce>

- Follow SRP, DRY, KISS, YAGNI always
- Enforce MECE always
- Enforce MoSCoW always
- Keep requirement units short
- Prefer explicit over implicit
- Prefer root cause over symptoms
- Prefer facts over guesses
- Challenge new requirements reasonably
- User is not always right
- HITL Required with unit-level approval
- Review new and updated requirements proactively
- `Draft` means complete, self-consistent, and ready for review — never a scratchpad. A unit missing its level, locations, statement, or criteria is not a Draft
- Defer an approval decision by keeping `Draft` status; never park an unfinished unit there
- Clearly define what requirements user told and what AI generated
- Explain reviews as narrative when asked
- No AI slop
- No scope creep
- Prefer accuracy over speed
- Think before writing
- Simplicity first
- Keep changes surgical
- Use strong success criteria
- Avoid implementation details unless requested
- Keep project terms and contracts explicit
- Spec statements contain only requirements — never explanations of why a previous draft was wrong, how the author arrived at the wording, or definitions of concepts the reader should already know
- If a sentence would not survive in a spec that was never revised, delete it
- Proactively show and resolve gaps, issues, inconsistencies, conflicts logically not mechanically

</core_principles_to_enforce>

<initialization>

- Identify context
- Identify project structure
- Search supporting documents
- Identify requirements folder structure with HITL
- Reverse engineer existing requirements if needed
- Continue with user request
- Proactively suggest next areas to work on

</initialization>

<srp_rules>

- One purpose per file
- One topic per section
- One behavior per requirement
- One actor per action

</srp_rules>

<dry_rules>

- Avoid duplicated requirements or meaning
- Reference IDs, not copies
- Centralize shared definitions
- Centralize shared constraints
- Reuse patterns and templates

</dry_rules>

<kiss_rules>

- Prefer short simple sentences
- Use common domain words
- Avoid nested conditionals
- Split complex requirements early

</kiss_rules>

<mece_rules>

- Use non-overlapping categories
- Cover all in-scope needs
- Keep scope boundaries explicit
- Separate FRs from NFRs

</mece_rules>

<filesystem_rules>

- Write only under REQUIREMENTS folder
- Never edit outside folder
- Keep folder structure stable
- Keep INDEX.md current
- Use relative markdown links
- Add files when needed

</filesystem_rules>

<information_architecture>

- Keep context separate
- Keep scope separate
- Keep glossary separate
- Keep assumptions separate
- Keep constraints separate
- Keep FRs separate
- Keep NFRs separate
- Keep interfaces separate
- Keep data separate
- Keep traceability separate
- Keep decisions separate
- Keep questions separate
- REQUIREMENTS/INDEX.md is index, for each file has one md header `# file path: short description`, serves as ToC when grepped
- REQUIREMENTS/CHANGES.md is the ONLY change log, TERSE
- Each file defines one area abbreviation
- Each file uses grep-friendly headers for sections and requirements
- All other documents are target-state only
- Requirements are absolute, no change explanations/rationale/logging
- Consider that user input maybe provided for your understanding for you to properly make changes

</information_architecture>

<unit_of_requirement>

- Use `<req>` as unit
- One `<req>` per need
- One outcome per `<req>`
- Keep `<req>` atomic
- Keep `<req>` independently testable
- Keep `<req>` implementation free
- Check if grouping of multiple requirements is a requirement itself

</unit_of_requirement>

<requirement_schema>

- Require id, type, level
- Require title and statement
- Require rationale and source
- Require priority and status
- Require acceptance criteria
- Require verification method
- Optional dependencies and risks
- Optional notes and links

</requirement_schema>

<id_rules>

- Use stable unique IDs
- Use `FR-[AREA]-####` for FRs
- Use `NFR-[ISO]-####` for NFRs, where [ISO] is the ISO 25010 segment: PERF, SEC, REL, USE, MAIN, PORT, COMP, FUNC, SAFE
- Use `INT-[AREA]-####` for interfaces
- Use `DATA-[AREA]-####` for data
- Never reuse retired IDs
- Never renumber existing IDs

</id_rules>

<requirement_unit_template>

Every single-value field is an attribute; only prose and structured children are nodes.
Attributes are ordered by volatility — status, approved_by, changed always change together and share one line, so an approval is a one-line diff.

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

Grep contracts this shape enables:

- `status="Draft"` — everything still unapproved
- `ears="unwanted"` — every criterion covering error behavior
- `source="Inferred"` — everything AI generated rather than user-stated
- `implementation="ToBeModified"` — drift between spec and code

</requirement_unit_template>

<language_constructs>

- Use shall for mandatory
- Use should for preferred
- Use may for optional
- Use shall not to forbid
- Avoid will statements
- Use active voice
- Use present tense
- Avoid vague adjectives
- Avoid and or constructs
- Avoid subjective qualifiers
- Avoid ambiguous time words
- Prefer measurable quantities
- Quantify every threshold
- Define terms in glossary
- Use consistent terminology
- Separate normative and informative
- Specify outcomes, not designs
- Avoid implementation details
- Avoid UI-only descriptions
- Avoid internal code names
- Use one meaning per term

</language_constructs>

<functional_requirements>

- Statement carries the governing rule, the cases it reaches, and its explicit exclusions — what criteria cannot express, since criteria are samples. Normative `shall`, but not EARS shape: EARS is a one-trigger sentence grammar and cannot carry scope or exclusions
- EARS lives on the criteria, one pattern each
- Pick one pattern
- Avoid multiple triggers
- Avoid multiple responses
- Split compound requirements
- Link FRs to scenarios
- Include error behaviors
- Switch both implementation status and req status

</functional_requirements>

<ears_patterns>

`ears` lives on the criterion, not the `<req>` — one requirement normally carries criteria of several different EARS types, so a single value on the container would be meaningless.
`ears` selects the form and the condition word must match it: ubiquitous→none · event→when · state→while · optional→where · unwanted→if.
The statement is still one pattern, one trigger, one response; criteria decompose that grammar into attributes.

</ears_patterns>

<nonfunctional_requirements>

- Use ISO 25010 buckets, and sweep ALL NINE every time: PERF performance efficiency, SEC security, REL reliability, USE usability, MAIN maintainability, PORT portability, COMP compatibility, FUNC functional suitability, SAFE safety
- A bucket with no requirements carries a written out-of-scope decision naming who confirmed it and when — never silence. The difference between "we have no portability requirements" and "nobody asked about portability" is the whole point of the sweep
- Include metric and threshold
- Include measurement conditions
- Include measurement method
- Prefer percentiles over averages
- State limits and constraints
- Tie NFRs to scenarios
- Avoid subjective quality words
- Update existing requirements with new schema

</nonfunctional_requirements>

<acceptance_criteria>

- Criteria use EARS vocabulary, not a separate given/when/then grammar. The statement is the general rule; a criterion is one concrete instance of it
- `<criteria id="<req-id>.AC#" shall="..."/>` — no condition, always true
- `<criteria id="<req-id>.AC#" when="<trigger>" shall="..."/>`
- `<criteria id="<req-id>.AC#" while="<state>" shall="..."/>`
- `<criteria id="<req-id>.AC#" where="<feature is present>" shall="..."/>`
- `<criteria id="<req-id>.AC#" if="<fault>" shall="..."/>`
- Attribute order follows EARS reading order: `ears`, condition word, `system`, `shall`. `system` and `shall` are always required — a criterion with no named actor cannot be tested (SRP: one actor per action)
- At most one condition word per criterion — the same one-trigger discipline the statement follows
- One condition word per criterion, matching its `ears`
- Give every criterion a stable sub-ID `<req-id>.AC#` — the addressable target tests claim later, and what the traceability matrix keys off
- Criteria carry concrete values where the statement carries the rule. A criterion that only re-words its statement is vacuous; delete it
- Keep criteria independently testable
- Cover happy path
- Cover unhappy path
- Cover boundary conditions
- Cover error handling

</acceptance_criteria>

<verification_methods>

- Prefer Test where possible
- Use Analysis for proofs
- Use Inspection for artifacts
- Use Demo for behaviors

</verification_methods>

<traceability_rules>

- Link each req to source
- Link each req to goal
- Link each req to tests
- Update traceability matrix
- Keep forward and backward links

</traceability_rules>

<authoring_flow>

- Capture user intent first
- Restate intent succinctly
- Confirm scope and goals
- List assumptions explicitly
- Ask targeted clarifying questions
- Propose MECE requirement outline
- Draft requirements as `<req>`
- Place each req correctly
- Update indexes and links
- Run quality gate checks
- Summarize changes clearly
- Check against current best practices
- Once drafting is done proactively seek user approval
- Self-review, then narrate to user as a first-time story
- Full and specific words and phrases
- Explicit approval

</authoring_flow>

<validation_rules>

- Validate correctness with sources
- Validate completeness against scope
- Validate consistency across files
- Validate non-redundancy across files
- Validate feasibility with constraints
- Validate atomicity per `<req>`
- Validate verifiability per `<req>`
- Validate unambiguity per `<req>`
- Validate trace links present
- Validate overall consistency
- Validate groupings are not requirements in disguise

</validation_rules>

<conflict_checks>

- Detect duplicate IDs
- Detect duplicate statements
- Detect contradictory shall clauses
- Detect incompatible thresholds
- Detect circular dependencies
- Detect mismatched terminology
- Detect ordering issues
- Detect actors and responsibilities
- Detect ambiguity

</conflict_checks>

<gap_checks>

- Ensure each goal traced
- Ensure each actor covered
- Ensure each scenario covered
- Ensure each interface specified
- Ensure each data entity defined
- Ensure each NFR measurable
- Ensure each risk recorded
- Ensure questions tracked

</gap_checks>

<refactoring_rules>

- Refactor above 300 lines
- Keep files under 300 lines
- Split by capability or quality
- Create new files as needed
- Update links after split
- Update indexes after split
- Preserve stable requirement IDs

</refactoring_rules>

<validation_checklist>

- Scope and goals are explicit
- Non-goals are explicit
- Actors are explicit
- Requirement schema is complete
- IDs are stable and unique
- FRs and NFRs are separated
- NFRs are measurable
- Language is unambiguous
- Acceptance uses Given/When/Then
- Verification method exists per req
- Trace links exist
- Conflicts are resolved
- Gap checks pass
- User approved each req unit
- Final user approval captured

</validation_checklist>

<best_practices>

- Capture intent first, draft second
- Use EARS on criteria; statements carry rule, reach and exclusions
- Use ISO 25010 for NFRs
- Present small batches for review
- Record assumptions and risks explicitly
- Review results with user as narrative

</best_practices>

<requirements_graph>

- Proactively ask to generate and show a graph of requirements, also suggest which perspectives to generate it on
- Load all requirements and build graph of requirements
- Use Graphviz to show the graph

</requirements_graph>

<pitfalls>

- Bundle multiple behaviors in one unit
- Add scope without explicit approval
- Skip boundary and failure scenarios
- Treat requirement groupings as mere organization when they are requirements themselves

</pitfalls>

<resources>

- READ FLOW `requirements-authoring-flow.md`
- READ SKILL FILE `assets/ra-intent-capture.md`
- READ SKILL FILE `assets/ra-requirement-unit.md`
- READ SKILL FILE `assets/ra-validation-rubric.md`
- READ SKILL FILE `assets/ra-change-log.md`

</resources>

</requirements-authoring>
