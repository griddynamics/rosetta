# tech-specs
Turns approved requirements/discovery into a terse, testable tech-spec document (target-state architecture, contracts, interfaces) — the WHAT half of the specs/plan pair with `planning`.

## Why it exists
Without it, a model asked for "specs" would likely produce prose that explains standard patterns, skip a TLDR, write the whole document in one pass instead of section-by-section, blend "what to build" into "how to build it" (duplicating the plan), or over-specify implementation instead of contracts. The skill forces compressed/terse output, a mandatory TLDR, a strict WHAT/HOW split, and a validation checklist before calling the spec done.

## When to engage
- Trigger: requirements need translation into specs, architecture needs documentation, or API contracts/data models need definition.
- Actor: `architect` and `planner` agents (frontmatter `agent: planner, architect`); invoked via USE SKILL from `agents/architect.agent.md`, required by `commands/coding-flow.md` (paired with `planning`) and `commands/adhoc-flow.md`, pointed to from `skills/coding/SKILL.md` resources.
- Prerequisite (`core_concepts`): "All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed"; "Discovery MUST be completed before writing specs".
- REQUIREMENTS duty: core_concepts carries "Validate request against REQUIREMENTS for gaps and conflicts; USE SKILL `requirements-use` if present" — near-identical to `agents/architect.agent.md` process #2 ("Validate request and specs against REQUIREMENTS for gaps and conflicts..."). `docs/stories/bootstrap-removed.md` records this as an intentional dual placement from the `bootstrap-execution-policy` dissolution ("MOVED-to-agents/architect.md + MOVED-to-tech-specs — deliberate dup per ruling"), not drift; edit both together.

## How it works
SKILL.md is one flat XML pass: `role` → `when_to_use_skill` → `core_concepts` (prep/discovery/REQUIREMENTS gates, WHAT/HOW split with `planning`, Tech Spec Flow: TOC → section-by-section → separate integrity pass → TLDR, 11-item spec section list) → `request_size_scaling` (SMALL/MEDIUM/LARGE table: output form, sections, detail, length, diagrams, security depth) → `spec_rules` (11 numbered rules) → `design_principles` (SRP/SOLID/KISS/DRY/YAGNI/MECE — applied, not explained) → `security_considerations` (STRIDE, gated to security-critical features) → `test_data_considerations` → `validation_checklist` (10 items) → `best_practices` → `pitfalls` → `resources` (points to `planning`). No `assets/` or `references/` subfolder exists — the entire skill lives in this one SKILL.md.

## Mental hooks & unexpected rules
- Best practice: wrap specs output in a `CRITICAL` marker with attribute `ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS"` — the model shields its own spec output from being compacted or summarized downstream.
- "Do NOT repeat across both. Keep consistent. When one changes, verify the other." — every edit to spec content carries a mandated cross-check against the companion plan.
- Role line folds the style mandate into the persona itself: "writing them compressed, terse, using unicode chars, terms, no hieroglyphs".
- "Sequence diagram when 4+ actors involved" appears in both `spec_rules` and `validation_checklist` — one actor-count threshold gates diagrams twice.
- `security_considerations applies="security-critical features: auth, payments, PII, FedRAMP"` — an explicit narrow gate, not a default section for every spec.

## Invariants — do not change
- Frontmatter `name: tech-specs` equals the folder name; registered in `docs/definitions/skills.md` (line 9) — renaming either side breaks the registry link.
- `description` sits at the schema's "~25 tokens, keyword-dense" budget (`docs/schemas/skill.md`); current text is already at that budget — do not pad it with explanation.
- `disable-model-invocation: false`, `user-invocable: true` — matches `docs/stories/skills-refactoring.md`'s listing of `tech-specs` among `user-invocable: true` capability skills; flipping either changes menu/discovery behavior other files assume.
- `agent: planner, architect` — `architect.md` is the actual USE SKILL invoker; `planner.md` only consumes the resulting spec ("approved intent/specs"), it does not itself invoke this skill. Don't assume symmetry between the two names.
- The WHAT/HOW split with `planning` is authoritative on this side: `skills/planning/README.md` states "the authoritative statement of this contract lives on the `tech-specs` side, not here" — do not move that wording into `planning`.
- Planning-mode persistence is NOT declared here; it lives in `rosetta/SKILL.md`: "In planning mode: `planning` + `tech-specs` outputs → store per system prompt, never `plans/` (read-only)". Don't add a conflicting local storage rule.
- The 11-item spec section list and the SMALL/MEDIUM/LARGE scaling table are load-bearing for `commands/coding-flow.md` and `commands/adhoc-flow.md` size-based routing — check those workflows before renaming sections or changing table bands.
- `resources` names `planning` in bare skill-name form, not `USE SKILL` — matches the convention `skills/coding/README.md` documents ("once a skill name is in context it's referenced directly rather than via `USE SKILL`").

## Editing guide
Safe to change: `role` prose, individual `spec_rules` wording, `pitfalls`, `best_practices` other than the CRITICAL-wrapper convention, ordering inside the Tech Spec Flow. Handle with care: the spec-section list and scaling table (external workflows key off them), the REQUIREMENTS-validation bullet (deliberately duplicated with `agents/architect.agent.md` — edit together), and the `planning` companion pointer/WHAT-HOW wording (authoritative copy lives here). No `assets/`/`references/` split exists yet — new reasoning or process detail goes straight into SKILL.md. Referenced by: `agents/architect.agent.md` (invoker), `agents/planner.agent.md` (consumer), `commands/coding-flow.md` / `commands/adhoc-flow.md` (required skill), `skills/coding/SKILL.md` and `skills/planning/README.md` (resource pointers), `rosetta/SKILL.md` (planning-mode storage rule), `skills/orchestration/assets/o-team-manager.md` (single-source-of-truth blueprint reference), `docs/definitions/skills.md` (registry).
