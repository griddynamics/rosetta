---
name: load-context
description: "To load the most current project context; MUST during prep."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

**Mode detection:**

- If `RUNNING AS A PLUGIN` is in context → Plugin mode
- Else if `get_context_instructions` tool is available → MCP mode
- Else → Adhoc mode

**Plugin mode:**

1. Bootstrap rules are loaded via startup hook — do NOT assume prep steps are done
2. Create todo tasks (search/discover the tool if needed)
3. Locate and execute ALL prep steps defined in the loaded bootstrap rules in full
4. DO NOT proceed to any action until all prep steps are confirmed complete
5. Identify and load the most matching workflow — a must if you are not subagent
6. Create and update all todo tasks per workflow

**MCP mode:**

1. Call `get_context_instructions` (blocking gate — do not proceed until complete)
2. If output truncated and file path provided — read entire file, preview is NOT enough
3. Create todo tasks (search/discover the tool if needed)
4. Execute ALL prep steps returned — no skipping, no partial execution
5. DO NOT proceed to any action until all prep steps are confirmed complete
6. Identify and load the most matching workflow — a must if you are not subagent
7. Create and update all todo tasks per workflow

**Adhoc mode:**

1. Read `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` in full
2. List `docs/*.md` and workspace root `*.md` files to gather context

**All modes:**

- Treat context loading as a hard blocking gate, not a background task
- Explicitly confirm all prep steps complete before responding, planning, or executing anything
- If anything fails or is unclear — stop and ask user
