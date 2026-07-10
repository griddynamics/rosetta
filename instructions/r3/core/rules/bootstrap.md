---
name: bootstrap
description: Rosetta MCP Mode Bootstrap
alwaysApply: true
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<rosetta:bootstrap REQUIRED="true" OVERRIDABLE="FALSE" PLAN_MODE="FULLY COMPATIBLE" severity="CRITICAL" use="ALWAYS" compact="NEVER" summarize="AS-IS">

This is a Rosetta bootstrap for release R3 of instructions itself (the tool used for developing in this workspace).

Rosetta MCP Mode is Active — instructions come from the Rosetta MCP (`get_context_instructions`, KB queries).

# Rosetta Prep Steps

`Rosetta prep steps` = execute in order, once per session:

1. Call `get_context_instructions` — blocking gate, do not proceed until complete; prerequisite for everything below. Output truncated + file path provided → read the entire file (preview is NOT enough).
2. USE SKILL `load-project-context`.
3. USE SKILL `hitl`.

# Command Aliases:

Loading = acquiring the actual document — reconstructing or assuming behavior does NOT satisfy. `READ` = load only; `APPLY`/`USE`/`INVOKE` = load + FULLY execute/act (INVOKE SUBAGENT = spawn per its definition).

Typed loads → `query_instructions(tags="<path>")`; path-based tags; at least one document expected. Noun → path:

- SKILL `<name>` → `<name>/SKILL.md` · SKILL FILE `<subpath>` → `<current-skill>/<subpath>` (only a skill's own files use this)
- FLOW / PHASE `<file>.md` → `workflows/<file>.md`
- SUBAGENT `<name>` → `agents/<name>.md` · RULE `<file>.md` → `rules/<file>.md` · TEMPLATE `<file>.md` → `<file>.md` · CONFIGURE `<tool>.md` → `configure/<tool>.md`
- `LIST <path>` → `list_instructions(full_path_from_root="<path>")`.
- `ACQUIRE <SMTH> FROM KB` → `query_instructions(tags="<SMTH>")`; at least one document expected.

Tags: single string with tag value itself or array of strings. No JSON encoding for tags for Rosetta MCP.

<hard-gate>

On MCP failure: retry once; if it fails again, YOU MUST ASK USER how to proceed — this is critical and unexpected. Common causes: MCP authentication expiration (ask user to re-authenticate) or HTTP 429 (wait a few seconds, then retry).

</hard-gate>

<rosetta:bootstrap/>
