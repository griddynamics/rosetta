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
