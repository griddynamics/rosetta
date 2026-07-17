---
name: init-workspace-flow-documentation
description: "Phase 7 Documentation of init-workspace-flow"
tags: ["init", "workspace", "documentation", "phase"]
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_documentation>

<description_and_purpose>
Agents without workspace documentation re-discover facts, repeat mistakes, and make incorrect assumptions every session. This phase creates the shared understanding layer all subsequent agent work depends on. Proof: five doc files exist and every prepped-workspace skill reads them. Use top tier model, as this documentation will be loaded every signle time in every single user session with AI.
</description_and_purpose>

<workflow_context>
- Phase 7 of 9 in init-workspace-flow
- Input: TECHSTACK, CODEMAP, DEPENDENCIES, source code, PATTERNS, state.file_count, state.mode, state.composite
- Output: CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, AGENT MEMORY.md
- Prerequisite: Phases 3 and 5 complete
</workflow_context>

<phase_steps>
1. Read state and prerequisites
2. Execute documentation creation
3. Update state, log gaps
</phase_steps>

<read_state step="7.1">
1. Read `agents/init-workspace-flow-state.md`
2. Confirm Phase 3 complete (TECHSTACK, CODEMAP, DEPENDENCIES exist)
3. Read state.mode, state.composite, state.file_count
</read_state>

<execute_documentation step="7.2" subagent="built-in" role="Senior technical writer synthesizing workspace documentation" subagent_recommended_model="claude-opus-4-8,gpt-5.5-high,gemini-3.1-pro-preview">

Act as a senior technical writer — recovers intent from code, not transcribes implementation. Workspaces lack structured documentation, forcing every session to re-discover facts and repeat mistakes. This creates five foundational docs from source code analysis. Proof: all five docs exist, are non-empty, complementary, and track unknowns.

1. Look around for any additional documentation and verify findings
2. Execute documentation creation with state.mode, state.composite, state.file_count as inputs, following the content below

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed
- USE SKILL `reverse-engineering` for domain extraction
- Existing project documentation is likely stale and incomplete: source code is the true source of truth
- Documentation phase is based on discovery phase to perform **deep** analysis, but avoid reading entire codebase.
- Select which files to read, group organize by modules/batches/groups and must assign to subagents to execute.
- All docs MUST BE COMPRESSED, TERSE, CONCISE as those are ALWAYS loaded in LLM context.

</core_concepts>

<documentation_process>

1. Dual-mode based on state.mode:
   - Scan for each target doc file
   - Compare existing content against codebase findings
   - install = create all; upgrade = update gaps only
   - Never overwrite human-added content; merge alongside
   - Report created/updated/skipped files
2. Analyze project structure and key source files
3. Create TODO task per document with business context angle
4. Track unknowns in ASSUMPTIONS.md with forward references
5. Create or update documents:

CONTEXT.md:
- What this doc is for and what it should contain, self-defining style
- Self-defines purpose, content type, style
- Bulleted business context, purpose, domain — stakeholder perspective
- No technical details
- Limit to 100 lines, if there is MORE => keep CONTEXT.md with core CONTEXT plus index to per-feature <FEATURE>-CONTEXT.md files with a set of terms what it contains.

ARCHITECTURE.md:
- What this doc is for and what it should contain, self-defining style
- Self-defines purpose, content type, style
- Architecture, modules, workspace structure, testing, styling, building blocks
- No business context — reference CONTEXT.md
- Reference CODEMAP.md for file structure
- Limit to 150 lines, if there is MORE => keep ARCHITECTURE.md with core ARCHITECTURE plus index to per-area <AREA>-ARCHITECTURE.md files with a set of terms what it contains.

IMPLEMENTATION.md:
- What this doc is for and what it should contain, self-defining style
- Self-defines purpose, content type, style
- Baseline state VERY BRIEFLY (first part, use word "Baseline" in header, not word "current" - misleading later on)
- High-level change log, each change separate header with date and description (second part)
- DRY — reference other docs
- The only implementation change log
- If nothing to add - add template

ASSUMPTIONS.md:
- What this doc is for and what it should contain, self-defining style
- Self-defines purpose, content type, style
- Each entry: assumption, confidence level, target file when resolved
- Revalidate all assumptions after other documents complete
- If nothing to add - add template

TODO.md:
- What this doc is for and what it should contain, self-defining style
- Self-defines purpose, content type, style
- Each entry comes with header containing "priority when what where" and body with details
- If nothing to add - add template

AGENT MEMORY.md:
- What this doc is for and what it should contain, self-defining style
- Self-defines purpose, content type, style
- Must follow the template exactly - it will be updated during use
- Keep template entries so that AI knows how to fill them in later on
- It is for agent operational notes, not a duplicate of CONTEXT.md/ARCHITECTURE.md

README.md:
- Create in workspace and in each repository root README.md files if missing

6. Special cases:
   - Speckit: if `memory/constitution.md` and `specs` folder exist, add "MUST APPLY RULE speckit-integration-policy.md" to CONTEXT.md
   - Composite (state.composite = true): create top-level docs as registries with workspace-relative paths to sub-repo docs
   - If large project add "MUST USE SKILL `large-workspace-handling`" to CONTEXT.md
   - Code-graph backend: if Phase 6 state shows a backend installed, add to CONTEXT.md: "MUST USE SKILL `codemap`, <Graphify|Gitnexus> USE IS REQUIRED." (naming the installed backend)

</documentation_process>

<documentation_validation_checklist>
- Each document contains self-definition of purpose and style
- Documents complement without repeating each other
- ASSUMPTIONS.md entries have forward references to target documents
- Upgrade mode: human content preserved, only gaps filled
- Files can be grepped by headers for useful information and ToC
</documentation_validation_checklist>

<templates>

### AGENT MEMORY.md

```markdown
# AGENT MEMORY

Generalized reusable lessons from agent sessions.
Root causes converted into preventive rules, not incident-specific notes.
Entries are h3 headers with [ACTIVE|RETIRED] status.
Content: brief, grep-friendly, MECE across sections. 
Style: one-liner per entry, optional sub-bullets for context.
Keep template entries so that AI knows how to fill them in later on.

## Preventive Rules

### <Generalized Preventive Rule> [ACTIVE|RETIRED]
[Root cause, Reasons, Problems]

## What Worked

### <Generalized What Worked> [ACTIVE|RETIRED]
[Root cause, Reasons, Problems]

## What Failed

### <Generalized What Failed> [ACTIVE|RETIRED]
[Hypothesis, Root cause, Reasons, Problems]

## Discoveries

### <Generalized Discovery> [ACTIVE|RETIRED]
[Usage, Reasons, Problems]
```

### IMPLEMENTATION.md

```markdown
# Rosetta Implementation Summary

This file is a brief and durable summary of the current implementation state.
It is intentionally concise and should not be used as a chronological work log.

For detailed change history, use git history and PRs instead of expanding this file.

## Current State

- [List what is implemented briefly]

## Major Implemented Workstreams

### [Workstream 1]: [status], [modified date]

- [Brief changes with keywords and references]
```

</templates>

</execute_documentation>

<update_state step="7.3">
1. Write Phase 7 completion to `agents/init-workspace-flow-state.md`
2. Update file inventory for CONTEXT, ARCHITECTURE, IMPLEMENTATION, ASSUMPTIONS, AGENT MEMORY
3. Log gaps identified for Phase 8
</update_state>

<validation_checklist>
- All 7 doc files exist and are non-empty
- If composite: top-level docs are registries with sub-repo references
- If upgrade mode: human-added content preserved
- State file shows Phase 7 complete with per-file status
</validation_checklist>

<pitfalls>
- AGENT MEMORY.md is for agent operational notes, not a duplicate of CONTEXT.md
</pitfalls>

</init_workspace_flow_documentation>
