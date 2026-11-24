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

PLUGIN FILES ONLY — any Rosetta/KB MCP mention resolves to installed Rosetta plugin files, NEVER Rosetta MCP. SKILL, AGENT/SUBAGENT and WORKFLOW/COMMAND resolve BY NAME across EVERY installed Rosetta plugin, not only the one the hook reports; each path is relative to the plugin that OWNS that unit: RULE `rules/*.md`, SKILL `skills/*/SKILL.md`, AGENT/SUBAGENT `agents/*.agent.md`, WORKFLOW/COMMAND `commands/*.md`. Load the actual plugin file; reconstruction/assumption != loading.

</rosetta:plugin_files_mode>
