# Tech Specs: plan-manager Skill

Status: Draft

## 1. Scope

One new Rosetta skill `plan-manager` that replicates the `plan_manager` MCP tool functionality using JavaScript, so it works in Claude Code, Cursor, and any JS-capable coding agent without requiring the MCP server. The existing MCP tool and all existing code stay untouched. Only new skill files are created.

## 2. Skill Identity

### Frontmatter

```yaml
name: plan-manager
description: "Rosetta plan manager skill for creating, tracking, and executing plans using local JSON files when MCP plan_manager is unavailable."
dependencies: node.js
disable-model-invocation: false
user-invocable: true
argument-hint: plan-name
allowed-tools: Bash(node:*)
model: <varies by variant, see section 9>
tags:
  - plan-manager
  - plan-manager-create
  - plan-manager-use
baseSchema: docs/schemas/skill.md
```

Key fields:

| Field | Value | Rationale |
|---|---|---|
| `name` | `plan-manager` | Matches folder name per schema rule |
| `dependencies` | `node.js` | pm-helper.js uses only built-in Node.js modules |
| `allowed-tools` | `Bash(node:*)` | Allows node execution without permission prompts in Claude Code |
| `user-invocable` | `true` | Users can invoke via `/plan-manager` |
| `tags` | `plan-manager`, `plan-manager-create`, `plan-manager-use` | Discoverable by both old tag names and the new unified name |

## 3. Commands

The skill exposes six commands via `pm-helper.js`. All invoked as:

```
node pm-helper.js <cmd> <plan-file> [args...]
```

### 3.1 create

Creates a new plan file.

```
node pm-helper.js create <plan-file> '<plan-json>'
```

- `plan-json`: JSON object with `name`, `description`, optional `phases[]` with nested `steps[]`.
- Creates file at `<plan-file>` path, auto-creates parent directories.
- Sets `status: open`, `created_at`, `updated_at` timestamps.
- Returns: `{ ok: true, plan_file, name, status }`.

### 3.2 next

Returns steps ready for execution: `in_progress` steps first (with `resume: true`), then `open` steps whose dependencies are all `complete`.

```
node pm-helper.js next <plan-file> [limit=10]
```

- Scans phases in order, skipping `complete` phases and phases whose `depends_on` are not all `complete`.
- **Resume behavior** (bug fix): Collects `in_progress` steps first, tagged with `resume: true`. Then collects `open` steps with `resume: false`. Returns `in_progress` steps before `open` steps.
- `limit` applies to total returned steps across both categories.
- Returns: `{ ready: [...], count, plan_status }`. Each item includes `phase_id`, `phase_name`, and `resume` flag.

### 3.3 update_status

Sets the status of a phase or step, then propagates upward.

```
node pm-helper.js update_status <plan-file> <id> <status>
```

- Valid statuses: `open`, `in_progress`, `complete`, `blocked`, `failed`.
- Cannot target `entire_plan` (plan status is always derived).
- Propagation is bottom-up only (does not override siblings).
- Returns: `{ ok: true, id, status, plan_status }`.

### 3.4 show_status

Returns a compact status summary with progress percentages.

```
node pm-helper.js show_status <plan-file> [id|entire_plan]
```

- Without `id` or with `entire_plan`: returns plan-level summary with phase/step totals and `progress_pct`.
- With phase `id`: returns phase summary with its steps.
- With step `id`: returns step status.
- Returns: status object with `totals` breakdown per status category.

### 3.5 query

Returns full JSON of a plan, phase, or step.

```
node pm-helper.js query <plan-file> [id|entire_plan]
```

- Without `id` or with `entire_plan`: returns full plan JSON.
- With `id`: returns matching phase or step JSON.

### 3.6 upsert

Create-or-patch plan, phase, or step using RFC 7396 merge patch.

```
node pm-helper.js upsert <plan-file> <target-id> '<patch-json>'
```

- `target-id`: `entire_plan`, phase-id, or step-id.
- For new items: `data.kind` must be `phase` or `step`; new steps also need `data.phase_id`.
- Arrays (phases, steps) are merged by `id` field.
- Creates file if `target-id` is `entire_plan` and file does not exist.
- Returns: `{ ok: true, id, plan_status }`.

## 4. pm-helper.js Interface Contract

### CLI Interface

```
node pm-helper.js <cmd> <plan-file> [args...]
```

- Uses only built-in Node.js modules: `fs`, `path`. No `npm install` needed.
- All output is JSON to stdout via `console.log(JSON.stringify(data, null, 2))`.
- Error responses use `{ error: "description" }` format.
- Exit code 1 for unknown commands or missing command.

### Resume Bug Fix (applied to `cmdNext`)

**Current behavior**: `next` only returns steps with `status === 'open'`.

**Required behavior**: `next` returns both `in_progress` and `open` steps:

1. First pass: collect all `in_progress` steps (from non-complete phases with satisfied deps), add `resume: true` to each.
2. Second pass: collect all `open` steps (from non-complete phases with satisfied deps), add `resume: false` to each.
3. Concatenate: `in_progress` steps first, then `open` steps.
4. Apply `limit` to the combined list.

This ensures that if an agent crashes mid-execution, the next session sees the `in_progress` step as the first item from `next` with `resume: true`, signaling it should be continued rather than started fresh.

## 5. pm-schema.md Content Spec

`pm-schema.md` is a reference template asset that documents the plan JSON structure. It serves as inline documentation for plan creators. Content:

- Plan JSON structure with all fields, types, and defaults
- Status enum: `open | in_progress | complete | blocked | failed`
- Status propagation rules (bottom-up)
- Dependency resolution rules (step and phase level)
- Constants/limits (max phases: 100, max steps per phase: 100, max deps: 50, max string length: 20000, max name length: 256)
- Example minimal plan JSON
- Example plan with phases and steps

## 6. Plan File Path Convention

Plans are stored at:

```
plans/<plan-name>/plan.json
```

- `plans/` is the FEATURE PLAN folder per Rosetta workspace conventions.
- `<plan-name>` matches the plan's `name` field, lowercased, dash-separated.
- The SKILL.md instructs agents to use this convention.
- `savePlan()` in pm-helper.js auto-creates directories recursively.

## 7. Status Propagation Rules

Bottom-up, computed from children:

| Condition | Derived Status |
|---|---|
| All children `complete` | `complete` |
| Any child `failed` | `failed` |
| Any child `blocked` | `blocked` |
| Any child `in_progress` or `complete` | `in_progress` |
| Otherwise | `open` |

- `update_status` sets a phase/step directly, then propagates only upward.
- Plan root status is always derived; cannot be set directly.
- Phase status is derived from its steps (after explicit set, propagation recalculates).

## 8. Data Structure

```
plan:
  name: str
  description: str
  status: open|in_progress|complete|blocked|failed  (derived, bottom-up)
  created_at: ISO timestamp
  updated_at: ISO timestamp
  phases[]:
    id: str          (unique across entire plan)
    name: str
    description: str
    status: open|in_progress|complete|blocked|failed  (derived from steps)
    depends_on: [phase-id, ...]
    subagent: str    (optional)
    role: str        (optional)
    model: str       (optional)
    steps[]:
      id: str        (unique across entire plan)
      name: str
      prompt: str
      status: open|in_progress|complete|blocked|failed
      depends_on: [step-id, ...]  (cross-phase allowed)
      subagent: str  (optional)
      role: str      (optional)
      model: str     (optional)
```

## 9. Plugin Variants

Three copies of the skill, differing only in the `model` frontmatter field:

| Variant | Location | `model` value |
|---|---|---|
| core | `instructions/r2/core/skills/plan-manager/` | `claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro-preview` |
| core-claude | `plugins/core-claude/skills/plan-manager/` | `sonnet` |
| core-cursor | `plugins/core-cursor/skills/plan-manager/` | Same as core |

Each variant folder contains:
- `SKILL.md` (only `model` field differs)
- `assets/pm-helper.js` (identical across all three)
- `assets/pm-schema.md` (identical across all three)

Assets MUST be duplicated (not referenced cross-folder) because each plugin must be self-contained.

## 10. Files to Create

| # | File | Description |
|---|---|---|
| 1 | `instructions/r2/core/skills/plan-manager/SKILL.md` | Core skill definition |
| 2 | `instructions/r2/core/skills/plan-manager/assets/pm-helper.js` | JS CLI (with resume fix) |
| 3 | `instructions/r2/core/skills/plan-manager/assets/pm-schema.md` | Plan JSON schema reference |
| 4 | `plugins/core-claude/skills/plan-manager/SKILL.md` | Claude plugin variant |
| 5 | `plugins/core-claude/skills/plan-manager/assets/pm-helper.js` | Copy of #2 |
| 6 | `plugins/core-claude/skills/plan-manager/assets/pm-schema.md` | Copy of #3 |
| 7 | `plugins/core-cursor/skills/plan-manager/SKILL.md` | Cursor plugin variant |
| 8 | `plugins/core-cursor/skills/plan-manager/assets/pm-helper.js` | Copy of #2 |
| 9 | `plugins/core-cursor/skills/plan-manager/assets/pm-schema.md` | Copy of #3 |

## 11. Files to Update

| # | File | Change |
|---|---|---|
| 10 | `docs/definitions/skills.md` | Add `plan-manager` entry |
| 11 | `instructions/r2/core/workflows/adhoc-flow-with-plan-manager.md` | Convert to USE SKILL `plan-manager` (see section 16) |
| 12 | `plugins/core-claude/workflows/adhoc-flow-with-plan-manager.md` | Same as #11 |
| 13 | `plugins/core-cursor/workflows/adhoc-flow-with-plan-manager.md` | Same as #11 |

## 12. Files to Delete (Cleanup)

Old folders created before the design was finalized (had assets only, no SKILL.md):

| # | Path | Reason |
|---|---|---|
| 11 | `instructions/r2/core/skills/plan-manager-create/` | Replaced by unified `plan-manager` |
| 12 | `plugins/core-claude/skills/plan-manager-create/` | Replaced by unified `plan-manager` |
| 13 | `plugins/core-cursor/skills/plan-manager-create/` | Replaced by unified `plan-manager` |

## 13. SKILL.md Body Structure

The SKILL.md follows the standard skill schema with these sections:

- `<role>`: Senior execution planner and tracker for plan-driven workflows.
- `<when_to_use_skill>`: Use when `plan_manager` MCP tool is unavailable (offline, no MCP configured, plugin-only environment) and the workflow requires plan creation, tracking, or execution. Replaces MCP `plan_manager` with local JSON file operations.
- `<core_concepts>`: Plan file convention (`plans/<plan-name>/plan.json`), pm-helper.js CLI interface, resume behavior, status propagation.
- `<process>`: Step-by-step for orchestrators (create plan, upsert phases/steps, delegate) and for subagents (next, update_status, show_status). Exact command invocations inline.
- `<validation_checklist>`: Plan file exists, phases have steps, `next` returns resume steps, status propagation is correct.
- `<pitfalls>`: Forgetting to `update_status` after step execution, not checking `resume` flag, hardcoding plan file paths.
- `<resources>`: Reference to `plan-manager/assets/pm-schema.md` via ACQUIRE, reference to `adhoc-flow-with-plan-manager` workflow.

## 14. Alignment with Existing Workflows

The `adhoc-flow-with-plan-manager` workflow is converted to reference the skill as the primary planner. See section 16 for exact changes.

## 16. adhoc-flow-with-plan-manager Conversion

Three copies updated: `instructions/r2/core/workflows/`, `plugins/core-claude/workflows/`, `plugins/core-cursor/workflows/`.

### `<plan_manager>` section — full replacement

**Remove:**
- `"Rosetta's plan_manager tool"` wording
- Data structure YAML block (moved to `pm-schema.md` asset)
- Command-level detail (lives in skill)

**Replace with:**
```
USE SKILL `plan-manager` as the main execution planner (file-based, JS). When Rosetta MCP is available, the `plan_manager` MCP tool can be used instead with identical command semantics.

Orchestrator and subagents:
- MUST use plan-manager as main execution planner; todo tasks/built-in planners are for tracking INSIDE step execution only.
- MUST USE `next` to drive execution loop until `plan_status: complete` and `count: 0`.
- MUST USE `update_status` after each step.
- MUST USE `upsert` to adapt plan mid-execution (add/remove phases/steps).

Orchestrator:
- MUST tell subagents all above MUST as MUST (within their scope).
- MUST tell subagents: "tell orchestrator to modify plan if work is outside your scope".

ACQUIRE `plan-manager/assets/pm-schema.md` FROM KB for data structure reference.
```

### `<building_blocks>` section — two lines updated

- `plan-wbs`: `"persist via plan_manager upsert"` → `"USE SKILL plan-manager upsert"`
- `execute-track`: `"`plan_manager next` → execute → `update_status`"` → `"plan-manager next → execute → update_status"`

### `<description_and_purpose>` — one line updated

- `"persist via plan_manager"` → `"persist via plan-manager skill"`

### All other sections unchanged

`<models>`, `<workflow_phases>`, `<best_practices>`, `<pitfalls>` — no changes.

## 15. Constraints

- No npm dependencies. Only built-in Node.js modules.
- Agent environment must have `node` in PATH.
- JSON files are not concurrency-safe (no file locking). Acceptable because coding agents execute sequentially.
- Plan file size is unbounded; practical limit is filesystem and memory.
- Old MCP tool stays as-is. No Python changes.
