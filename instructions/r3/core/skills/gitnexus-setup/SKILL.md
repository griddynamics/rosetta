---
name: gitnexus-setup
description: "To install GitNexus (repo code graph), when requested."
tags: ["gitnexus", "code-graph", "installation", "opt-in"]
baseSchema: docs/schemas/skill.md
---

<gitnexus_setup>

<role>
Installation gate for GitNexus — runs two commands, verifies the MCP connection, and hands off to GitNexus's own auto-provisioned skills and documentation.
</role>

<when_to_use_skill>
Use ONLY during workspace initialization (Phase 6 of init-workspace-flow) or when the user explicitly asks to install GitNexus.

</when_to_use_skill>

<installation>

**Prerequisites:** Node.js 18+, npm.

**Step 1 — Index the repository:**
```bash
npx gitnexus@latest analyze --skip-agents-md
```
Indexes the codebase into `.gitnexus/` and auto-provisions editor-specific skills, hooks, and context files where supported.

Add `.gitnexus` to `.gitignore` — the index is local and not committed.

**Step 2 — Register the MCP server (one-time):**
```bash
npx gitnexus@latest setup
```
Auto-detects installed editors and writes the global MCP config.

**Step 3 — Verify:**
```
/mcp
```
GitNexus should appear as `gitnexus · ✔ connected`.

</installation>

<troubleshooting>

- **MCP not connecting:** Run `npx gitnexus@latest setup` again. For project-scoped config, add `.mcp.json` to the repo root with `{"mcpServers":{"gitnexus":{"type":"stdio","command":"gitnexus","args":["mcp"]}}}`.
- **`vector`/`fts` extension errors:** These download from a third-party CDN at index time and may fail on restricted networks. Core graph navigation still works without them.
- **Slow indexing:** ~5 min for a medium repo (~4k symbols). For very large repos, use `--worker-timeout 60` to increase worker idle timeout.
- **Stale index after edits:** `gitnexus analyze` installs a PostToolUse hook that auto-refreshes. If missing, run `npx gitnexus@latest analyze` manually between sessions.

</troubleshooting>

</gitnexus_setup>
