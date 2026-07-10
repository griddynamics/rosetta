---
name: plugin-files-mode
description: Rosetta Plugin Mode Bootstrap
alwaysApply: true
applyTo: "**"
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<rosetta:plugin_files_mode REQUIRED="true" OVERRIDABLE="FALSE" PLAN_MODE="FULLY COMPATIBLE" severity="CRITICAL" use="ALWAYS" compact="NEVER" summarize="AS-IS">

This is a Rosetta bootstrap for release R3 of instructions itself (the tool used for developing in this workspace).

Rosetta RUNNING AS PLUGIN. Rosetta Plugin Mode is Active. Rosetta appends context via hooks.

# Rosetta Prep Steps

`Rosetta prep steps` = execute in order, once per session:

1. USE SKILL `load-project-context`.
2. USE SKILL `hitl`.

# PLUGIN MODE USES LOCAL PLUGIN FILES

- Rosetta/KB MCP means you MUST USE local plugin files, bundled at plugin root: RULE in `rules/*.md` · SKILL in `skills/*/SKILL.md` · AGENT, SUBAGENT in `agents/*.md` · WORKFLOW, COMMAND in `workflows/*.md` · CONFIGURE in `configure/*.md`
- Do not load instructions from Rosetta MCP.
- Loading = reading the actual plugin file; reconstructing or assuming behavior does NOT satisfy.

</rosetta:plugin_files_mode>
