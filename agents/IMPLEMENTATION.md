# Rosetta Implementation Summary

This file is a durable summary of the current implementation state.
It is intentionally concise and should not be used as a chronological work log.

For detailed change history, use git history and PRs instead of expanding this file.

## Current State

- Rosetta is an OSS instruction platform with:
  - a Python MCP server in `src/ims-mcp-server/`
  - a Python CLI in `src/rosetta-cli/`
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
- MCP dataset lookup caches dataset objects as well as name/id mappings, avoiding repeated dataset-open calls during instruction/resource/project tool execution.
- Analytics repository detection caches MCP roots per HTTP session and uses a fixed singleton cache key for STDIO/local transports.

### MCP Server — HTTP Observability + RC1 Hang Fix (ims-mcp-http-observability)

- **RC1 fix (A3/A4):** All sync RAGFlow calls that previously blocked the asyncio event loop are now offloaded via `asyncio.to_thread` + `asyncio.wait_for` using the new `offload()` helper in `tracing.py`. Leaf sites: `list_docs_with_keyword_fallback`, `ragflow.retrieve` in `tools/instructions.py`; `doc_cache.get_all_docs_async` in `clients/doc_cache.py` (used by `list_instructions` and `read_instruction_resource`). Cache reads/writes remain on the event-loop thread (SPECS A-1).
- **RAGFlow timeout injection (A2/DD-3):** `_traced_http_method` in `tracing.py` now calls `kwargs.setdefault("timeout", _get_ragflow_http_timeout())` before every RAGFlow HTTP call, defaulting to 60s.
- **Redis socket timeouts (A5/DD-4):** `_build_redis_store` in `server.py` appends `socket_timeout`, `socket_connect_timeout`, and `health_check_interval` query params to the Redis URL when not already present.
- **OAuth/OIDC timeouts (A6):** `IntrospectionTokenVerifier` and `OIDCProxy` in `auth/oauth.py` now receive `timeout_seconds=config.oauth_http_timeout` (default 10s).
- **Exception cause chain (A7):** `_retry_once` raises `RuntimeError(...) from last_exc` so `__cause__` is preserved.
- **In-flight watchdog (A8/REQ-OBS-6):** OS-thread daemon (`threading.Thread`) started in `main()` before `asyncio.run`; reads `_INFLIGHT_REGISTRY` under a `threading.Lock`; WARN-logs slow requests and calls `faulthandler.dump_traceback()` on stuck entries.
- **9 env knobs (A1):** Added `ENV_*` + `DEFAULT_*` constants to `constants.py` and dataclass fields + `os.getenv` parsing to `config.py` for all 9 observability/timeout knobs.
- **RequestLoggingMiddleware repositioned (B1/DD-5):** Now wraps the return value of `mcp.http_app(...)` as the outermost ASGI layer, so auth-rejected requests are also logged.
- **Response-started flag ordering fixed (B2):** Flag set AFTER `await send(message)` succeeds, not before.
- **Response completion + disconnect logging (B3):** `http.response.body` with `more_body=False` logs completion; `_wrapped_receive` detects `http.disconnect`/`websocket.disconnect` and logs disconnect.
- **SSE chunk tracing (B4/REQ-OBS-5):** `_send` wrapper logs one compact INFO per SSE chunk (seq+bytes); payload only under DEBUG.
- **Error logging (C1):** Added `logger.error`/`logger.exception` at all `return "Error: ..."` sites in `tools/instructions.py` and `tools/resources.py`.
- **exc_info in tracing (C3):** `traced_execution` and `_traced_http_method` failures now log with `exc_info=True`.
- **Transport loggers wired (C4):** `mcp.server.streamable_http` and `mcp.server.streamable_http_manager` loggers attached to the ims-mcp handler at startup.
- **Origin-block log (C5/REQ-OBS-7):** `OriginValidationMiddleware` now WARN-logs rejected origins with origin/path/client.
- **`/healthz` endpoint (D1-D3):** Registered via `@mcp.custom_route("/healthz", methods=["GET"])`; genuinely unauthenticated (no `RequireAuthMiddleware`); probes RAGFlow off-loop via `asyncio.to_thread` + `asyncio.wait_for(timeout=healthz_ragflow_timeout)`; result cached for `healthz_cache_ttl`; returns 200/503/disabled JSON per spec §4.2.
- **Dockerfile (E0/E1):** Added `ENV PYTHONFAULTHANDLER=1` and `HEALTHCHECK` using Python stdlib urllib.
- **Pre-existing type errors fixed:** `_install_process_exception_logging` `exc_info` tuples typed correctly with `types.TracebackType | None`.

#### Phase 6b — Defect Fix: RAGFlow Timeout Layer Correction

- **A2 fix (timeout layer):** Removed `kwargs.setdefault("timeout", ...)` from `_traced_http_method` in `tracing.py` — the RAGFlow SDK methods (`get`, `post`, `put`, `delete`, `patch`) do NOT accept a `timeout` kwarg (confirmed: `ragflow_sdk/ragflow.py:36-52`), so forwarding it raised `TypeError` and broke every tool. Replaced with a one-time `requests.sessions.Session.request` patch in `_install_requests_timeout_patch()`, called inside `instrument_ragflow_client`. This injects `timeout=<RAGFLOW_HTTP_TIMEOUT>` via `setdefault` at the actual transport chokepoint — the single method all `requests.*` module-level functions route through. Blast radius is intentional: all requests-based calls in the process (RAGFlow SDK + PostHog) now get a finite default timeout when no explicit one is passed; explicit callers are unaffected (setdefault semantics). The guard `_requests_session_patched` ensures idempotency.

#### Phase 6b — Review Fixes

- **F2 (RC1 leaf fix):** `_build_workflows_listing` in `tools/instructions.py` converted from sync to `async def`; now calls `await doc_cache.get_all_docs_async(...)` instead of the blocking `get_all_docs()`. Caller `get_context_instructions` updated to `await` it. No remaining sync RAGFlow call on the event loop for `get_context_instructions` path.
- **F4 (latent NFR-1):** `document_client.list_docs(...)` inside the topic/semantic expansion loop (`tools/instructions.py`) is now offloaded via `await offload(...)`. Dormant today (`topic=None` in all callers), but safe for future enablement.
- **F5 (watchdog noise):** Watchdog in `server.py` tracks an `already_dumped` set per `trace_id`; `faulthandler.dump_traceback()` fires once per stuck request, not every tick. Set is pruned when requests unregister.
- **F10 (/healthz info leak):** Exception `detail` in `/healthz` 503 body replaced with generic string `"error"`; full `exc` (which may contain internal RAGFlow URL) now logged at WARNING via `_logger` before returning the response.
- **F11 (GitHub OAuth timeout):** `GitHubProvider.__init__` accepts `timeout_seconds` (confirmed in installed source). Now passes `timeout_seconds=config.oauth_http_timeout` in `auth/oauth.py`, consistent with OIDCProxy and IntrospectionTokenVerifier.

### Authorization and Security

- Dataset access is policy-driven, with separate read/write behavior for project datasets.
- OAuth configuration supports both generic OAuth token introspection and OIDC discovery-based validation.
- Token/session handling includes encryption hooks, TTL controls, and negative-cache behavior for introspection.
- Public documentation and examples were scrubbed to remove internal infrastructure details while retaining public OSS references.

### CLI and Publishing

- The CLI was migrated to the RAGFlow-backed model and later refactored into a command-pattern architecture.
- Publishing supports change detection, dry-run flows, and dataset-scoped cleanup behavior.
- Publishing reuses in-process dataset lookups during a CLI run and clears that cache after dataset create/delete operations.
- Auth checks were tightened so API-backed commands fail earlier and more predictably.
- A dedicated `version` command was added so package version inspection does not require config loading or auth.
- Package metadata and publish flows were repaired to keep CI/CD and PyPI publishing functional.

### Workspace Initialization

- Rosetta workspace initialized (upgrade mode, 512 files): proxy shells generated for 17 skills, 7 agents, and 12 workflow commands under `.claude/`.
- `gain.json` created defining SDLC setup and Rosetta file locations.
- Workspace docs created: `TECHSTACK.md`, `CODEMAP.md`, `DEPENDENCIES.md`, `ASSUMPTIONS.md`.

### Hooks — IDE Input Normalization

- Added `src/hooks/src/adapter.ts`: normalizes IDE stdin to Claude Code canonical format. Exports `detectIDE`, `normalize`, `formatOutput`, `readStdin`. Per-IDE adapters in `src/hooks/src/adapters/`.
- Added `src/hooks/src/loose-files.ts`: PostToolUse hook that nudges AI when `.py`/`.js` files lack a module marker (`__init__.py`/`package.json`). Exports `shouldCheck`, `isLooseFile`, `buildNudgeOutput` with injected `fs` for testability.
- TDD: both modules have full test coverage in `src/hooks/tests/*.test.ts` using `node:test` (zero deps). TypeScript compiled to `src/hooks/dist/bundles/<plugin>/`; `src/hooks/dist/shell/` holds generic shell assets.
- Bootstrap via `hooks.json.tmpl` templates only — `rosetta-bootstrap.sh` eliminated from all plugins. All 4 plugin templates carry `PostToolUse` blocks referencing `loose-files.js` at IDE-correct paths.
- `PluginSyncSpec.runtime_asset_subdirs` field added for generic asset mirroring; Copilot uses it to mirror hook assets to plugin root (replacing hardcoded filename logic).
- `src/hooks/dist/bundles/` is generated-only and untracked from git. `src/hooks/.gitignore` merged into root `.gitignore` with scoped `src/hooks/` prefixes.
- Dedup guard in `loose-files.ts` gated on `ide === 'copilot'` — GitHub Copilot CLI fires PostToolUse twice per call; all other IDEs receive every nudge.
- Build integrated into `scripts/pre_commit.py` via `build_hooks()` check before plugin sync.
- Codex `md-file-advisory.js` hook installed in workspace `.codex/hooks.json` and wired into the `core-codex` hook template/generated configs.

### Hooks — lint-format-advisory PostToolUse Hook

- Added `src/hooks/src/hooks/lint-format-advisory.ts`: PostToolUse advisory that emits `[Rosetta Advisory]` text nudging the agent to plan a syntax/type/lint/format check step after editing a code file.
- Monitored extensions: `.html`, `.css`, `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.cs`, `.ps1`, `.cmd`, `.java`, `.go`, `.rs`, `.md`.
- Throttle: 5-second tmp-file lock keyed by `(session, filePath)`; Copilot platform double-fire absorbed by the same key. Session-long TTL deferred.
- No `plan_manager` coupling (deferred to a follow-up PR alongside actual linter execution).
- Registered in all four plugins via `hooks.json.tmpl` (workspace) and the GitHub Marketplace tmpl for Copilot; generated `hooks.json` checked into each plugin tree. vitest suite (43 tests).

### rosettify (npm package)

- Local CLI/MCP tool runner for Rosetta. Published on npm as `rosettify` (`src/rosettify/`).
- Dual-frontend: same run delegates behind both `npx rosettify <cmd>` CLI and `rosettify --mcp` stdio server.
- Current commands: `plan` (create, next, update_status, show_status, query, upsert, create-with-template, upsert-with-template, list-templates), `help`.
- **Atomic write cycle (FR-PLAN-0024)**: every plan mutation uses a rename-as-guard write cycle — rename plan to `<file>.bakNNN` (backup chain, up to 5 retained), then write new content. `previous_version` field on the plan JSON tracks the prior backup path. Bounded to 50 retries; `backup_create_failed` on exhaustion.
- **Template registry (FR-PLAN-0033)**: two compiled-in template kinds (`create`, `upsert`) with strict bidirectional placeholder matching. Seed templates: `for-orchestrator` (create) and `for-subagent` (upsert). New subcommands `create-with-template`, `upsert-with-template`, `list-templates`.
- **phase-steps injection (FR-PLAN-0043)**: `create-with-template` and `upsert-with-template` take a last positional `phase-steps` — a JSON string parsed (`parsePhaseSteps` in `templates/render.ts`) to an array of step objects appended verbatim (IDs unchanged) to the seeded steps after placeholder substitution, so one call emits a full phase (prep steps + caller steps). Empty `[]` valid; bad JSON / non-array → `invalid_phase_steps`; per-step + uniqueness validation stays downstream in create/upsert. Not a placeholder (separate from FR-PLAN-0034). Templates carry no injection marker. Backward compatibility: phase-steps is recommended/required in usage and help, but an **omitted** value is treated as `[]` (defaulted at the command boundary, CLI positional optional) rather than rejected — same recommend-in-guidance / recover-in-implementation pattern as the hidden `--limit` alias.
- **PlanWriteResult output (FR-PLAN-0040)**: all write subcommands return the single shared `PlanWriteResult` = `{ plan: {name, status, previous_version}, phases[{steps}] }`. `previous_version` (backup path captured at the write, or null on first create) lives inside the plan summary so the backup link is self-discoverable in every write output; the plan document remains the recovery chain. Nested shapes are named/reused types (PlanSummary, PlanPhaseSummary, PlanStepSummary). CLI output is dense JSON (no indent, FR-SHRD-0008).
- **`next` is `PlanNextResult` (FR-PLAN-0011)**: `{ parent?, next[], count, plan_status, Overall{Open,InProgress,Blocked,Failed,Complete}Count }`. Array = in_progress→open→blocked→failed truncated to limit (default **3**); steps carry `status` (no per-step flags); `parent` only with `--target` (phase scalar fields, no steps); counts scoped to filter else whole plan. Blocked/failed retrieved via `show_status`→`query`→`update_status`.
- **No internal-traceability leakage (FR-ARCH-0016)**: emitted output (results, errors, help, schema descriptions, notes) carries no requirement IDs / internal paths / dataset prefixes; IDs kept in code comments only. Help `schemas` keyed by exported type name (FR-HELP-0002/FR-PLAN-0041); help `notes` carry construction-flow + phase-scoped + recovery guidance (FR-PLAN-0042).
- Envelope is internal: frontends extract payload via `extractOutput` and log failures via `logFailure` before output — consumers never see the raw envelope wrapper.
- Follow-up help-clarity backlog (P1–P10) captured in `plans/rosettify/plan-help-improvements-proposal.md`.
- Validated with `npm run typecheck` and `npm run test` (vitest, 90%+ line + branch coverage).

### Instructions and Skills

- Added `plan-manager` skill under `instructions/r2/core/skills/plan-manager/` — primary plan manager for coding agents via local JSON files.
- Skill assets: `plan_manager.js` (CLI, no npm deps), `pm-schema.md` (data structure reference), `plan_manager.test.js` (60 unit tests).
- Key behaviors: resume-safe `next` command returns `in_progress` steps with `resume: true` before `open` steps; plans stored at `plans/<name>/plan.json`; self-describing `help` command.
- Converted `adhoc-flow-with-plan-manager` workflow to `USE SKILL plan-manager`; data structure externalized to `pm-schema.md`.
- All plugins (`core-claude`, `core-cursor`, `core-copilot`, `core-codex`, `core-cursor-standalone`, `core-copilot-standalone`) are auto-synced from core by `npx rosettify-plugins@latest` (invoked via `scripts/pre_commit.py`).
- `npx rosettify-plugins@latest` materializes plugin trees from the **release-selected** source `instructions/<release>/core` (`--release`, default **r2**; r3 opt-in). `instructions/r2/core` and `instructions/r3/core` are maintained per release (shared skills/workflows kept aligned where intended).
- **r3 bootstrap-reduction** (in progress; see `docs/stories/reduce-bootstrap.md`) — shrinking the always-on bootstrap by moving content behind a user-invoked `/rosetta` and on-demand skills. Built `load-project-context` (absorbs `load-context`; `hitl` prereq, full file roster, todo-task ledger, leaf with no next-steps); registered in `docs/definitions/skills.md`. Originals removed only after replacements are approved and working.

### Plugin Generator

- **Reference rewriter root-cause fix (2026-06-16)** — `rewritePathToken` in `plugin-rewrite-references.ts` extended with a vendor-prefix lookbehind `(?<!\.[A-Za-z][A-Za-z0-9_-]*/)` to block rewriting IDE-native dot-directory paths (`.windsurf/workflows/`, `.cursor/rules/`, `.github/workflows/`) while correctly rewriting bare plugin-internal references (`workflows/coding-flow.md`). Verbatim flag retained as belt-and-suspenders. FR-ARCH-0049 updated. 424 tests pass.
- **Fix batch — model maps, correctness, code quality (2026-06-11/16)** — Series of fixes to the TypeScript plugin-generator following post-Task-C audits. Model maps: `CURSOR_CLAUDE_MAP`/`COPILOT_CLAUDE_MAP` opus entries corrected from 4.6 to 4.8 (matched Python generator after commit cfdd610); opus-4-7 upgrade entries added; `CURSOR_GPT_MAP`/`COPILOT_GPT_MAP` rewritten as exhaustive tables (5.3+ models × 4 effort variants, inline effort-stripping removed); `CURSOR_GEMINI_MAP`/`COPILOT_GEMINI_MAP` added; `gpt-4.5` and older removed as out-of-scope; `gemini-3.5-flash` passthrough added. Codex: `normalizeCodex` no-effort default `'medium'` removed — bare GPT token now emits `model: <id>` only, no `model_reasoning_effort` line (matches Python). Correctness: binary+multi-source now fails with a hard `GenError` in `file-read.ts` and `file-bundle.ts` (FR-ARCH-0034/0042). Configure verbatim: `verbatim` flag added to `SpecEntry`/`FileProcessingFrame`; `makeConfigureEntry` sets it; `pluginRewriteReferences` skips verbatim frames — fixes over-match rewriting `.windsurf/workflows/` to `.windsurf/commands/` inside configure guides. Target conflict detection: `pluginProcessSpecEntries` now fails hard when two SpecEntries produce frames with the same output path, naming both sources (FR-ARCH-0056 added). Smells: `generate.ts` seed keys, `cli.ts` help text, fixture templates, stale map comment all cleaned. 424 tests pass; tsc clean.
- **Task C — Clean Architecture: identity-switch elimination (2026-06-11)** — Eliminated all 5 identity-switch violations (FR-ARCH-0005). (1) Deleted `ModelVocabulary.kind` and `PluginSpec.hookEntryShape` from `types.ts` and all 6 specs. (2) Split `fileNormalizeModels` into 4 per-vocabulary processors + 4 shared helpers (FR-ARCH-0046). (3) Replaced `pluginAssembleBootstrap` with callback-driven `assembleBootstrapPayload` + 4 per-IDE assemblers writing `bootstrap_hooks` (FR-VAR-0070, FR-ARCH-0055). (4) Added cursor bootstrap via `buildCursorBootstrapEntry`/`buildCursorHookPayloadJson`/`CURSOR_PLUGIN_ROOT_ENTRY` (FR-HOOK-0007). (5) Renamed 3 `.tmpl` placeholder keys `bootstrap_hooks_<ide>` → `bootstrap_hooks`. Spec: `plans/plugin-generator/CLEAN-ARCHITECTURE-SPECS.md`.
- **Compliance cleanup (2026-06-10)** — Deleted two dead/forbidden `PluginSpec` fields: `includeBootstrapRules` (FR-HOOK-0004; never read by any processor) and `createHookFolderInR2` (DATA-CFG-0002/FR-ARCH-0004; bespoke per-release+per-target flag). Removed from `src/types.ts`, all 6 spec definitions in `src/spec/targets.ts`, and the `if (spec.createHookFolderInR2)` branch in `src/plugin-processors/plugin-sync-bundles.ts`. Test updated: "r2 does not create hook folder" replaces the old "creates when true/no-op when false" tests. Net: 303 tests pass; tsc clean; r2 exit 1 (1 NFR-0004); r3 exit 1 (5 NFR-0004). Note: baseline (agents/TEMP/old-gen-r2|r3) was generated at v2.0.42; current instructions are v2.0.44 — 67/66 pre-existing content diffs, all from instruction updates; single new diff = expected absent `core-cursor-standalone/.cursor/hooks` empty dir (accepted). Task C (IDE-name switch dispatch, FR-ARCH-0005) completed 2026-06-11 (see entry above).
- **TypeScript/npx re-implementation (2026-06-05, `src/rosettify-plugins/`)** — Implements `docs/requirements/plugin-generator/*` to byte-for-byte parity with the Python generator for r2 and r3 (domain `core`). FR-ARCH two-tier pure-processor pipeline: immutable flat VFS (deep-frozen) → `FileProcessor`s over `FileProcessingFrame` (`fileRead`/`fileApplyOverrides`(incl. `~overwrite~` directive)/`fileBundle`/`fileNormalizeModels`/`fileRename` path-only/`fileCodexAgentFormat`) → `PluginProcessor`s over `PluginProcessingFrame` (`pluginCleanup`/`pluginCopy` seed from `src/rosettify-plugins/plugins/<target>/`/`pluginProcessSpecEntries`/`pluginRewriteReferences` content-only via frame lookup, boundary-anchored/`pluginGenerateIndexes`/`pluginInjectSections`/`pluginAssembleBootstrap`/`pluginRenderTemplates`/`pluginMirrorFiles` data-driven mirrors/`pluginSyncBundles`/`pluginWrite`). Structural sharing via `immer`. Six targets, one `PluginSpec` shape, all values in `spec/*.ts` (no per-release/per-target control-flow branching, NFR-0006). Deps: commander@14, pino@10, handlebars@4, gray-matter@4, immer@10, fast-glob@3, micromatch (NFR-0010). Bootstrap payload (the only generated hook content; wrappers are preserved `.tmpl`) = per-IDE entries (claude `once`/codex `statusMessage`+`timeout`/copilot bash+powershell per-entry lock) + a SEPARATE appended plugin-root entry → 9 (r2)/8 (r3); cursor emits none. Excludes `rules/bootstrap.md`, `rules/local-files-mode.md`, `templates/shell-schemas/**`. Tests: 301 vitest (unit + e2e sample core/acme bundling/overwrite/exclusions + parity-e2e vs `agents/TEMP/old-gen-r{2,3}`), coverage 94.8% stmt/86.3% branch/100% func/97.7% lines. Parity oracle: empty `diff -rq` (r2=880, r3=946 files; shell-schemas excluded). Requirements enriched to baseline ground truth in `plans/plugin-generator/GROUND-TRUTH.md` + CHANGES.md (FR-COPY-0020/0021 claude model scan, FR-VAR-0030/0031 copilot 3×hooks, FR-HOOK-0005/0007 entry shapes + plugin-root, FR-COPY-0011 shell-schemas exclude — all `Draft`, pending owner review). Old Python generator (`scripts/plugin_generator.py`) and its tests (`scripts/tests/test_plugin_generator.py`) removed; `npx rosettify-plugins@latest` is now the canonical generator.
- **Package rename + npm publish surface (2026-06-19)** — The package now publishes as `rosettify-plugins` from `src/rosettify-plugins/`, emits compiled `dist/` artifacts, ships a package README, exposes the `rosettify-plugins` bin, and has a dedicated GitHub Actions workflow at `.github/workflows/publish-rosettify-plugins.yml` modeled on the existing `rosettify` publish pipeline.
- **Reverse-engineered requirements & rewrite spec (2026-06-04)** — `docs/REQUIREMENTS/plugin-generator/` (INDEX, SCOPE, GLOSSARY, MODEL, FR-ARCH, FR-CLI, FR-COPY, FR-GEN, FR-HOOK, FR-PLUGINS, STRUCTURES, NFR, REFERENCES, ASSUMPTIONS; 101 units, all `Draft`/`NotStarted`) plus grounded analysis at `docs/plugin-generator/analysis.md`. Captured the behavior of the old Python generator as a target spec for the TypeScript/npx re-implementation (`npx rosettify-plugins@latest`); added `--domain` (multi-value bundling), uniform from-source generation of all six targets, processor-pipeline architecture, per-target bootstrap-delivery strategy, and authoritative per-IDE guide references (`instructions/r3/core/configure/`).
- **Model normalization** — selects the first model from the frontmatter `model:` comma-separated list. Cursor normalizes to short IDs (e.g. `claude-sonnet-4-6`, `gpt-5.4`); Copilot to display names (e.g. `Claude Sonnet 4.6`, `GPT-5.4`); Claude Code to full model IDs (`claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`). `configure/claude-code.md` documentation in r2/r3 uses full model IDs throughout.
- **Folder/file rename (precise path replacement)** — content rewriting uses exact path replacement (`workflows/coding-flow.md` → `commands/coding-flow.md` / `prompts/coding-flow.prompt.md`) with dot-directory vendor-prefix lookbehind to avoid touching IDE-native paths (`.windsurf/workflows/`, `.cursor/rules/`). Cursor renames `workflows/` → `commands/`; Copilot renames `workflows/` → `prompts/` and files `*.md` → `*.prompt.md`. Index title normalized to `# Rosetta Workflows Index` regardless of physical folder name.
- **Workflow index filtering** — only files with `tags: ["workflow"]` appear in workflow/commands/prompts indexes; phase files are excluded.
- **Standalone plugins** — second-pass generation produces `core-cursor-standalone` and `core-copilot-standalone` from their main plugins. Each standalone is fully wiped and recreated per sync. Copilot standalone moves bootstrap rules to `instructions/*.instructions.md`, renames `commands/` → `prompts/`, rewrites cross-references, strips marketplace-only files. Cursor standalone injects the commands index into `rules/plugin-files-mode.mdc`.
- **Hook bundle sync into plugins** — bundles from `src/hooks/dist/bundles/<plugin>` are synced into each plugin's hooks directory (`hooks/`, `.cursor/hooks/`, `.codex/hooks/`). Skipped for r2 (non-deterministic hooks); active for r3. Stale `.js` files in r2 hook dirs are removed on sync.
- **Release selection + conditional templating** — `--release` selects `instructions/<release>/core` (default `r2`); `--output` redirects output (default `<source>/plugins`); `--source` sets repo root (default: current directory). `.tmpl` files are Handlebars templates: bootstrap JSON injected via triple-stache `{{{bootstrap_hooks}}}`; r3-only advisory hook blocks wrapped in `{{#if deterministic_hooks}}`. `pre_commit.py` invokes it with no args (→ r2, output defaults to `<repo-root>/plugins`).
- **Release-aware hook tests** — `hooks-registered.test.ts` and `claude-plugin-root.test.ts` read each plugin's `plugin.json` major version and enforce advisory-hook references only when major ≥ 3 (r3+); r2 (version 2.x) self-skips, not disabled.

### Workflows and Automation

- GitHub Actions were updated to remove most deprecated Node 20-era dependencies and align with newer action runtimes where upstream allowed it.
- `repo-triage` and `validate-prompts` use `pull_request_target` for PR automation so workflow definitions come from the base branch (`main`). Both explicitly check out candidate PR content under `pr/` when PR files must be inspected.
- `repo-triage` has an explicit instruction-quality path for `instructions/r*/**` and instruction-related issues/comments: use `orchestrator-contract`, dispatch a `coding-agents-prompt-authoring` subagent, and load Rosetta intro/patterns/hardening/schemas references.
- Init-workspace instructions now treat `rosetta@rosetta` as the MCP connector path rather than plugin mode, while any other plugin type is handled as plugin mode.
- Workflow maintenance included:
  - Bun runtime override for Claude workflows
  - build/publish pipeline repairs
  - rosetta-mcp publish gating that waits for the matching `ims-mcp` version to appear on PyPI before upload
  - native Git pre-commit hook shim with a shared Python entrypoint under `scripts/`
  - generated plugin trees sourced from `instructions/r2/core` for all six plugin variants
  - plugin-specific packaging transforms for model metadata, generated indexes, and local marketplace/manifests
  - bootstrap hooks inlined at build time via `hooks.json.tmpl` templates and generic `process_templates` engine; runtime shell scripts eliminated; 4 platform-specific placeholder formats (Claude, Codex, Cursor, Copilot) generated once per build
  - Jira loader recovery after upstream API changes
  - shared type-validation entrypoint
- Some GitHub Pages actions remain upstream-limited and may still depend on older Node runtimes until upstream changes.

### Hooks — dangerous-actions PreToolUse Hook (F13: two-tier retry pattern)

> F12 superseded. The original single-gate HITL model is replaced by the two-tier retry pattern below.

- `PreToolUse` hook covers `Bash`, `Write`, `Edit`, `MultiEdit`, `mcp-call` across all five IDE bundles (Claude Code, Cursor, Copilot, Codex, Windsurf).
- **Two-tier policy**: every `DangerPattern` carries `reason` and `policy` fields:
  - `reconsider` — deny on first call; AI may append `# Rosetta-AI-reviewed` and retry after reconsidering blast radius.
  - `hard-deny` — permanently blocked; `# Rosetta-AI-reviewed` has no effect; human review required.
- **Marker token**: renamed to `# Rosetta-AI-reviewed`. Strict regex `(?:^|\s)#\s+Rosetta-AI-reviewed\b`. Legacy `# Rosetta-reviewed` rejected.
- **Single traversal**: `detectDanger(ctx)` replaces the previous parallel `evalPatternRaw` + `findMatchedPattern`, eliminating potential hard-deny bypass via divergence.
- **Stateless**: `cooldown-store.ts` and `audit-log.ts` deleted; safe across worktrees, CI runners, and parallel sessions.
- **`curl | sh` reclassified to `hard-deny`**: supply-chain execution is treated as catastrophic, not self-approvable.
- **Windsurf adapter**: `permissionDecisionReason` surfaced as `additionalContext` so agents receive actionable feedback.
- **SKILL.md alignment**: `dangerous-actions/SKILL.md` documents two-tier model and correct token; `hitl/SKILL.md` removes the now-incorrect AI-marker prohibition.
- 461 hooks tests pass (7 new coverage additions: Edit/MultiEdit dangerous path, partial Write, reconsider+marker retry, MCP query field, curl|sh hard-deny).

### Website — Right-side In-document TOC

Added sticky right-side table of contents to all doc pages (`layout: docs`). Extracts H2/H3 headers from page content, builds anchor links, highlights active section via `IntersectionObserver`. At ≥1280px: sticky column. At 769–1280px: fixed overlay, `opacity: 0.25` default → `0.9` on hover (`0.5s` transition). At ≤768px: hidden. Panel suppressed when <2 headings. Files changed: `docs/web/_layouts/docs.html`, `docs/web/assets/styles.css`.

### Documentation and Public Surface

- Installation, deployment, quickstart, troubleshooting, and README content were aligned with the current transport/auth model.
- The website introduction page now includes a dedicated `Tech Demo` section using the separate website demo video, while preserving the original intro video in `What is Rosetta`.
- Usage guides describe workflow phases, expected subagents/artifacts, HITL gates, and user responsibilities for the unified Rosetta workflow set.
- Docs pages rendered via the Jekyll site now convert fenced Mermaid blocks client-side in the docs layout, preserve authoring as plain ````mermaid` fences, rerender on theme changes, and scale rendered SVGs for better readability on GitHub Pages direct loads.
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
