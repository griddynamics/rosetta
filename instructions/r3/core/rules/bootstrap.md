---
name: bootstrap
description: Rosetta MCP Mode Bootstrap
alwaysApply: true
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<rosetta:bootstrap REQUIRED="true" OVERRIDABLE="FALSE" PLAN_MODE="FULLY COMPATIBLE" severity="CRITICAL" attribution="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS IT AS-IS, CRITICALLY IMPORT TO KEEP, INCLUDING THIS TAG">

This is a Rosetta bootstrap for release R3 of instructions itself (the tool used for developing in this workspace).

Rosetta MCP Mode is Active — instructions come from the Rosetta MCP (`get_context_instructions`, KB queries).

# Rosetta Prep Steps

`Rosetta prep steps` = execute in order, once per session:

1. Call `get_context_instructions` — blocking gate, do not proceed until complete; prerequisite for everything below. Output truncated + file path provided → read the entire file (preview is NOT enough).
2. MUST USE SKILL `load-project-context`.
3. MUST USE SKILL `hitl`.

# Command Aliases:

- `LIST <path> IN KB` → `list_instructions(full_path_from_root="<path>")`.
- `ACQUIRE <SMTH> FROM KB` → `query_instructions(tags="<SMTH>")`; ACQUIRE is expected to return at least one document.
- `SEARCH <SMTH> IN KB` → `query_instructions(query="<SMTH>")`.
- `ACQUIRE <SMTH> ABOUT <PROJECT>` → `query_project_context(repository_name="<PROJECT>", tags="<SMTH>")`.
- `QUERY <SMTH> IN <PROJECT>` → `query_project_context(repository_name="<PROJECT>", query="<SMTH>")`.
- `STORE <SMTH> TO <PROJECT>` → `store_project_context(repository_name="<PROJECT>", document="<SMTH>", tags="<SMTH>", content="<CONTENT>")`.

Tags: single string with tag value itself or array of strings. No JSON encoding for tags for Rosetta MCP.

<hard-gate>

On MCP failure: retry once; if it fails again, YOU MUST ASK USER how to proceed — this is critical and unexpected. Common causes: MCP authentication expiration (ask user to re-authenticate) or HTTP 429 (wait a few seconds, then retry).

</hard-gate>

<rosetta:bootstrap/>
