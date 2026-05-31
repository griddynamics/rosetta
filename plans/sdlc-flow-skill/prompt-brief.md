# Prompt Brief — sdlc-flow

## Original User Intent (verbatim, never deviate)

"Make a skill that reads sdlc.md from workspace root, which contains sdlc processes defined in high level by humans (example: pre-release checklist, feature branching, documentation post implementation, PR review checklist, PR creation checklist, verification checklist, etc). Skill detects actions required and uses todo tasks to execute those actions reliably. It also performs discovery and meta-process engineering (to identify exactly what steps are needed to fully complete the work by first defining thinking aspects/best practices/etc and asking subagent to generate such plan with proper order of actions), then reviewer subagent checks the plan (and fixes it), original user intent is always passed all the way to prevent deviation. Once plan is good, all todo tasks are created main agent/subagents (planner to decide, based on size of the work) execute required work one-by-one. Use subagents itself to generate this skill."

## Confirmed Decisions (HITL)

| # | Decision | Choice |
|---|---|---|
| 1 | Artifact shape | **SKILL + companion WORKFLOW** (multi-phase) |
| 2 | Missing `sdlc.md` behavior | **Halt, instruct user, propose template; NO file creation without approval** |
| 3 | Task tracking | **Built-in todo tasks ALWAYS** (coding-agent-agnostic — Claude Code, Cursor, Codex, Copilot each have their own native todo tool) |
| 4 | Execution routing | **Planner subagent decides per-action routing table; reviewer verifies** |

## Deliverables

1. **SKILL** — `instructions/r2/core/skills/sdlc-flow/SKILL.md`
2. **WORKFLOW** — `instructions/r2/core/workflows/sdlc-flow.md` (multi-phase orchestration)
3. **Index updates** — `docs/definitions/skills.md`, `docs/definitions/workflows.md`

## Purpose / When to use

Activate when a user requests SDLC-process execution against the workspace's `sdlc.md` (e.g., "run the pre-release checklist", "follow our PR process", "execute SDLC for this feature"), or when an upstream workflow needs to honor workspace-defined SDLC processes.

The skill is the **executor** of human-authored, high-level SDLC processes. It is not a process-authoring tool; humans own `sdlc.md`.

## Core capability set (MECE)

1. **Read** `sdlc.md` from workspace root (path discoverable via `gain.json` if overridden).
2. **Parse & detect** required actions (checklists, gates, conditions, ordering).
3. **Discovery** — gather workspace-local context relevant to detected actions (existing patterns, tools, files).
4. **Meta-process engineering** — define thinking aspects / best practices / quality gates needed to fully complete each action.
5. **Plan generation** — planner subagent produces ordered execution plan + per-action routing (main vs subagent).
6. **Plan review** — reviewer subagent inspects plan, fixes deviations, confirms intent preservation.
7. **HITL approval gate** — user explicitly approves the plan before todos are created.
8. **Built-in todo task creation** — one todo per actionable step from the approved plan.
9. **Execution loop** — execute one todo at a time, mark complete only with evidence; route per planner's table.
10. **Original-intent propagation** — every subagent dispatch carries the verbatim user intent + originating `sdlc.md` line/section reference.
11. **Final validation** — verify all required actions are completed and evidenced.

## Out of scope (forbid scope creep)

- Authoring or editing `sdlc.md` content (humans own it; exception: scaffold a starter template only after explicit user approval per decision Q2 — but actual content authoring is the human's job).
- Replacing `plan-manager` or `planning` skill (this skill orchestrates around them, does not duplicate).
- Inventing SDLC actions not present in `sdlc.md`.
- Hard-coding any specific SDLC process (pre-release, PR, branching) — content is workspace-defined.

## Inputs

- `sdlc.md` at workspace root (or path from `gain.json`).
- User invocation / triggering request.
- Workspace state (repo files, current branch, etc.) as needed for detection.
- Original user intent string (passed through end-to-end).

## Outputs

- Built-in todo tasks (one per detected action / sub-step from approved plan).
- Execution evidence per todo (file paths, command output, links).
- A short execution report at end (what ran, what was skipped with reason).
- (Optional) Plan persistence under `plans/sdlc-<run-id>/` for LARGE runs.

## Subagent topology

| Phase | Subagent | Role |
|---|---|---|
| Detect | discoverer | Parse `sdlc.md`, list actions, gather minimal workspace context |
| Plan | planner | Meta-process engineering, ordered WBS, per-action routing table (main vs subagent) |
| Review | reviewer | Inspect plan for intent preservation, gaps, ordering errors; produce fix list |
| Execute | engineer / discoverer / reviewer / validator | Per planner's routing |
| Validate | validator (or main) | Confirm all required actions completed with evidence |

## Critical contracts

- **Intent propagation** — every subagent dispatch prompt MUST include verbatim original user intent AND the originating `sdlc.md` section/line.
- **HITL gates** — (a) before todos are created (plan approval), (b) when `sdlc.md` is missing, (c) when reviewer flags risk above threshold, (d) at final report.
- **Coding-agent agnosticism** — never name a specific todo tool API; use phrase "built-in todo tasks".
- **No duplication** — defer to `orchestrator-contract`, `plan-manager`, `planning`, `hitl`, `subagent-contract` skills via standard ACQUIRE/USE SKILL aliases; do not re-implement.
- **Anti-deviation** — main agent owns intent fidelity; reviewer subagent is mandatory; planner output rejected if it adds actions not derivable from `sdlc.md`.

## Failure modes to address

- `sdlc.md` missing → halt + instruct (decision Q2 A).
- `sdlc.md` ambiguous / underspecified → planner raises HITL question, never guesses.
- Plan adds actions not in `sdlc.md` → reviewer rejects, planner re-runs with stricter constraint.
- Subagent drift from intent → orchestrator detects via output schema (intent echo), re-dispatches.
- Todo tool API varies per coding agent → skill describes behavior in agent-agnostic terms.
- Long sdlc.md (50+ actions) → planner partitions; LARGE-size routing forces subagent execution.

## Sizing policy (size-aware)

| Size | Trigger | Behavior |
|---|---|---|
| SMALL | 1-2 actions, single area | Main agent executes all; built-in todos only |
| MEDIUM | 3-10 actions, single area | Mixed routing; full HITL |
| LARGE | 10+ actions or multi-area | Subagent-heavy; persist plan; optional `plan-manager` |

## Style / Length

- Skill: concise, ≤ ~200 lines. Frontmatter + role + when_to_use + process + pitfalls.
- Workflow: phases with explicit step IDs, subagent assignments, inputs/outputs per phase, HITL gates, validation checklist.
- Follow `coding-agents-prompt-authoring/references/pa-rosetta.md` conventions (frontmatter, command aliases, no sibling awareness violations).

## Success criteria (validation)

- [ ] Reading `sdlc.md` always produces a parsed action list before any planning.
- [ ] Halts cleanly with instructions when `sdlc.md` is missing.
- [ ] Planner subagent invocation produces routing table per action.
- [ ] Reviewer subagent invocation produces inspection report and (if needed) fix list.
- [ ] Original user intent appears verbatim in every subagent prompt.
- [ ] Built-in todo tasks created from approved plan; one per action/sub-step.
- [ ] HITL approval enforced before todos materialize.
- [ ] No duplication of `plan-manager` / `planning` / `orchestrator-contract` content.
- [ ] Coding-agent-agnostic wording (no Claude Code-specific tool names).
- [ ] Indices updated (`docs/definitions/skills.md`, `docs/definitions/workflows.md`).

## Open questions (none blocking; defaults documented)

- Whether to integrate with `plan-manager` for LARGE size — default: optional, agent decides.
- Whether to support multiple `sdlc.md` files (per-module) — default: single workspace-root `sdlc.md` only; multi-file is future scope.
