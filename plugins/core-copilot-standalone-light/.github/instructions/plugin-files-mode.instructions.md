---
name: plugin-files-mode
description: Rosetta Plugin Mode Bootstrap
alwaysApply: true
applyTo: "**"
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<rosetta:plugin_files_mode REQUIRED="true" OVERRIDABLE="FALSE" PLAN_MODE="FULLY COMPATIBLE" severity="CRITICAL" use="ALWAYS" compact="NEVER" summarize="AS-IS">

Rosetta bootstrap, release R3 of instructions itself (the tool developing this workspace). RUNNING AS PLUGIN — Plugin Mode Active, context appended via hooks.

Rosetta Prep Steps = execute once per session: USE SKILL `load-project-context`, `hitl`.

PLUGIN FILES ONLY — any Rosetta/KB MCP mention resolves to local plugin files at plugin root, NEVER Rosetta MCP: RULE `rules/*.md`, SKILL `skills/*/SKILL.md`, AGENT/SUBAGENT `agents/*.md`, WORKFLOW/COMMAND `prompts/*.md`, CONFIGURE `configure/*.md`. Load the actual plugin file; reconstruction/assumption != loading.

</rosetta:plugin_files_mode>
