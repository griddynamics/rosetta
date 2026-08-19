# planning
Produces a graph of session plan files for incremental modernization. Each file is later executed by a coding agent. Human WBS is a separate high-priority branch, not the default.

## Why it exists
Without it, a plan restates docs, narrates process the executor already knows, or dumps code instead of WHAT + CHECKLIST. The skill forces terse session files, project-specific traps only, dependency-ordered decomposition, and a handoff index that stays factual.

## When to engage
- Default: a multi-session (or mergeable one-session) modernization plan for an AI executor that already has the same env, docs, subagents, and skills.
- Human work breakdown: `APPLY SKILL FILE` `assets/pl-human.md` and `assets/pl-wbs.md` as high priority.
- Skip: small or trivial request → do nothing.
- One session: merge into `plans/<FEATURE>/<FEATURE>-PLAN.md` and `plans/<FEATURE>/HANDOFF.md`.
- No `<when_to_use_skill>` block. Frontmatter has no `agent`. Callers still `USE SKILL planning` from `agents/architect.md`, `agents/planner.md`, `commands/coding-flow.md`, `commands/adhoc-flow.md`.

## How it works
`role` → `target` (session-file graph for a later coding agent) → `core_concepts` (human/skip/one-session gates; six hard rules for session files; decomposition; plan-index must-contain; handoff; finish checks) → `output` (four path patterns).

Loaded assets (human branch only): `pl-human.md`, `pl-wbs.md`. Present on disk but not referenced by SKILL.md: `pl-functional-requirements.md`, `pl-risk-and-unknowns.md`.

## Mental hooks
- `"State only WHAT to do and final CHECKLIST"` — no process, methodology, workflow steps, or code (contracts allowed). Discovery/design/review/verify stay with the executor.
- `"Assume high competence"` / `"Do not restate the docs. Reference them by path."`
- `"Encode only project-specific traps"` — five named kinds (asymmetries, deprecated ports, must-stay-empty artifacts, hidden ordering, known env quirks).
- Line budget: 20–30 WHAT, 40–50 CHECKLIST.
- Session skeleton: `# NN — Title`, optional `Depends on:`, `## Do`, `## Subagents`, optional `## Rules`/`## Notes`, `## Done when`, `## Checklist`.
- `"If request is small or trivial -> SKIP, DO NOTHING."`
- Shared foundations first; leaf-first; global behaviors last and alone; file ownership to keep parallel sessions from colliding.
- Handoff is status/evidence/blockers/decisions — not a second plan.

## Invariants — do not change
- Frontmatter `name: planning` equals the folder name and `docs/definitions/skills.md` (`- planning`).
- `description` is still the auto-invocation string and still names EARS, sequenced WBS, and HITL checkpoints. The body does not use those terms. Do not pad the description; changing it changes auto-activation.
- Output paths: `plans/<FEATURE>/<FEATURE>-PLAN.md`, `<NN>-plan-<slug>.md`, `HANDOFF.md`, `<NN>-handoff.md`. Two `output` lines are missing a closing backtick in SKILL.md.
- Index contract: read-first list, one-line governing rules with authority pointers, where findings land, file-ownership, per-phase table `# | Session | Depends on | Parallel with`, unlisted = sequential, parallelism only when sessions share no files, alone-sessions flagged.
- Alias grammar: `APPLY SKILL FILE` for `assets/pl-human.md` and `assets/pl-wbs.md`. Do not rewrite as `USE SKILL`.
- Callers still speak WBS / size-scaled plans (`agents/planner.md`, `commands/adhoc-flow.md` "plan-wbs"). Edit those with this skill, not instead of it.
- `tech-specs` still pairs WHAT/HOW with `planning`; this SKILL.md does not restate that pair.

## Editing guide
Safe: `role`/`target` wording, trap examples, checklist example items. Care: skip/human/one-session gates, session skeleton headings, line budgets, `plans/<FEATURE>/` path contract, index table columns, human-branch asset names. New session-graph rules go in SKILL.md. Human WBS schema stays in `pl-human.md` / `pl-wbs.md` (those files still describe the old EARS/WBS flow). Unreferenced assets: delete or re-wire; do not assume SKILL.md loads them. `plugins/**` is generated. Referenced by: `agents/architect.md`, `agents/planner.md`, `commands/coding-flow.md`, `commands/adhoc-flow.md`, `skills/tech-specs/SKILL.md`, `skills/coding/SKILL.md`, `docs/definitions/skills.md`.
