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

### src/rosetta-cli/README.md — `npx rosetta` CLI tool: configure command and workspace management.

## plugin-generator

### plugin-generator/INDEX.md — Plugin generator: transforms an instruction source tree into six IDE plugin distributions.
### plugin-generator/SCOPE.md — In/out of scope, actors, entry points, goals, non-goals, global constraints.
### plugin-generator/GLOSSARY.md — Domain terms and canonical type names: release, domain, target, VirtualFile, the two-tier FileProcessor/PluginProcessor model, SpecEntry, etc.
### plugin-generator/MODEL.md — Configuration contract: release, plugin-target (PluginSpec = SpecEntry[] + PluginProcessor[] + descriptor), preserved-file source location (DATA-*).
### plugin-generator/FR-ARCH.md — Architecture: uniform spec contract, immutable flat VFS with structural sharing, filename directives, two-tier File/Plugin processor pipeline (FR-ARCH-*).
### plugin-generator/FR-CLI.md — Invocation, release selection, domain resolution + bundling, run modes (dry-run/verbose), orchestration, exit status (FR-CLI-*).
### plugin-generator/FR-COPY.md — Preserved-file seeding from src/plugin-generator/plugins (FR-SEED-*), source reset, copy, model normalization, renames, content reference rewriting (FR-COPY-*).
### plugin-generator/FR-GEN.md — Folder index generation and template rendering (FR-GEN-*).
### plugin-generator/FR-HOOK.md — Bootstrap context payload assembly and hook-bundle synchronization (FR-HOOK-*).
### plugin-generator/FR-VAR.md — Per-target structure, reasoning, and bootstrap-delivery strategy; per-variant output properties (FR-VAR-*).
### plugin-generator/NFR.md — Byte-for-byte parity, determinism, idempotency, portability (TS/npx), modularity, library selection criteria, limits (NFR-*).
### plugin-generator/REFERENCES.md — Authoritative per-IDE configuration guides under instructions/r3/core/configure/ (INT-IDE-*).
### plugin-generator/STRUCTURES.md — Generalized example folder structure per target (preserved vs generated, with provenance) (FR-STRUCT-*).
### plugin-generator/ASSUMPTIONS.md — Assumptions, flagged quirks/implementation accidents, open questions.

## Planned Components

### rosetta-mcp — MCP server package (`ims-mcp` on PyPI). Planned.
### rosetta-server — Backend instruction management system. Planned.
### publishing-tools — CLI tools for publishing instructions to Rosetta Server. Planned.

## Cross-Component Documents

### CHANGES.md — Change log across all components.
