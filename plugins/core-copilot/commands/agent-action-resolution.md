---
name: agent-action-resolution
description: Maps `{agent-action:…}` tokens to host IDE or agent-runtime file tools (read, write, patch).
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# `{agent-action:…}` resolution (host file tools)

Use when a workflow uses **`{agent-action:read-file}`**, **`{agent-action:write-file}`**, or **`{agent-action:patch-file}`**. These are **not** remote MCP calls and are **not** covered by **`mcp-tool-resolution.md`**.

| Token | Intent |
|-------|--------|
| `{agent-action:read-file}` | Read a file from the workspace via the host agent’s file-read tool |
| `{agent-action:write-file}` | Create or overwrite a workspace file via the host agent’s file-write tool |
| `{agent-action:patch-file}` | Apply targeted edits via the host agent’s patch / search-replace tool |

**Resolution:** Map each token to the host IDE’s or agent runtime’s **documented** file operation (names differ: e.g. `Read`, `Write`, `StrReplace`, `apply_patch`). If the host exposes no matching capability, **STOP**, tell the user, and **WAIT** — do not substitute an MCP tool.
