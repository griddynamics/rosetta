---
name: init-workspace-flow-rules
description: "Phase 4 Rules (optional) of init-workspace-flow"
tags: ["init", "workspace", "rules", "phase", "optional"]
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_rules>

<description_and_purpose>
Creates IDE-specific and tech-specific rule files that customize agent behavior for the workspace. Optional, disabled by default — runs only when explicitly enabled by user.
</description_and_purpose>

<workflow_context>
- Phase 4 of 9 in init-workspace-flow
- Input: TECHSTACK (from P3), state.mode, IDE/OS detection
- Output: core agents file, tech-specific rule files
- Prerequisite: Phase 3 complete (TECHSTACK exists on disk)
</workflow_context>

<phase_steps>
1. Check if rules phase enabled
2. If disabled, mark skipped and proceed to Phase 5
3. Read state and TECHSTACK
4. Execute rules skill
5. Update state
</phase_steps>

<check_enabled step="4.1">
1. Read `agents/init-workspace-flow-state.md`
2. If rules phase NOT enabled: mark Phase 4 skipped in state, proceed to Phase 5
3. Autonomous decision based on enable flag — no user prompting
</check_enabled>

<read_inputs step="4.2" condition="enabled">
1. Read state.mode for dual-mode behavior
2. Read TECHSTACK from disk
3. Detect IDE and OS from environment
</read_inputs>

<execute_rules step="4.3" condition="enabled">

Execute with state.mode and TECHSTACK as inputs. Act as a senior agent configuration specialist — Rosetta-to-local full-copy adaptation expert.

Local copies of Rosetta instructions enable AI agents to load rules without Rosetta access and stay current via periodic version checks. Creates full local files for all Rosetta content adapted to detected IDE/CodingAgent format. Validation: all Rosetta content exists as local files, root entry point triggers full prep chain.

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed
- Rules consumed by AI agents, not humans
- **Full-copy mode** — copies complete file content from Rosetta to local workspace
- **Adapt** — copy content AS-IS; adapt ONLY IDE format: extension, frontmatter, directory. Never rewrite instruction content.
- **Exclusion set** — `init-workspace-*` skills/workflows, `templates/shell-schemas/*`, `configure/*`, `rules/mcp-files-mode.md` MUST NOT BE copied
- **Bundled reads** — when a KB read returns multiple `<rosetta:file>` sections, strip tags, merge into one file with one frontmatter
- **state.mode** — `init` creates all files; `upgrade` fills gaps only, never overwrites human-customized files
- Make sure that you follow original activation conditions, MUST never make all rules to be ALWAYS activated/loaded (overflows context)

</core_concepts>

<rules_process>

Internal knowledge about IDE/agent configuration is obsolete — LIST and READ from KB.

Step 1: Identify Environment

1. LIST `configure` with XML format (to understand supported IDE/CodingAgents)
2. Detect current environment, preselect IDE/CodingAgent
3. MUST ask user to confirm selection and provide multi-choose
4. READ CONFIGURE `<tool>.md` for each selected IDE/CodingAgent
5. If multiple selected, use common standards to reduce copies

Step 2: Read Workspace Context

1. Read TECHSTACK.md and relevant project docs

Step 3: Discover Full Rosetta Content (subagent)

1. LIST `all` with format=flat, save to FEATURE TEMP folder as `list-all-output.md`
2. Parse into content-type groups (rules, skills, agents, workflows, commands)
3. Apply exclusion set
4. Report: total count, per-type count, excluded count

Step 4: MUST Install Root Entry Point and Bootstrap Rules

1. READ RULE `local-files-mode.md` — install as root entry point per IDE configure spec
2. Embed Rosetta version marker (e.g., "R3") in core root file for staleness detection
3. Apply IDE-specific frontmatter format from configure file
4. READ RULES `bootstrap-*.md` (each individually) — install as individual rule files per IDE configure spec

Step 5: MUST Generate All Content Files

For each content type from filtered list (non-bootstrap rules, skills, agents, workflows, commands):

1. Map ResourcePaths to local file paths using configure file rules
2. If state.mode=upgrade: skip existing human-customized files
3. READ each resource using its typed alias (READ SKILL/FLOW/SUBAGENT/RULE/TEMPLATE)
4. Write to local path with IDE-specific format adaptation
5. Preserve skill subdirectory structures (assets/, references/, scripts/)
6. If multiple IDEs: write shared content to common location where possible

Step 6: Verify and Report (HITL)

1. Count files per type, compare against expected from filtered list minus exclusions
2. Verify: no absolute paths in generated files
3. Verify: root entry point file contains version marker
4. Verify: bundled reads content merged correctly (no `<rosetta:file>` tags, single frontmatter per file)
5. If state.mode=upgrade: report diff summary (added, skipped with reason)
6. MUST get explicit user confirmation before closing

</rules_process>

<rules_validation_checklist>

- Agent with no prior context can bootstrap from generated files using only local filesystem
- Every content type from LIST output has corresponding local files (none silently dropped)

</rules_validation_checklist>

<rules_pitfalls>

- USE SKILL / USE FLOW / INVOKE SUBAGENT / APPLY PHASE / READ|APPLY RULE|TEMPLATE|SKILL FILE / LIST aliases — and `ACQUIRE`/`QUERY`/`STORE` forms (shell + project-scoped) — inside instruction content are mode-bound aliases: do NOT remove or replace them

</rules_pitfalls>

</execute_rules>

<update_state step="4.4">
1. Write to `agents/init-workspace-flow-state.md`:
   - Rule files status (created | updated | skipped | disabled)
   - Phase 4 completion timestamp
2. Log gaps identified for Phase 8
</update_state>

<validation_checklist>
- Disabled: state shows "skipped: disabled by default", no rule files modified
- Enabled: core agents file and tech rules exist on disk, consistent with TECHSTACK
</validation_checklist>

<pitfalls>
- Halt if TECHSTACK missing — dependency failure, do not generate rules
</pitfalls>

</init_workspace_flow_rules>
