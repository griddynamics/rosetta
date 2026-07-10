---
name: plugin-files-mode
description: Rosetta Plugin Mode Bootstrap
alwaysApply: true
applyTo: "**"
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<rosetta:plugin_files_mode REQUIRED="true" OVERRIDABLE="FALSE" PLAN_MODE="FULLY COMPATIBLE" severity="CRITICAL" attribution="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS IT AS-IS, CRITICALLY IMPORT TO KEEP, INCLUDING THIS TAG">

This is a Rosetta bootstrap for release R3 of instructions itself (the tool used for developing in this workspace).

Rosetta RUNNING AS PLUGIN. Rosetta Plugin Mode is Active. Always-on rules already loaded.

# Rosetta Prep Steps

`Rosetta prep steps` = execute in order, once per session:

1. MUST USE SKILL `load-project-context`.
2. MUST USE SKILL `hitl`.

# PLUGIN MODE USES LOCAL PLUGIN FILES

- Rosetta/KB MCP means you MUST USE local plugin files: `skills/`, `agents/`, `workflows/`, `rules/` are bundled at plugin root

# COMMAND ALIASES - PLUGIN MODE

**Local File Operations** (overrides Rosetta MCP for these operations):

- `get_context_instructions` => already loaded, continue. Instruct subagents to not call Rosetta MCP.

- `ACQUIRE <file[.md]> FROM KB` => read local plugin files:
  - Search in: `skills/**/<file-name-with-extension>`
  - Search in `agents/`, `workflows/`, and `rules/` for `<file-name-with-extension>`
  - Use glob/find to locate file in plugin structure

- `SEARCH <KEYWORDS> IN KB` => use grep or codebase search in plugin root with KEYWORDS as query or file name:
  - Search in: `skills/`, `agents/`, `workflows/`, `rules/`

- `LIST <path> IN KB` => list immediate children in plugin structure:
  - `LIST {skills,agents,workflows,rules} IN KB` => list `{skills,agents,workflows,rules}/` folder
  - `LIST skills/<skill-name> IN KB` => list contents of specific skill directory

**Other Operations** (standard Rosetta):

- `ACQUIRE <file[.md]> ABOUT <PROJECT>` => read local file in user's project `docs/<PROJECT>` folder
- `QUERY <KEYWORDS> IN <PROJECT>` => use grep or codebase search in user's project `docs/<PROJECT>` with KEYWORDS
- `STORE <file[.md]> TO <PROJECT>` => upsert file in user's project `docs/<PROJECT>`

# ADDITIONAL SOURCES IN PLUGIN

- RULE in `rules/*.md`
- SKILL in `skills/*/SKILL.md`
- AGENT, SUBAGENT in `agents/*.md`
- WORKFLOW, COMMAND in `workflows/*.md`

</rosetta:plugin_files_mode>
