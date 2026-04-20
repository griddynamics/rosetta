---
name: large-workspace-handling
description: "Rosetta skill to partition large workspaces or folders (100+ files recursively) into scoped subagent tasks when single-agent context is insufficient."
tags: ["skill", "workspace", "large-workspace", "delegation"]
baseSchema: docs/schemas/skill.md
---

<large_workspace_handling>

<role>

Workspace partitioning strategist. Draws scope boundaries, dispatches subagents.

</role>

<when_to_use_skill>
Use when large workspaces exceed single-agent context window. Partitions into write-scopes where every file belongs to exactly one scope, and merged results address the original request completely.
</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- If CODEMAP.md missing, ACQUIRE `init-workspace-discovery/SKILL.md` FROM KB and EXECUTE to create ONLY CODEMAP.md
- Grep `#` headers of CODEMAP before scoping

Two strategies (mutually exclusive):
- Summarize & Index
- Work distribution

## Summarization & Indexing
- Research without changing code, navigable index with module summaries, etc.
- Assign subagents: scope paths, goal, context, inputs, output format, boundaries, constraints, and level of detail
- Subagents to ACQUIRE `reverse-engineering/SKILL.md` FROM KB if needed for code analysis
- Request slightly more information than actually needed for better understanding
- Summarize all outputs
- Subagent: discoverer, explore, etc.
- Subagent output structure: analysis scope, TLDR answer, quick navigation with relevance, details with subsections per each logical group (globs, purpose, key components, relevant findings, dependencies), cross-group map, follow ups required
- Subagents to use relevance classification: 
  - High: group directly addresses the research question
  - Medium: group has supporting information or context
  - Low: group tangentially related, included for completeness

## Work distribution
- Coordinated modifications via contract-scoped parallel subagents with explicit boundaries and success criteria
- Split work across subagents and provide: scope paths, goal, context, inputs, output format, boundaries, constraints, operations, and success criteria
- Subagents decide and execute work within declared scope
- Resolve cross-scope deps via execution ordering
- Resolve shared-interface conflicts or changes with extra pass
- Produce unified result
- Subagent: executor, engineer, etc.

## Task type detection:
- `Summarize & Index` keywords: understand, analyze, investigate, explore, document, explain, find, search, review, audit, learn, overview
- `Work distribution` keywords: implement, create, add, fix, refactor, update, change, modify, delete, remove, migrate, build, write
- Tie-breaker: default to `Summarize & Index`

Scoping:
- Partition into independent areas
- One subagent per area or logical group
- Group coupled paths and related work into one scope
- Align to monorepo boundaries when present
- Define output files in advance using agent feature TEMP folder
- Spawn subagents in parallel if possible to do the work
- Once work is done spawn another set of subagents to verify that the work was done properly

</core_concepts>

</large_workspace_handling>
