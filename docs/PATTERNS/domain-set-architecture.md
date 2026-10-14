# Domain Set Architecture Pattern

The instruction library is partitioned into release-versioned, subject-scoped folders called domain sets. Each set ships as its own installable plugin, and a build selects sets rather than merging them.

## Problem Solved

A single monolithic instruction tree forces every user to install everything, and it gives teams no way to add their own material without editing shared files. Partitioning by subject lets a project take only the domains it needs, and lets a new domain arrive as a new sibling folder instead of an edit to an existing one.

An earlier design used org-namespaced overlay folders (`grid/`, `acme/`) that shadowed files in `core/` at the same VFS path. That mechanism is retired. It went unused, and it made a top-level folder mean two different things depending on its name.

## When to Use

- Adding a new subject area to the instruction library: create `instructions/r3/<domain>/` and declare it in `src/rosettify-plugins/plugins.json`.
- Maintaining the release folders under `instructions/` (`r3` current, `r2` backports only).
- Scoping a build: `--domain qe` builds only the sets whose folders are all named in the list.
- Restricting what an MCP deployment serves with `INSTRUCTION_ROOT_FILTER` (parsed into `Config.root_filter` and not yet applied, see Occurrences).

## Folder Structure

```
instructions/
  r3/
    core/            ← skills, rules, templates, bootstrap (filter key: CORE)
    workflows/       ← agents, orchestrated workflows
    qe/              ← test automation
    search/          ← Solr
    modernization/   ← conversion workflows
```

Every top-level folder under a release is a domain set. Nothing nests, and nothing overrides.

## Naming Rules

- Lowercase, dash-separated, globally unique filenames across the entire tree.
- Entry points: `SKILL.md` for skills, `<name>.md` for everything else.
- Uniqueness is load-bearing. Publishing strips the domain segment, so two sets cannot both own `skills/planning/SKILL.md`.

## CLI Behavior

CLI always publishes the entire `/instructions` folder (`--force` for full republish). Publishing a subfolder breaks tag extraction; this is enforced by convention, not code.

## Occurrences

- `instructions/r3/{core,workflows,qe,search,modernization}/` — the five sets
- `src/rosettify-plugins/plugins.json` — the catalog mapping sets to plugins
- `src/rosettify-plugins/src/cli.ts` — `--domain`, a folder filter over sets
- `src/rosetta-mcp-server/rosetta_mcp/config.py` — `INSTRUCTION_ROOT_FILTER` env var, parsed and not yet read anywhere
- `docs/ARCHITECTURE.md` — "Instruction Structure" section
