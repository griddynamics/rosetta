# requirements-authoring
Turns a request into atomic, testable, implementation-free `<req>` units with per-unit HITL approval and source→goal→req→test traceability, instead of a prose or vague spec.

## Why it exists
Without it a capable model would draft compound/vague/implementation-coupled requirements, bundle several behaviors into one unit, skip boundary/error scenarios, self-mark units `Approved`, leak change rationale into spec text, and lose traceability. Pitfalls section names the failure modes directly: "Bundle multiple behaviors in one unit", "Add scope without explicit approval", "Skip boundary and failure scenarios", "Treat requirement groupings as mere organization when they are requirements themselves". `core_principles_to_enforce` adds "No AI slop", "No scope creep", and a meta-leak test: "Spec statements contain only requirements — never explanations of why a previous draft was wrong... If a sentence would not survive in a spec that was never revised, delete it."

## When to engage
Compressed trigger (`when_to_use_skill`): creating, updating, reviewing, or refactoring requirements and building traceability coverage; requirements must be atomic, testable, implementation-free, measurable, and explicitly approved by user in a HITL loop. Frontmatter `agent: requirements-engineer, reviewer` names both actors without a role split; the drafts-vs-validates division comes from `requirements-authoring-flow.md`'s phases (requirements-engineer drafts phases 2-5/8, reviewer validates phase 6). Dependencies: Rosetta prep steps completed; `USE SKILL \`questioning\`` for Q&A; CONTEXT/ARCHITECTURE/IMPLEMENTATION/ASSUMPTIONS/TECHSTACK docs available. Driven mainly by the dedicated `commands/requirements-authoring-flow.md` (all 8 phases require it) and optionally by `commands/code-analysis-flow.md`'s extraction step.

## How it works
SKILL.md flow: `role` → `when_to_use_skill` → `dependencies` → `core_concepts` (default output sections: Intent Capture, Draft Requirements, Validation Pack, Traceability Matrix, Open Questions; HITL-gate list) → `core_principles_to_enforce` (SRP/DRY/KISS/YAGNI/MECE/MoSCoW) → `initialization` → srp/dry/kiss/mece/filesystem rule blocks → `information_architecture` (INDEX.md + CHANGES.md contract) → `unit_of_requirement` → `requirement_schema` → `id_rules` → `requirement_unit_template` (inline `<req>` XML) → `language_constructs` → `functional_requirements`/`ears_patterns` → `nonfunctional_requirements` (ISO 25010) → `acceptance_criteria` (Given/When/Then) → `verification_methods` → `traceability_rules` → `authoring_flow` → `validation_rules`/`conflict_checks`/`gap_checks` → `refactoring_rules` (300-line file cap) → `validation_checklist` → `best_practices` → `requirements_graph` (Graphviz, proactive offer) → `pitfalls` → `resources`.

assets/ files, each answering one authoring-flow question:
- `ra-intent-capture.md` — pre-draft template: goal/audience/ticketId, intent_summary, non_goals, scope, must_know/assumptions/open_questions, actors, MoSCoW constraints, requirements_areas, traceability_plan, validation_plan, `hitl_gates` (decision/why/default_if_unknown), success_criteria_smart.
- `ra-requirement-unit.xml` — canonical `<req>` template (note the `.xml` extension, unlike the other three `.md` assets).
- `ra-validation-rubric.md` — true/false scorecard across structure, quality, language, verification, traceability, conflicts, gaps, governance; mirrors SKILL.md's checklist/conflict/gap sections.
- `ra-change-log.md` — ephemeral change-log entry (`kept`/`removed`/`added`/`clarified`/`assumptions`/`risks_hitl`); guideline: "Only show this to user, do not save in documents" — distinct from the persisted `REQUIREMENTS/CHANGES.md`.

ID grammar: `FR-[AREA]-####` (functional), `NFR-####` (no area segment), `INT-[AREA]-####` (interfaces), `DATA-[AREA]-####` (data); IDs are never reused or renumbered once assigned. HITL gates fire on ambiguity/conflicts, structural changes, MoSCoW tradeoffs, every unit approval, and final delivery approval; approval must be explicit — "user questions/comments do not mean it was approved."

## Mental hooks & unexpected rules
- "Requirements are absolute, no change explanations/rationale/logging" — rationale for a change belongs only in the ephemeral change-log asset, never in the requirement file.
- "REQUIREMENTS/CHANGES.md is the ONLY change log, TERSE" — a second, persisted change-log concept that coexists with (and must not be conflated with) the ephemeral `ra-change-log.md` template.
- "If a sentence would not survive in a spec that was never revised, delete it." — the meta-leak test, phrased as a thought experiment rather than a rule to check off.
- "Check if grouping of multiple requirements is a requirement itself" — a grouping heading can silently smuggle in an unreviewed requirement disguised as file organization; repeated in `validation_rules` and `pitfalls`.
- "User is not always right" / "Challenge new requirements reasonably" — the skill must push back, not transcribe.
- "Defer by keeping Draft status" — the default escape hatch: never invent an answer, leave the unit `Draft`.
- "Refactor above 300 lines" — a hard split trigger for requirement files, far stricter than this SKILL.md's own ~490 lines.
- `requirements_graph` tells the model to "Proactively ask to generate and show a graph of requirements" via Graphviz, unprompted.

## Invariants — do not change
- Frontmatter `name: requirements-authoring` equals the folder name; registered (bare listing, no description) in `docs/definitions/skills.md`.
- `description` is one sentence within the schema's ~25-token budget (`docs/schemas/skill.md`) — this skill respects the budget, unlike e.g. `hitl`, which deliberately exceeds it.
- `disable-model-invocation: false` + `user-invocable: true` — auto-engaged and directly callable.
- Root wrapper `<requirements-authoring>` matches the skill name per the shared skill-schema convention.
- `<req>` field set/order in the inline `requirement_unit_template` (id, type, level, ticketId, classification; title, statement, rationale, source, priority, status, approved_by, changed, verification, acceptance, depends, implementation, implementationNotes, notes) is what downstream workflows key off. UNCERTAINTY: `assets/ra-requirement-unit.xml` disagrees — it omits `approved_by`/`changed`/`implementationNotes` and folds status+notes into one `<implementation>[status][notes]</implementation>` field; `docs/requirements/rosetta-cli/functional-requirements.md` uses a third, older shape (plain `FR-0017` IDs, no AREA segment, no `approved_by`/`changed`/`implementation`). Treat the inline SKILL.md template as authoritative; reconcile the asset before relying on it verbatim (intent not documented).
- ID grammar `FR-[AREA]-####` / `NFR-####` / `INT-[AREA]-####` / `DATA-[AREA]-####` is load-bearing for `requirements-authoring-flow.md` phase 4 ("Map files and IDs") and for `docs/requirements/*`.
- Asset filename `ra-requirement-unit.xml` is `.xml`, not `.md` like its three siblings — a real, referenced inconsistency (SKILL.md's `resources` section names it by this exact filename), not a typo to silently "fix".
- `resources` uses the repo-wide typed-alias grammar `READ FLOW` / `READ RULE` / `READ SKILL FILE` — changing these forms breaks the shared loader convention other skills rely on.
- `commands/requirements-authoring-flow.md` routes to this skill's assets by description, never by filename (e.g. "the `requirements-authoring` skill's requirement-unit asset", "...validation rubric", "...change-log asset"). This skill must keep exposing exactly one requirement-unit template, one validation rubric, one change-log template so that indirection keeps resolving.
- Filesystem contract: write only under `REQUIREMENTS/`, never edit outside it; `INDEX.md` (one header per file: `# file path: short description`) and `CHANGES.md` (terse, sole change log) are fixed filenames other tooling greps for.

## Editing guide
- Safe: wording inside srp/dry/kiss/mece_rules, `best_practices`, `pitfalls` phrasing (same failure modes preserved); ISO 25010 detail; EARS example text.
- Handle with care: `<req>` template fields/order, ID grammar, asset filenames (especially the `.xml` one), `resources`' typed-alias lines, the 300-line refactor threshold, the HITL gate list and "explicit approval only" rule (mirrors the `hitl` skill — check `hitl/SKILL.md` before diverging).
- New standalone templates/checklists belong in `assets/` (one file per template, mirroring the existing four); new inline behavioral rules belong in SKILL.md's existing tag sections.
- Referenced by: `commands/requirements-authoring-flow.md` (dedicated, all 8 phases require this skill), `commands/code-analysis-flow.md` (optional extraction step), `commands/self-help-flow.md` and `commands/init-workspace-flow-verification.md` (example invocations), `agents/requirements-engineer.md`, `agents/prompt-engineer.md`, `skills/specflow-use/SKILL.md`, `skills/hitl/README.md` (lists this skill among `hitl`'s delegators).
