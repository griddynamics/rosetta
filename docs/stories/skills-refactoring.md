# Story: Skills Taxonomy Reconciliation + Frontmatter Refactoring

Status: IN PROGRESS — r3 W1/W2/W3/W4 done; r2 visibility flags ported. Remaining: W0 (taxonomy), W5 (guardrails reframe), W6 (doc sync), W2 cross-IDE research.

## Done (this PR — feat/skills-visibility-flags)

- **W4** — All descriptions compressed (verb-first ≤25 tokens). 4 critical skills kept verbatim.
- **W3** — Phase files `user-invocable: false`; top-level flows `true`. Descriptions → `Phase N <label> of <flow>`.
- **W2** — All 44 r3 skills carry both `user-invocable` + `disable-model-invocation`. r2 ported (35 skills). Cross-IDE matrix deferred (W2 research).
- **W1 init-workspace** — 7 skill bodies inlined into phase files; skill folders deleted (r3 only).
- **W1 gitnexus** — `gitnexus-{tools,cli,setup}` merged into single `gitnexus` skill with `assets/gitnexus-{cli,setup}.md` (r3 only).
- **W1 coding-iac** — folded into `coding` via `assets/iac.md` (prior pass).
- **codemap skill** — new `skills/codemap/` (`disable-model-invocation: true`, `user-invocable: false`); scripts in assets; wired into init-workspace-flow-discovery, coding-flow discovery (recommended), reverse-engineering.
- **Various** — `orchestrator-contract` read-only clarification; `questioning` rules refined; `coding-flow` architect-background guidance; `coding-agents-prompt-adaptation` removed; `hooks-authoring` → `coding-agents-hooks-authoring`.

## Open Workstreams

- **W0 — Taxonomy reconciliation.** Update `docs/definitions/skills.md`: rename `plan-manager`→`operation-manager`; add `load-context/load-workflow/load-context-instructions/codemap`; remove `init-workspace-*` (now phases), `gitnexus-{cli,setup,tools}` (now one `gitnexus`); keep `discovery` distinct, `context-engineering` TBD. Same for `docs/definitions/workflows.md` (lists unbuilt flows, omits built ones). Zero dangling `USE SKILL` / `ACQUIRE` refs after.
- **W5 — Native-trigger reframe.** Shrink `bootstrap-guardrails.md` to a minimal pointer — remove inline trigger restatements already carried by skill descriptions. Done when: rule no longer repeats any trigger the description already carries.
- **W6 — Doc sync.** Update `coding-agents-prompt-authoring/references/pa-rosetta.md`, `pa-rosetta-intro-for-AI.md`, `pa-schemas.md`, `pa-knowledge-base.md`, `pa-intake.md`, `docs/schemas/skill.md`, `docs/ARCHITECTURE.md` to reflect: new visibility-flag model, codemap skill, gitnexus consolidation, init-workspace-* removed, canonical skill list.
- **W2 cross-IDE research.** Produce IDE→attribute matrix (Claude Code, Cursor, Copilot, Codex, OpenCode) for hide-from-menu vs disable-auto for both skills and commands. Apply per-IDE frontmatter; extend `plugin_generator.py` where an IDE ignores the flag.

## Confirmed decisions (keeper — needed for W0/W5/W6)

- `disable-model-invocation: true` ONLY for: `init-*` phases, workflow phase files, `specflow-use`.
- User-facing skills (`user-invocable: true`): all capability skills + `hitl`, `operation-manager`, `questioning`, `specflow-use`.
- `risk-assessment`: `user-invocable: false`.
- `reverse-engineering`, `tech-specs`: `user-invocable: true`.
- Asset references in skills: use `ACQUIRE <skill/assets/file> FROM KB` (full path) — not bare `assets/` paths.
- Release targeting: default `r3`; ask each request which release(s) to apply.
- `context-engineering`: TBD placeholder in definitions, do not build.
- `discovery`: distinct skill, separate from codemap.
