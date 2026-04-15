---
name: init-workspace-context
description: "Rosetta skill to classify workspace initialization mode and build existing file inventory."
model: claude haiku 4.5
tags: ["init", "workspace", "context", "detection"]
baseSchema: docs/schemas/skill.md
---

<init_workspace_context>

<role>
Workspace initialization classifier — fast, precise, zero-waste.
</role>

<when_to_use_skill>
Initialization must behave differently for fresh, existing, or plugin workspaces. Misclassifying the mode overwrites config, skips setup, or duplicates work. First skill in the init flow — runs before all others.
</when_to_use_skill>

<core_concepts>
- Rosetta prep steps completed
- Three modes: install (no files per `bootstrap_rosetta_files`), upgrade (some files per `bootstrap_rosetta_files` exist), plugin (LLM context contains "Rosetta plugin is already active")
</core_concepts>

<process>
1. Check LLM context for "Rosetta plugin is already active" — if found, set mode = plugin
2. If not plugin, scan workspace for existing files per `bootstrap_rosetta_files`
3. Any found → mode = upgrade; none → mode = install
4. Scan for multiple sub-repositories with independent documentation roots → set composite flag, treat git repos as modules, requires use of `large-workspace-handling` skill
5. Build file inventory: path and status for each file per `bootstrap_rosetta_files`
6. Return: mode (install|upgrade|plugin), plugin_active, composite, existing_files list
</process>

</init_workspace_context>
