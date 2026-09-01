# VFS Resource Path Pattern

A virtual file system (VFS) path is the canonical identifier for an instruction document, computed by stripping release and org prefix from the physical file path, enabling stable cross-version addressing.

## Problem Solved

Physical paths (`instructions/r3/core/skills/planning/SKILL.md`) change when a release rolls or a document moves between domain sets. VFS paths (`skills/planning/SKILL.md`) are stable and used in every agent alias, MCP tool call, and `rosetta://{path}` resource URI.

## When to Use

- All `ACQUIRE` (generated MCP shells), `LIST`, and `rosetta://` references.
- Adding new skills/agents/workflows — VFS path is derived automatically by CLI.
- Cross-release compatibility: same VFS path works across releases (r1, r2, r3).

## Path Computation

```
instructions/r3/qe/skills/qa-knowledge/SKILL.md
  physical path parts: [instructions, r3, qe, skills, qa-knowledge, SKILL.md]
  release = "r3"  (first part matching /^r\d+/)
  domain  = "qe" (part after release, for r2+; always a domain set)
  rest    = [skills, qa-knowledge, SKILL.md]
  resource_path = "skills/qa-knowledge/SKILL.md"  ← strip release + domain

instructions/r1/agents/coding.md
  release = "r1"
  domain  = None (r1 has no domain prefix)
  resource_path = "coding.md"  ← strip up to and including release
```

## Resource URI

```
rosetta://skills/planning/SKILL.md
```

The MCP `read_instruction_resource` tool resolves this via `InstructionDocCache`.

## Bundling at Same VFS Path

Documents sharing the same VFS path are bundled together in one response. Because the domain segment is stripped, filenames must be unique across the whole tree and a single-domain deployment normally has one document per path. The `INSTRUCTION_ROOT_FILTER` env var is meant to select which domain sets are served; the server parses it and does not apply it today.

## Occurrences

- `src/rosetta-cli/rosetta_cli/services/document_data.py` — `_compute_resource_path()`
- `src/rosetta-mcp-server/rosetta_mcp/services/bundler.py` — `_resource_path()` used for grouping
- `src/rosetta-mcp-server/rosetta_mcp/tools/resources.py` — `rosetta://` URI handler
- Generated MCP shells (`ACQUIRE ... FROM KB`) and the alias bindings in `instructions/r3/core/rules/mcp-files-mode.md`
