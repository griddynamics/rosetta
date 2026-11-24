# Instruction Folder Architecture Pattern

The instruction library is one release-versioned tree. Each release holds top-level folders (today one, `core`). A plugin catalog bundles folders into installable plugin sets. Organizations add their own material with customization roots, merged folder into folder at build time.

## Problem Solved

Teams need their own instructions without forking the library or editing shared files. Customization roots have the same layout as the main source (`<root>/<release>/<folder>/...`). The generator merges them with one rule set: order key, append, `overwrite`. A top-level folder always means the same thing.

The catalog (`plugins.json`) can bundle any number of folders into any number of plugin sets. The split of the library into five subject folders is recorded in `docs/REQUIREMENTS/plugin-generator/assets/plugin-sets-split.md` and is dormant.

## When to Use

- Adding a skill, agent, workflow, or rule: add it under `instructions/r3/core/<type>/`.
- Adding a new top-level folder: create `instructions/r3/<folder>/` and add it to the `folders` of a set in `src/rosettify-plugins/plugins.json`.
- Adding organization material: keep it in a customization root and build with `--customizations <root>`.
- Maintaining the release folders under `instructions/` (`r3` current, `r2` backports only).
- Scoping a build: `--domain <set>` builds only the named sets. `--publish <name>` writes only the named plugins.
- Restricting what an MCP deployment serves with `INSTRUCTION_ROOT_FILTER` (parsed into `RosettaConfig.root_filter` and not enforced yet, [#172](https://github.com/griddynamics/rosetta/issues/172); see Occurrences).

## Folder Structure

```
instructions/
  r3/
    core/            ← skills, agents, workflows, rules, templates, bootstrap (filter key: CORE)

<root>/              ← customization root, any location
  r3/
    core/            ← merged into instructions/r3/core/
```

Only `<root>/<release>/` is checked. Each directory there names a declared folder.

## Merge Rules

- Order key: `<letter>:<path>:<OrderToken>`. `A` is the main source, `B` the first root, `C` the second.
- Keys sort as plain strings. Pad `OrderToken` with zeros for numeric order.
- A file at an existing path is appended. `overwrite` replaces all earlier contributions. The last overwrite wins.

## Naming Rules

- Lowercase, dash-separated, globally unique filenames across the entire tree.
- Entry points: `SKILL.md` for skills, `<name>.md` for everything else.
- Uniqueness is load-bearing. Publishing strips the folder segment, so two folders cannot both own `skills/planning/SKILL.md`.

## CLI Behavior

CLI always publishes the entire `/instructions` folder (`--force` for full republish). Publishing a subfolder breaks tag extraction; this is enforced by convention, not code.

## Occurrences

- `instructions/r3/core/` — the library folder
- `src/rosettify-plugins/plugins.json` — the catalog mapping folders to plugin sets
- `src/rosettify-plugins/src/cli.ts` — `--domain`, `--customizations`, `--publish`
- `src/rosettify-plugins/src/vfs/customizations.ts` — customization root validation
- `src/rosetta-mcp-server/rosetta_mcp/config.py` — `INSTRUCTION_ROOT_FILTER` env var, parsed and not yet read anywhere ([#172](https://github.com/griddynamics/rosetta/issues/172))
- `docs/ARCHITECTURE.md` — "Instruction Structure" section
