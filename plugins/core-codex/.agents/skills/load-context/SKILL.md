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
1. Bootstrap rules are loaded via startup hook — do NOT assume prep steps are done
2. Locate and execute ALL prep steps defined in the loaded bootstrap rules in full
3. DO NOT proceed to any action until all prep steps are confirmed complete
4. Identify and load the matching workflow — if you are the orchestrator/top/main agent

**MCP mode:**
1. Call `get_context_instructions` (blocking gate — do not proceed until complete)
2. If output truncated and file path provided — read entire file, preview is NOT enough
3. Execute ALL prep steps returned — no skipping, no partial execution
4. DO NOT proceed to any action until all prep steps are confirmed complete
5. Identify and load the matching workflow — if you are the orchestrator/top/main agent

**Adhoc mode:**
1. Read `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` in full
2. List `docs/*.md` and workspace root `*.md` files to gather context

**All modes:**
- Treat context loading as a hard blocking gate, not a background task
- Explicitly confirm all prep steps complete before responding, planning, or executing anything
- If anything fails or is unclear — stop and ask user
