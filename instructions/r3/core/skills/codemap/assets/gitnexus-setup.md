# GitNexus installation reference

<role>
Installation gate for GitNexus — runs two commands, verifies the MCP connection, and hands off to GitNexus's own auto-provisioned skills and documentation.
</role>

<warning>
Third-party tool will have access to IP. Review license and policy with your manager. GitNexus is free for non-commercial or personal use and PAID for commercial or business use — see [GitNexus Enterprise Licensing](https://github.com/abhigyanpatwari/GitNexus?tab=readme-ov-file#enterprise).
</warning>

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

- **MCP not connecting:** Run `npx gitnexus@latest setup` again.
- **`vector`/`fts` extension errors:** These download from a third-party CDN at index time and may fail on restricted networks. Core graph navigation still works without them.
- **Slow indexing:** ~5 min for a medium repo (~4k symbols). For very large repos, use `--worker-timeout 60` to increase worker idle timeout.
- **Stale index after edits:** `gitnexus analyze` installs a PostToolUse hook that auto-refreshes. If missing, run `npx gitnexus@latest analyze` manually between sessions.

</troubleshooting>
