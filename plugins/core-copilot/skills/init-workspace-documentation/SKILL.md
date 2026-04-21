---
name: init-workspace-documentation
description: "Rosetta skill to create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, and AGENT MEMORY.md from workspace analysis."
model: claude opus 4.6
tags: ["init", "workspace", "documentation", "context", "architecture"]
baseSchema: docs/schemas/skill.md
---

<init_workspace_documentation>

<role>
Senior technical writer — recovers intent from code, not transcribes implementation.
</role>

<when_to_use_skill>
Workspaces lack structured documentation, forcing every session to re-discover facts and repeat mistakes. This skill creates five foundational docs from source code analysis. Proof: all five docs exist, are non-empty, complementary, and track unknowns.
</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- ACQUIRE `reverse-engineering/SKILL.md` FROM KB and EXECUTE for domain extraction
- Existing project documentation is likely stale and incomplete: source code is the true source of truth
- Documentation phase is based on discovery phase to perform **deep** analysis, but avoid reading entire codebase.
- Select which files to read, group organize by modules/batches/groups and must assign to subagents to execute.

</core_concepts>

<process>

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
- Bulleted business context, purpose, domain — stakeholder perspective
- No technical details
- Self-defines purpose, content type, style

ARCHITECTURE.md:
- Architecture, modules, workspace structure, testing, styling, building blocks
- No business context — reference CONTEXT.md
- Reference CODEMAP.md for file structure
- Self-defines purpose, content type, style

IMPLEMENTATION.md:
- Current state only VERY BRIEFLY, no change log
- DRY — reference other docs
- Self-defines purpose, content type, style

ASSUMPTIONS.md:
- Each entry: assumption, confidence level, target file when resolved
- Revalidate all assumptions after other documents complete

AGENT MEMORY.md:
- Self-defines purpose, content type, style
- Should be empty by default - it will be updated during use

README.md:
- Create workspace and in each repository root README.md files if missing

6. Special cases:
   - Speckit: if `memory/constitution.md` and `specs` folder exist, add "MUST ACQUIRE speckit-integration-policy.md FROM KB and execute it" to CONTEXT.md
   - Composite (state.composite = true): create top-level docs as registries with workspace-relative paths to sub-repo docs
   - If large project add "MUST USE SKILL `large-workspace-handling`" to CONTEXT.md

</process>

<validation_checklist>
- Each document contains self-definition of purpose and style
- Documents complement without repeating each other
- ASSUMPTIONS.md entries have forward references to target documents
- Upgrade mode: human content preserved, only gaps filled
</validation_checklist>

<templates>

### AGENT MEMORY.md

```markdown
# AGENT MEMORY

Generalized reusable lessons from agent sessions.
Root causes converted into preventive rules, not incident-specific notes.
Entries are h3 headers with [ACTIVE|RETIRED] status.
Content: brief, grep-friendly, MECE across sections. Style: one-liner per entry, optional sub-bullets for context.

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

</templates>

</init_workspace_documentation>
