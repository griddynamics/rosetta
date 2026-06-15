---
name: requirements-authoring
description: "To author, update, and validate functional/non-functional requirements as atomic units with user approval."
tags: ["requirements", "skills"]
license: Apache-2.0
disable-model-invocation: false
user-invocable: true
argument-hint: request, existing-requirements?, scope?, constraints?, stakeholders?
context: default
agent: requirements-engineer, reviewer
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

Expert in requirements engineering and requirement quality.

</role>

<when_to_use_skill>
Use when creating, updating, reviewing, refactoring, or synthesizing requirements and building traceability. Requirements must be atomic, testable, implementation-free, measurable, and explicitly user-approved in a HITL loop.
</when_to_use_skill>

<dependencies>

Prep steps completed; use CONTEXT, ARCHITECTURE, IMPLEMENTATION, ASSUMPTIONS, TECHSTACK docs; ACQUIRE `questions.md` FROM KB.

</dependencies>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Reference-grade catalogs / schemas / templates live in [references/authoring-catalogs.md](references/authoring-catalogs.md), lazy-loaded on demand (convention stated once here).
- **Role and boundaries:** treat requirements as source of truth; do not execute implementation; no side effects or changes without user approval; keep language brief; requirements state only what the system shall do; prevent meta leaks (what the user explained).
- **Output sections / artifacts:** Intent Capture (intent, scope, goals, assumptions, questions, risks, HITL plan), Draft Requirements (`<req>` units), Validation Pack (correctness, conflicts, gaps, quality), Traceability Matrix (sources → goals → reqs → tests), Open Questions.
- **HITL gates** — ambiguity/conflicts, structural tree changes, MoSCoW tradeoffs, each requirement-unit approval, final delivery approval; review requests explained as story + changelog; defer by keeping Draft status. Canonical authority → USE SKILL `hitl`.
- **Principles:** always SRP, DRY, KISS, YAGNI, MECE, MoSCoW; keep units short; prefer explicit/root-cause/facts/accuracy; think before writing; keep changes surgical. No AI slop, no scope creep; avoid implementation details unless requested. Challenge new requirements reasonably — the user is not always right; separate what the user told from what AI generated.
- Spec statements contain only requirements — never explanations of why a prior draft was wrong, how the wording was reached, or definitions the reader should already know. If a sentence would not survive in a spec that was never revised, delete it.

</core_concepts>

<initialization>

Identify context, project structure, and (with HITL) the requirements folder structure; search supporting documents; reverse-engineer existing requirements if needed; continue with the user request; proactively suggest next areas.

</initialization>

<application_rules>

- **SRP:** one purpose per file, one topic per section, one behavior per requirement, one actor per action.
- **DRY:** no duplicated requirements/meaning; reference IDs not copies; centralize shared definitions/constraints; reuse.
- **KISS:** short sentences, common domain words, no nested conditionals; split complex requirements early.
- **MECE:** non-overlapping categories covering all in-scope needs; explicit boundaries; FRs apart from NFRs.

</application_rules>

<structure_and_units>

- Write only under REQUIREMENTS; keep each concern in its own file/section; keep `INDEX.md` (ToC) and `CHANGES.md` (change log) current; non-index docs are target-state only (no change explanations).
- Use `<req>` as the unit: one per need, one outcome, atomic, independently testable, implementation-free. Check whether a grouping is itself a requirement.
- Filesystem / information-architecture / refactoring (300-line) conventions, schema fields, ID conventions, and the `<req>` template → [references/authoring-catalogs.md](references/authoring-catalogs.md#requirement-unit-template-req).

</structure_and_units>

<language_constructs>

Modal verbs: `shall` (mandatory), `should` (preferred), `may` (optional), `shall not` (forbid); avoid `will`. Active voice, present tense. Avoid vague adjectives, and/or constructs, subjective qualifiers, ambiguous time words, implementation details, UI-only descriptions, internal code names. Prefer measurable quantities; quantify every threshold; define terms in glossary; one meaning per term; separate normative from informative; specify outcomes not designs.

</language_constructs>

<requirement_statements>

- **FRs:** EARS, one pattern per FR; avoid multiple triggers/responses; split compound requirements; link to scenarios; include error behaviors; switch both implementation status and req status. Pattern catalog (ubiquitous/event/state/optional/unwanted) → [references/authoring-catalogs.md](references/authoring-catalogs.md#ears-pattern-catalog-functional-requirement-statements).
- **NFRs:** ISO 25010 buckets; include metric, threshold, measurement conditions and method; prefer percentiles; state limits; tie to scenarios; no subjective quality words.
- **Acceptance criteria:** `Given:<G> When:<W> Then:<T>.` Independently testable; cover happy/unhappy/boundary/error.
- **Verification:** prefer **Test**; **Analysis** (proofs); **Inspection** (artifacts); **Demo** (behaviors).
- **Traceability:** link each req to source, goal, and tests; update the matrix; keep forward and backward links.

</requirement_statements>

<authoring_flow>

1. Capture intent first — restate succinctly, confirm scope/goals, list assumptions, ask targeted clarifying questions.
2. Propose a MECE outline; draft requirements as `<req>`, placing each correctly; update indexes and links; run quality-gate checks; summarize changes.
3. Self-review, then narrate to the user as a first-time story. Explicit approval only — do not assume; user questions/comments are not approval.

</authoring_flow>

<synthesis>

Mode: synthesize collected multi-source data (Jira, Confluence, TestRail, user answers, gap/contradiction analysis) into ONE structured requirements document — user stories, FRs, NFRs, constraints, dependencies, assumptions, risks, traceability. EMITS into the skeleton the calling phase ASSERTS; the phase owns the section contract and output path. All authoring rules above apply. Six per-requirement schemas + document wrapper + source-priority ladder → [references/authoring-catalogs.md](references/authoring-catalogs.md#synthesis-output-schemas-synthesis-mode) — load the active schema per step.

Synthesis-specific rules:

- **Source provenance:** every requirement carries an explicit `Source` field (source row, ticket, page section, or user-answer index); absent provenance = fabrication.
- **Conflict resolution:** apply the source-priority ladder; unresolved → assumption with impact-if-wrong, listed under Risks when both sides share a tier.
- **NFR threshold:** thresholdless NFRs move to assumptions-and-risks flagged. **One behavior per req:** split composite "A AND B" at synthesis time.
- **Coverage discipline:** include only what sources specify; empty categories stay empty; no padding. **No verbatim copy-paste** — reshape into schema voice.
- **Single-source flag:** primary-source-only → tag every derived assumption `Confidence: Single-source`. Produce the document even when answers/docs are missing — mark each missing-input gap as an explicit assumption. Redact before quoting (→ `<safety_boundaries>`).

</synthesis>

<safety_boundaries>

The requirements document is DRAFT, version-tracked, downstream-fed — treat output as PUBLIC by default. Redact credentials/tokens/keys and PII before quoting source content (placeholders or synthetic values); flag each redaction inline; never infer redacted content. Structural content (paths, methods, status codes, field names) is safe. Canonical authority → USE SKILL `sensitive-data`.

</safety_boundaries>

<validation_checklist>

- **Validate** correctness vs sources, completeness vs scope, consistency and non-redundancy across files, feasibility vs constraints; atomicity / verifiability / unambiguity / trace links per `<req>`; groupings are not requirements in disguise.
- **Conflict checks:** no duplicate IDs/statements, contradictory shall clauses, incompatible thresholds, circular dependencies, mismatched terminology, ordering/actor conflicts, ambiguity.
- **Gap checks:** each goal traced; each actor/scenario/interface/data-entity covered; each NFR measurable; each risk recorded; each question tracked.
- **Gate (must hold to emit):** scope/goals/non-goals/actors explicit; schema complete; IDs stable/unique; FRs/NFRs separated and measurable; language unambiguous; acceptance uses Given/When/Then; verification per req; user approved each unit and final delivery.

</validation_checklist>

<requirements_graph>

Proactively offer a requirements graph (suggest perspectives), build it from all requirements, render with Graphviz → [references](references/authoring-catalogs.md#requirements-graph).

</requirements_graph>

<pitfalls>

- Bundling multiple behaviors in one unit; adding scope without approval; skipping boundary/failure scenarios
- Treating requirement groupings as mere organization when they are requirements themselves
- `<synthesis>`: verbatim source copy-paste, implementation detail in user stories, subjective/non-testable acceptance criteria, or padding empty categories

</pitfalls>

<resources>

`ACQUIRE FROM KB`: workflow `requirements-flow`; rule `rules/requirements-best-practices.mdc`; reference `requirements-authoring/references/authoring-catalogs.md` (unit template, EARS, synthesis schemas, conventions, graph); assets `ra-intent-capture.md`, `ra-requirement-unit.xml`, `ra-validation-rubric.md`, `ra-change-log.md`.

</resources>

</requirements-authoring>
