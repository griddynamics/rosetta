# rosettify — Requirements Index

Jira: [CTORNDGAIN-1333](https://griddynamics.atlassian.net/browse/CTORNDGAIN-1333)

Requirements for rosettify npm package: a unified tool runner for Rosetta with dual CLI/MCP frontend.

## Files

| File | Area | Status |
|---|---|---|
| [ARCH.md](ARCH.md) | Architecture | Approved |
| [PLAN.md](PLAN.md) | Plan command | Approved |
| [HELP.md](HELP.md) | Help command | Approved |
| [CLI.md](CLI.md) | CLI frontend | Approved |
| [MCP.md](MCP.md) | MCP frontend | Approved |
| [PKG.md](PKG.md) | Packaging | Approved |
| [NFR.md](NFR.md) | Non-functional (stability, reliability, security, performance, integration) | Approved |
| [SHARED.md](SHARED.md) | Shared common functionality (validation, envelope, help enrichment, error handling, logging) | Approved |
| [FUTURE.md](FUTURE.md) | Future commands (install, uninstall, upgrade, generate, handle) | Draft |

## Tech Stack

- TypeScript 6.0 (latest stable)
- commander 14.0.3 (CLI, zero deps, MIT)
- @modelcontextprotocol/sdk 1.29.0 (MCP stdio, official, MIT)
- pino 10.3.1 (logging, file-only, MIT)
- vitest 4.1.2 (testing)
- License: Apache 2.0

## ID Strategy

`FR-<AREA>-NNNN` for functional, `NFR-<AREA>-NNNN` for non-functional.

## Summary

- 8 approved requirement files, 1 draft (FUTURE.md — intentional placeholders)
- Batch 1 (now): architecture, plan, help, CLI, MCP, packaging, shared, NFR
- Batch 2+ (future): install, uninstall, upgrade, generate, handle
