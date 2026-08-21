# planning
Produces a graph of session plan files for incremental modernization. Each file is later executed by a coding agent. Human WBS is not here: it lives in the `backlog` skill.

## Why it exists
Without it, a plan restates docs, narrates process the executor already knows, or dumps code instead of WHAT + CHECKLIST. The skill forces terse session files, project-specific traps only, dependency-ordered decomposition, and a handoff index that stays factual.

## When to engage
- Default: a multi-session (or mergeable one-session) modernization plan for an AI executor that already has the same env, docs, subagents, and skills.
- Human work breakdown: not this skill — redirect to `USE SKILL backlog`, mode `work-breakdown`.
- Skip: small or trivial request → do nothing.
- One session: merge into `plans/<FEATURE>/<FEATURE>-PLAN.md` and `plans/<FEATURE>/HANDOFF.md`.
- No `<when_to_use_skill>` block. Frontmatter has no `agent`. Callers still `USE SKILL planning` from `agents/architect.agent.md`, `agents/planner.agent.md`, `prompts/coding-flow.prompt.md`, `prompts/adhoc-flow.prompt.md`.

## How it works
`role` → `target` (session-file graph for a later coding agent) → `core_concepts` (human/skip/one-session gates; six hard rules for session files; decomposition; plan-index must-contain; handoff; finish checks) → `output` (four path patterns).

No assets. Human-WBS content lives in `skills/backlog/assets/work-breakdown.md` and `assets/work-breakdown-templates.md`.

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
- The human-work-breakdown line is a compatibility redirect to `USE SKILL backlog`. It knowingly deviates from the prompt-authoring boundary rule that a skill must not name a sibling skill; it exists so existing callers that ask `planning` for a human WBS still reach the owner of that method. Do not "fix" it by deleting the redirect.
- Callers still speak WBS / size-scaled plans (`agents/planner.agent.md`, `prompts/adhoc-flow.prompt.md` "plan-wbs"). Edit those with this skill, not instead of it.
- `tech-specs` still pairs WHAT/HOW with `planning`; this SKILL.md does not restate that pair.

## Editing guide
Safe: `role`/`target` wording, trap examples, checklist example items. Care: skip/human/one-session gates, session skeleton headings, line budgets, `plans/<FEATURE>/` path contract, index table columns, human-branch asset names. New session-graph rules go in SKILL.md. Human WBS schema now belongs to `skills/backlog/assets/work-breakdown.md`; do not re-add it here. `plugins/**` is generated. Referenced by: `agents/architect.agent.md`, `agents/planner.agent.md`, `prompts/coding-flow.prompt.md`, `prompts/adhoc-flow.prompt.md`, `skills/tech-specs/SKILL.md`, `skills/coding/SKILL.md`, `docs/definitions/skills.md`.
