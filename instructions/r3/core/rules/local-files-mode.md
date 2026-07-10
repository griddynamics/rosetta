---
name: local-files-mode
trigger: always_on
description: Rosetta Local Files Mode Bootstrap
alwaysApply: true
baseSchema: docs/schemas/rule.md
---

This is a Rosetta bootstrap for release R3 of instructions itself (the tool used for developing in this workspace).

Rosetta Local Files Mode is Active — instructions are read from the local `instructions/r*` folder (developing Rosetta itself).

# Rosetta Prep Steps

`Rosetta prep steps` = execute in order, once per session:

1. Read `instructions/r3/core/rules/bootstrap-alwayson.md` — always-on rules (skip if already in context).
2. USE SKILL `load-project-context` — `instructions/r3/core/skills/load-project-context/SKILL.md`.
3. USE SKILL `hitl` — `instructions/r3/core/skills/hitl/SKILL.md`.

# Command Aliases:

- `ACQUIRE <file[.md]> FROM KB` => read local files `instructions/r3/**/<file-name-with-extension>`
- `SEARCH <KEYWORDS> IN KB` => use grep or codebase search in `instructions/r3/` folder with KEYWORDS as a query or file name
- `LIST <path> IN KB` => list immediate children of `instructions/r3/core/<path>/` (folders and files, no content)
- `USE SKILL <skill-name>` => use SKILL from `instructions/r3/core/skills/<skill-name>/SKILL.md`, all relative references in skill are relative to skill folder itself
- `INVOKE SUBAGENT <agent-name>[.md]` => Call/Execute/Start/Spawn/Invoke <agent-name> subagent:
  - Definition location `instructions/r3/core/agents/<agent-name>.md`
  - Always prepend `Must fully assume agent from "{path to <agent-name>.md file}"`
  - If subagent not available, use generic task executor agent
- `USE FLOW <flow-name>[.md]` => use command or workflow from `instructions/r3/core/workflows/<flow-name>.md`
- `ACQUIRE <file[.md]> ABOUT <PROJECT>` => read local file in `docs/<PROJECT>` folder
- `QUERY <KEYWORDS> IN <PROJECT>` => use grep or codebase search in `docs/<PROJECT>` with KEYWORDS as a query or file name
- `STORE <file[.md]> TO <PROJECT>` => upsert file in `docs/<PROJECT>`
- `call "get_context_instructions"` or `execute prep steps` => execute `# Rosetta Prep Steps` above (this mode file is already in context)

# ADDITIONAL SOURCES

- RULE in `instructions/r3/core/rules/*.md`
- SKILL in `instructions/r3/core/skills/*/SKILL.md`
- AGENT, SUBAGENT in `instructions/r3/core/agents/*.md`
- WORKFLOW, COMMAND in `instructions/r3/core/workflows/*.md`
