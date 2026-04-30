---
name: load-context
description: Rosetta MUST skill to load the most current context, extremely useful, fast, fully automated, especially for planning, helps understand what actually user wants, skipping leads to wrong execution path
baseSchema: docs/schemas/skill.md
---

**Mode detection:**

- If `RUNNING AS A PLUGIN` is in context → Plugin mode
- Else if `get_context_instructions` tool is available → MCP mode
- Else → Adhoc mode

**Plugin mode:**

1. Bootstrap rules are loaded via startup hook — do NOT assume plan steps are complete
2. Create todo tasks (search/discover the tool if needed)
3. Locate and execute ALL plan steps in `ph-prep` defined in the loaded bootstrap rules in full
4. DO NOT proceed to any action until all plan steps are confirmed complete

**MCP mode:**

1. Call `get_context_instructions` (blocking gate — do not proceed until complete)
2. If output truncated and file path provided — read entire file, preview is NOT enough
3. Create todo tasks (search/discover the tool if needed)
4. Execute ALL plan steps upserted into `ph-prep` — no skipping, no partial execution
5. DO NOT proceed to any action until all plan steps are confirmed complete

**Adhoc mode:**

1. Read `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` in full
2. List `docs/*.md` and workspace root `*.md` files to gather context

**All modes:**

- Treat context loading as a hard blocking gate, not a background task
- Explicitly confirm all plan steps complete before responding, planning, or executing anything
- If anything fails or is unclear — stop and ask user
