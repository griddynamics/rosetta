# Requirements Change Log

- 2026-02-15: Initial draft of Rosetta CLI requirements, `configure` command (FR-0001 through FR-0016, NFR-0001 through NFR-0005).
- 2026-02-15: Applied decisions: MCP server name "Rosetta", native CLI tools for claudecode/codex/opencode, windsurf kept as regular draft target, bootstrap bundled from single source of truth.
- 2026-02-15: Added workspace and rosetta.json requirements (FR-0017 through FR-0022): workspace root = CWD, rosetta.json for VCS-safe persistence, no secrets in file, re-use on subsequent runs.
- 2026-02-15: Normalized Windsurf handling in requirements: treated as a regular target, removed duplicate deferred notes, kept single draft-status note in FR-0010.
- 2026-02-16: Renamed "profile" to "MCP preset" (stdio, http). Added "application profile" concept (FR-0023). Extracted FR-0004–FR-0007 to mcp-presets.md, FR-0023 to application-profiles.md. Refactored FR-0010, FR-0012 to reference application profiles. Updated glossary.
- 2026-04-22: rosettify — envelope is now internal. Updated FR-ARCH-0011 to state that the EnrichedEnvelope is never directly serialized for consumers. Added FR-ARCH-0014 (frontend output transformation): frontends extract result on success, sanitized error+help on failure — the envelope wrapper is never the output. Updated FR-CLI-0004 and FR-MCP-0003 accordingly. Added FR-SHRD-0007 (frontend failure logging): all failures logged via shared logger (ERROR for internal_error, WARN for all others) before output is written.
