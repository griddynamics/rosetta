# Implementation Plan: plan-manager Skill

Status: Draft
Specs: plan-manager-SPECS.md (same folder)

## Task 1: Apply resume bug fix to pm-helper.js

**Description**: Modify `cmdNext` in the existing pm-helper.js to return `in_progress` steps (with `resume: true`) before `open` steps (with `resume: false`). This is the source file that will be copied to all skill folders.

**Files affected**:
- `instructions/r2/core/skills/plan-manager-create/assets/pm-helper.js` (source to copy from and modify)

**Acceptance Criteria**:
- `cmdNext` collects `in_progress` steps first with `resume: true` flag
- `cmdNext` collects `open` steps second with `resume: false` flag
- `in_progress` steps appear before `open` steps in the `ready` array
- `limit` applies to the combined list
- All other commands remain unchanged
- Running `node pm-helper.js next <file>` on a plan with an `in_progress` step returns that step with `resume: true`

---

## Task 2: Create pm-schema.md asset

**Description**: Write the plan JSON structure reference template. Documents the data model, status enum, propagation rules, constraints, and includes minimal examples.

**Files affected**:
- New: `instructions/r2/core/skills/plan-manager/assets/pm-schema.md`

**Acceptance Criteria**:
- Documents all plan/phase/step fields with types and defaults
- Lists status enum values
- Describes status propagation rules (bottom-up)
- Includes constants/limits
- Contains one minimal example and one example with phases/steps
- No frontmatter (it is an asset, not a skill)

---

## Task 3: Create plan-manager SKILL.md (core)

**Description**: Write the core skill definition following the skill schema. Combines creator and consumer responsibilities into one skill. Uses full multi-vendor model names.

**Files affected**:
- New: `instructions/r2/core/skills/plan-manager/SKILL.md`

**Acceptance Criteria**:
- Frontmatter matches SPECS section 2 exactly (name, description, dependencies, allowed-tools, model, tags, baseSchema)
- `model: claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro-preview`
- Body has sections: role, when_to_use_skill, core_concepts, process, validation_checklist, pitfalls, resources
- Process section covers both orchestrator flow (create, upsert, delegate) and subagent flow (next, update_status, show_status)
- References `pm-schema.md` via `ACQUIRE plan-manager/assets/pm-schema.md FROM KB`
- Documents plan file convention: `plans/<plan-name>/plan.json`
- Documents resume behavior for `next` command
- Concise, imperative, no filler

---

## Task 4: Copy pm-helper.js to core plan-manager folder

**Description**: Copy the bug-fixed pm-helper.js from the old `plan-manager-create` location to the new `plan-manager` skill assets folder.

**Files affected**:
- New: `instructions/r2/core/skills/plan-manager/assets/pm-helper.js` (copy from task 1 output)

**Acceptance Criteria**:
- File is identical to the bug-fixed version from task 1
- File is executable with `node pm-helper.js`

---

## Task 5: Create plugin variants

**Description**: Create `plan-manager` skill folders in both `core-claude` and `core-cursor` plugins. Each folder contains SKILL.md, assets/pm-helper.js, and assets/pm-schema.md.

**Files affected**:
- New: `plugins/core-claude/skills/plan-manager/SKILL.md` (model: `sonnet`)
- New: `plugins/core-claude/skills/plan-manager/assets/pm-helper.js` (copy)
- New: `plugins/core-claude/skills/plan-manager/assets/pm-schema.md` (copy)
- New: `plugins/core-cursor/skills/plan-manager/SKILL.md` (same as core)
- New: `plugins/core-cursor/skills/plan-manager/assets/pm-helper.js` (copy)
- New: `plugins/core-cursor/skills/plan-manager/assets/pm-schema.md` (copy)

**Acceptance Criteria**:
- core-claude SKILL.md has `model: sonnet`, all other frontmatter identical to core
- core-cursor SKILL.md is identical to core
- pm-helper.js copies are byte-identical to the core version
- pm-schema.md copies are byte-identical to the core version

---

## Task 6: Cleanup old plan-manager-create folders

**Description**: Delete the old `plan-manager-create` folders that were created before the design was finalized. They contain only assets (no SKILL.md) and are superseded by the unified `plan-manager` skill.

**Files affected**:
- Delete: `instructions/r2/core/skills/plan-manager-create/` (entire folder)
- Delete: `plugins/core-claude/skills/plan-manager-create/` (entire folder)
- Delete: `plugins/core-cursor/skills/plan-manager-create/` (entire folder)

**Acceptance Criteria**:
- All three `plan-manager-create` folders are removed
- No references to `plan-manager-create` remain in any new files
- `plan-manager` tags in the new skill cover discoverability for both old and new names

---

## Task 7: Convert adhoc-flow-with-plan-manager.md (3 copies)

**Description**: Update all three copies of the workflow to use `USE SKILL plan-manager` instead of the MCP tool. Per specs section 16:
- Replace `<plan_manager>` section content (remove data structure, replace MCP references, keep MUST orchestration rules, add ACQUIRE pm-schema.md reference)
- Update `plan-wbs` building block: `plan_manager upsert` → `plan-manager upsert`
- Update `execute-track` building block: `plan_manager next` → `plan-manager next`
- Update `<description_and_purpose>`: `persist via plan_manager` → `persist via plan-manager skill`

**Files affected**:
- Update: `instructions/r2/core/workflows/adhoc-flow-with-plan-manager.md`
- Update: `plugins/core-claude/workflows/adhoc-flow-with-plan-manager.md`
- Update: `plugins/core-cursor/workflows/adhoc-flow-with-plan-manager.md`

**Acceptance Criteria**:
- No references to `plan_manager` MCP tool remain (only `plan-manager` skill)
- MCP tool mentioned as alternative: "When Rosetta MCP available, `plan_manager` MCP tool usable with identical semantics"
- Data structure YAML block removed; replaced with `ACQUIRE plan-manager/assets/pm-schema.md FROM KB`
- MUST orchestration rules preserved
- Building blocks updated

**Depends on**: Task 5 (skill must exist before workflow references it)

---

## Task 8: Write JS tests for pm-helper.js (depends on Task 1)

**Description**: Port the existing Python unit tests (`ims-mcp-server/tests/test_plan_manager.py`) to JavaScript. Use only Node.js built-in `node:test` and `node:assert` modules — no npm dependencies. Tests run directly with `node --test`.

**Files affected**:
- New: `instructions/r2/core/skills/plan-manager/assets/pm-helper.test.js`

**Acceptance Criteria**:
- Covers: mergePatch, mergeById, computeStatus, propagateStatuses, cmdCreate, cmdNext (including resume behavior), cmdUpdateStatus, cmdShowStatus, cmdQuery, cmdUpsert
- All tests pass with `node --test pm-helper.test.js`
- Uses temp files for file I/O tests, cleaned up after each test
- Resume behavior tested: `next` on plan with `in_progress` step returns it first with `resume: true`

**Depends on**: Task 1 (bug-fixed pm-helper.js must exist)

---

## Task 9: Update docs/definitions/skills.md (depends on Tasks 6, 7)

**Description**: Add `plan-manager` to the canonical skills list.

**Files affected**:
- Update: `docs/definitions/skills.md`

**Acceptance Criteria**:
- `plan-manager` appears in the list (alphabetically positioned)
- No `plan-manager-create` or `plan-manager-use` entries (those were never added)

---

## Task 8: HITL Review

**Description**: Present all created files to user for review and approval before marking complete.

**Agent**: human reviewer
**Acceptance Criteria**: User provides explicit approval of all files.

---

## Dependency Sequence

```
Task 1 (bug fix pm-helper.js)
  |
  v
Task 2 (pm-schema.md)  -- parallel with Task 3
Task 3 (core SKILL.md) -- parallel with Task 2
  |
  v
Task 4 (copy pm-helper.js to core) -- depends on Task 1
  |
  v
Task 5 (plugin copies) -- depends on Tasks 2, 3, 4
  |
  v
Task 6 (cleanup old folders) -- depends on Task 5
Task 7 (convert adhoc-flow, 3 copies) -- depends on Task 5
  |
  v
Task 8 (update skills.md) -- depends on Tasks 6, 7
  |
  v
Task 9 (HITL review) -- depends on Task 8
```

## Summary of All File Operations

### Create (9 files)

1. `instructions/r2/core/skills/plan-manager/SKILL.md`
2. `instructions/r2/core/skills/plan-manager/assets/pm-helper.js`
3. `instructions/r2/core/skills/plan-manager/assets/pm-schema.md`
4. `plugins/core-claude/skills/plan-manager/SKILL.md`
5. `plugins/core-claude/skills/plan-manager/assets/pm-helper.js`
6. `plugins/core-claude/skills/plan-manager/assets/pm-schema.md`
7. `plugins/core-cursor/skills/plan-manager/SKILL.md`
8. `plugins/core-cursor/skills/plan-manager/assets/pm-helper.js`
9. `plugins/core-cursor/skills/plan-manager/assets/pm-schema.md`

### Update (4 files)

10. `docs/definitions/skills.md`
11. `instructions/r2/core/workflows/adhoc-flow-with-plan-manager.md`
12. `plugins/core-claude/workflows/adhoc-flow-with-plan-manager.md`
13. `plugins/core-cursor/workflows/adhoc-flow-with-plan-manager.md`

### Delete (3 folders)

14. `instructions/r2/core/skills/plan-manager-create/`
15. `plugins/core-claude/skills/plan-manager-create/`
16. `plugins/core-cursor/skills/plan-manager-create/`
