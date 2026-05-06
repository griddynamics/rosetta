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
- PostHog analytics parity restored in `ims_mcp/analytics/tracker.py`: added `$referring_domain`, `$screen_name`, `$title`, `error_type`/`error_message` on soft errors, `$pageview` and `$web_vitals` events, `error_status_code` on HTTP exceptions, `$browser`/`$browser_version` in exception context, `on_error` logging on Posthog constructor, inner try/except isolating analytics failures from tool results; all exception sites use `logger.warning`. Fixed `feedback.py` `distinct_id` to `call_ctx.username` (was composite `username@repository`). 18 new test cases added covering all acceptance criteria including boundary conditions.
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

### Workspace Initialization

- Rosetta workspace initialized (upgrade mode, 512 files): proxy shells generated for 17 skills, 7 agents, and 12 workflow commands under `.claude/`.
- `gain.json` created defining SDLC setup and Rosetta file locations.
- Workspace docs created: `TECHSTACK.md`, `CODEMAP.md`, `DEPENDENCIES.md`, `ASSUMPTIONS.md`.

### Hooks — IDE Input Normalization

- Added `hooks/src/adapter.ts`: normalizes IDE stdin to Claude Code canonical format. Exports `detectIDE`, `normalize`, `formatOutput`, `readStdin`. Per-IDE adapters in `hooks/src/adapters/`.
- Added `hooks/src/loose-files.ts`: PostToolUse hook that nudges AI when `.py`/`.js` files lack a module marker (`__init__.py`/`package.json`). Exports `shouldCheck`, `isLooseFile`, `buildNudgeOutput` with injected `fs` for testability.
- TDD: both modules have full test coverage in `hooks/tests/*.test.ts` using `node:test` (zero deps). TypeScript compiled to `hooks/dist/bundles/<plugin>/`; `hooks/dist/shell/` holds generic shell assets.
- Bootstrap via `hooks.json.tmpl` templates only — `rosetta-bootstrap.sh` eliminated from all plugins. All 4 plugin templates carry `PostToolUse` blocks referencing `loose-files.js` at IDE-correct paths.
- `PluginSyncSpec.runtime_asset_subdirs` field added for generic asset mirroring; Copilot uses it to mirror hook assets to plugin root (replacing hardcoded filename logic).
- `hooks/dist/bundles/` is generated-only and untracked from git. `hooks/.gitignore` merged into root `.gitignore` with scoped `hooks/` prefixes.
- Dedup guard in `loose-files.ts` gated on `ide === 'copilot'` — GitHub Copilot CLI fires PostToolUse twice per call; all other IDEs receive every nudge.
- Build integrated into `scripts/pre_commit.py` via `build_hooks()` check before plugin sync.
- Codex `md-file-advisory.js` hook installed in workspace `.codex/hooks.json` and wired into the `core-codex` hook template/generated configs.

### Hooks — lint-format-advisory PostToolUse Hook

- Added `hooks/src/hooks/lint-format-advisory.ts`: PostToolUse advisory that emits `[Rosetta Advisory]` text nudging the agent to plan a syntax/type/lint/format check step after editing a code file.
- Monitored extensions: `.html`, `.css`, `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.cs`, `.ps1`, `.cmd`, `.java`, `.go`, `.rs`, `.md`.
- Throttle: 5-second tmp-file lock keyed by `(session, filePath)`; Copilot platform double-fire absorbed by the same key. Session-long TTL deferred.
- No `plan_manager` coupling (deferred to a follow-up PR alongside actual linter execution).
- Registered in all four plugins via `hooks.json.tmpl` (workspace) and the GitHub Marketplace tmpl for Copilot; generated `hooks.json` checked into each plugin tree. vitest suite (43 tests).

### rosettify (npm package)

- Local CLI/MCP tool runner for Rosetta. Published on npm as `rosettify` (`rosettify/`).
- Dual-frontend: same run delegates behind both `npx rosettify <cmd>` CLI and `rosettify --mcp` stdio server.
- Current commands: `plan` (create, next, update_status, show_status, query, upsert), `help`.
- Envelope is internal: frontends extract payload via `extractOutput` and log failures via `logFailure` before output — consumers never see the raw envelope wrapper.
- Validated with `npm run typecheck` and `npm run test` (vitest, 90%+ line + branch coverage).

### Instructions and Skills

- Added `plan-manager` skill under `instructions/r2/core/skills/plan-manager/` — primary plan manager for coding agents via local JSON files.
- Skill assets: `plan_manager.js` (CLI, no npm deps), `pm-schema.md` (data structure reference), `plan_manager.test.js` (60 unit tests).
- Key behaviors: resume-safe `next` command returns `in_progress` steps with `resume: true` before `open` steps; plans stored at `plans/<name>/plan.json`; self-describing `help` command.
- Converted `adhoc-flow-with-plan-manager` workflow to `USE SKILL plan-manager`; data structure externalized to `pm-schema.md`.
- Plugins (`core-claude`, `core-cursor`, `core-copilot`, `core-codex`) are auto-synced from core by `scripts/plugin_generator.py`.
- `instructions/r3/core` is kept aligned with the current `instructions/r2/core` instruction set.

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
  - bootstrap hooks inlined at build time via `hooks.json.tmpl` templates and generic `process_templates` engine; runtime shell scripts eliminated; 4 platform-specific placeholder formats (Claude, Codex, Cursor, Copilot) generated once per build
  - Jira loader recovery after upstream API changes
  - shared type-validation entrypoint
- Some GitHub Pages actions remain upstream-limited and may still depend on older Node runtimes until upstream changes.

### Hooks — dangerous-actions PreToolUse Hook

- Added first `PreToolUse` hook: `hooks/src/hooks/dangerous-actions.ts` — blocks `Bash`, `Write`, `Edit`, `MultiEdit` on a hardcoded catalogue of dangerous patterns.
- Three-file split: `dangerous-actions-patterns.ts` (28 pure-data patterns), `dangerous-actions-evaluate.ts` (pure `evaluateDangerous()` fn, unit-testable), `dangerous-actions.ts` (hook entry).
- Pattern catalogues: 16 Bash patterns (rm-rf, git force-push, DDL, aws s3 rm, curl|sh, etc.), 8 path patterns (.env*, SSH keys, cloud credentials), 4 content patterns (DDL in payload, AWS key ID, PEM).
- Override: `# reviewed` shell comment disarms Bash gate; no inline override for Write/Edit/MultiEdit.
- Registered in `plugins/core-claude/hooks/hooks.json` under `PreToolUse` with matcher `Bash|Write|Edit|MultiEdit`. Other plugins receive bundles but no registration (follow-up PR).
- Regression test updated: `CLAUDE_CODE_ONLY_HOOKS` Set + `isLibraryModule()` suffix filter handles scoped rollout without false failures for copilot/cursor/codex.
- 54 new Vitest tests; all 407 hooks tests pass. PR #79 → `v3`.

### Documentation and Public Surface

- Installation, deployment, quickstart, troubleshooting, and README content were aligned with the current transport/auth model.
- Usage guides describe workflow phases, expected subagents/artifacts, HITL gates, and user responsibilities for both OSS and PRO workflow families.
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
