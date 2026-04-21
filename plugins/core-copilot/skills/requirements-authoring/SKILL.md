---
name: requirements-authoring
description: Author, update, and validate functional and non-functional requirements as a source of truth using atomic requirement units with explicit user approval.
tags: ["requirements", "skills"]
license: Proprietary
disable-model-invocation: false
user-invocable: true
argument-hint: request, existing-requirements?, scope?, constraints?, stakeholders?
context: default
agent: requirements-engineer, requirements-reviewer
metadata:
  version: "1.0"
  category: "requirements-engineering"
  tags: "requirements functional non-functional traceability hitl"
tags:
  - requirements-authoring
  - requirements-validation
---

<requirements-authoring>

<role>

You are expert in requirements engineering and requirement quality.

</role>

<when_to_use_skill>
Use when creating, updating, reviewing, or refactoring requirements and building traceability coverage. Requirements must be atomic, testable, implementation-free, measurable, and explicitly approved by user in a HITL loop.
</when_to_use_skill>

<dependencies>

- ACQUIRE `questions.md` FROM KB for Q&A.
- Prep steps completed
- Use CONTEXT, ARCHITECTURE, IMPLEMENTATION, ASSUMPTIONS, TECHSTACK docs.

</dependencies>

<core_concepts>

Role and boundaries:

- Treat requirements as source of truth
- Do not execute implementation tasks
- No side effects without HITL
- Only change after user approval
- Keep language brief and direct

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

- Follow SRP always
- Follow DRY always
- Follow KISS always
- Follow YAGNI always
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
- Defer by keeping Draft status
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
- Spec statements contain only requirements — never explanations of why a previous draft was wrong, how the author arrived at the wording, or definitions of concepts the reader should already know.
- If a sentence would not survive in a spec that was never revised, delete it.

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
- REQUIREMENTS/INDEX.md is index
- REQUIREMENTS/CHANGES.md is change log
- Each file defines one area abbreviation
- All other documents are target-state only
- Never write change explanations
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
- Use `NFR-####` for NFRs
- Use `INT-[AREA]-####` for interfaces
- Use `DATA-[AREA]-####` for data
- Never reuse retired IDs
- Never renumber existing IDs

</id_rules>

<requirement_unit_template>

```xml
<req id="FR-AREA-0001" type="FR" level="System" ticketId="JIRA-0000" classification="business|technical">
  <title>...</title>
  <statement>...</statement>
  <rationale>...</rationale>
  <source>User|Inferred|Sources|Documentation</source>
  <priority>Must|Should|Could|Wont</priority>
  <status>Draft|Approved|Deprecated</status>
  <approved_by>[user login approved]</approved_by>
  <verification>Test|Analysis|Inspection|Demo</verification>
  <acceptance>
    <criteria>Given:<G> When:<W> Then:<T>.</criteria>
  </acceptance>
  <depends>FR-AREA-0000, NFR-0000, INT-AREA-0000</depends>
  <notes>...</notes>
</req>
```

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

- Use EARS patterns
- Pick one pattern
- Avoid multiple triggers
- Avoid multiple responses
- Split compound requirements
- Link FRs to scenarios
- Include error behaviors

</functional_requirements>

<ears_patterns>

- `<ubiq><S> shall <R>.</ubiq>`
- `<event>When <T>, <S> shall <R>.</event>`
- `<state>While <X>, <S> shall <R>.</state>`
- `<optional>Where <O>, <S> shall <R>.</optional>`
- `<unwanted>If <F>, <S> shall <M>.</unwanted>`

</ears_patterns>

<nonfunctional_requirements>

- Use ISO 25010 buckets
- Include metric and threshold
- Include measurement conditions
- Include measurement method
- Prefer percentiles over averages
- State limits and constraints
- Tie NFRs to scenarios
- Avoid subjective quality words

</nonfunctional_requirements>

<acceptance_criteria>

- Use Given/When/Then format
- Use `Given:<G> When:<W> Then:<T>.`
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
- Read (if needed), Review yourself, and Present to the user as a story (explaining how it will work)
- Explicit approval, do not assume approval, user questions/comments do not mean it was approved

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
- Use EARS for FR statements
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

Use `ACQUIRE FROM KB` to load.

- workflow `requirements-flow`
- rule `rules/requirements-best-practices.md`
- asset `requirements-authoring/assets/ra-intent-capture.md`
- asset `requirements-authoring/assets/ra-requirement-unit.xml`
- asset `requirements-authoring/assets/ra-validation-rubric.md`
- asset `requirements-authoring/assets/ra-change-log.md`

</resources>

<templates>

Use `ACQUIRE FROM KB` to load.

- `requirements-authoring/assets/ra-intent-capture.md`
- `requirements-authoring/assets/ra-requirement-unit.xml`
- `requirements-authoring/assets/ra-validation-rubric.md`
- `requirements-authoring/assets/ra-change-log.md`

</templates>

</requirements-authoring>
