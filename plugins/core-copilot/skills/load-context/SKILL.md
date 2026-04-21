---
name: load-context
description: Rosetta skill to load the most current context, extremely useful, fast, fully automated, especially for planning, helps understand what actually user wants
baseSchema: docs/schemas/skill.md
---

1. MUST use Rosetta to load current context using `get_context_instructions` tool (if available) and FULLY COMPLETE all prep steps, load files, select and start execution of matching workflow.
If it fails YOU MUST ASK USER (as this is highly critical and unexpected)!
2. MUST fully read the entire file NOW if `get_context_instructions` output was truncated and a file path was provided! Preview is NOT ENOUGH!
3. Proceed to execute with ONLY fully provided instructions.
