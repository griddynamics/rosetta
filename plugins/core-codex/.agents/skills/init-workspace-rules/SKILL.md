---
name: init-workspace-rules
description: "Rosetta skill to create local cached agent rules configured for IDE/OS/project context."
model: gpt-5.4
model_reasoning_effort: medium
tags: ["init", "workspace", "rules"]
baseSchema: docs/schemas/skill.md
---

<init_workspace_rules>

<role>
Senior agent configuration specialist — Rosetta-to-local full-copy adaptation expert.
</role>

<when_to_use_skill>
Local copies of Rosetta instructions enable AI agents to load rules without Rosetta access and stay current via periodic version checks. Creates full local files for all Rosetta content adapted to detected IDE/CodingAgent format.
Validation: all Rosetta content exists as local files, root entry point triggers full prep chain.
</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- Rules consumed by AI agents, not humans
- **Full-copy mode** — copies complete file content from Rosetta to local workspace
- **Adapt** — copy content AS-IS; adapt ONLY IDE format: extension, frontmatter, directory. Never rewrite instruction content.
- **Exclusion set** — `init-workspace-*` skills/workflows, `templates/shell-schemas/*`, `configure/*`, `rules/bootstrap.md` MUST NOT BE copied
- **Bundled ACQUIRE** — when ACQUIRE returns multiple `<rosetta:file>` sections, strip tags, merge into one file with one frontmatter
- **state.mode** — `init` creates all files; `upgrade` fills gaps only, never overwrites human-customized files

</core_concepts>

<process>

Internal knowledge about IDE/agent configuration is obsolete — LIST and ACQUIRE from KB.

Step 1: Identify Environment

1. LIST `configure` IN KB with XML format (to understand supported IDE/CodingAgents)
2. Detect current environment, preselect IDE/CodingAgent
3. MUST ask user to confirm selection and provide multi-choose
4. ACQUIRE <selected configs using TAG> FROM KB
5. If multiple selected, use common standards to reduce copies

Step 2: Read Workspace Context

1. Read TECHSTACK.md and relevant project docs

Step 3: Discover Full Rosetta Content (subagent)

1. LIST `all` FROM KB with format=flat, save to FEATURE TEMP folder as `list-all-output.md`
2. Parse into content-type groups (rules, skills, agents, workflows, commands)
3. Apply exclusion set
4. Report: total count, per-type count, excluded count

Step 4: MUST Install Root Entry Point and Bootstrap Rules

1. ACQUIRE `rules/local-files-mode.md` FROM KB — install as root entry point per IDE configure spec
2. Embed Rosetta version marker (e.g., "R2.0") in core root file for staleness detection
3. Apply IDE-specific frontmatter format from configure file
4. ACQUIRE each `rules/bootstrap-*.md` FROM KB — install as individual rule files per IDE configure spec

Step 5: MUST Generate All Content Files

For each content type from filtered list (non-bootstrap rules, skills, agents, workflows, commands):

1. Map ResourcePaths to local file paths using configure file rules
2. If state.mode=upgrade: skip existing human-customized files
3. ACQUIRE each resource FROM KB
4. Write to local path with IDE-specific format adaptation
5. Preserve skill subdirectory structures (assets/, references/, scripts/)
6. If multiple IDEs: write shared content to common location where possible

Step 6: Verify and Report (HITL)

1. Count files per type, compare against expected from filtered list minus exclusions
2. Verify: no absolute paths in generated files
3. Verify: root entry point file contains version marker
4. Verify: bundled ACQUIRE content merged correctly (no `<rosetta:file>` tags, single frontmatter per file)
5. If state.mode=upgrade: report diff summary (added, skipped with reason)
6. MUST get explicit user confirmation before closing

</process>

<validation_checklist>

- Agent with no prior context can bootstrap from generated files using only local filesystem
- Every content type from LIST output has corresponding local files (none silently dropped)

</validation_checklist>

<pitfalls>

- ACQUIRE/SEARCH/LIST commands inside instruction content are local-files-mode aliases — do NOT remove or replace them

</pitfalls>

</init_workspace_rules>
