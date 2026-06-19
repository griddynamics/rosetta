---
name: load-context-instructions
description: "To detect execution mode and load the matching bootstrap instructions."
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---
<load-context-instructions>

<prerequisites>

- OPERATION_MANAGER is in use for deterministic execution

</prerequisites>

<mode-detection>

- If `RUNNING AS A PLUGIN` is in context → Plugin mode
- Else if `get_context_instructions` tool is available → MCP mode
- Else → Fallback mode

</mode-detection>

<plugin-mode>

1. Instructions already loaded via startup hook — `get_context_instructions` is complete; do NOT call Rosetta MCP
2. Create todo tasks using OPERATION_MANAGER
3. Locate and execute ALL `ph-prep` plan steps from loaded bootstrap rules in full
4. Gate: DO NOT proceed to any action until all ph-prep steps confirmed complete

</plugin-mode>

<mcp-mode>

1. Call `get_context_instructions` MCP tool — blocking gate, do not proceed until complete
2. If output truncated and file path provided — read the entire file; preview is NOT enough
3. Create todo tasks using OPERATION_MANAGER 
4. Execute ALL `ph-prep` steps upserted by returned instructions — no skipping, no partial execution
5. Gate: DO NOT proceed to any action until all ph-prep steps confirmed complete

</mcp-mode>

<fallback-mode>

1. Find and load the following files from the repository: `bootstrap.md`, `bootstrap-core-policy.md`, `bootstrap-execution-policy.md`, `bootstrap-guardrails.md`, `bootstrap-rosetta-files.md`. Skip any that are missing.  
2. List `docs/*.md` and workspace root `*.md` files to gather context

</fallback-mode>

<next-steps>

- Read project context 
- MUST USE SKILL `load-context`

</next-steps>

</load-context-instructions>
