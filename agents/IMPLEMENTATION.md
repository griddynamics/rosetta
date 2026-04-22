# Rosetta Implementation Summary

This file is a durable summary of the current implementation state.
It is intentionally concise and should not be used as a chronological work log.

For detailed change history, use git history and PRs instead of expanding this file.

## Current State

- Rosetta is an OSS instruction platform with:
  - a Python MCP server in `ims-mcp-server/`
  - a Python CLI in `rosetta-cli/`
  - public documentation in `docs/` and `docs/web/`
  - deployment examples under `deployment/`
- The MCP server supports both `stdio` and HTTP transports.
- HTTP mode supports OAuth-based authentication, session storage, and policy-based authorization.
- The CLI supports publish, verify, list, parse, cleanup, and related packaging flows.
- The repository contains both user-facing OSS docs and contributor-oriented implementation notes.

## Major Implemented Workstreams

### MCP Server

- Refactored into a modular package structure with dedicated `config`, `context`, `services`, `tools`, `auth`, and `analytics` modules.
- Core MCP tools are implemented, including:
  - `get_context_instructions`
  - `query_instructions`
  - `list_instructions`
  - `submit_feedback`
  - `query_project_context`
  - `store_project_context`
  - `discover_projects`
  - `plan_manager`
- Added HTTP transport support on top of the existing `stdio` mode.
- Added Redis-backed session and plan storage with in-memory fallbacks for local development.
- Added OAuth/OIDC integration for HTTP deployments, including introspection-based validation and offline-refresh handling.
- Added a FastMCP loopback redirect compatibility patch so CIMD-based OAuth clients using ephemeral localhost callback ports can complete HTTP authentication.
- Added origin validation and cross-tool hardening around invalid inputs, malformed requests, and wrapper failures.
- Added response-shape and schema cleanup so tool contracts are more predictable for coding agents.

### Authorization and Security

- Dataset access is policy-driven, with separate read/write behavior for project datasets.
- OAuth configuration supports both generic OAuth token introspection and OIDC discovery-based validation.
- Token/session handling includes encryption hooks, TTL controls, and negative-cache behavior for introspection.
- Public documentation and examples were scrubbed to remove internal infrastructure details while retaining public OSS references.

### CLI and Publishing

- The CLI was migrated to the RAGFlow-backed model and later refactored into a command-pattern architecture.
- Publishing supports change detection, dry-run flows, and dataset-scoped cleanup behavior.
- Auth checks were tightened so API-backed commands fail earlier and more predictably.
- A dedicated `version` command was added so package version inspection does not require config loading or auth.
- Package metadata and publish flows were repaired to keep CI/CD and PyPI publishing functional.

### Instructions and Skills

- Added `plan-manager` skill under `instructions/r2/core/skills/plan-manager/` — primary plan manager for coding agents via local JSON files.
- Skill assets: `plan_manager.js` (CLI, no npm deps), `pm-schema.md` (data structure reference), `plan_manager.test.js` (60 unit tests).
- Key behaviors: resume-safe `next` command returns `in_progress` steps with `resume: true` before `open` steps; plans stored at `plans/<name>/plan.json`; self-describing `help` command.
- Converted `adhoc-flow-with-plan-manager` workflow to `USE SKILL plan-manager`; data structure externalized to `pm-schema.md`.
- Plugins (`core-claude`, `core-cursor`) are auto-synced from core by `scripts/pre_commit.py`.

### Workflows and Automation

- GitHub Actions were updated to remove most deprecated Node 20-era dependencies and align with newer action runtimes where upstream allowed it.
- Init-workspace instructions now treat `rosetta@rosetta` as the MCP connector path rather than plugin mode, while any other plugin type is handled as plugin mode.
- Workflow maintenance included:
  - Bun runtime override for Claude workflows
  - build/publish pipeline repairs
  - rosetta-mcp publish gating that waits for the matching `ims-mcp` version to appear on PyPI before upload
  - native Git pre-commit hook shim with a shared Python entrypoint under `scripts/`
  - generated `plugins/core-claude`, `plugins/core-cursor`, `plugins/core-copilot`, and `plugins/core-codex` trees sourced from `instructions/r2/core`
  - plugin-specific packaging transforms for model metadata, generated indexes, and local marketplace/manifests
  - Jira loader recovery after upstream API changes
  - shared type-validation entrypoint
- Some GitHub Pages actions remain upstream-limited and may still depend on older Node runtimes until upstream changes.

### Documentation and Public Surface

- Installation, deployment, quickstart, troubleshooting, and README content were aligned with the current transport/auth model.
- Internal/private environment details were replaced with public-safe placeholders where appropriate.
- Public Docker Hub references remain intentionally visible because they are part of the OSS distribution surface.

## Known Constraints

- Local test execution depends on the correct Python version and optional package dependencies being installed.
- Some flows depend on external systems such as RAGFlow, Redis, OAuth providers, GitHub Actions, or Jira; local code changes cannot fully validate those integrations without environment access.
- HTTP deployments require careful environment configuration for callback URLs, token storage, TLS, and origin policy.
- Legacy compatibility paths exist for older clients, but the preferred path is the current Rosetta HTTP/modern MCP setup.
- Temporary research utilities under `agents/TEMP/` are not part of the stable product surface unless promoted elsewhere.

## Validation Status

- The repository has focused unit and regression coverage across MCP tools, config parsing, auth flows, analytics wrappers, and CLI behaviors.
- Validation scripts and targeted pytest runs are used regularly, but passing them depends on local environment readiness.
- Integration verification exists for MCP behavior, including live or semi-live harnesses, but external services remain the main source of non-code failures.

## Maintenance Rules For This File

- Keep this file under roughly 150 lines.
- Prefer stable summaries over date-stamped status bullets.
- Do not add per-day implementation logs here.
- Do not duplicate information already captured in architecture docs, READMEs, or git history.
- If a new capability materially changes Rosetta, update the relevant section above instead of appending a diary entry.
