# Discovery Notes: plan-manager-create and plan-manager-use Skills

## 1. What plan_manager MCP Tool Does

### Commands

| Command | Description |
|---|---|
| `help` | Returns help text (stateless) |
| `upsert` | Create-or-patch plan / phase / step using RFC 7396 merge patch by `id`. Requires `target_id` (`entire_plan`, phase-id, or step-id) and `data` JSON object. For new items: `data.kind` must be `phase` or `step`; new steps also need `data.phase_id`. |
| `query` | Return full JSON of plan / phase / step for `target_id`. |
| `show_status` | Return compact status summary with progress percentages and step/phase breakdowns. |
| `update_status` | Set status of a phase or step; propagates upward (step → phase → plan). Cannot set `entire_plan` directly. |
| `next` | Return list of `open` steps whose `depends_on` are all `complete`, respecting phase deps. Accepts `limit`. |

### Data Structure

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

### Status Propagation Logic

Bottom-up, computed from children:
- All children `complete` → parent = `complete`
- Any child `failed` → parent = `failed`
- Any child `blocked` → parent = `blocked`
- Any child `in_progress` or `complete` → parent = `in_progress`
- Otherwise → `open`

`update_status` sets a phase/step directly, then propagates only UPWARD (does not override sibling statuses). Plan root status is always derived; cannot be set directly.

### Constants / Limits

- `PLAN_MAX_PHASES = 100`
- `PLAN_MAX_STEPS_PER_PHASE = 100`
- `PLAN_MAX_DEPENDENCIES_PER_ITEM = 50`
- `PLAN_MAX_STRING_LENGTH = 20_000`
- `PLAN_MAX_NAME_LENGTH = 256`
- Valid statuses: `open`, `in_progress`, `complete`, `blocked`, `failed`
- Storage key: `plan:<plan_name>` in Redis (TTL 5 days default)

### MCP vs JS Skill Difference

MCP stores plans in Redis (keyed by `plan_name`). The JS skill stores plans as JSON files on disk. The file path replaces `plan_name` as the plan identifier. The convention for file location is `agents/TEMP/<FEATURE>/<plan-name>.json`.

---

## 2. Existing Artifacts

### pm-helper.js (already created)

- Location: `/instructions/r2/core/skills/plan-manager-create/assets/pm-helper.js`
- Status: **Complete and correct**. Fully implements all MCP commands: `create`, `next`, `update_status`, `show_status`, `query`, `upsert`.
- Also already copied to: `/plugins/core-claude/skills/plan-manager-create/assets/pm-helper.js` (identical content).
- Usage: `node pm-helper.js <cmd> <plan-file> [args...]`
- Key difference from MCP: `create` command (new, not in MCP) initializes a new plan file; `upsert` on non-existent file with `entire_plan` also creates it.

### plan-manager-create folder

- `/instructions/r2/core/skills/plan-manager-create/` — exists, contains only `assets/` subfolder. **SKILL.md is missing.**
- `/plugins/core-claude/skills/plan-manager-create/` — exists, contains only `assets/` subfolder. **SKILL.md is missing.**
- `/plugins/core-cursor/skills/plan-manager-create/` — does NOT exist yet.

### plan-manager-use

- `/instructions/r2/core/skills/plan-manager-use/` — does NOT exist yet.
- No plugin copies exist yet.

---

## 3. Skill Format and Structure

### Frontmatter Fields (from skill.md schema)

Required:
- `name`: must match parent folder name
- `description`: "Rosetta" + brief when/why

Optional but relevant:
- `dependencies`: e.g., `node.js` for JS-executing skills
- `disable-model-invocation`: boolean
- `user-invocable`: boolean
- `argument-hint`: shown in autocomplete
- `allowed-tools`: e.g., `Bash(node:*)` to allow node without permission prompts
- `model`: preferred model(s)
- `tags`: for KB discovery
- `baseSchema: docs/schemas/skill.md` — REQUIRED, do not remove

### XML Body Sections

Standard sections used in real skills:
- `<role>` — agent specialization
- `<when_to_use_skill>` — very short, problem + validation
- `<core_concepts>` — fundamental concepts, definitions
- `<process>` — action/gate steps, imperative
- `<validation_checklist>` — observable proof of correct execution
- `<best_practices>` — short tips
- `<pitfalls>` — gotchas, non-obvious issues
- `<resources>` — references
- `<templates>` — output templates

### Plugin Model Name Differences

Core uses full model descriptors: `model: claude-4.6-opus-high, gpt-5.3-codex-high, gemini-3.1-pro-high`
Claude plugin (`core-claude`) uses short Anthropic-only names: `model: opus` (or `sonnet`, `haiku`)
Cursor plugin uses full multi-vendor names (same as core).

---

## 4. Plugin Structure

### How Core Skills Map to Plugins

- `instructions/r2/core/skills/<name>/SKILL.md` → core (multi-vendor)
- `plugins/core-claude/skills/<name>/SKILL.md` → Claude Code plugin (Anthropic model names only)
- `plugins/core-cursor/skills/<name>/SKILL.md` → Cursor plugin (same as core, multi-vendor)

The `assets/` subfolder is also copied per plugin when it contains files agents need to execute.

### Existing Plugin Skills (both claude and cursor plugins have same set)

coding, coding-agents-prompt-adaptation, debugging, init-workspace-context, init-workspace-discovery, init-workspace-documentation, init-workspace-patterns, init-workspace-rules, init-workspace-shells, init-workspace-verification, large-workspace-handling, load-context, **plan-manager-create** (assets only, no SKILL.md), planning, questioning, reasoning, requirements-authoring, requirements-use, reverse-engineering, tech-specs, testing

---

## 5. Files to Create or Update

### Files to Create

1. `/instructions/r2/core/skills/plan-manager-create/SKILL.md`
   - Documents the skill for plan creators (orchestrators)
   - Teaches: use `node pm-helper.js create` to initialize, file convention for plan storage
   - References pm-helper.js usage and command set
   - `dependencies: node.js`
   - `allowed-tools: Bash(node:*)`

2. `/instructions/r2/core/skills/plan-manager-use/SKILL.md`
   - Documents the skill for plan consumers (subagents)
   - Teaches: how to call pm-helper.js for `next`, `update_status`, `show_status`
   - References pm-helper.js from plan-manager-create/assets/
   - `dependencies: node.js`

3. `/instructions/r2/core/skills/plan-manager-use/assets/pm-helper.js`
   - QUESTION: Should pm-helper.js be duplicated here, or should plan-manager-use reference the asset from plan-manager-create?
   - RECOMMENDED: Duplicate to plan-manager-use/assets/ as well for self-contained skill. This avoids cross-skill asset dependency that would break if only one skill is loaded.

4. `/plugins/core-claude/skills/plan-manager-create/SKILL.md`
   - Same as core but with `model: sonnet` (or medium-tier Anthropic model)

5. `/plugins/core-cursor/skills/plan-manager-create/` (full folder)
   - `assets/pm-helper.js` (copy)
   - `SKILL.md` (same as core, multi-vendor model names)

6. `/plugins/core-claude/skills/plan-manager-use/` (full folder)
   - `assets/pm-helper.js` (copy)
   - `SKILL.md` (claude model names)

7. `/plugins/core-cursor/skills/plan-manager-use/` (full folder)
   - `assets/pm-helper.js` (copy)
   - `SKILL.md` (same as core)

### Files to Update

8. `/docs/definitions/skills.md`
   - Add `plan-manager-create` and `plan-manager-use` to the list

---

## 6. Design Constraints

### Node.js Requirement

- `pm-helper.js` uses only built-in Node.js modules: `fs`, `path`
- No `npm install` needed
- Constraint: agent environment must have `node` in PATH
- `dependencies: node.js` in frontmatter communicates this to IDE
- `allowed-tools: Bash(node:*)` in skill frontmatter allows executing without permission prompts in Claude Code

### JSON File Storage Convention

- Plan files stored at `agents/TEMP/<FEATURE>/<plan-name>.json`
- `agents/TEMP/` is excluded from SCM (per ARCHITECTURE.md workspace file definitions)
- The `savePlan()` function in pm-helper.js auto-creates directories recursively

### `create` vs `upsert` for Initialization

- `pm-helper.js create` is the idiomatic way to initialize a new plan
- `upsert entire_plan` also creates if file does not exist (fallback)
- Skills should teach `create` as the canonical first step

---

## 7. Skill Responsibility Separation

### plan-manager-create

- **Who uses it**: Orchestrators / plan creators
- **Purpose**: Create a new execution plan, add phases/steps, set up the plan structure
- **Key commands taught**: `create`, `upsert`, `query`
- **When to use**: At the start of a workflow when plan_manager MCP is unavailable (e.g., offline, no MCP configured, Claude Code / Cursor direct execution)

### plan-manager-use

- **Who uses it**: Subagents / plan consumers / executors
- **Purpose**: Drive execution using an existing plan — get next tasks, mark progress
- **Key commands taught**: `next`, `update_status`, `show_status`, `query`
- **When to use**: During execution when assigned to work from a plan file

### Dependency Note

`plan-manager-use` needs pm-helper.js. If pm-helper.js is duplicated into plan-manager-use/assets/, the skill is self-contained. If it references plan-manager-create/assets/, both skills must be loaded together. Duplication is simpler and safer for skill independence.

---

## 8. Questions / Gaps

1. **pm-helper.js duplication**: Should plan-manager-use/assets/pm-helper.js be a copy or should it reference plan-manager-create/assets/pm-helper.js? Recommendation: duplicate for self-contained skill.

2. **allowed-tools in plan-manager-use**: Should it include `Bash(node:*)` as well? Yes, same rationale as plan-manager-create.

3. **model selection**: plan-manager-create is used by orchestrators (medium/large model reasonable). plan-manager-use is used by subagents during execution (medium model). Claude plugin: `sonnet` for both. Core/Cursor: `claude-sonnet-4-6, gpt-5.4-medium` or similar.

4. **SKILL.md body depth**: These are operational/tool skills (not reasoning-heavy). The process section should be very direct and concrete with exact command invocations. Reference the pm-helper.js command table inline.

5. **Tags**: `plan-manager-create` and `plan-manager-use` should have tags that allow `ACQUIRE plan-manager-create FROM KB` to work. Auto-tagging from folder structure will produce `plan-manager-create` and `plan-manager-use` tags automatically. Additional tags like `plan-manager` could be added to bundle both when needed.

---

## 9. Summary

The `plan_manager` MCP tool is a Redis-backed plan store. The two new skills (`plan-manager-create` and `plan-manager-use`) replicate this functionality using `pm-helper.js`, a Node.js CLI script that operates on local JSON files. The JS asset (`pm-helper.js`) is already complete and tested.

**What remains**:
- Write SKILL.md for plan-manager-create (core + 2 plugins)
- Create plan-manager-use folder with SKILL.md and pm-helper.js copy (core + 2 plugins)
- Update docs/definitions/skills.md

**No MCP changes required. No Python changes required. Old plan_manager MCP tool stays as-is.**
