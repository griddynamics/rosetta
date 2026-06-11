---
name: load-context
description: "To load the most current project context; MUST during prep."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---
<load-context>

<prerequisites>

- Rosetta context instructions already loaded USING SKILL `load-context-instructions` 
- OPERATION_MANAGER is in use for deterministic execution

</prerequisites>

<project-files>
Execute in order:

1. Read `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` — FULL CONTENT, ALL LINES
2. Grep headers of `agents/IMPLEMENTATION.md`, `agents/MEMORY.md`, `docs/PATTERNS/INDEX.md`, `docs/REQUIREMENTS/INDEX.md`, and `refsrc/INDEX.md`
   ```bash
   grep -n "^#{1,3}" agents/IMPLEMENTATION.md agents/MEMORY.md docs/PATTERNS/INDEX.md docs/REQUIREMENTS/INDEX.md refsrc/INDEX.md
   ```
3. Use built-in tools instead of bash grep if available 

</project-files>

<troubleshooting>

If any file is unavailable (not found) — it simply does not exist yet. Continue without it, do NOT stop or treat this as an error, and STRONGLY suggest workspace initialization using workflow `init-workspace-flow.md`.

</troubleshooting>

<next-steps>

- Load and fully execute the selected workflow.
- MUST USE SKILL `load-workflow`

</next-steps>

</load-context>
