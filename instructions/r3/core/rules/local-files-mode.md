---
name: local-files-mode
trigger: always_on
description: Rosetta Local Files Mode Bootstrap
alwaysApply: true
baseSchema: docs/schemas/rule.md
---

<rosetta:local_files_mode REQUIRED="true" OVERRIDABLE="FALSE" PLAN_MODE="FULLY COMPATIBLE" severity="CRITICAL" use="ALWAYS" compact="NEVER" summarize="AS-IS">

This is a Rosetta bootstrap for release R3 of instructions itself (the tool used for developing in this workspace).

Rosetta Local Files Mode is Active — instructions are read from the local `instructions/r*` folder (developing Rosetta itself).

# Rosetta Prep Steps

`Rosetta prep steps` = execute in order, once per session:

1. Read `instructions/r3/core/rules/bootstrap-alwayson.md` (skip if already in context).
2. USE SKILL `load-project-context` — `instructions/r3/core/skills/load-project-context/SKILL.md`.
3. USE SKILL `hitl` — `instructions/r3/core/skills/hitl/SKILL.md`.

# Command Aliases:

Root = `instructions/r3/core/`. Loading = reading the actual file — reconstructing or assuming behavior does NOT satisfy. `READ` = load only; `APPLY`/`USE`/`INVOKE` = load + FULLY execute/act.

- `USE SKILL <name>` / `READ SKILL <name>` (read = content only) => `<root>/skills/<name>/SKILL.md`; relative references inside a skill resolve against its folder
- `READ SKILL FILE <subpath>` / `APPLY SKILL FILE <subpath>` => `<root>/skills/<current-skill>/<subpath>` (only a skill's own files use this)
- `USE FLOW <file>.md` / `READ FLOW <file>.md` / `APPLY PHASE <file>.md` => `<root>/workflows/<file>.md`
- `INVOKE SUBAGENT <name>` => Call/Execute/Start/Spawn <name> subagent; definition `<root>/agents/<name>.md`; always prepend `Must fully assume agent from "{path}"`; unavailable → generic task executor. `READ SUBAGENT <name>` => definition only
- `READ RULE <file>.md` / `APPLY RULE <file>.md` => `<root>/rules/<file>.md` · `READ TEMPLATE <file>.md` => `<root>/templates/**/<file>.md` · `READ CONFIGURE <tool>.md` => `<root>/configure/<tool>.md`
- `LIST <path>` => list immediate children of `<root>/<path>/` (folders and files, no content)
- `call "get_context_instructions"` or `execute prep steps` => execute `# Rosetta Prep Steps` above (this mode file is already in context)

# ADDITIONAL SOURCES

- RULE in `instructions/r3/core/rules/*.md`
- SKILL in `instructions/r3/core/skills/*/SKILL.md`
- AGENT, SUBAGENT in `instructions/r3/core/agents/*.md`
- WORKFLOW, COMMAND in `instructions/r3/core/workflows/*.md`

</rosetta:local_files_mode>
