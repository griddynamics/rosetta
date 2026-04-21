# Code Map

## rosettify/ (root)
Config: package.json, tsconfig.json, tsconfig.build.json, vitest.config.ts, .gitignore, LICENSE, README.md

## rosettify/src/bin/
Entry point
- rosettify.ts — shebang, --mcp detection, delegate to runCli/runMcp

## rosettify/src/registry/ (2 files)
Tool registry
- types.ts — RunEnvelope, EnrichedEnvelope, RunDelegate, ToolDef, HelpTopLevel, HelpCommandDetail, HelpCommandEntry
- index.ts — registry Map, getToolDef, getCliTools, getMcpTools

## rosettify/src/shared/ (5 files)
Shared infrastructure
- constants.ts — size limits, MAX_CONCURRENCY_RETRIES
- envelope.ts — ok(), err(), usageErr() helpers
- logger.ts — pino file-only singleton
- dispatch.ts — validate→run→enrich pipeline + validateInput
- concurrency.ts — readModifyWrite with optimistic retry

## rosettify/src/commands/plan/ (8 files)
Plan command implementation
- core.ts — ALL shared types, merge, status, validate, file I/O
- index.ts — planToolDef + runPlan dispatch
- create.ts — cmdCreate
- next.ts — cmdNext
- update-status.ts — cmdUpdateStatus
- show-status.ts — cmdShowStatus
- query.ts — cmdQuery
- upsert.ts — cmdUpsert
- help-content.ts — planHelpContent object

## rosettify/src/commands/help/ (1 file)
Help command
- index.ts — helpToolDef + runHelp + HelpInput

## rosettify/src/frontends/ (2 files)
I/O frontends
- cli.ts — commander 14 wiring, stdout JSON, exit codes
- mcp.ts — MCP Server, StdioServerTransport, tools/list + tools/call

## rosettify/tests/fixtures/ (1 file)
Test utilities
- plans.ts — fullPlan(), minimalPlan(), singleStepPlan(), completedPlan(), factories
