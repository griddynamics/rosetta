# Requirements Index

Requirements are organized by Rosetta component. Each component has its own folder with scope, glossary, assumptions, functional requirements (FRs), and non-functional requirements (NFRs).

## rosettify

### rosettify/INDEX.md — `rosettify` npm package: unified CLI/MCP tool runner for Rosetta.
### rosettify/ARCH.md — Internal architecture: tool registry, command dispatch, output envelope, frontend abstraction.
### rosettify/PLAN.md — Plan command: two-level hierarchy, CRUD subcommands, templates, atomic write, help, output shapes.
### rosettify/HELP.md — Help command: top-level and per-command help, schema enumeration, --help flag handling.
### rosettify/CLI.md — CLI frontend: argument parsing, positional conventions, error formatting, exit codes.
### rosettify/MCP.md — MCP frontend: stdio transport, tool registration, input validation, error formatting.
### rosettify/PKG.md — Packaging and distribution: npm package structure, semantic versioning, published entry points.
### rosettify/NFR.md — Non-functional requirements: stability, reliability, security, performance, integration constraints.
### rosettify/SHARED.md — Shared common functionality: input validation, output envelope, help enrichment, error handling, logging.
### rosettify/FUTURE.md — Future commands (install, uninstall, upgrade, generate, handle): placeholder starting requirements.

## rosetta-cli

### rosetta-cli/README.md — `npx rosetta` CLI tool: configure command and workspace management.

## Planned Components

### rosetta-mcp — MCP server package (`ims-mcp` on PyPI). Planned.
### rosetta-server — Backend instruction management system. Planned.
### publishing-tools — CLI tools for publishing instructions to Rosetta Server. Planned.

## Cross-Component Documents

### CHANGES.md — Change log across all components.
