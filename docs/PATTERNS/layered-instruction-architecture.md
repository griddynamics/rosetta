# Layered Instruction Architecture Pattern

Instructions are organized in release-versioned, org-namespaced folder layers; files at the same VFS resource path from different layers are bundled together at serve time, enabling organization-specific overrides without forking the core.

## Problem Solved

Organizations need to customize prompts without diverging from upstream OSS updates. Forking creates maintenance debt. Copying creates staleness. Layering + bundling allows additive customization while core evolves independently.

## When to Use

- Adding organization-specific extensions to any core skill, agent, or workflow.
- Building a new release (r3, etc.) — new folder under `instructions/`.
- Controlled rollout: `INSTRUCTION_ROOT_FILTER=CORE,GRID` includes both; `CORE` alone serves only OSS content.

## Folder Structure

```
instructions/
  r2/
    core/         ← OSS foundation (ships with Rosetta, filter key: CORE)
      skills/
      agents/
      workflows/
      rules/
    <org>/        ← Organization layer (e.g., grid/, filter key: GRID)
      skills/     ← same structure, same VFS paths
      agents/
```

## Naming Rules

- Lowercase, dash-separated, globally unique filenames across the entire tree.
- Entry points: `SKILL.md` for skills, `<name>.md` for everything else.
- Two files at the same VFS path must be in different org folders — never collide within one folder.

## CLI Behavior

CLI always publishes the entire `/instructions` folder (`--force` for full republish). Publishing a subfolder breaks tag extraction; this is enforced by convention, not code.

## Occurrences

- `instructions/r2/core/` — all OSS instructions (512+ files)
- `instructions/r2/grid/` (if present) — enterprise extensions
- `ims-mcp-server/ims_mcp/services/bundler.py` — merges layers at serve time
- `ims-mcp-server/ims_mcp/config.py` — `INSTRUCTION_ROOT_FILTER` env var
- `docs/ARCHITECTURE.md` — "Layered customization" section
