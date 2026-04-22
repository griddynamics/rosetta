# VFS Resource Path Pattern

A virtual file system (VFS) path is the canonical identifier for an instruction document, computed by stripping release and org prefix from the physical file path, enabling stable cross-version addressing.

## Problem Solved

Physical paths (`instructions/r2/core/skills/planning/SKILL.md`) change when releases or org folders change. VFS paths (`skills/planning/SKILL.md`) are stable and used in every agent alias, MCP tool call, and `rosetta://{path}` resource URI.

## When to Use

- All `ACQUIRE`, `LIST`, and `rosetta://` references in instructions.
- Adding new skills/agents/workflows — VFS path is derived automatically by CLI.
- Cross-release compatibility: same VFS path works for r1, r2, and future releases.

## Path Computation

```
instructions/r2/core/skills/planning/SKILL.md
  physical path parts: [instructions, r2, core, skills, planning, SKILL.md]
  release = "r2"  (first part matching /^r\d+/)
  org     = "core" (part after release, for r2+)
  rest    = [skills, planning, SKILL.md]
  resource_path = "skills/planning/SKILL.md"  ← strip release + org

instructions/r1/agents/coding.md
  release = "r1"
  org     = None (r1 has no org prefix)
  resource_path = "coding.md"  ← strip up to and including release
```

## Resource URI

```
rosetta://skills/planning/SKILL.md
```

The MCP `read_instruction_resource` tool resolves this via `InstructionDocCache`.

## Bundling at Same VFS Path

Multiple documents (core + org overlay) sharing the same VFS path are bundled together in one response. The `INSTRUCTION_ROOT_FILTER` env var controls which layers are included.

## Occurrences

- `rosetta-cli/rosetta_cli/services/document_data.py` — `_compute_resource_path()`
- `ims-mcp-server/ims_mcp/services/bundler.py` — `_resource_path()` used for grouping
- `ims-mcp-server/ims_mcp/tools/resources.py` — `rosetta://` URI handler
- All `ACQUIRE ... FROM KB` command aliases throughout `instructions/r2/core/`
