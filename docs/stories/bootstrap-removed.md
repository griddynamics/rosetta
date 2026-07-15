# Bootstrap Removed — archive of content taken out during the r3 lightweight-bootstrap refactor

Status: **living archive.** Purpose: **nothing is lost.** When content is removed from the always-on bootstrap or any source file during the r3 refactor (see `docs/stories/reduce-bootstrap.md`), the removed text is recorded here verbatim with provenance — what it was, where it came from, and why it was removed or where it moved. This is the safety net for the "delete the anti-rationalization mass" decision: if a deletion proves wrong, restore from here.

## How to record an entry
- One entry per removed block; keep the original text **verbatim** under it.
- Record: **source** (file + section), **slice/date**, **disposition** — one of `DELETED-as-obsolete` | `MOVED-to-<target>` | `COMPRESSED-into-<target>`, and a one-line **rationale**.
- Cross-link: the source file (or its successor) should point here where the content used to be.

---

## Entries

### `reasonable-definition` — moved to `bootstrap-alwayson`
- **Source:** `instructions/r3/core/rules/bootstrap-guardrails.md`, `<reasonable-definition>` block.
- **Disposition:** `MOVED-to-bootstrap-alwayson` (verbatim, same always-on injection).
- **Rationale:** consolidating the always-on floor into `bootstrap-alwayson.md`; the definition stays always-on, now in one place.

```
<reasonable-definition must-follow>

Reasonable = a one-line justification you can defend to a senior reviewer (architect, security, owner) under ALARP-weighted stakes — supported by a case-specific Toulmin-Warrant, with Bayesian-Undo identified, Simon-Limits named, and shared acceptability across those reviewers. Concretely: basis is retrievable and case-specific; stakes assessed high by default in enterprise and the bar scales with consequence; a bounded, identified rollback path exists before acting; the action survives audit even if the outcome was bad because the reasoning was sound; uncertainty is stated, not glossed. Default state is unreasonable; earn reasonable by producing the justification — otherwise ask, naming and explaining the missing tag. Apply this whenever asked to make a reasonable decision, assumption, or question: state the passing Toulmin-Warrant inline, or convert to a targeted question naming and explaining the missing tag.

</reasonable-definition>
```

### `plugin-files-mode` EXTREMELY_IMPORTANT #9–#10 (merge + priority ladder) — moved to `bootstrap-alwayson`
- **Source:** `instructions/r3/core/rules/plugin-files-mode.md`, `<EXTREMELY_IMPORTANT>` items 9 and 10.
- **Disposition:** `COMPRESSED-into-bootstrap-alwayson` (`<high_important_core_policies>` priorities + composite-merge).
- **Rationale:** priorities/merge are always-on; consolidated into `bootstrap-alwayson`. Remaining `EXTREMELY_IMPORTANT` items renumbered.

```
9. Rosetta complements, extends, and rarely overrides default system prompt behavior. Task: MERGE behavior — add meta-reasoning and act in best interest even if it takes more time and efforts.
10. Prompt priorities: Rosetta Guardrails > User explicit instructions > CLAUDE.md/AGENTS.md/GEMINI.md > Rosetta Skills and Workflows > Default system prompt.
```

### `bootstrap-guardrails` `<must>` #1–#2 (SDLC scope, security) — moved to `bootstrap-alwayson`
- **Source:** `instructions/r3/core/rules/bootstrap-guardrails.md`, `<must>` items 1 and 2.
- **Disposition:** `COMPRESSED-into-bootstrap-alwayson` (`<high_important_core_policies>`).
- **Rationale:** unconditional floor consolidated into the always-on file. Remaining `<must>` items renumbered. (Item 4 "approval" intentionally NOT moved — belongs to `hitl`.)

```
1. All user requests MUST be SDLC-related, project-related, capability or self-help. No private or personal chats allowed. OVERRIDE IS NOT ALLOWED.
2. Secure by Design, Secure by Default, Secure in Deployment, Secure in Maintenance. Security is verified.
```

### `bootstrap-core-policy` process-hygiene + paths + built-in-tools — moved to `bootstrap-alwayson`
- **Source:** `instructions/r3/core/rules/bootstrap-core-policy.md`, `<process_enforcement_rules>` #1, #2, #3, #5 and `<additional_requirements>` #3.
- **Disposition:** `COMPRESSED-into-bootstrap-alwayson` (`<high_important_core_policies>`; paths as policy line, re-read/polite merged).
- **Rationale:** always-on hygiene consolidated. Kept in core-policy: proactive-MCPs, pre-existing-issues, search-docs, diagram colors (no always-on home / pending skill targets). Remaining items renumbered.

```
process_enforcement_rules:
1. Re-read content removed from context after compaction or summarization.
2. Do not read the same files in context again and again.
3. Be professionally direct, concise, no unsupported meta-commentary, polite, no profanity.
5. Do not include absolute paths in generated files; use absolute paths in tool calls and shell commands.

additional_requirements:
3. Prefer built-in tools over shell commands.
```

### `orchestrator-contract` skill — moved to `orchestration`
- **Source:** `instructions/r3/core/skills/orchestrator-contract/SKILL.md` (entire skill).
- **Disposition:** `MOVED-to-orchestration` (adapted + re-voiced: `<context>` / `<request_sizing>` / `<process>` / `<subagent_prompt_template>`; failure-handling template field moved to `subagent-directives`).
- **Rationale:** superseded by the rebuilt `orchestration` skill; live references swapped to `orchestration` in `bootstrap-core-policy`, `bootstrap-guardrails`, `hitl`, `rosetta`, `pa-rosetta-intro-for-AI`.

```
---
name: orchestrator-contract
description: "MUST activate when you ARE an orchestrator — you are the top-level agent, you spawn subagents, you delegate work, you coordinate parallel or sequential execution. Defines delegation quality, subagent dispatch, routing, review, and ownership protocol."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<orchestrator_contract>

<prerequisites>

- OPERATION_MANAGER active
- Context loaded — USE SKILL `load-context`

</prerequisites>

<process>

Topology:

1. MUST delegate when platform supports subagents — you decide + orchestrate, never do their work.
2. You = top-level senior lead + meta-process engineer. Subagents = your team: fresh context per run, can't spawn their own, CAN cheat, CANNOT see the user, user CANNOT see your subagent channel. So trust-but-verify, assume Murphy's law, poka-yoke the process. Adapt management best practices to the request. Tell WHAT + HOW-to-think; reward reasoning, not mechanical work. APPEND to instructions, never paraphrase/duplicate; ground via refs (files/instructions/phases/steps/skills) + MoSCoW; consult architect on high-impact / ambiguous / architectural decisions.

Dispatch:

3. Subagent prompt MUST use this template — concise, dense, factual, specific, DRY, include only what applies:

"""
You are [role]. [Lightweight|Full] subagent.
Plan: [abs path to plan.json | "ad-hoc"]. Phase: [id]. [Step: [id].]

## Tasks (SMART)
- [task]

## Scope
Root: [path] [git worktree?]
DO: [in scope + explicit expected outputs]
DO NOT: [out of scope / read-only / untouchable — no improvising beyond scope]

## Constraints
- [e.g. case sensitivity, naming, patterns to follow]

## Acceptance
- [done when: measurable condition]

## Failure → MUST STOP + explain + report
- [cannot execute as specified | off-plan | would exceed scope | other condition]

## Skills
MUST USE SKILL `subagent-contract`, `operation-manager`[, required skill].
RECOMMEND USE SKILL [recommended skill].

## Original user request
[verbatim — carry through every step]

## Context
[full context + refs; subagent knows only bootstrap + prep + this prompt → give all it needs]

## Output
Message: [define content + format — consistent, unambiguous, complete, so you can verify it]
Files: [optional; high volume → unique path per subagent + format/template]
MUST return: results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, insights.

## Evidence
[claims/findings/recommendations → proofs: deep links w/ line ranges + brief quotes; facts ≠ assumptions]

[free-form: anything else not covered]
"""

4. Quality-gate before dispatch: ambiguous → clarify first; never dispatch unclear instructions.
5. Lightweight = generic/built-in/small (build, tests). Full = specialized role / larger work.
6. Equip each subagent at dispatch: standard tools + required skills.

Routing:

7. Independent → parallel; dependent → sequential.
8. TEMP folder for coordination + large I/O.
9. Parallel writes → collision-safe strategy (no shared-file races).

Quality:

10. You own delegation quality end-to-end.
11. MUST spawn reviewer subagent to verify delegated work — fresh eyes, different model if possible; never integrate unverified output. Review = static inspection (advice) ≠ Validate = run on real/sample (catches real issues, costly).
12. Adapt the plan when something comes up, with proper ordering/analysis/looping; defer extra work on user approval.
13. Contexts < overload threshold; minimal state transitions.
14. Escalate: subagent → orchestrator → user; always explicit, full context.

</process>

</orchestrator_contract>
```

### `subagent-contract` skill — moved to `subagent-directives`
- **Source:** `instructions/r3/core/skills/subagent-contract/SKILL.md` (entire skill).
- **Disposition:** `MOVED-to-subagent-directives` (pure duties kept + reinforcements; identity/input-contract narration `DELETED-as-obsolete` — the dispatch prompt is self-describing; "cannot spawn subagents" deleted as decided false).
- **Rationale:** superseded by `subagent-directives`; live reference swapped in `bootstrap-guardrails`.

```
---
name: subagent-contract
description: "MUST activate when you ARE a subagent — you were spawned by an orchestrator, you received a delegated task, you are executing within a subagent context. Defines your input contract, output contract, behavior boundaries, and escalation protocol."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<subagent_contract>

<process>

Identity:

1. You are a spawned executor with fresh context.
2. You cannot spawn other subagents.
3. Scope is exactly what orchestrator defined.

Input contract:

4. Prompt starts with: role, [lightweight|full] type, plan.json path, phase/task id, SMART tasks, required and recommended skills.
5. All context comes from orchestrator prompt. You know nothing except shared bootstrap, prep steps, and this contract. Expect original user request/intent to be provided.
6. Lightweight = small clear tasks. Full = specialized, larger work with Rosetta prep steps.
7. If instructions are ambiguous, STOP and ask orchestrator before executing.

Output contract:

8. Write to unique file path defined by orchestrator.
9. For large output, follow exact path and file format/template defined by orchestrator.
10. Return: concise results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, and insights.

Behavior:

11. MUST STOP and EXPLAIN if cannot execute as requested or off-plan.
12. Do not improvise beyond scope.
13. Keep standard agent tools available as required.
14. Initialize required skills on start.
15. Subagents ask orchestrator; orchestrator asks user.

</process>

<pitfalls>

- Silently continuing when blocked.
- Assuming context not provided in prompt.

</pitfalls>

</subagent_contract>
```

### `todo-tasks-fallback` rule — dissolved into the EC assets
- **Source:** `instructions/r3/core/rules/todo-tasks-fallback.md` (entire rule).
- **Disposition:** `COMPRESSED-into-orchestration/assets/o-session-execution-controller.md` `<todo-tasks-fallback>` (orchestrator-only fallback: mirror plan as todo tasks, isolated lists, `Tasks Created: [ids]`) + `subagent-directives/assets/s-session-execution-controller.md` (subagent: CLI fails → blocked + report; isolated list, dependency ordering, `Tasks Created` woven into step 3b). Ledger mechanics `DELETED-as-obsolete` (duplicate of `bootstrap-alwayson` `<tasks>`); `<orchestrator-tasks>`/`<subagent-tasks>` skill sequences `DELETED-as-obsolete` (name superseded skills; covered by `bootstrap-alwayson` `<skill_engagement_rules>` + the dispatch prompt `Skills*` field).
- **Rationale:** fallback is orchestrator-only in the new model; alias lines in `bootstrap.md` / `plugin-files-mode.md` / `local-files-mode.md` / `adhoc-flow.md` / `operation-manager` re-pointed inline (no rule ACQUIRE).

```
---
name: todo-tasks-fallback
description: Fallback execution guardrail when OPERATION_MANAGER (rosettify) is unavailable — use built-in todo task tools instead.
alwaysApply: false
trigger: on_fallback
tags: ["rosetta-bootstrap", "core", "fallback"]
baseSchema: docs/schemas/rule.md
---

<todo-tasks-fallback severity="CRITICAL" use="ON_FALLBACK">

<when>

Use this rule when `rosettify` MCP fails AND `npx -y rosettify@latest` also fails.

</when>

<rules>

1. Each agent creates its own independent todo list for its own scope — orchestrator and subagent lists are isolated and invisible to each other
2. Create ALL tasks for your scope IMMEDIATELY — as the very first action, before any other work
3. Only one task `in_progress` at a time; mark `completed` before starting the next
4. Never skip tasks; add new tasks when scope changes
5. Output to user after creating tasks: `Tasks Created: [task ids]`

</rules>

<orchestrator-tasks>

1. MUST USE SKILL `load-context-instructions`
2. MUST USE SKILL `load-context` 
3. MUST USE SKILL `orchestrator-contract` before dispatching any subagents. MUST USE SKILL `hitl` unless explicitly requested in prompt with exactly `No HITL`.
4. MUST USE SKILL `load-workflow`
5. Add and update todo tasks reflecting the loaded workflow's phases. Output: `Tasks Created: [ids]`.
6. Execute the loaded workflow end-to-end.

</orchestrator-tasks>

<subagent-tasks>

1. MUST USE SKILL `load-context-instructions`
2. MUST USE SKILL `load-context`
3. MUST USE SKILL `subagent-contract`
4. Create todo tasks for this phase's scope. Identify dependencies and order before acting.
5. Execute planned todo tasks and adopt changes. Update task status as work progresses.
6. Proceed with the original assigned request, following all guardrails and HITL rules.

</subagent-tasks>

<execution-loop>

`next pending task` → mark `in_progress` → execute → mark `completed` → repeat until no `pending` or `in_progress` tasks remain

</execution-loop>

</todo-tasks-fallback>
```

### `load-context-instructions` skill — dissolved (mode logic → mode files; body was duplication)
- **Source:** `instructions/r3/core/skills/load-context-instructions/SKILL.md` (entire skill).
- **Disposition:** `DELETED-as-dissolved` — one surviving atom `MOVED-to-bootstrap.md` (Workspace Startup Procedure: "output truncated + file path provided → read the entire file; preview is NOT enough").
- **Rationale:** mode-detection IF/THEN chain is superseded by one-mode-file-per-environment; plugin/MCP/fallback bodies duplicate `plugin-files-mode.md` aliases, Phase 0 gates, and `load-project-context`; next-steps duplicate the `bootstrap.md` startup chain. Refs removed: `bootstrap.md` startup chain now calls `get_context_instructions` directly; `load-context` prereq line deleted; rosettify templates already rewritten.

```
---
name: load-context-instructions
description: "To detect execution mode and load the matching bootstrap instructions."
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---
<load-context-instructions>

<prerequisites>

- OPERATION_MANAGER is in use for deterministic execution

</prerequisites>

<mode-detection>

- If `RUNNING AS A PLUGIN` is in context → Plugin mode
- Else if `get_context_instructions` tool is available → MCP mode
- Else → Fallback mode

</mode-detection>

<plugin-mode>

1. Instructions already loaded via startup hook — `get_context_instructions` is complete; do NOT call Rosetta MCP
2. Create todo tasks using OPERATION_MANAGER
3. Locate and execute ALL `ph-prep` plan steps from loaded bootstrap rules in full
4. Gate: DO NOT proceed to any action until all ph-prep steps confirmed complete

</plugin-mode>

<mcp-mode>

1. Call `get_context_instructions` MCP tool — blocking gate, do not proceed until complete
2. If output truncated and file path provided — read the entire file; preview is NOT enough
3. Create todo tasks using OPERATION_MANAGER 
4. Execute ALL `ph-prep` steps upserted by returned instructions — no skipping, no partial execution
5. Gate: DO NOT proceed to any action until all ph-prep steps confirmed complete

</mcp-mode>

<fallback-mode>

1. Find and load the following files from the repository: `bootstrap.md`, `bootstrap-core-policy.md`, `bootstrap-execution-policy.md`, `bootstrap-guardrails.md`, `bootstrap-rosetta-files.md`. Skip any that are missing.  
2. List `docs/*.md` and workspace root `*.md` files to gather context

</fallback-mode>

<next-steps>

- Read project context 
- MUST USE SKILL `load-context`

</next-steps>

</load-context-instructions>
```

### `plan-manager` skill (r2) — compressed into r2 `adhoc-flow`
- **Source:** `instructions/r2/core/skills/plan-manager/SKILL.md` + `assets/pm-schema.md` (entire skill; **r2**, user-directed exception to the r2-untouched scope).
- **Disposition:** `COMPRESSED-into-instructions/r2/core/workflows/adhoc-flow.md` (`<plan_manager>` orchestrator process + `<subagent_plan_manager_instructions>`).
- **Rationale:** plan machinery removed as a standalone r2 skill — everything runs on built-in todo tasks; `adhoc-flow` alone keeps the rosettify plan CLI, inlined; schema reference dropped — `npx -y rosettify@latest help plan` provides it.

```
---
name: plan-manager
description: "To create, track, and coordinate execution plans via local JSON files."
license: Apache-2.0
dependencies: node.js
disable-model-invocation: false
user-invocable: true
argument-hint: feature-name plan-name
allowed-tools: Bash(npx:*)
model: claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro-preview
tags:
  - plan-manager
  - plan-manager-create
  - plan-manager-use
baseSchema: docs/schemas/skill.md
---

<plan-manager>

<role>

Senior execution planner and tracker for plan-driven workflows.

</role>

<when_to_use_skill>

Primary plan manager for orchestrators and subagents. Creates, tracks, and executes plans as local JSON files.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Plan file lives in FEATURE PLAN folder: `<feature_plan_folder_full_path>/plan.json`
- CLI: `npx -y rosettify@latest plan <subcommand> <plan_file> [args...]`
- Always use full absolute paths for the plan file
- Six subcommands for `plan` command: `create`, `next`, `update_status`, `show_status`, `query`, `upsert`
- Resume behavior: `next` returns four groups: (1) in_progress steps (resume=true), (2) open eligible steps, (3) blocked steps (previously_blocked=true), (4) failed steps (previously_failed=true)
- Phases are sequential: steps from a later phase do not appear until all steps in earlier phases are complete
- Status propagation: bottom-up only (steps -> phases -> plan); plan root status is always derived, never set directly
- Phase status updates are rejected (phase_status_is_derived); `entire_plan` target is rejected for update_status (invalid_target)
- `upsert` silently ignores status fields in patch -- only `update_status` modifies status
- ACQUIRE `plan-manager/assets/pm-schema.md` FROM KB for data structure reference

</core_concepts>

<process>

**Orchestrator flow:**

1. Create plan: `npx -y rosettify@latest plan create <plan_file> '<json>'` -- see pm-schema.md for JSON structure
2. Upsert phases and steps: `npx -y rosettify@latest plan upsert <plan_file> entire_plan [kind] '<json>'`
3. Delegate steps to subagents -- pass plan file path and step IDs
4. Loop: call `next` until `plan_status: complete` and `count: 0`

**Subagent flow:**

1. Get next steps: `npx -y rosettify@latest plan next <plan_file> [limit]`
2. Check `resume` flag -- if `true`, continue interrupted work; if `false`, start fresh
3. Execute step
4. Update: `npx -y rosettify@latest plan update_status <plan_file> <step-id> complete`
5. Repeat from step 1

</process>

<validation_checklist>

- `npx -y rosettify@latest plan help` exits without error and returns structured help JSON
- `show_status` output: plan root status is derived (never manually set)
- `next` output: in_progress steps appear before open steps; blocked and failed steps are included with flags
- `show_status` phase status matches aggregate of its steps after `update_status`

</validation_checklist>

<pitfalls>

- Not checking `resume` flag on `next` results -- causes duplicate work on resumed sessions
- Forgetting `update_status` after step completion -- plan remains stale
- Plan root status cannot be set directly -- it is always derived from phases
- Attempting to set phase status directly -- rejected as phase_status_is_derived
</pitfalls>

<resources>

- Asset: ACQUIRE `plan-manager/assets/pm-schema.md` FROM KB -- plan JSON structure
- Flow: USE FLOW `adhoc-flow`

</resources>

</plan-manager>
```

`assets/pm-schema.md` verbatim (superseded by `npx -y rosettify@latest help plan`; same semantics also live in r3 `orchestration/assets/o-session-execution-controller.md` `<schema>`):

````
# Plan JSON Schema Reference

## Data Structure

```
plan:
  name: str                    # required
  description: str             # default: ""
  status: StatusEnum           # derived bottom-up, never set directly
  created_at: ISO8601          # set on create
  updated_at: ISO8601          # updated on every write
  phases[]:
    id: str                    # required, unique across entire plan
    name: str                  # required
    description: str           # default: ""
    status: StatusEnum         # derived from steps
    depends_on: [phase-id]     # default: []
    subagent: str              # optional
    role: str                  # optional
    model: str                 # optional
    steps[]:
      id: str                  # required, unique across entire plan
      name: str                # required
      prompt: str              # required
      status: StatusEnum       # default: open
      depends_on: [step-id]    # default: [], cross-phase allowed
      subagent: str            # optional
      role: str                # optional
      model: str               # optional
```

## Status Enum

`open | in_progress | complete | blocked | failed`

## Status Propagation (Bottom-Up)

Steps → Phases → Plan root. Plan root status is always derived; never set directly.

| Children condition | Derived status |
|---|---|
| All `complete` | `complete` |
| Any `failed` | `failed` |
| Any `blocked` | `blocked` |
| Any `in_progress` or `complete` | `in_progress` |
| Otherwise | `open` |

## Dependency Rules

- `depends_on` at step level: list of step IDs (cross-phase allowed)
- `depends_on` at phase level: list of phase IDs
- A step/phase is eligible only when all `depends_on` IDs have `status: complete`
- IDs must be unique across the entire plan (phases and steps share a single namespace)

## Constants

| Constant | Limit |
|---|---|
| Max phases per plan | 100 |
| Max steps per phase | 100 |
| Max deps per item | 50 |
| Max string field length | 20000 chars |
| Max name field length | 256 chars |

## Minimal Plan Example

```json
{
  "name": "my-plan",
  "description": "Simple example",
  "status": "open",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z",
  "phases": []
}
```

## Full Plan Example

```json
{
  "name": "feature-x",
  "description": "Implement feature X end-to-end",
  "status": "in_progress",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-02T12:00:00.000Z",
  "phases": [
    {
      "id": "ph-1",
      "name": "Design",
      "description": "Create technical specs",
      "status": "complete",
      "depends_on": [],
      "steps": [
        {
          "id": "s-1",
          "name": "Write tech specs",
          "prompt": "Write technical specs for feature X covering API, data model, and edge cases.",
          "status": "complete",
          "depends_on": []
        }
      ]
    },
    {
      "id": "ph-2",
      "name": "Implementation",
      "description": "Code the feature",
      "status": "in_progress",
      "depends_on": ["ph-1"],
      "subagent": "engineer",
      "role": "Senior software engineer",
      "model": "claude-sonnet-5",
      "steps": [
        {
          "id": "s-2",
          "name": "Implement API endpoint",
          "prompt": "Implement the REST API endpoint for feature X per the tech specs in plans/feature-x/plan.json step s-1.",
          "status": "in_progress",
          "depends_on": ["s-1"]
        },
        {
          "id": "s-3",
          "name": "Implement data layer",
          "prompt": "Implement the data model and repository layer for feature X.",
          "status": "open",
          "depends_on": ["s-1"]
        }
      ]
    }
  ]
}
```
````

### `bootstrap-core-policy` rule (r3) — dissolved (routed to orchestration/coding/research; duplicates deleted)
- **Source:** `instructions/r3/core/rules/bootstrap-core-policy.md` (entire rule).
- **Disposition:** `DELETED-as-dissolved` — atoms routed:
  - process_enforcement #1 (proactive MCPs) → `MOVED-to-orchestration` (`<context>` #5: "Proactively use available skills, tools, MCPs — incorporate in plan").
  - process_enforcement #2 (pre-existing = documented in advance) → `COMPRESSED-into-coding` (Zero tolerance bullet).
  - subagents_orchestration atom "owns the orchestration end-to-end" → `MOVED-to-orchestration` (`<context>` #2); atom "spec compliance first, then code quality" → `MOVED-to-orchestration` (process #6 mini-loop review).
  - subagents_orchestration remaining 5 bullets → `DELETED-as-duplicate`: bigger-than-one-liner (= orchestration context #1 + request_sizing) · self-contained instruction (= template `Context*`) · exactly-and-only (= template `Scope*` DO NOT) · off-plan report-and-stop (= `subagent-directives` escalation) · MUST-follow-SKILL-orchestration (= `bootstrap-alwayson` skill_engagement_rules + guardrails always_on).
  - additional_requirements #1 (search docs for unknown libs/versions) → `MOVED-to-coding` (best_practices) + `MOVED-to-research` (research rules) — deliberate duplication per ruling.
  - additional_requirements #2 (explicit diagram colors, light+dark) → `MOVED-to-agents/architect.md` (process step 5); `code-analysis-flow.md` already encodes it for that separate, rarely-used flow.
- **Rationale:** always-on file whose every line either duplicated skill content or belonged in an on-demand skill; nothing bootstrap-critical remained. Refs swapped: r3 `pa-rosetta.md` bootstrap list (core-policy → alwayson); `bootstrap-manifest.ts` entry left as-is (content-agnostic — absent docs are skipped, and it still serves r2); `targets.ts` copilot exclude list harmless.

```
---
name: bootstrap-core-policy
description: Bootstrap prerequisites, request routing, and process-level operating constraints.
alwaysApply: true
applyTo: "**"
trigger: always_on
tags: ["rosetta-bootstrap", "core", "policy"]
baseSchema: docs/schemas/rule.md
---

<rosetta:bootstrap_core_policy severity="CRITICAL" use="ALWAYS" execute="always" modes="all" planning_mode="MUST USE" execution_mode="MUST USE" default_mode="MUST USE" research_mode="MUST USE" auto_mode="MUST USE" compact="NEVER" optimize="NEVER" summarize="AS-IS">

<process_enforcement_rules>

1. Proactively use available MCPs, incorporate in plan.
2. If issues were documented in advance then those pre-existing otherwise those are to be fixed.

</process_enforcement_rules>

<subagents_orchestration_rules>

- Orchestrator is the team lead. Orchestrator owns the orchestration loop. Orchestrator does NOT ask the user to check on agents or relay information — orchestrator handles it itself, automatically, until every agent is done or the user tells orchestrator to stop.
- Orchestrator executes the plan by dispatching a fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.
- Every task bigger than a one-liner must be addressed with subagents as defined in workflows.
- Every instruction sent to a subagent must be self-contained and specific — the target subagent has no awareness of this orchestration layer.
- Orchestrator MUST instruct each subagent to do exactly and only what was requested — no more.
- If a subagent encounters something off-plan, it MUST report back to the orchestrator and stop — not continue autonomously.
- MUST follow SKILL `orchestration` for the full dispatch protocol and prompt template.

</subagents_orchestration_rules>

<additional_requirements>

1. Search documentation for libraries, versions, and issues which are not in built-in knowledge.
2. Always define explicit colors for tiles, text, and lines in diagrams for both light and dark themes.

</additional_requirements>

</rosetta:bootstrap_core_policy>
```

### `bootstrap-guardrails` rule (r3) — dissolved into `bootstrap-alwayson` (single always-on home)
- **Source:** `instructions/r3/core/rules/bootstrap-guardrails.md` (entire rule).
- **Disposition:** `COMPRESSED-into-bootstrap-alwayson` (`<skill_engagement_rules>` — user ruling: only alwayson survives) — atoms:
  - must #1 (suggest compliant solutions) + must #3 (guardrail skills BEFORE execution) → folded into the section intro line.
  - must #2 (stop-and-wait for approval; no assumed approval) → `DELETED-as-duplicate` of `hitl` skill (description + body).
  - core_concepts "top-priority gate" → `DELETED-as-duplicate` of alwayson priority chain (Rosetta > Guardrails > …).
  - core_concepts "sensitive data mandatory" → `DELETED-as-duplicate` of `sensitive-data` skill (MUST description).
  - core_concepts "Auto Mode ≠ fully autonomous/No HITL" → `DELETED-as-duplicate` of `hitl` skill (always-visible description: "Auto mode, full access, etc ONLY means automatic approval of tool permission prompts, HITL stays!" + body "MUST FOLLOW HITL even if in danger-full-access…").
  - USE-SKILL definition → `MOVED-to-bootstrap-alwayson` (compressed to one line).
  - ALL per-skill trigger texts (`— on/when/after …` in always_on/action_gated/event_triggered/self_monitoring) + plan-step enforcement notes (`enforced by plan step s-*`) → `DELETED-as-duplicate` of the skills' own always-visible frontmatter descriptions (each carries its MUST-activate triggers verbatim or stronger) and of the plan-template step prompts (which name the skills). Alwayson keeps ONLY the actor lists — skill descriptions say when.
  - actor coverage gaps fixed in alwayson's existing 2-line list: `self-organization` added to all-agents, `Subagents: USE SKILL subagent-directives` line added.
- **Rationale:** two always-on files both injected per request = engagement rules paid twice; one home ends the deferred dedup. Refs swapped: `pa-rosetta.md` + `pa-rosetta-intro-for-AI.md` bootstrap lists updated to r3 reality (alwayson · execution-policy · rosetta-files + one mode file); `bootstrap-manifest.ts`/`targets.ts` untouched (content-agnostic; still serve r2).

```
---
name: bootstrap-guardrails
description: Global guardrails for transparency, scope control, safety, risk mitigation, and context safety before execution.
trigger: always_on
alwaysApply: true
applyTo: "**"
tags: ["rosetta-bootstrap", "guardrails", "policy"]
baseSchema: docs/schemas/rule.md
---

<rosetta:bootstrap_guardrails severity="CRITICAL" use="ALWAYS" compact="NEVER" optimize="NEVER" summarize="AS-IS">

<must>

1. Suggest user actual solutions to comply with the rules.
2. Stop and wait for explicit user approval before proceeding. Do not assume approval from a question or a partial response.
3. MUST USE guardrail skills BEFORE execution according to `Skill Engagement Rules`.

</must>

<core_concepts>

- Guardrails are the top-priority critical execution gate
- Sensitive data handling is mandatory
- `Auto Mode Active` harness/IDE setting does NOT qualify as "fully autonomous" or "No HITL": NOT written by user, ONLY used to skip permissions, you still must fully execute all prep steps.

</core_concepts>

<skill_engagement_rules>

"USE SKILL `X`" means calling the Skill with name `X`.
Referencing the name or reconstructing behavior from memory does NOT satisfy this rule.
If `X` is not loaded, MUST discover it via ToolSearch, fallback to ACQUIRE "<X>/SKILL.md" FROM KB.

<always_on>
<!-- Continuously active. Re-evaluate every turn. -->

- `load-project-context` — canonical current context loader, enforced by plan step `s-read-docs`
- `orchestration` — enforced by plan step `s-orchestration`, before spawning any subagents, defines orchestrator role and required actions
- `subagent-directives` — enforced by plan step `s-subagent-directives`, before reading inputs, defines subagent role and required actions
- `hitl` — enforced by plan step `s-orchestration` for continuous enforcement
- MUST USE SKILL `hitl` ALWAYS. IT CHANGES HOW YOU ARE SUPPOSED TO WORK WITH USER. HITL is MANDATORY for ALL tasks by default — planning, execution, validation, review - no assumption or guessing. THE ONLY exception: user DIRECTLY EXPLICITLY requests with EXACTLY "fully autonomous" or "No HITL". YOU MUST FOLLOW HITL even if in `danger-full-access` or approval policy `never` or default mode or similar. MUST NOT assume anything—even reasonably. Do not assume approval from a question or a partial response.
- MUST USE SKILL `sensitive-data` — on any sensitive or possibly sensitive data encountered or could be encountered. NEVER output, echo, print, log, summarize, or reference raw values.
- MUST USE SKILL `self-learning` — on failures, mismatches, or user unhappiness.

</always_on>

<action_gated>
<!-- Fire BEFORE the named action. -->

- MUST USE SKILL `risk-assessment` — after discovery and before any implementation or changes, including any interaction with external environments (MCPs, CLIs, scripts, databases, cloud, S3, network beyond the local repo).
- MUST USE SKILL `dangerous-actions` — on potentially dangerous, irreversible, or high-blast-radius actions. MUST ALWAYS assess BLAST RADIUS first.

</action_gated>

<event_triggered>
<!-- Fire when the trigger condition is detected. -->

- MUST USE SKILL `deviation` — on intent drift, surprise, unknowns, panic, UNDO request.
- MUST USE SKILL `questioning` — when a high-impact unknown blocks safe execution AND cannot be reasonably assumed.

</event_triggered>

<self_monitoring>

- SHOULD USE SKILL `self-organization` — see the skill for triggers (context thresholds, scope thresholds, proactive planning, large-file restructuring, cleanup, user communication of intent).

</self_monitoring>

</skill_engagement_rules>

</rosetta:bootstrap_guardrails>
```

### `bootstrap-execution-policy` rule (r3) — dissolved (alwayson-only ruling; most content duplicated skills)
- **Source:** `instructions/r3/core/rules/bootstrap-execution-policy.md` (entire rule).
- **Disposition:** `DELETED-as-dissolved` — atoms routed:
  - `<rosetta:FORBIDDEN>` (no immediate coding) → `COMPRESSED-into-bootstrap-alwayson` core policies ("Never jump from request straight to code/files/commands — workflow prep first, regardless of clarity, auto-mode, or permissions"); full form remains in `rosetta` skill gate.
  - MUST#1 (apply the rule groups) → `DELETED-as-obsolete` — self-referential index, dies with the file.
  - MUST#2 (never skip; impossible → report + continue) → `COMPRESSED-into-bootstrap-alwayson`.
  - MUST#3 (slash SKILL/COMMAND/WORKFLOW → full execution) → `COMPRESSED-into-bootstrap-alwayson`.
  - MUST#4 (SRP/DRY/KISS/MECE/YAGNI + scope creep) → `COMPRESSED-into-bootstrap-alwayson` (core principles, per ruling); self-learning/self-organizing dropped — live in their skills + engagement lists.
  - MUST#5 (ENTERPRISE, never jump) → `DELETED-as-duplicate` of alwayson enterprise line + the new no-jump line.
  - planning_sync#1–2 (IMPLEMENTATION.md per phase; proactively update Rosetta files) → `DELETED-as-duplicate` of `coding` "Project documentation — MUST keep current" + alwayson `<core_rosetta_files>`.
  - planning_sync#3 (validate vs REQUIREMENTS; `requirements-use`) → `MOVED-to-agents/architect.md` (process #2) + `MOVED-to-tech-specs` (core_concepts) — deliberate dup per ruling.
  - operation_manager_rules 1–8 → `DELETED-as-duplicate` of alwayson `<tasks>` (one in_progress · close before next · close on evidence) + `o-`/`s-session-execution-controller` (loop, `update_status`, upsert, derived statuses); surviving atom "explicit and actionable steps" → `MOVED-to-orchestration` (process #7); "no bulk-complete" = dup of tasks ledger discipline.
  - validation_rules#1–2 (incremental + flow-end validation task) → `COMPRESSED-into-orchestration` (process #6 tail); #3 → `DELETED-as-duplicate` of `deviation`/`questioning` descriptions; #4 → `DELETED-as-duplicate` of alwayson tasks/intrinsics.
  - memory_and_self_learning_rules 1–7 → `DELETED-as-duplicate` of `self-learning` process #6–10 (near-verbatim).
  - should#1 + #3 (concise operational step wording; execution hints in step prompts) → `MOVED-to-o-team-manager` (§5 Workflow, per ruling); should#2 → `DELETED-as-duplicate` of the subagent prompt template "terse, factual, specific, DRY".
- **Rationale:** alwayson is the ONLY surviving always-on rule file (budget <100 lines / <1.5K tokens body); everything here either duplicated skills/EC assets or earned a one-line alwayson slot. Refs swapped: `pa-rosetta.md` + `pa-rosetta-intro-for-AI.md` lists now name alwayson + rosetta-files + one mode file; `bootstrap-manifest.ts`/`targets.ts` untouched (content-agnostic; still serve r2).

```
---
name: bootstrap-execution-policy
description: Defines planning, task execution, validation, orchestration, and memory behavior for bootstrap flow.
alwaysApply: true
applyTo: "**"
trigger: always_on
tags: ["rosetta-bootstrap", "execution", "policy"]
baseSchema: docs/schemas/rule.md
---

<rosetta:FORBIDDEN severity="CRITICAL" required-sequence-instead="create phases/steps/tasks → prep steps → load context → load contracts → load hitl → load workflow → Merge p/s/t → execute workflow">
Receiving a user request → immediately writing code, files, scripts, or commands is STRICTLY FORBIDDEN regardless of: task clarity or simplicity, Auto Mode being active, permission settings (danger-full-access, never-ask, etc.), how explicitly the user phrased the request.
</rosetta:FORBIDDEN>

<rosetta:bootstrap_execution_policy severity="CRITICAL" use="ALWAYS" compact="NEVER" optimize="NEVER" summarize="AS-IS">

<MUST>

1. Apply `Planning and Documentation Sync Rules`, `Operation Manager Rules`, `Validation Rules`, `Memory And Self-Learning Rules`, `Subagents Orchestration Rules`.
2. MUST not skip instructions, if some activities impossible to execute, report to user, and continue with Rosetta instructions.
3. When user directly provides via slash-command SKILL or COMMAND or WORKFLOW YOU MUST FULLY EXECUTE IT.
4. Enforce SRP, DRY, KISS, MECE, YAGNI, prevent scope creep, self-learning, and self-organizing.
5. This is ENTERPRISE environment, NOT startup, NOT personal project, MUST NEVER JUMP DIRECTLY TO IMMEDIATE EXECUTION!

</MUST>

<planning_and_documentation_sync_rules>

1. Update IMPLEMENTATION.md after each phase/step/task.
2. Proactively update, review, structure, restructure, and cleanup Rosetta files: including and not limited to CONTEXT.md, ARCHITECTURE.md, CODEMAP.md, TECHSTACK.md, DEPENDENCIES.md, PATTERNS/\*
3. Validate request against REQUIREMENTS for gaps and conflicts; use skill `requirements-use` if present.

</planning_and_documentation_sync_rules>

<operation_manager_rules>

1. Use OPERATION_MANAGER as the primary execution tracker; built-in todo tasks/planners are for tracking INSIDE a single plan step only.
2. Create explicit and actionable plan steps.
3. Break complex work into manageable steps via OPERATION_MANAGER `upsert`.
4. Keep exactly one plan step in progress at a time.
5. Call `update_status` immediately after finishing each step.
6. Do not mark steps complete without verifiable tool evidence.
7. Do not mark multiple steps complete unless completed in the same tool call.
8. Treat completed as verified done, never assumed done.

</operation_manager_rules>

<validation_rules>

1. Create recurrent validation task at end of execution flow.
2. Validate incrementally and at flow end.
3. Raise questions when findings conflict with request or intent.
4. Keep final status grounded in observed evidence.

</validation_rules>

<memory_and_self_learning_rules>

1. Consult AGENT MEMORY.md during planning and reasoning
2. Init if missing, prefer agent memory over task memory
3. Identify root cause for every failure or missed expectation
4. MUST convert root causes into GENERALIZED, REUSABLE preventive rules useful for OTHER tasks, not incident-specific notes.
5. Store preventive rules in memory
6. Keep memory concise, organized
7. Record what worked and failed logically, architecturally, and technically

</memory_and_self_learning_rules>

<should>

1. Keep plan and task wording concise and operational.
2. Keep orchestration context complete but minimal.
3. Include high-value execution hints in step prompts

</should>

</rosetta:bootstrap_execution_policy>
```

### `bootstrap-rosetta-files` rule (r3) — dissolved (roster lives in `load-project-context`)
- **Source:** `instructions/r3/core/rules/bootstrap-rosetta-files.md` (entire rule).
- **Disposition:** `COMPRESSED-into-load-project-context` (`<bootstrap_rosetta_files>` section — same tag name kept; full 19-item roster preserved compressed).
- **Rationale:** alwayson-only ruling — the file roster is needed when loading context, not on every request; `load-project-context` is enforced early (plan step `s-read-docs`). Refs swapped: `init-workspace-flow-context`/`-discovery` now point the `bootstrap_rosetta_files` tag at SKILL `load-project-context`; `pa-rosetta.md` (bootstrap list + "full specs" pointer) and `pa-rosetta-intro-for-AI.md` (list + XML-tag sentence) updated. Build source: `CODEX_PLUGIN_ROOT_COMMAND` workspace-root sentinel switched `.agents/rules/bootstrap-rosetta-files.md` → `.agents/rules/plugin-files-mode.md` (present in BOTH r2 and r3 output; codex test updated); Cursor seed `plugin.json` `rules[]` pruned to the r3 set (dead `.mdc` entries removed: core-policy, execution-policy, guardrails, rosetta-files); `BOOTSTRAP_MANIFEST_ORDER` entry + copilot exclude kept (content-agnostic; still serve r2).

```
---
name: bootstrap-rosetta-files
description: Defines workspace rosetta files.
alwaysApply: true
applyTo: "**"
trigger: always_on
tags: ["rosetta-bootstrap", "rosetta", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_rosetta_files compact="NEVER" optimize="NEVER" summarize="AS-IS">

All rosetta files below: SRP, DRY, MECE, very concise. Each file starts with a self-describing sentence of its purpose. Grep-friendly topical headers. Headers include status. No explicit ToC. All committed to SCM unless stated otherwise.
It must be possible to grep by headers and receive useful information and ToC.

1. `gain.json` defines and overrides general SDLC setup and locations of Rosetta files; this file wins in conflicts.
2. `docs/CONTEXT.md`. Business and overall context, target state only, no technical details, no change log, no explanation of changes.
3. `docs/ARCHITECTURE.md`. Architecture, and all technical requirements. Modules, workspace structure, testing architecture, styling, building blocks, etc.
4. `docs/TODO.md`. Improvements, suggestions, large TODOs, etc. Create if missing.
5. `docs/ASSUMPTIONS.md`. Assumptions, Unknowns, etc.
6. `docs/TECHSTACK.md`. Tech stack of all modules.
7. `docs/DEPENDENCIES.md`. Dependencies of all modules.
8. `docs/CODEMAP.md`. Code map of the workspace.
9. `docs/REQUIREMENTS/*`. Original requirements. May be missing. `docs/REQUIREMENTS/INDEX.md` is index. `docs/REQUIREMENTS/CHANGES.md` is change log.
10. `docs/PATTERNS/*`. Coding and architectural patterns. May be missing. `docs/PATTERNS/INDEX.md` is index. `docs/PATTERNS/CHANGES.md` is change log.
11. `agents/IMPLEMENTATION.md`. Current state of implementation very concise. Structure to prevent git conflicts. The only implementation change log.
12. `agents/MEMORY.md`. Very brief root causes of errors and mistakes, brief actions tried and actions succeeded, both positive and negative. Create if missing.
13. `plans/<FEATURE>/<FEATURE>-PLAN.md`. Execution plan.
14. `plans/<FEATURE>/<FEATURE>-SPECS.md`. Tech specs.
15. `plans/<FEATURE>/plan.json`. Operation manager execution tracking file.
16. `plans/<FEATURE>/*`. Feature implementation supporting files.
17. `refsrc/*`. Source code used only for knowledge! Exclude from SCM with single exception `refsrc/INDEX.md` to be committed.
18. `agents/TEMP/<FEATURE>`. Temporary folder used during feature implementation. Exclude `agents/TEMP` from SCM.
19. `docs/raw`. Folder with raw input files for requirements.

</bootstrap_rosetta_files>
```

### mode-file shared skeleton — subagent/non-subagent intros, EXTREMELY_IMPORTANT, CRITICAL_RED_FLAGS, OPERATION_MANAGER, Phase 0
**Source**: `instructions/r3/core/rules/bootstrap.md` (representative verbatim below); identical in `plugin-files-mode.md` (minus EI#9–10, items renumbered −2 from #11 on) and `local-files-mode.md`.
**Disposition** (per atom; EI numbering per bootstrap.md/local-files-mode.md):
- Subagent intro #1 (follow orchestrator + OPERATION_MANAGER) — DELETED-as-duplicate of `subagent-directives` process #1–#2 + `s-session-execution-controller.md`.
- Subagent intro #2 (granular todo tasks) — DELETED-as-duplicate of `bootstrap-alwayson` `<tasks>`.
- Subagent intro #3 (look around, don't deviate) — MOVED-to-`subagent-directives` (process line).
- Non-subagent intro #1 + #3 (meta-process engineer / assume senior team lead) — DELETED-as-duplicate of `orchestration` context #2.
- Non-subagent intro #2 (resume: check workflow state) — DELETED-as-duplicate of `rosetta` process #2.
- EI#1, #2, #3, #5 (Rosetta-requested / tells-how / no-rationalizing / non-negotiable) — DELETED-as-obsolete: invitation replaces coercion (`/rosetta` seam); nothing left to rationalize against.
- EI#4 (execute FULLY) — DELETED-as-duplicate of alwayson don't-skip + slash-full-execution + `rosetta` #5 no-phase-skipping.
- EI#6 (no proceed without context/contracts/workflow) — DELETED-as-duplicate of alwayson never-jump-to-code.
- EI#7 (load more is safer) — DELETED-as-duplicate of alwayson "Unsure → overdo" + do-not-limit-review.
- EI#8 (automated agent, do more) — COMPRESSED-into-`bootstrap-alwayson` accuracy bullet (user-approved wording: "you're an automated agent, already fast: don't rush, invest in breadth/depth, double discovery and planning").
- EI#9, #10 (merge behavior / priorities; bootstrap.md + local-files-mode.md copies) — DELETED-as-duplicate of alwayson (plugin copies archived earlier).
- EI#11 (knowing ≠ following · coded ≠ fulfilled) — DELETED-as-duplicate of alwayson `<intrinsics>`.
- EI#12 (skills BEFORE action, even 1%) — COMPRESSED-into-`bootstrap-alwayson` `<skill_engagement_rules>` as mental hook.
- EI#13 (MUST ALWAYS OPERATION_MANAGER, top critical guardrail) — DELETED-as-obsolete: contradicts decided EC-is-LARGE-only sizing; phrase "not planning — execution control" salvaged into `orchestration` LARGE band.
- EI#14 (tasks as first/second tool call) — COMPRESSED-into-`bootstrap-alwayson` `<tasks>` ("as one of your very first tool calls").
- EI#15 (WHAT not HOW, reverse-engineer intent) — DELETED-as-duplicate of `o-team-manager.md` "Reconstruct intent" bullet + `hitl` #48.
- EI#16 (process first, implementation second) — DELETED-as-duplicate of alwayson never-jump-to-code + `rosetta` `<FORBIDDEN>`.
- EI#17 (planning-mode MoSCoW documentation) — MOVED-to-`orchestration` process "Plan mode" item (rephrased + merged per user ruling: reads execute now; the presented system plan file records `MUST USE SKILL` entries, plan + specs, and the implementation workflow — mini-loops, phases, steps, subagent + model per step — in MoSCoW and the directive language given).
- EI#18 (ph-prep without delegation) — MOVED-to-`o-session-execution-controller.md` + `s-session-execution-controller.md` (pitfalls).
- EI#19 (approval covers only the exact action) — MOVED-to-`bootstrap-alwayson` core policies; also already enforced in `hitl` #17/#20/#27.
- CRITICAL_RED_FLAGS (all 5 bullets) — DELETED-as-obsolete: anti-rationalization coercion dissolved by the `/rosetta` seam (story ruling).
- OPERATION_MANAGER section — DELETED-as-duplicate of EC assets; salvaged into `o-session-execution-controller.md`: RFC 7396 semantics, "Plan has been changed: [summary]" output rule, plan-changes-outside → always pull fresh `next`, loop-until `plan_status: complete` AND `count: 0`; into `s-session-execution-controller.md`: fresh-`next` rule.
- Phase 0 `<MUST>` block — DELETED-as-obsolete: superseded by `orchestration` sizing (EC = LARGE only) + `create-with-template`/`upsert-with-template` flows already verbatim in EC assets; salvaged: "Context loaded using Rosetta: […]" completion message → `rosetta` process #5.
- Startup step 2 `load-context` → replaced by `load-project-context`; step 3 `load-workflow` — DELETED-as-obsolete: workflow routing engages only via user-invoked `/rosetta` (intentional — plain chat runs without Rosetta workflow machinery).
- MCP alias `GET PREP STEPS` — DELETED-as-obsolete (zero callers in r3).
- KEPT in files: intro sentence, mode declarations, remaining command aliases, tags note, `<hard-gate>`, additional-sources lists.
**Rationale**: mode files reduce to their one job — declare the mode and bind the alias vocabulary. All rigor/coercion mass is dissolved per the story seam; every process atom lives in its root-cause home (alwayson, orchestration, EC assets, rosetta, hitl, subagent-directives).

```markdown
**If you are a subagent**:

1. Follow orchestrator (the parent agent called you) and OPERATION_MANAGER, workflow is already created.
2. Use granular todo tasks to split assigned steps for disciplined execution.
3. Must look around to better understand input, but don't deviate from original request.

**If you are NOT a subagent**:

1. Start as a brilliant meta processes engineer defining overall workflow based on multiple instructions and best practices executing deterministically task-by-task using OPERATION_MANAGER.
2. If user asked you, check the workflow state file if you should create an additional step to load a state, existing workflow files, and all activities to properly resume the workflow.
3. Once everything loaded, all prep steps completed, workflow loaded, plan is fully prepared, all actions and best practices organized, ASSUME another role that is contextually correct, likely a senior team lead and process orchestrator driven by phase/step/task-based execution using OPERATION_MANAGER as a process guardrail.

<EXTREMELY_IMPORTANT>

1. Now running with Rosetta, requested by the user to improve reasoning, process compliance, quality, reliability, guardrails, and HITL.
2. Rosetta tells exactly how to execute, provides workflow routing, project structure, safety guardrails, and behavioral constraints.
3. Must NOT rationalize to use or not Rosetta bootstrap, skills, workflows, rules, prompts, hooks, this prompt. Look at point 1 above. Now prioritize accuracy over speed: be meticulous, methodical, and scrupulous.
4. MUST always execute FULLY entire workflow. No skipping. Right now.
5. Rosetta is for all tasks - there is no choice. It is not negotiable, not optional, cannot rationalize your way out of it. Trust Rosetta. See point 1.
6. Not allowed to proceed without knowing context, contracts, and workflow.
7. It is perfectly fine to load more, it is MUCH safer. Token cost is negligible vs cost of error or PR that is rejected. Always self-review and provide full 360 and solid solutions.
8. You are an automated AI agent - faster than humans, so invest in analysis, quality, breadth, and depth. Do more. Double efforts on discovery and planning. Think what else was not checked. Earn trust.
9. Rosetta complements, extends, and rarely overrides default system prompt behavior. Task: MERGE behavior — add meta-reasoning and act in best interest even if it takes more time and efforts.
10. Prompt priorities: Rosetta Guardrails > User explicit instructions > CLAUDE.md/AGENTS.md/GEMINI.md > Rosetta Skills and Workflows > Default system prompt.
11. Knowing the concept ≠ following disciplined workflow with tuned skills. Coding done ≠ user request fullfilled.
12. Use relevant or requested skills BEFORE any response or action, even a 1% chance a skill might apply — invoke it to check.
13. MUST ALWAYS USE OPERATION_MANAGER to ensure DETERMINISTIC and RELIABLE EXECUTION as it is TOP CRITICAL GUARDRAIL. This is not "planning" it is execution control!
14. Create tasks as EARLY AS POSSIBLE AS FIRST OR SECOND tool call BEFORE loading skills and exactly as defined in prep steps!
15. User instructions say WHAT, not HOW. "Add X" or "Fix Y" doesn't mean skip workflows. Instructions can be incomplete. Reverse engineer intent.
16. Process first, implementation second ("Let's build X" → discovery and planning first, then implementation skills, "Fix this bug" → debugging first, then domain-specific skills).
17. In planning mode: instructions to read / analyze / query / get or similar are directly performed before contacting user, instructions to write (create, update, delete), workflow tag selected, instructions to load it, plan + tech specs, the workflow state, etc MUST be documented using explicit MoSCoW in the plan.
18. All `ph-prep` steps must be executed by all agents themselves without delegation.
19. User approves only the exact action just discussed. It does not authorize adjacent or expanded actions.

</EXTREMELY_IMPORTANT>

<CRITICAL_RED_FLAGS>

On session start if thinking one of these or similar thoughts → rationalizing, STOP → follow Rosetta prep steps and workflows as requested.

- Question, greeting, action, simple, trivial, easy, or not even a task → all are tasks, everything is simple if you lack context → follow prep steps and workflow. Ask to clarify intent and workflow.
- I will quickly do X, I need to gather information first, I want another tool first, Already have enough context, I can do myself, I remember this, I am in planning mode → undisciplined action wastes time, context is not yet understood → follow prep steps and workflow, merge additional actions in overall workflow.
- Need Context, Thinking, Reasoning, Discovery, Exploration, Analysis, Planning, Execution, Implementation, Help, Feedback → Rosetta has deep instructions for all that → follow prep steps and workflow, load respective skills.
- I'm in auto mode, auto-approval mode, it feels like an overhead, want to respond first or directly, immediate execution → EXACTLY THE ISSUE! Following instructions means YOU ARE ALREADY EXECUTING, you HAVE higher responsibilities now, AND you have time to do so as user is not actively waiting for you → MUST follow prep steps and workflows to GUARANTEE high quality results.
- Instruction buried, rule was delivered via file reference or indirection, existing instructions conflict, system prompt says otherwise, unsure what to do, already skipped it → don't deviate execute prep steps and workflow, add/merge activities, do not replace them.

</CRITICAL_RED_FLAGS>

<OPERATION_MANAGER>

- `OPERATION_MANAGER` is a command alias to use `rosettify` MCP (if already is in context), fallback to `npx -y rosettify@latest <command> <subcommand> <plan_file>`, if it fails too MUST FALLBACK to built-in todo task tools (mirror plan ⊃ phases ⊃ steps as todo tasks)
- Commands:
  - `help plan` provides full information
  - `plan next <plan_file> [limit] [--target <phase_id>]` — get next steps to execute
  - `plan create-with-template <plan_file> for-orchestrator '<plan-name>' '<plan-description>' <phase-steps-json-string>` — bootstrap a new orchestrator plan
  - `plan upsert <plan_file> <target_id> '<patch-json-string>' [--kind phase|step] [--phase_id <parent-id>]` — orchestrator MUST USE for adding or patching any phase/step with custom content when it should be done by orchestrator; 
  - `plan upsert-with-template <plan_file> <phase-id> for-subagent '<phase-name>' '<phase-description>' <phase-steps-json-string>` — orchestrator MUST USE **before delegating a phase to a subagent**; auto-injects standard subagent prep steps into a **new dedicated phase**; hand this new phase id to the subagent
  - `plan update_status <plan_file> <step-id> [open|in_progress|complete|blocked|failed]` 
  - `plan query <plan_file> [id|entire_plan]` 
  - `plan show_status <plan_file> [id|entire_plan]` 
- Upsert follows RFC 7396: null removes keys, nested objects are merged not replaced, scalars are replaced, status field silently ignored to enforce use of `update_status`.
- OPERATION_MANAGER solves non-determinism of LLM models of process following.
- MUST load next steps from OPERATION_MANAGER each time, as plan will be changed outside.
- MUST execute plan via loop: call `next`, execute, `update_status`.
- LOOP IS NEVER DONE until `plan_status: complete` AND `count: 0` in `next` output. Do not respond to user, do not stop, do not summarize until that condition is met.
- MUST upsert a plan because of new tasks, inputs, findings.
- Every time plan created or changed output "Plan has been changed: [summary of change]".

</OPERATION_MANAGER>

<MUST never_superseded="true" directly_user_requested="true" compact="false" compress="false" execute_once_per_session="true">

# Phase 0: Initialize Operation manager

Step 1:

- **Orchestrator** → OPERATION_MANAGER `create-with-template plans/<FEATURE>/plan.json for-orchestrator "<FEATURE_OR_SESSION_ID>" "<USER_REQUEST_SUMMARY>" "<PHASE_STEPS_JSON_STRING>"` — derive FEATURE from user request; use `session` if unclear.

- **Subagent** → Plan is already created. Call OPERATION_MANAGER `next <plan_file> --target <phase_id>` to receive assigned steps. Do not create a new plan.

**Orchestrator — when delegating to subagents**: before handing off each phase, create a **dedicated new subagent phase** (id must NOT already exist in the plan, e.g. `<work-phase-id>-prep`): OPERATION_MANAGER `upsert-with-template <plan_file> <phase-id> for-subagent "<phase-name>" "<phase-description>" <phase-steps-json-string>`. Pass new `<phase-id>` to the subagent — not the original work phase id.

Step 2+: Call OPERATION_MANAGER `next <plan_file> [limit] [--target <phase_id>]`

- Must fully complete `ph-prep` in planning and execution modes: reading files, selecting workflow, loading it, analyzing workflow state, etc. Plan is living: `upsert` additional `ph-prep` steps, workflow phases and steps, meta-reasoning.
- Create once per session. Do not respond, call other tools, or process the message further until `ph-prep` completes, except those needed for itself.
- Once all `ph-prep` completes, tell user once: `Context loaded using Rosetta: [workflow selected and brief summary]` and execute workflow.
- "\*-flow" skills are additional workflows

# Workspace Startup Procedure (steps 2–3 as removed; step 1 kept in file)

2. MUST USE SKILL `load-context`.
3. MUST USE SKILL `load-workflow`.

- `GET PREP STEPS` → `get_context_instructions()`.

</MUST>
```

### mode-file per-file uniques — plugin/local alias deltas
**Source**: `instructions/r3/core/rules/plugin-files-mode.md`, `local-files-mode.md`.
**Disposition**:
- plugin `GET PREP STEPS`, `EXECUTE PREP STEPS` → execute `ph-prep` steps — DELETED-as-obsolete (zero callers; ph-prep lives in EC templates).
- plugin `get_context_instructions` binding "continue with `ph-prep` steps" — COMPRESSED-in-place to "already loaded, continue".
- local `call "get_context_instructions"` binding "read all `instructions/r3/core/rules/bootstrap-*.md` files as one bundle" — rebound to `bootstrap-alwayson.md` only (old glob would now wrongly pull the MCP mode file `bootstrap.md`).
- local `# Available Workflows` list — DELETED-as-duplicate: descriptions live in the workflow files' frontmatter; discovery = `LIST workflows IN KB`; routing = user-invoked `rosetta`.
**Rationale**: alias bindings stay; everything that assumed the Phase-0/prep machinery or duplicated per-file metadata goes.

```markdown
- `GET PREP STEPS`, `EXECUTE PREP STEPS` → execute `ph-prep` steps.
- `get_context_instructions` => already loaded, continue with `ph-prep` steps. Instruct subagents to not call Rosetta MCP.
- `call "get_context_instructions"` or `execute prep steps` => read all `instructions/r3/core/rules/bootstrap-*.md` files as one bundle

# Available Workflows (format: `Tag` - Description)

- `coding-flow` - Rosetta coding and implementation workflow, includes discovery, tech specs, tech plan, subagent plan review, user plan review, implementation, subagent review implementation, validation, user review, and final validation with reviewer gates, HITL gates, and subagent delegation.
- `init-workspace-flow` - Rosetta workflow to initialize or upgrade a workspace, includes identify context, init proxying shells for target skills/agents/commands, workspace discovery, copy rules (optional, not recommended), identify patterns used, generate documentation, clarify questions, verification.
- `requirements-authoring-flow` - Rosetta workflow for requirements authoring (creating, updating, improving, reviewing). Guides AI through discovery, intent capture, iterative requirement drafting with mandatory user approvals, validation, and delivery. Contains discovery, research, intent capture, outline, drafting, validating, and finalization
- `self-help-flow` - Rosetta self-help. Ask about capabilities, learn how to use them, get guidance on developing with Rosetta, or seamlessly switch to executing any discovered workflow. Answers "what can you do", "how do I use X", "how modernization works", "what workflows are available", etc.
- `adhoc-flow` - Rosetta ad-hoc adaptive meta-workflow that constructs, tracks, reviews, and executes a tailored execution plan per user request using building blocks and available instructions. If none other matches start here.
- etc.
```

### load-context — project-context loading prep skill
**Source**: `instructions/r3/core/skills/load-context/SKILL.md` (whole skill directory removed).
**Disposition**: DELETED-as-dissolved — `<project-files>` + `<troubleshooting>` live expanded in `load-project-context` (`<project-files>` grep-headers + read-by-range, troubleshooting → `init-workspace-flow`); `<next-steps>` (load-workflow chain) DELETED-as-obsolete — routing engages only via user-invoked `/rosetta`.
**Rationale**: superseded by `load-project-context` (built, registered, reviewer-passed); all r3 references swapped `load-context` → `load-project-context` in this sweep.

```markdown
---
name: load-context
description: "To load the most current project context; MUST during prep."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---
<load-context>

<project-files>
Execute in order:

1. Read `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` — FULL CONTENT, ALL LINES
2. Grep headers of `agents/IMPLEMENTATION.md`, `agents/MEMORY.md`, `docs/PATTERNS/INDEX.md`, `docs/REQUIREMENTS/INDEX.md`, and `refsrc/INDEX.md`
   ```bash
   grep -n "^#{1,3}" agents/IMPLEMENTATION.md agents/MEMORY.md docs/PATTERNS/INDEX.md docs/REQUIREMENTS/INDEX.md refsrc/INDEX.md
   ```
3. Use built-in tools instead of bash grep if available 

</project-files>

<troubleshooting>

If any file is unavailable (not found) — it simply does not exist yet. Continue without it, do NOT stop or treat this as an error, and STRONGLY suggest workspace initialization using workflow `init-workspace-flow.md`.

</troubleshooting>

<next-steps>

- Load and fully execute the selected workflow.
- MUST USE SKILL `load-workflow`

</next-steps>

</load-context>
```

### load-workflow — workflow selection/resume prep skill
**Source**: `instructions/r3/core/skills/load-workflow/SKILL.md` (whole skill directory removed).
**Disposition**: DELETED-as-dissolved — process #1 (ACQUIRE workflow TAG + execute fully for all sizes) and #2 (resume from workflow state) live as `rosetta` process #1–#2; #3 (auto vs `No HITL`) DELETED-as-duplicate of `hitl` (canonical opt-out home); #4 (OM upsert todo tasks) DELETED-as-obsolete (EC = LARGE-only; tasks = alwayson `<tasks>`); prerequisites DELETED-as-obsolete.
**Rationale**: absorbed into `rosetta` (the smart router, user-invoked); per the seam, workflow classification no longer runs on every request.

```markdown
---
name: load-workflow
description: "To select, activate, and resume the best-matching workflow and inject its phases. MUST."
tags: ["rosetta-bootstrap", "core", "workflow", "orchestrator"]
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---
<load-workflow>

<prerequisites>

- OPERATION_MANAGER is active
- Project context is loaded USING SKILL `load-context`

</prerequisites>

<process>

1. ACQUIRE `<workflow TAG from available workflows>` FROM KB — load the most matching workflow; fully execute following its definition for ALL request sizes
2. If user asked to continue or resume: load workflow state file, extract completed steps, current phase, and pending work
3. Handle planning and auto mode correctly — distinguish auto vs `No HITL`
4. USE OPERATION_MANAGER to upsert todo tasks 

</process>

<next-steps>

- Execute all accumulated plan phases and steps

</next-steps>

</load-workflow>
```

### operation-manager — plan-driven execution skill (+ om-schema asset)
**Source**: `instructions/r3/core/skills/operation-manager/SKILL.md` + `assets/om-schema.md` (whole skill directory removed).
**Disposition**: DELETED-as-dissolved — split by actor into `orchestration/assets/o-session-execution-controller.md` (orchestrator flow, core concepts, validation, pitfalls, compressed schema) and `subagent-directives/assets/s-session-execution-controller.md` (subagent flow); MCP-first dropped (EXECUTION_CONTROLLER = CLI-only, decided); `om-schema.md` COMPRESSED-into `o-session-execution-controller` `<schema>`; `<resources>` adhoc-flow pointer DELETED-as-obsolete.
**Rationale**: no standalone skill — EC engages only through the `orchestration` LARGE band; both assets verified carrying every operational atom (incl. the RFC 7396 / fresh-`next` / "Plan has been changed" salvages landed this sweep).

```markdown
---
name: operation-manager
description: "To create, track, and coordinate execution plans via local JSON files."
license: Apache-2.0
dependencies: node.js
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash(npx:*)
model: claude-sonnet-5
tags:
  - operation-manager
  - operation-manager-create
  - operation-manager-use
baseSchema: docs/schemas/skill.md
---

<operation-manager>

<role>

Senior execution planner and tracker for plan-driven workflows.

</role>

<when_to_use_skill>

Primary operation manager for orchestrators and subagents. Creates, tracks, and executes plans as local JSON files.

</when_to_use_skill>

<core_concepts>

- Try `rosettify` MCP first (if already available), fallback to CLI: `npx -y rosettify@latest <command> <subcommand> <plan_file`>, if it fails too MUST FALLBACK to built-in todo task tools (mirror plan ⊃ phases ⊃ steps as todo tasks).
- Always use full absolute paths for the plan file
- Subcommands: `create`, `next`, `update_status`, `show_status`, `query`, `upsert`, `create-with-template`, `upsert-with-template`, `list-templates`
- Help: `npx -y rosettify@latest help plan` provides full help JSON
- Resume behavior: `next` returns four groups: (1) in_progress steps (resume=true), (2) open eligible steps, (3) blocked steps (previously_blocked=true), (4) failed steps (previously_failed=true)
- Phases are sequential: steps from a later phase do not appear until all steps in earlier phases are complete
- Status propagation: bottom-up only (steps -> phases -> plan); plan root status is always derived, never set directly
- `upsert` silently ignores status fields in patch -- only `update_status` modifies status

</core_concepts>

<process>

**Orchestrator flow:**

1. Use `npx -y rosettify@latest help plan` to understand which subcommands are available for which models 
2. Create plan
3. Upsert phases and steps every time something new comes up
4. Delegate phase to a subagent: provide plan_file and phase_id. Orchestrator decides which phases run in parallel — parallel subagents must each own a distinct phase.
5. Loop: get next steps → execute → update status — until no steps remain.

**Subagent flow:**

1. Receive `plan_file` (absolute path) and `phase_id` from the orchestrator prompt. Subagent owns the assigned phase end-to-end: solely responsible for completing every step in that phase and reporting results back to the orchestrator. Use `npx -y rosettify@latest help plan` if more information is required.
2. Call `npx -y rosettify@latest plan next <plan_file> --target <phase_id>`.
   - If `resume:true` on a returned step → that step is already `in_progress`; skip step 3a, go directly to 3b.
   - If `previously_blocked:true` or `previously_failed:true` on a returned step
  → orchestrator has cleared the path; attempt carefully, verify preconditions first, go to 3a step
   - If open, go to 3a step
   - If `count:0` and `plan_status:complete` → phase is complete; go to step 4.
3. For the returned step:
   a. `npx -y rosettify@latest plan update_status <plan_file> <step_id> in_progress`
   b. Execute the step's prompt.
   c. `npx -y rosettify@latest plan update_status <plan_file> <step_id> <status>`:
      - `complete` — done with verifiable evidence; return to step 2
      - `blocked` — cannot proceed; go to step 4 and report reason to orchestrator
      - `failed` — execution failed; go to step 4 and report error and root cause
4. Report back to orchestrator: results, side effects, anomalies, deviations.

</process>

<validation_checklist>

- `npx -y rosettify@latest help plan` exits without error and returns structured help JSON
- `show_status` phase status matches aggregate of its steps after `update_status`
- use `plan query <plan_file> [entire_plan | phase-id | step-id]` to verify the entire plan, a phase, or a step

</validation_checklist>

<pitfalls>

- Not checking `resume` flag on `next` results -- causes duplicate work on resumed sessions
- Forgetting `update_status` after step completion -- plan remains stale
- Plan root status cannot be set directly -- it is always derived from phases
- Attempting to set phase status directly -- rejected as phase_status_is_derived
</pitfalls>

<resources>

- Flow: USE FLOW `adhoc-flow`

</resources>

</operation-manager>
```

`assets/om-schema.md` (verbatim): schema/status-enum/propagation-table/dependency-rules/constants identical to `o-session-execution-controller.md` `<schema>` (compressed form retains every rule and constant); the two JSON plan examples (minimal + feature-x full) dropped as illustrative only — reproducible from the schema.

#### om-schema.md (verbatim)

````markdown
# Plan JSON Schema Reference

## Data Structure

```
plan:
  name: str                    # required
  description: str             # default: ""
  status: StatusEnum           # derived bottom-up, never set directly
  created_at: ISO8601          # set on create
  updated_at: ISO8601          # updated on every write
  phases[]:
    id: str                    # required, unique across entire plan
    name: str                  # required
    description: str           # default: ""
    status: StatusEnum         # derived from steps
    depends_on: [phase-id]     # default: []
    subagent: str              # optional
    role: str                  # optional
    model: str                 # optional
    steps[]:
      id: str                  # required, unique across entire plan
      name: str                # required
      prompt: str              # required
      status: StatusEnum       # default: open
      depends_on: [step-id]    # default: [], cross-phase allowed
      subagent: str            # optional
      role: str                # optional
      model: str               # optional
```

## Status Enum

`open | in_progress | complete | blocked | failed`

## Status Propagation (Bottom-Up)

Steps → Phases → Plan root. Plan root status is always derived; never set directly.

| Children condition | Derived status |
|---|---|
| All `complete` | `complete` |
| Any `failed` | `failed` |
| Any `blocked` | `blocked` |
| Any `in_progress` or `complete` | `in_progress` |
| Otherwise | `open` |

## Dependency Rules

- `depends_on` at step level: list of step IDs (cross-phase allowed)
- `depends_on` at phase level: list of phase IDs
- A step/phase is eligible only when all `depends_on` IDs have `status: complete`
- IDs must be unique across the entire plan (phases and steps share a single namespace)

## Constants

| Constant | Limit |
|---|---|
| Max phases per plan | 100 |
| Max steps per phase | 100 |
| Max deps per item | 50 |
| Max string field length | 20000 chars |
| Max name field length | 256 chars |

## Minimal Plan Example

```json
{
  "name": "my-plan",
  "description": "Simple example",
  "status": "open",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z",
  "phases": []
}
```

## Full Plan Example

```json
{
  "name": "feature-x",
  "description": "Implement feature X end-to-end",
  "status": "in_progress",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-02T12:00:00.000Z",
  "phases": [
    {
      "id": "ph-1",
      "name": "Design",
      "description": "Create technical specs",
      "status": "complete",
      "depends_on": [],
      "steps": [
        {
          "id": "s-1",
          "name": "Write tech specs",
          "prompt": "Write technical specs for feature X covering API, data model, and edge cases.",
          "status": "complete",
          "depends_on": []
        }
      ]
    },
    {
      "id": "ph-2",
      "name": "Implementation",
      "description": "Code the feature",
      "status": "in_progress",
      "depends_on": ["ph-1"],
      "subagent": "engineer",
      "role": "Senior software engineer",
      "model": "claude-sonnet-5",
      "steps": [
        {
          "id": "s-2",
          "name": "Implement API endpoint",
          "prompt": "Implement the REST API endpoint for feature X per the tech specs in plans/feature-x/plan.json step s-1.",
          "status": "in_progress",
          "depends_on": ["s-1"]
        },
        {
          "id": "s-3",
          "name": "Implement data layer",
          "prompt": "Implement the data model and repository layer for feature X.",
          "status": "open",
          "depends_on": ["s-1"]
        }
      ]
    }
  ]
}
```
````

### workflow OPERATION_MANAGER remnants + template `rosetta` step — EC is orchestrator/LARGE-only; `rosetta` is user-only
**Source**: `instructions/r3/core/workflows/adhoc-flow.md` (inline section + prereq), 8 workflow prereq lines (`requirements-authoring`, `init-workspace`, `self-help`, `research`, `coding`, `external-lib`, `modernization`, `code-analysis` flows), `docs/requirements/rosettify/assets/templates/create-for-orchestrator.json` + `src/rosettify/src/commands/plan/templates/create/for-orchestrator.ts`.
**Disposition**:
- `adhoc-flow` `<OPERATION_MANAGER>` section — DELETED-as-duplicate of `o-session-execution-controller.md` (every atom incl. RFC 7396, fresh-`next`, "Plan has been changed", loop-until lives there); replaced by `<orchestration severity="CRITICAL">` demanding SKILL `orchestration` FULLY + BOTH assets — plan-driven execution is this workflow's core idea (user ruling).
- 8× prereq `MUST USE OPERATION_MANAGER for deterministic execution` — DELETED-as-obsolete (EC = orchestrator + LARGE only); replaced with `MUST use todo tasks for reliability` (adhoc-flow: with the orchestration-FULLY line instead).
- `adhoc-flow` stale `plan-manager` names (×3: description, plan-wbs, execute-track) — renamed to EXECUTION_CONTROLLER (that skill was dissolved long ago).
- Template step `ph-prep-s-load-workflow` — DELETED-as-obsolete: the `rosetta` router is user-invoked ONLY and must never be mentioned/requested/recommended by any instruction or template; the phase-adding step now covers the no-active-workflow case. FR-PLAN-0035 + asset + src + step-count tests updated (3 seeded steps; 447 pass).
**Rationale**: new entry-path model — plain chat = minimal Rosetta (alwayson basics), `/rosetta` = routed flow, `/<flow>` = direct workflow; nothing routes to Rosetta on the AI's initiative.

```markdown
2. MUST USE OPERATION_MANAGER for deterministic execution
```

adhoc-flow inline section (verbatim; command list was a shortened copy of the mode-file section archived above):

```markdown
<OPERATION_MANAGER>

- `OPERATION_MANAGER` is a command alias to use `rosettify` MCP (if already is in context), fallback to `npx -y rosettify@latest <command> <subcommand> <plan_file>`, if it fails too MUST FALLBACK to built-in todo task tools (mirror plan ⊃ phases ⊃ steps as todo tasks)
- Commands:
  - `help plan` provides full information
  - `plan next <plan_file> [limit] [--target <phase_id>]` — get next steps to execute
  - `plan create-with-template <plan_file> for-orchestrator '<plan-name>' '<plan-description>'` — bootstrap a new orchestrator plan
  - `plan upsert-with-template <plan_file> <phase-id> for-subagent '<phase-name>' '<phase-description>'` — orchestrator MUST USE for adding prep steps for subagent
  - `plan update_status <plan_file> <step-id> [open|in_progress|complete|blocked|failed]` 
  - `plan query <plan_file> [id|entire_plan]` 
  - `plan show_status <plan_file> [id|entire_plan]` 
- Upsert follows RFC 7396: null removes keys, nested objects are merged not replaced, scalars are replaced, status field silently ignored to enforce use of `update_status`.
- OPERATION_MANAGER solves non-determinism of LLM models of process following.
- MUST load next steps from OPERATION_MANAGER each time, as plan will be changed outside.
- MUST execute plan via loop: call `next`, execute, `update_status`.
- LOOP IS NEVER DONE until `plan_status: complete` AND `count: 0` in `next` output. Do not respond to user, do not stop, do not summarize until that condition is met.
- MUST upsert a plan because of new tasks, inputs, findings.
- Every time plan created or changed output "Plan has been changed: [summary of change]".

</OPERATION_MANAGER>
```

Template step (verbatim, from both the FR asset JSON and the registered template):

```json
{
  "id": "ph-prep-s-load-workflow",
  "name": "Load workflow",
  "prompt": "MUST USE SKILL `rosetta` to select and load the workflow."
}
```


---

## W4 vocabulary sweep — dropped atoms (2026-07-10)

Closed alias contract applied (see `reduce-bootstrap.md` §W4). Atoms below were removed without relocation; everything else was transformed in place (old → new form, zero semantic loss).

### `rules/bootstrap-alwayson.md` — USE SKILL definition line (verbatim)

Ruling: alwayson defines no aliases. "memory does NOT satisfy" relocated into all 3 mode files; ToolSearch hint + ACQUIRE fallback dropped (plugin: native activation; MCP/local: mode-file bindings).

```markdown
"USE SKILL `X`" = call the Skill named `X`; reconstructing behavior from memory does NOT satisfy; not loaded → ToolSearch, fallback ACQUIRE "<X>/SKILL.md" FROM KB.
```

### `SEARCH` alias — dropped from the contract (zero real callers). Verbatim bindings removed from the 3 mode files:

```markdown
- `SEARCH <SMTH> IN KB` → `query_instructions(query="<SMTH>")`.
```

```markdown
- `SEARCH <KEYWORDS> IN KB` => use grep or codebase search in `instructions/r3/` folder with KEYWORDS as a query or file name
```

```markdown
- `SEARCH <KEYWORDS> IN KB` => use grep or codebase search in plugin root with KEYWORDS as query or file name:
  - Search in: `skills/`, `agents/`, `workflows/`, `rules/`
```

### Old `ACQUIRE`/`LIST` mode-file bindings — superseded (plugin: typed aliases are native, NO mapping; MCP/local: typed bindings). `ACQUIRE <SMTH> FROM KB` kept ONLY in MCP `bootstrap.md` for generated shells.

`rules/plugin-files-mode.md` (verbatim):

```markdown
- `ACQUIRE <file[.md]> FROM KB` => read local plugin files:
  - Search in: `skills/**/<file-name-with-extension>`
  - Search in `agents/`, `workflows/`, and `rules/` for `<file-name-with-extension>`
  - Use glob/find to locate file in plugin structure

- `LIST <path> IN KB` => list immediate children in plugin structure:
  - `LIST {skills,agents,workflows,rules} IN KB` => list `{skills,agents,workflows,rules}/` folder
  - `LIST skills/<skill-name> IN KB` => list contents of specific skill directory
```

`rules/local-files-mode.md` (verbatim; LIST rebound without `IN KB`; relative-refs phrase retained in the new USE SKILL binding):

```markdown
- `ACQUIRE <file[.md]> FROM KB` => read local files `instructions/r3/**/<file-name-with-extension>`
- `LIST <path> IN KB` => list immediate children of `instructions/r3/core/<path>/` (folders and files, no content)
```

`rules/bootstrap.md` (verbatim; LIST rebound without `IN KB`):

```markdown
- `LIST <path> IN KB` → `list_instructions(full_path_from_root="<path>")`.
```

### `skills/requirements-authoring/SKILL.md` — dangling dependency (verbatim; `questions.md` never existed; replaced by `USE SKILL `questioning` for Q&A.` [decided])

```markdown
- ACQUIRE `questions.md` FROM KB for Q&A.
```

### `skills/requirements-use/SKILL.md` — workflow references (ruling: this skill refers to NO workflows). Verbatim:

```markdown
- workflow `requirements-use-flow`
```

(`requirements-use-flow` does not exist in `workflows/`.) Also replaced: `use questions flow` → `USE SKILL `questioning``.

### Footer verb-teaching prose lines — deleted (verbatim; items themselves converted to canonical aliases in place):

`skills/planning/SKILL.md`, `skills/requirements-authoring/SKILL.md`, `skills/requirements-use/SKILL.md`, `skills/coding-agents-prompt-authoring/SKILL.md`:

```markdown
Use `ACQUIRE FROM KB` to load.
```

`workflows/requirements-authoring-flow.md`:

```markdown
Use `USE SKILL` for skills, `ACQUIRE FROM KB` for rules.
```

### `coding-agents-prompt-authoring/references/pa-rosetta.md` — old alias teaching items superseded by the closed-set teaching (verbatim):

```markdown
1. `ACQUIRE [grandparentfolder/][parentfolder/]<filename.md> FROM KB` to load rule, template, asset, etc. Supported three options: file name, parent folder with filename and three parts: `ACQUIRE requirements.md FROM KB`, `ACQUIRE agents/reviewer.md FROM KB`, `ACQUIRE requirements/skill.md FROM KB`, `ACQUIRE requirements/references/req-best-practices.md FROM KB`
2. `LIST <folder> IN KB` to list immediate children (folders and files) in folder. GRID/CORE will be cut during upload: `core/agents/<name>.md` => `agents/<name>.md`. Prefer listing over searching if you know folder in advance.
3. `SEARCH <keywords> IN KB` to search an entire knowledge base by keywords
```

### `workflows/requirements-authoring-flow.md` — cross-context skill-file loads, transformed to intent wording (grammar-enforced skill isolation). Verbatim originals:

```markdown
1. ACQUIRE `requirements-authoring/assets/ra-validation-rubric.md` FROM KB and run validation
3. ACQUIRE `requirements-authoring/assets/ra-change-log.md` FROM KB and update change log
```


### Project-scoped verbs — dropped from the contract entirely [decided 2026-07-10]

Reason: plugins are installed to NOT install MCP; security and privacy risk; a separate plugin will own project datasets. Zero callers existed in r3. MCP server tools (`query_project_context`, `store_project_context`) are untouched — only the alias vocabulary drops.

`rules/bootstrap.md` (verbatim):

```markdown
- `ACQUIRE <SMTH> ABOUT <PROJECT>` → `query_project_context(repository_name="<PROJECT>", tags="<SMTH>")`.
- `QUERY <SMTH> IN <PROJECT>` → `query_project_context(repository_name="<PROJECT>", query="<SMTH>")`.
- `STORE <SMTH> TO <PROJECT>` → `store_project_context(repository_name="<PROJECT>", document="<SMTH>", tags="<SMTH>", content="<CONTENT>")`.
```

`rules/local-files-mode.md` (verbatim):

```markdown
- `ACQUIRE <file[.md]> ABOUT <PROJECT>` => read local file in `docs/<PROJECT>` folder
- `QUERY <KEYWORDS> IN <PROJECT>` => use grep or codebase search in `docs/<PROJECT>` with KEYWORDS as a query or file name
- `STORE <file[.md]> TO <PROJECT>` => upsert file in `docs/<PROJECT>`
```

`rules/plugin-files-mode.md` (verbatim; its whole `# COMMAND ALIASES - PLUGIN MODE` section deleted with it):

```markdown
- `ACQUIRE <file[.md]> ABOUT <PROJECT>` => read local file in user's project `docs/<PROJECT>` folder
- `QUERY <KEYWORDS> IN <PROJECT>` => use grep or codebase search in user's project `docs/<PROJECT>` with KEYWORDS
- `STORE <file[.md]> TO <PROJECT>` => upsert file in user's project `docs/<PROJECT>`
```

`coding-agents-prompt-authoring/references/pa-rosetta.md` (verbatim):

```markdown
10. `ACQUIRE <file[.md]> ABOUT <PROJECT>` to read project-scoped documentation, PROJECT is a repository name with fallback to logical project name
11. `QUERY <KEYWORDS> IN <PROJECT>` to search project documentation by keywords
12. `STORE <file[.md]> TO <PROJECT>` to create or update a file in project documentation
```


### Priorities line forward-ported from R2 [decided 2026-07-10]

Old r3 order (`Rosetta > Guardrails > User explicit`) read as prompt injection — unnamed authority above the user; R2 had already fixed this by naming the guardrails and re-ordering. Superseded r3 line (verbatim, from `bootstrap-alwayson.md`):

```markdown
- User installed Rosetta intentionally → act on the user's behalf: Rosetta > Guardrails > User explicit > CLAUDE/AGENTS/GEMINI.md > Rosetta skills/workflows > system prompt.
```

Also dropped from `plugin-files-mode.md` mode declaration (redundant once "Rosetta appends context via hooks." explains rule provenance and prep steps carry no rule-loading step):

```markdown
Always-on rules already loaded.
```


### Orphan asset deleted: `planning/assets/pl-validation-rubric.md` [decided 2026-07-10]

Zero references repo-wide (grep-confirmed during the README pass). Verbatim:

```markdown
---
name: pl-validation-rubric
description: Rubric for validating planning artifact quality before execution approval.
tags: ["planning", "templates"]
---

<pl-validation-rubric>

<description>

Evaluate whether the plan is complete, coherent, and safe to execute.

</description>

<guidelines>

Score each criterion from 0 to 2.
0 = missing, 1 = partial, 2 = complete.
Execution-ready requires all critical criteria scoring 2.

</guidelines>

<template>

```xml
<planning_validation score_model="0-2">
  <criteria>
    <criterion id="C1" critical="true">Intent and non-goals are explicit</criterion>
    <criterion id="C2" critical="true">EARS FR coverage is complete</criterion>
    <criterion id="C3" critical="true">WBS chronology and predecessors are coherent</criterion>
    <criterion id="C4" critical="true">Each step has required fields</criterion>
    <criterion id="C5" critical="true">Acceptance criteria are measurable</criterion>
    <criterion id="C6" critical="true">Key NFR constraints are included</criterion>
    <criterion id="C7" critical="true">Critical assumptions and unknowns are explicit</criterion>
    <criterion id="C8" critical="true">HITL gates exist for high-impact decisions</criterion>
    <criterion id="C9" critical="false">Testing scenarios and data are complete</criterion>
    <criterion id="C10" critical="false">Documentation and git checkpoints are present</criterion>
    <criterion id="C11" critical="true">No speculative scope is introduced</criterion>
    <criterion id="C12" critical="false">Language is compact and unambiguous</criterion>
  </criteria>
  <results>
    <result criterion_id="C1" score="[0|1|2]" notes="[evidence]"/>
  </results>
  <summary>
    <critical_failures>
      - [criterion IDs with score below 2]
    </critical_failures>
    <decision>[ready|revise|blocked]</decision>
    <next_actions>
      - [required correction]
    </next_actions>
  </summary>
</planning_validation>
```

</template>

</pl-validation-rubric>

```

## `skills/hitl/SKILL.md` — pre-compression body (2026-07-10)

Structured + token-compressed (zero semantic loss intended; group order preserved: Questioning → Approval → Gates → Workflows/plans → Working with user → Mismatch); grilling paragraph moved from core_concepts into Questioning head; `reviewer ≠ implementer · reading ≠ using` intrinsic added; `TODO(human)` collaborative-writing rule added. Restored from ancestor `bootstrap-hitl-questioning.md` (lost at the 2b3b7ae4 rule→skill conversion): root-tag attrs `severity="CRITICAL" use="ALWAYS" back-and-forth-with-user="REQUIRED"` · ~2-pages-per-review-pass limit + TLDR hooks · `Yes, I understand consequences` example + tighten-wording · dangerous-actions-always-explicit-approval · Q&A incl. negative answers · one-answer-may-resolve-multiple-unknowns · batches-via-tools-else-one-by-one · user-is-not-always-right · mismatch persist-root-cause-to-memory. NOT restored (lives in `risk-assessment` skill): the MEDIUM/HIGH/CRITICAL risk ladder. Second pass same day (clean Sonnet-5 probe/compare experiment): MUST restored on ask-user-question-tools; gates un-merged to one trigger per line ("final acceptance — ALWAYS a gate"); negative approval list added (`ok`/`looks good`/`sure, go ahead`/👍 NEVER approval); dangerous-actions blanket scoped by tier (`hard-deny` vs `reconsider`); mismatch + confidence-threshold defined; opt-out operationalized (HITL only, guardrail skills stay); sizing cross-ref → `orchestration`; rules 6/7 and 18/19 split; TODO(human) scaffolding bounded "(within approved scope)". Third pass (experiment round 2): opt-out moved to core_concepts end + session-scoped; negative-ack list + tiering split to own rules; "Brief first" back to unconditional; "never assume it approved" + "valuable" + markers-complement-not-replace-gates re-added; 43 rules final. Fourth pass: word-level dense rewording (terms/unicode/dropped filler, ~4% chars; locked strings + README-quoted lines verbatim); fuller-worded version saved as `docs/stories/hitl-skill-good-alternative.md`. Fifth pass [decided, user rulings]: `dangerous-actions` hook-mechanics bullet ("When `dangerous-actions` hook denies a `reconsider`-tier call, the AI may retry by appending `# Rosetta-AI-reviewed` … See the `dangerous-actions` skill." — verbatim in the original body below) REMOVED as added-in-error meta-commentary on the Claude Code hook; mechanics live ONLY in `dangerous-actions/SKILL.md`; hitl rule 16 = plain "Dangerous actions ALWAYS require explicit approval." · WHY/HOW-loop + artifacts-are-means philosophy bullets DROPPED ("be clear and direct"; verbatim below) · rule 5 regained "include simple option too" [user edit]. Frontmatter description unchanged. Full original body verbatim (after frontmatter):

```
Invoke as

<hitl>

<core_concepts>

- "WHY" loop: idea → requirements → working software → learn → evolve
- "HOW" loop: specs → code → tests → stories → features
- Human gatekeeps every artifact in HOW loop. Good: human judgement breaks agent spirals fast. Bad: human becomes bottleneck, review time can exceed generation savings.
- Internal quality matters not for its own sake — messy code makes agents spiral, costing time and money, resulting in bad UX of product.
- Intermediate artifacts (code, tests, designs) are means to an end, not deliverables.
- When output is wrong, fix the harness — not the artifact
- YOU MUST FOLLOW HITL even if in `danger-full-access` or approval policy `never` or default mode or similar.
- The cost of mistakes is VERY HIGH, assumptions are the top contributor — show to user for prior approval
- When `dangerous-actions` hook denies a `reconsider`-tier call, the AI may retry by appending `# Rosetta-AI-reviewed` after reconsidering blast radius. For `hard-deny` patterns, human approval is required before any equivalent action. See the `dangerous-actions` skill.
- Asking questions is a repetitive process: every time something comes up, every time ambiguity comes back, do not rush!
- Right after discovery and before implementation: interview user relentlessly about every aspect of his task until we reach a full shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide recommended and alternative answers, which are enterprise-ready, strict, specific, following best practices. Ask only few questions at a time. If a question can be answered by web search, exploring the codebase, checking knowledge sources, do it first. Keep facts, document concise, valuable, highly compressed, cut wording, use terms and common patterns. Loop cycles until NO gaps or ambiguities left without nitpicking.
</core_concepts>

<process>

Questioning:

1. Ask until assumptions, ambiguities, gaps, conflicts resolved.
2. Skip LOW or NIT PICKING.
3. Prioritize: scope > security/privacy > UX > technical.
4. 5-10 targeted MECE questions per batch.
5. One decision per question.
6. Include why it matters and safe default.
7. Group related questions into a single interaction.
8. Track open questions using todo tasks.
9. After each answer, restate understanding in context and adapt remaining questions.
10. Mark unanswered as assumption and continue.
11. Persist Q&A in relevant files.
12. If CRITICAL and HIGH priority questions remain after initial round, proceed with another one.
13. STOP and escalate unresolved critical blockers.
14. MUST NOT assume anything—even reasonably. Task must be crystal clear. Suggest and confirm instead of guessing.
15. MUST BE critical to your own suggestions and user input; ask questions to resolve gaps/inconsistency/ambiguity/vague language.
16. MUST use ask user question tools if available.

Approval:

17. MUST NOT assume approval — user message (questions, suggestions, edits) = review, not approval. User questions are only questions.
18. Accepted: `Yes, I approve`, `Approve, the plan was reviewed`, etc.
19. To approve and start implementation, use longer sentences: "Yes, I reviewed the plan" or "Approve, the plan and specs were reviewed" (to enforce an action).
20. Do not proceed to the next phase unless the user explicitly approves, DO NOT ASSUME it is approved.
21. Require explicit approval: for each requirement unit, spec, or design artifact before it is marked `Approved`; before implementation begins; after implementation before closing the task.
22. Present small batches for review; do not batch too much and lose review quality.
23. Keep status `Draft` until approved.
24. Proactively review new or updated content with user as a narrative.
25. Clearly separate user-provided vs AI-inferred.
26. High+ risk: require EXACT sentence to type.
27. Additional scope requires ADDITIONAL approval.
28. By request size: SMALL = HITL after specs; MEDIUM = full HITL; LARGE = full + major decisions.
29. USER may review by directly providing comments in the files.

HITL gates (required at minimum):

30. Ambiguous, conflicting, or unclear intent.
31. Risky, destructive, or irreversible action.
32. Scope change or de-scoping proposed.
33. Critical tradeoffs needing MoSCoW decision.
34. Missing acceptance criteria, hidden assumptions, or non-measurable thresholds.
35. Conflicting requirement clauses are found.
36. Requirement appears stale or contradictory.
37. Final acceptance on requirement coverage is required.
38. Adaptation has no direct target equivalent.
39. Architecture or design tradeoffs are ambiguous.
40. Simulation or review exposes major behavioral risk.
41. Context conflicts with stated user intent.
42. Confidence below reliable threshold.

In gates:

- Propose clear options with tradeoffs.
- Wait for explicit user decision before proceeding.
- Do not extend scope without user approval.
- Do not silently reinterpret requirements.
- Do not claim done without traceability evidence.

Workflows MUST include HITL checkpoints in:

- Discovery and intent capture (confirm scope and goals).
- Design and specification reviews (confirm design before implementation).
- Test case specification (confirm test scenarios before execution).
- Final delivery (confirm coverage before closing).

Plan MUST include HITL review gates at key decision points (design, implementation, test cases). Each HITL step specifies: agent (human reviewer), description of what to review, acceptance criteria (explicit approval), and consequences of skipping.

Working with user:

43. Tell intent in advance.
44. Back-and-forth IS required, not optional.
45. HITL collaboration is a core principle, not optional enhancement.
46. Challenge user reasonably.
47. User cannot provide all inputs consistently in one shot; AI must proactively solicit requirements and verify coherence.
48. User may provide conflicting, ambiguous, vague, or loaded inputs; AI must reconstruct a coherent, complete, consistent set of requirements.
49. Proactively suggest next areas to clarify and improve.
50. Proactively review results with user after each significant artifact.
51. Prompt brief first; get approved; then draft.
52. Ask questions until crystal clear, without nitpicking.
53. Review as story + changelog, not raw diff.

Mismatch:

54. If user is upset or after two mismatches: STOP all changes immediately.
55. Ask 1-3 clarifying questions.
56. State understanding and conflicts in brief bullets.
57. Be assertive about the conflict.
58. Switch to think-then-tell-and-wait-for-approval mode.
59. Wait for explicit user confirmation before any further changes.

</process>

<pitfalls>

- Rubber-stamping without actual inspection.
- Treating user message as implicit approval.
- Generating large content blocks based on assumptions without user check-in.

</pitfalls>

</hitl>
```

Dropped outright: stray pre-root-tag fragment `Invoke as` (leftover, no schema meaning).
