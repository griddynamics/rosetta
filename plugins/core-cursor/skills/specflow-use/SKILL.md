---
name: specflow-use
description: Connect Rosetta locally with Grid Dynamics SpecFlow MCP. Trigger only when the user mentions SpecFlow or SpecFlow workspaces and if SpecFlow MCP is already installed.
license: Apache-2.0
---

# SpecFlow Use

This skill helps you drive **Grid Dynamics SpecFlow** from a local workspace via **SpecFlow MCP**. Rosetta stays local; SpecFlow runs everything remotely. The skill loads project context from `gain.json` and guides the user through SpecFlow MCP tool usage.

SpecFlow MCP is the only user interface to SpecFlow: you order work and download outputs. You do not connect to or operate on the remote workspaces directly.

## Quick Start

When the user mentions SpecFlow or works in a SpecFlow-enabled project:

1. **Detect** `gain.json` at the workspace root (and up to 2 parents). If missing, SpecFlow MCP will create it on the first tool call (together with `specflow_session.json`).
2. **Load** and summarize the project context.
3. **Guide** the user to the right phase using `references/specflow-mcp-tools.md`.

## Step 1: Detect gain.json

Check for `gain.json` at the current workspace root. If not found, check parent directories up to 2 levels. If still missing, tell the user this workspace is not yet initialized for SpecFlow — the first SpecFlow MCP tool call will create both `gain.json` and `specflow_session.json`.

## Step 2: Parse and Display Context

When `gain.json` is found, present a compact summary:

```
## SpecFlow Project Context

**Description**: [gain.json.description]
**Services**: specflow — [gain.json.servicesDescription.specflow]
             rosetta  — [gain.json.servicesDescription.rosetta]
**Supported Coding Agents**: [gain.json.codingAgents]
**Versions**:
  - rosetta: [gain.json.versions.rosetta]
  - specflow:    [gain.json.versions.specflow]
**Vocabulary overrides** (if present in gain.json.vocabulary):
  - (See references/specflow-vocabulary.md for defaults.)
```

### Version Compatibility Check

Compare `gain.json.versions.rosetta` with the current Rosetta version:

- **Minor difference**: warn and continue.
- **Major difference**: alert the user about potential incompatibilities.

## Step 3: Guide the User Journey

Read `references/specflow-mcp-tools.md` to route the user to the correct phase (pregeneration, generation, or post-run).

## Step 4: Consolidate Review Feedback

When SpecFlow returns a review report and the user wants to fix their specs before another iteration, delegate to Rosetta core:

- Skill: `skills/requirements-authoring`
- Workflow: `commands/requirements-authoring-flow.md`

That skill handles iterative requirement updates with explicit user approval — matching the "consolidate the review report into updated specs" loop.

## Reference Files

Read as needed:

- `references/specflow-mcp-tools.md` — Phase routing and post-run skill bootstrap.
- `references/specflow-vocabulary.md` — Status values and checkpoint gates users encounter in responses.
- `references/specflow-schema.md` — Session files, version channels, and status enum quick lookup.
