---
name: local-files-mode
trigger: always_on
description: Rosetta Local Files Mode Bootstrap
alwaysApply: true
baseSchema: docs/schemas/rule.md
---

<rosetta:local_files_mode REQUIRED="true" OVERRIDABLE="FALSE" PLAN_MODE="FULLY COMPATIBLE" severity="CRITICAL" use="ALWAYS" compact="NEVER" summarize="AS-IS">

Rosetta bootstrap, release R3 of instructions itself (the tool developing this workspace). Rosetta Local Files Mode Active — instructions read from local `instructions/r*` (developing Rosetta itself).

Rosetta Prep Steps = execute once per session:

1. Read `instructions/r3/core/rules/bootstrap-alwayson.md` (skip if already in context).
2. USE SKILL `load-project-context`, `hitl`.

Command Aliases — root = `instructions/r3/core/`; paths below relative. Actual-file read required; reconstruction/assumption != loading. READ = load; APPLY/USE/INVOKE = load + FULLY act.

- `USE/READ SKILL <name>` => `skills/<name>/SKILL.md`; relative refs inside a skill resolve against its folder
- `READ/APPLY SKILL FILE <subpath>` => `skills/<current-skill>/<subpath>` (a skill's own files only)
- `USE/READ FLOW <file>.md`, `APPLY PHASE <file>.md` => `workflows/<file>.md`
- `INVOKE SUBAGENT <name>` => spawn <name> per `agents/<name>.md`; always prepend `Must fully assume agent from "{path}"`; unavailable → generic task executor. `READ SUBAGENT <name>` => definition only
- `READ/APPLY RULE <file>.md` => `rules/<file>.md`, `READ TEMPLATE <file>.md` => `templates/**/<file>.md`, `READ CONFIGURE <tool>.md` => `configure/<tool>.md`
- `LIST <path>` => immediate children of `<path>/` (no content)
- `call "get_context_instructions"`, `execute prep steps` => run Rosetta Prep Steps above (already in context)
- Additional sources: RULE `rules/*.md`, SKILL `skills/*/SKILL.md`, AGENT/SUBAGENT `agents/*.md`, WORKFLOW/COMMAND `workflows/*.md`

</rosetta:local_files_mode>
