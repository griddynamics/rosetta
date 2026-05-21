---
name: mcp-tool-resolution
description: Binds `{integration-action:…}` tokens to MCP tool identifiers in guided runs using a single-pass scan of the session tool list.
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# `{integration-action:…}` resolution (MCP tools)

Use when a parent workflow is **guided** for an integration and must turn a **`{integration-action:…}`** token into a concrete MCP tool call. **ACQUIRE only when needed** (not for questionnaire-only paths). Routing (guided vs questionnaire) is defined in **`mcp-capability-interaction.md`**.

Parent workflows define token spellings and parameter blocks. **Questionnaire** integrations must **not** use this file to call MCP.

## Deterministic tool selection (single pass over MCP list)

Let `T` = the list of MCP tool names (or ids) available in **this** session. Perform **exactly one** linear scan over `T` (no second pass, no “try again” loops).

1. **Required substrings** — From the token after `integration-action:`, take segments split by `-` (e.g. `jira-get-issue` → `jira`, `get`, `issue`). Build candidate set **C** = tools in `T` whose identifier **contains every remaining segment** (case-insensitive). If **C** is empty, drop segments in this order until **C** is non-empty or one segment remains: drop **`get`**, then **`search`**, then **`list`** or **`pages`**, then repeatedly drop the **rightmost** remaining segment.
2. **If C has exactly one tool** — use it.
3. **If C has more than one tool** — Prefer tools explicitly allowed or named in **`agents/mcp-capability.yaml`** and **`agents/user-instructions/mcp-guidance.md`** for that integration. If still more than one, **STOP** and ask **one** disambiguation question using the **format below** (no guess).
4. **If C is empty after step 1 reductions** — **Do not invent** a tool. Record resolution failure in state, then follow **Questionnaire** rules for that integration in **`mcp-capability-interaction.md`** (**STOP**, **WAIT**), then continue per the parent workflow’s routing table.

Map **Parameters** from the phase `Action` blocks to the chosen tool’s schema (adapt snake_case vs camelCase per tool docs).

## Disambiguation question format

When step **3** leaves multiple candidates, use exactly this shape:

1. One line stating the token and that multiple MCP tools matched.
2. Numbered lines **`1`** through **`N`**: each line is **one verbatim tool id** from the remaining candidate set (same spelling as in `T`).
3. Line **`N+1`**: `Cancel — use questionnaire for this integration instead`.
4. **Parse the reply:** accept only an integer **k**. If **k = N+1**, do not call MCP for that integration; follow the parent’s questionnaire path. If **1 ≤ k ≤ N**, select the **k**-th listed tool in order. Any other reply → ask again once with the same list.

Vendor tool names in examples elsewhere are **illustrations**; **`T`** is authoritative.
