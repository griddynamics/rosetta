# Scope: Rosetta CLI

## Goal

Provide a Node.js CLI tool (`npx -y rosetta@latest <command>`) for Rosetta operations. The first command is `configure`, which automatically installs and integrates Rosetta into one or more supported AI coding IDEs.

## In Scope

### Rosetta CLI (package)

- New npm package `rosetta` published to npmjs.com
- Extensible command architecture for future commands
- Cross-platform support (macOS, Linux, Windows)

### `configure` command

- Accept comma-separated IDE target names
- Profile system for MCP server credentials (default, api-key, oauth)
- MCP configuration file generation for each target IDE
- Bootstrap rules file generation for each target IDE
- All IDE targets currently documented in INSTALLATION.md
- Parameter overrides for server URL, dataset, credentials
- Dry-run mode for previewing changes
- Idempotent operation (safe to re-run)

## Out of Scope

- Repository initialization (`Initialize this repository using the respective Rosetta workflow` step)
- Rosetta Server deployment or management
- IDE plugin installation beyond MCP config and bootstrap files
- Local KB mode (Mode 3 from INSTALLATION.md)
- Offline/air-gapped mode (Mode 2 from INSTALLATION.md)
- Publishing instructions to Rosetta Server
- OAuth token exchange implementation (handled by Rosetta MCP, not this CLI)
