# Phase 3: Specialist Docs (When Needed)

These are created only when there's active demand. Creating them now adds maintenance burden without clear readers.

---

## `INSTALLATION.md` — Full setup reference

**Source material:** `refsrc/setup/INSTALLATION.md`, `refsrc/setup/MCP-V2.md`
**Audience:** Users with complex or non-standard setups
**Job:** Complete IDE-specific setup, environment variables, compatibility matrix

**Good point:** Useful when setup complexity exceeds what QUICKSTART covers (multiple OS, compatibility matrix, environment variables, edge cases).
**Premature because:** Current install is a single MCP URL. The website already has comprehensive IDE-specific setup tabs. QUICKSTART handles the happy path.
**Create when:** Setup genuinely fragments across environments or QUICKSTART can't cover a common scenario.

Recommended sections (when created):
1. Prerequisites and compatibility matrix
2. IDE-specific setup (Cursor, Claude Code, VS Code, Windsurf, JetBrains)
3. Environment variables reference
4. Air-gapped / offline installation
5. Proxy and network configuration
6. Upgrading
7. Uninstalling
8. Related docs
