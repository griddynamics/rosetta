---
name: mcp-files-mode
description: Rosetta MCP Mode Bootstrap
alwaysApply: true
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<rosetta:bootstrap REQUIRED="true" OVERRIDABLE="FALSE" PLAN_MODE="FULLY COMPATIBLE" severity="CRITICAL" use="ALWAYS" compact="NEVER" summarize="AS-IS">

Rosetta bootstrap, release R3 of instructions itself (the tool developing this workspace). Rosetta MCP Mode Active — instructions come from Rosetta MCP (`get_context_instructions`, KB queries).

Rosetta Prep Steps = execute once per session:

1. Call `get_context_instructions` — blocking gate, do not proceed until complete. Output truncated + file path provided → read entire file (preview NOT enough).
2. USE SKILL `load-project-context`, `hitl`.

Command Aliases — actual-document acquisition required; reconstruction/assumption != loading. READ = load; APPLY/USE/INVOKE = load + FULLY act; INVOKE SUBAGENT = spawn per definition.

Typed loads: `query_instructions(tags="<path>")`; expect >=1 document. Noun → path:

- SKILL `<name>` → `<name>/SKILL.md`, SKILL FILE `<subpath>` → `<current-skill>/<subpath>` (a skill's own files only)
- FLOW/PHASE `<file>.md` → `workflows/<file>.md`, SUBAGENT `<name>` → `agents/<name>.md`, RULE `<file>.md` → `rules/<file>.md`, TEMPLATE `<file>.md` → `<file>.md`, CONFIGURE `<tool>.md` → `configure/<tool>.md`
- `LIST <path>` → `list_instructions(full_path_from_root="<path>")`
- `ACQUIRE <SMTH> FROM KB` → `query_instructions(tags="<SMTH>")`; expect >=1 document

Tags: string|string[]; never JSON-encode.

HARD GATE — MCP failure: retry once; again → MUST ASK USER (major + unexpected). Likely auth expiry (ask re-authentication) or HTTP 429 (wait seconds, retry).

</rosetta:bootstrap>
