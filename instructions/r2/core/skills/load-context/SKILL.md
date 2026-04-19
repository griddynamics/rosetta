---
name: load-context
description: "Load Rosetta project context via get_context_instructions, complete all prep steps, and route to the matching workflow. Use when starting any new session, task, or request to ensure the agent operates with full project awareness before responding."
baseSchema: docs/schemas/skill.md
license: Proprietary
disable-model-invocation: false
user-invocable: true
argument-hint: none
context: default
metadata:
  version: "1.0"
  category: "context-loading"
tags:
  - load-context
  - initialization
---

<load-context>

<when_to_use_skill>
Use at the start of every session or when context may be stale. This skill loads project-specific context, guardrails, and workflow routing before any other action. It is fully automated and fast.
</when_to_use_skill>

<workflow>

1. **Call `get_context_instructions`** — this is a blocking prerequisite; do not respond, call other tools, or process the user message until this completes
2. **Execute all prep steps** — complete prep step 1, prep step 2, and prep step 3 as returned by `get_context_instructions`; read all referenced files
3. **Select matching workflow** — based on the user's request classification, select and begin execution of the appropriate workflow
4. **Confirm to user** — report once: "I have loaded context using Rosetta: [brief summary relevant to user input]"
5. **Continue with user request** — proceed to planning, questioning, or execution as appropriate

If `get_context_instructions` is unavailable or fails, immediately ask the user for help — this is critical and unexpected.

</workflow>

<validation_checklist>

- `get_context_instructions` was called and completed successfully
- All three prep steps were fully executed
- Referenced files were read and integrated
- A matching workflow was selected and initiated
- User was informed of loaded context

</validation_checklist>

<pitfalls>

- Skipping prep steps because the task seems simple — always complete all steps regardless of task size
- Responding before context is loaded — destroys instruction alignment
- Calling other tools before `get_context_instructions` — this must be the first action
- Not asking the user when the tool fails — silent failure leads to generic, unaligned responses

</pitfalls>

</load-context>

