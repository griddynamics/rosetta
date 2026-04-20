---
name: init-workspace-patterns
description: "Rosetta skill to extract recurring coding and architectural patterns from workspace code into reusable templates."
model: claude-opus-4-6, gpt-5.4-high, gemini-3.1-pro-preview
tags: ["init", "workspace", "patterns", "reverse-engineering"]
baseSchema: docs/schemas/skill.md
---

<init_workspace_patterns>

<role>
Senior pattern architect — recovers reusable structural conventions from code.
</role>

<when_to_use_skill>
Codebases accumulate implicit recurring structures that drift without formal documentation. Extract them into explicit reusable templates so agents and contributors produce consistent code. Requires CODEMAP.md on disk.
</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- ACQUIRE `reverse-engineering/SKILL.md` FROM KB — apply "Would we rebuild this?" test: pattern = recurring structure surviving a from-scratch rewrite; one-off = historical accident
- Pattern qualifies only if found in 2+ places

</core_concepts>

<process>

1. Read CODEMAP.md — scope extraction per module
   - if not enough use shell to list recursively all files with minimal output parameters
   - limit top 10-15 most common patterns
   - limit reading samples to 2-3 files per pattern
   - add 2-3 more patterns as you see fit
2. Dual-mode:
   - CHECK-EXISTS: read docs/PATTERNS/ and INDEX.md
   - IDENTIFY-GAPS: compare existing patterns against codebase
   - CREATE-OR-UPDATE: install = create all; upgrade = add missing only
   - PRESERVE-HUMAN: never overwrite human-curated content
   - REPORT-CHANGES: log to CHANGES.md
3. Per pattern file (docs/PATTERNS/*.md):
   - **Name**: short identifier (e.g., "REST Controller Endpoint")
   - **Description**: what it solves, when to use
   - **Template/Example**: generalizable code skeleton with extension-point comments
4. Write docs/PATTERNS/INDEX.md — all patterns with one-line descriptions
5. Write docs/PATTERNS/CHANGES.md — created/updated/skipped
6. If state.composite = true, extract per sub-repository; top-level INDEX.md references sub-repo folders

</process>

<validation_checklist>
- Every pattern represents a genuinely recurring structure (2+ occurrences)
- INDEX.md lists all pattern files
- CHANGES.md tracks all actions taken
- No human-curated content overwritten in upgrade mode
</validation_checklist>

</init_workspace_patterns>
