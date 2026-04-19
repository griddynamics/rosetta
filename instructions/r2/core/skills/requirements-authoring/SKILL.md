---
name: requirements-authoring
description: "Author, update, and validate functional and non-functional requirements as a source of truth using atomic requirement units with explicit user approval. Use when creating, updating, reviewing, or refactoring requirements and building traceability coverage."
license: Proprietary
disable-model-invocation: false
user-invocable: true
argument-hint: request, existing-requirements?, scope?, constraints?, stakeholders?
context: default
agent: requirements-engineer, requirements-reviewer
metadata:
  version: "1.0"
  category: "requirements-engineering"
tags:
  - requirements-authoring
  - requirements-validation
  - requirements
  - skills
---

<requirements-authoring>

<when_to_use_skill>
Use when creating, updating, reviewing, or refactoring requirements and building traceability coverage. Requirements must be atomic, testable, implementation-free, measurable, and explicitly approved by user in a HITL loop.
</when_to_use_skill>

<dependencies>

- ACQUIRE `questions.md` FROM KB for Q&A
- Prep steps completed
- Use CONTEXT, ARCHITECTURE, IMPLEMENTATION, ASSUMPTIONS, TECHSTACK docs

</dependencies>

<workflow>

1. **Initialize** — identify context, project structure, and requirements folder structure (HITL for folder decisions); reverse-engineer existing requirements if needed
2. **Capture intent** — restate user intent succinctly; confirm scope, goals, and non-goals; list assumptions explicitly
3. **Ask targeted questions** — ACQUIRE `questions.md` FROM KB; clarify ambiguities before drafting
4. **Propose outline** — MECE requirement structure with FR/NFR separation
5. **Draft requirements** — author atomic `<req>` units following schema and language rules below
6. **Place and link** — file each req correctly; update INDEX.md and traceability links
7. **Run quality gate** — execute validation checklist and conflict/gap checks
8. **Present for review** — explain changes as narrative; seek explicit unit-level approval (HITL required)
9. **Final approval** — get explicit user sign-off before delivery; proactively suggest next areas

</workflow>

<core_concepts>

Boundaries:

- Treat requirements as source of truth — do not execute implementation tasks
- No side effects without HITL; only change after user approval
- Clearly define what requirements user told vs what AI generated
- Spec statements contain only requirements — never explanations, revision history, or concept definitions
- If a sentence would not survive in a spec that was never revised, delete it

Output artifacts:

- Intent capture: intent, scope, goals, assumptions, questions, risks, HITL plan
- Requirement units: atomic `<req>` entries with schema fields
- Validation pack: correctness, conflicts, gaps, and quality checks
- Traceability matrix: links from sources to goals, requirements, and tests

HITL gates — escalate when:

- Ambiguity or conflicts arise
- Structural changes in requirements tree
- Tradeoffs require MoSCoW decision
- Each requirement unit needs approval
- Final approval before delivery

</core_concepts>

<core_principles>

- SRP, DRY, KISS, YAGNI, MECE, MoSCoW — enforce always
- Prefer explicit over implicit; prefer facts over guesses; prefer root cause over symptoms
- Challenge new requirements reasonably — user is not always right
- Keep requirement units short, changes surgical, and language unambiguous
- No AI slop, no scope creep, no implementation details unless requested

</core_principles>

<requirement_unit>

Each requirement uses `<req>` as its atomic unit. One need, one outcome, one behavior, one actor per `<req>`. Must be independently testable and implementation-free. Check if a grouping of requirements is itself a requirement.

Schema fields (required): id, type, level, title, statement, rationale, source, priority (Must/Should/Could/Wont), status (Draft/Approved/Deprecated), acceptance criteria, verification method. Optional: dependencies, risks, notes, links.

ID format: `FR-[AREA]-####` (functional), `NFR-####` (non-functional), `INT-[AREA]-####` (interfaces), `DATA-[AREA]-####` (data). Never reuse retired IDs.

</requirement_unit>

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

<language_rules>

Modal verbs: shall (mandatory), should (preferred), may (optional), shall not (forbidden). Use active voice, present tense, one meaning per term. Avoid: will statements, vague adjectives, and/or constructs, subjective qualifiers, ambiguous time words, implementation details, UI-only descriptions, internal code names. Prefer measurable quantities; quantify every threshold; define terms in glossary; separate normative from informative.

</language_rules>

<functional_requirements>

Use EARS patterns — one pattern per requirement, one trigger, one response. Split compound requirements. Link FRs to scenarios including error behaviors.

EARS patterns:
- `<ubiq><S> shall <R>.</ubiq>`
- `<event>When <T>, <S> shall <R>.</event>`
- `<state>While <X>, <S> shall <R>.</state>`
- `<optional>Where <O>, <S> shall <R>.</optional>`
- `<unwanted>If <F>, <S> shall <M>.</unwanted>`

</functional_requirements>

<nonfunctional_requirements>

Use ISO 25010 quality buckets. Each NFR must include: metric, threshold, measurement conditions, and measurement method. Prefer percentiles over averages. State limits and constraints. Tie NFRs to scenarios. Avoid subjective quality words.

</nonfunctional_requirements>

<acceptance_and_verification>

Acceptance criteria: `Given:<G> When:<W> Then:<T>.` — independently testable, covering happy path, unhappy path, boundary conditions, and error handling.

Verification methods: Test (preferred), Analysis (proofs), Inspection (artifacts), Demo (behaviors).

</acceptance_and_verification>

<traceability_rules>

- Link each req to source, goal, and tests
- Update traceability matrix continuously
- Keep forward and backward links
- Track uncovered requirements

</traceability_rules>

<filesystem_rules>

- Write only under REQUIREMENTS folder; never edit outside
- REQUIREMENTS/INDEX.md is index; REQUIREMENTS/CHANGES.md is change log
- Keep files under 300 lines — split by capability or quality when exceeding; update links and indexes after split
- Use relative markdown links; preserve stable requirement IDs across refactors

</filesystem_rules>

<information_architecture>

Separate files for: context, scope, glossary, assumptions, constraints, FRs, NFRs, interfaces, data, traceability, decisions, questions. Each file defines one area abbreviation. All documents are target-state only.

</information_architecture>

<validation_checklist>

- Scope, goals, non-goals, and actors are explicit
- Requirement schema is complete; IDs are stable and unique
- FRs and NFRs are separated; NFRs are measurable
- Language is unambiguous; acceptance uses Given/When/Then
- Verification method exists per req; trace links exist
- No duplicate IDs, contradictory shall clauses, incompatible thresholds, or circular dependencies
- All goals, actors, scenarios, interfaces, data entities, and risks covered
- User approved each req unit; final user approval captured

</validation_checklist>

<pitfalls>

- Bundle multiple behaviors in one unit
- Add scope without explicit approval
- Skip boundary and failure scenarios
- Treat requirement groupings as mere organization when they are requirements themselves

</pitfalls>

<requirements_graph>

Proactively offer to generate and display a Graphviz requirements graph. Suggest relevant perspectives (dependency, traceability, priority). Load all requirements and build the graph.

</requirements_graph>

<resources>

Use `ACQUIRE FROM KB` to load:

- workflow `requirements-flow`
- rule `rules/requirements-best-practices.md`
- assets: `requirements-authoring/assets/ra-intent-capture.md`, `ra-requirement-unit.xml`, `ra-validation-rubric.md`, `ra-change-log.md`

</resources>

</requirements-authoring>
