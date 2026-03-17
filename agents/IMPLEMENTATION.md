# Rosetta - Implementation Status

## ✅ Completed Implementation

### Recent Operations (2026-03-17) — Architecture note for local CLI testing

- Added a short note to `docs/ARCHITECTURE.md` explaining how to test `rosetta-cli` locally without `uv` or `uvx`.
- Documented repo-venv examples using `../venv/bin/python -m rosetta_cli ...` with `--env dev` for non-destructive local verification.
- Added matching short guidance to `DEVELOPER_GUIDE.md` in the CLI local development and CLI testing sections, clarifying the intended two-step workflow: test the checkout first with the repo `venv`, then test the published package with `uvx` after push/merge.

### Recent Operations (2026-03-17) — Rosetta CLI auth precheck ordering

- Moved the explicit `AuthService.verify_or_exit(...)` precheck ahead of dataset resolution in the API-backed commands that can auto-detect datasets:
  - `rosetta-cli/rosetta_cli/commands/list_command.py`
  - `rosetta-cli/rosetta_cli/commands/parse_command.py`
  - `rosetta-cli/rosetta_cli/commands/cleanup_command.py`
- This prevents those commands from touching RAGFlow through dataset auto-detection before the intended auth gate runs.
- Added focused regression tests for command ordering:
  - `rosetta-cli/tests/test_command_auth_order.py`
- Validation completed successfully with the repo virtual environment:
  - `venv/bin/pytest rosetta-cli/tests/test_command_auth_order.py -q`
  - `venv/bin/pytest rosetta-cli/tests -q`

### Recent Operations (2026-03-17) — Rosetta CLI version command

- Added an explicit `rosetta-cli version` subcommand that prints the package version and exits before any `.env` discovery, config validation, client creation, or auth checks.
- Kept the existing version banner for authenticated commands by extracting the shared print logic into a small helper.
- Updated CLI usage examples in `rosetta-cli/README.md` to document the new command.
- Added a focused CLI regression test proving `version` does not load config:
  - `rosetta-cli/tests/test_cli.py`
- Investigated `AuthService` usage in `rosetta-cli` while implementing the command:
  - Keep `AuthService`; it centralizes live API key verification and drives `verify` output.
  - Found one auth ordering issue for future follow-up: `parse`, `list-dataset`, and `cleanup-dataset` can auto-detect datasets before their explicit auth gate when `--dataset` is omitted.
- Validation completed successfully:
  - `uv run --python 3.12 --with pytest python -m pytest rosetta-cli/tests`
  - `uv run --python 3.12 python -m rosetta_cli version`

### Recent Operations (2026-03-16) — Jira story loader workflow recovery

- Investigated failing GitHub Actions run `23168407313` for `.github/workflows/repo-implement.yml`.
- Confirmed the shared `.github/scripts/load_stories.py` step failed before matrix expansion because Jira returned `HTTP 410 Gone` for the deprecated `GET /rest/api/3/search` endpoint.
- Migrated the loader to Atlassian's enhanced JQL search endpoint:
  - `POST /rest/api/3/search/jql?maxResults=50`
- Preserved the existing workflow contract for both shared callers:
  - `plan_matrix`, `impl_matrix`
  - `has_plan`, `has_impl`
  - `plan_count`, `impl_count`
- Refactored the loader into small functions so the Jira request path and label/status filtering can be regression-tested locally.
- Added a focused regression test file:
  - `.github/scripts/test_load_stories.py`
- Local validation completed successfully:
  - `venv/bin/pytest .github/scripts/test_load_stories.py -q`
  - `python3 -m py_compile .github/scripts/load_stories.py .github/scripts/test_load_stories.py`

### Recent Operations (2026-03-16) — Rosetta CLI domain-scoped orphan cleanup

- Scoped `rosetta-cli` orphan cleanup to `managed_domains_by_dataset` during full-folder publishes.
- This prevents `publish ../instructions` from one split repo from deleting published documents owned by a different domain in the same release dataset.
- File updated:
  - `rosetta-cli/rosetta_cli/ims_publisher.py`
  - `rosetta-cli/pyproject.toml`
  - `rosetta-cli/tests/test_publish_domain_scoped_orphan_cleanup.py`
- Validated with live `--dry-run` publishes against production `aia-r2` using temporary split trees:
  - `core`-only publish → orphan detection reported `aia-r2: no orphans`
  - `grid`-only publish → orphan detection reported `aia-r2: no orphans`
- Added publisher-level dry-run tests covering:
  - `core`-only publish ignores stale `grid` docs during orphan cleanup
  - mixed `core` + `grid` publish still reports stale docs from both managed domains
- Validation completed successfully:
  - `venv/bin/pytest rosetta-cli/tests/test_publish_domain_scoped_orphan_cleanup.py -q`
  - `venv/bin/pytest rosetta-cli/tests -q`
- Bumped Rosetta CLI prerelease version:
  - `rosetta-cli` `2.0.0b108` → `2.0.0b109`

### Recent Operations (2026-03-16) — Rosetta CLI publish workflow recovery

- Investigated failing GitHub Actions run `23151464923` for `.github/workflows/publish-rosetta-cli.yml`.
- Confirmed the workflow failed during `pip install -r requirements.txt` because current setuptools validation rejects `project.urls.Support = "mailto:..."` in package metadata.
- Updated package metadata support links to an HTTPS issue tracker URL in:
  - `rosetta-cli/pyproject.toml`
  - `ims-mcp-server/pyproject.toml`
- Bumped Rosetta CLI prerelease version:
  - `rosetta-cli` `2.0.0b107` → `2.0.0b108`
- Revalidated the publish path locally using the repo venv:
  - `venv/bin/pip install -r requirements.txt` → passes
  - `venv/bin/pytest rosetta-cli/tests -v` → 9 passed
  - `../venv/bin/python -m build` from `rosetta-cli/` → passes
  - `../venv/bin/twine check dist/rosetta_cli-2.0.0b108.tar.gz dist/rosetta_cli-2.0.0b108-py3-none-any.whl` → passes

### Recent Operations (2026-03-16) — GitHub Actions Node.js 20 deprecation follow-up

- Applied surgical workflow-only action bumps for remaining repo-owned Node 20-era action majors:
  - `actions/checkout@v4` → `actions/checkout@v5`
  - `astral-sh/setup-uv@v5` → `astral-sh/setup-uv@v7`
- Files updated:
  - `.github/workflows/pages.yml`
  - `.github/workflows/repo-analysis.yml`
  - `.github/workflows/repo-implement.yml`
  - `.github/workflows/repo-plan.yml`
  - `.github/workflows/validate-prompts.yml`
  - `.github/workflows/validate-test-cases.yml`
- Confirmed current upstream Pages actions remain Node 20 based:
  - `actions/configure-pages@v5`
  - `actions/deploy-pages@v4`
- Left upstream-limited Pages actions unchanged to keep the fix surgical.

### Recent Operations (2026-03-10) — GitHub Actions Node.js 24 migration

- Updated all GitHub Actions workflows to Node.js 24 compatible actions:
  - `actions/setup-python@v5` → `actions/setup-python@v6` (v6.2.0 with Node.js 24 support)
  - `actions/checkout@v4` → `actions/checkout@v5` (Node.js 24 support)
- Files updated:
  - `.github/workflows/publish-ims-mcp.yml`
  - `.github/workflows/publish-instructions.yml`
  - `.github/workflows/ims-mcp-build.yaml`
- Resolves GitHub deprecation warning for Node.js 20 actions (forced migration by June 2nd, 2026)
- All workflows now fully compatible with Node.js 24 runtime

### Recent Operations (2026-03-10) — type validation automation

- Added repo-root `validate-types.sh` as the shared shell entrypoint for the committed `mypy.ini` gate.
- Wired the shared type-validation script into both existing GitHub workflows:
  - `.github/workflows/publish-ims-mcp.yml`
  - `.github/workflows/ims-mcp-build.yaml`
- Updated `docs/ARCHITECTURE.md` with a concise rule: `./validate-types.sh` MUST run if code was changed.
- Verified the shared script locally: `./validate-types.sh` → passes.

### Recent Operations (2026-03-10) — IMS CLI and IMS MCP typing hardening

- Added repo-root `mypy.ini` as the committed strong-typing entrypoint for `tools`, `ims-mcp-server/ims_mcp`, and `ims-mcp-server/validation`.
- Added shared typing helpers in `tools/typing_utils.py` and `ims-mcp-server/ims_mcp/typing_utils.py` to model dynamic RAGFlow/FastMCP objects without changing runtime logic.
- Tightened explicit optionals, container generics, protocol-based SDK adapters, and JSON payload types across IMS CLI and IMS MCP code paths.
- Kept runtime behavior unchanged while making the full requested surface pass `uvx mypy --config-file mypy.ini tools ims-mcp-server/ims_mcp ims-mcp-server/validation`.
- Validation completed successfully for:
  - `tools/venv/bin/pytest ims-mcp-server/tests`
  - `PYTHONPATH=. venv/bin/pytest tests` from `tools/`
  - `VERSION=r1 tools/venv/bin/python ims-mcp-server/validation/verify_mcp.py`
  - `VERSION=r2 tools/venv/bin/python ims-mcp-server/validation/verify_mcp.py`
  - `REDIS_URL=redis://127.0.0.1:6379/0 VERSION=r1 tools/venv/bin/python ims-mcp-server/validation/verify_mcp.py`
  - `REDIS_URL=redis://127.0.0.1:6379/0 VERSION=r2 tools/venv/bin/python ims-mcp-server/validation/verify_mcp.py`
- Verified the Redis-backed MCP path by starting a disposable local Redis container through Podman and re-running both verifier variants successfully.

### Recent Operations (2026-03-10) — additive lightweight Rosetta plugin

- Added `plugins/rosetta/rules/bootstrap.md` as the single always-on linked rule for the lightweight plugin.
- Restored existing `core` and `grid` marketplace entries for Claude Code and Cursor.
- Added a new additive `rosetta` plugin entry that points to `plugins/rosetta` instead of `instructions/`.
- Kept Rosetta MCP on the lightweight `rosetta` plugin so runtime content comes from MCP rather than published bundled files.
- Updated `PLUGINS.md` to document the lightweight plugin as an additional install option.

### Recent Operations (2026-03-10) — list_instructions flat format headers

**Enhancement**: Added informative headers to flat format output in `list_instructions` function to improve usability.

**Implementation**:
- **Bug Fix**: Fixed syntax errors in f-string formatting (lines 264, 267)
  - Changed `\"{prefix or "/"}\"` to `f\"{prefix or '/'}\"`
  - Code now runs correctly without syntax errors
- **Headers Added**: 
  - "all" case: `"List of all instruction files. Use 2-part/3-part tags for querying: folder/file.md or parent/folder/file.md"`
  - Folder listing: `"List of immediate folders of \"{prefix or '/'}\", no tags."`
  - File listing: `"List of immediate files of \"{prefix or '/'}\". Use 2-part/3-part tags for querying: folder/file.md or parent/folder/file.md"`
- **User Experience**: Headers clarify what the flat format output represents and provide clear examples of multi-part tags for precise querying

**Files Modified**:
1. `ims-mcp-server/ims_mcp/tools/instructions.py` - Fixed syntax errors and improved flat format output with headers

**Testing**:
- **New Test Suite**: Created comprehensive `tests/test_instructions.py` with 17 test cases:
  - `TestListInstructions` class (13 tests):
    - Flat format with "all" prefix
    - Flat format with root prefix (`""` or `"/"`)
    - Flat format with valid prefix (`"skills"`, `"skills/coding"`)
    - XML format (default) behavior
    - Error cases: no children found, invalid format, permission denied, dataset not found
    - Deduplication and filtering behavior
  - `TestResourcePathHelper` class (4 tests):
    - Resource path extraction from dict meta_fields
    - Handling of empty, None, and missing resource paths
- **Full Test Suite**: All 297 tests pass (280 existing + 17 new)
  - No regressions introduced
  - Type validation passes: `./validate-types.sh` ✓
- **Test Coverage**: 
  - Syntax correctness: f-string formatting validated
  - Header presence: verified in flat format output
  - Path sorting and deduplication: validated
  - Edge cases: empty datasets, missing permissions, invalid inputs

**Risk Assessment**: LOW (syntax bug fix, UX enhancement, comprehensive test coverage)

### Core Tools (2024-10-02)
All R2R tools have been implemented and are ready for use.

### Recent Operations (2026-03-09) — `list_instructions` format parameter

**Feature**: Added optional `format` parameter to `list_instructions` MCP tool for flat output mode.

**Implementation**:
- **New Parameter**: `format` (optional, default: "XML")
  - `"XML"`: Current XML-formatted output with metadata (default, backward compatible)
  - `"flat"`: Plain text list of sorted, deduplicated `resource_path` values with newline separators
  - **Case-insensitive**: "xml", "XML", "Xml" → "XML"; "flat", "FLAT", "Flat" → "flat"
- **Validation**: Added `normalize_format()` function in `ims_mcp/tools/validation.py`
  - Accepts "XML" or "flat" (case-insensitive)
  - Normalizes to canonical forms: "XML" or "flat"
  - Defaults to "XML" when None or empty string provided
  - Returns clear error message for invalid values
- **Output Format (flat)**:
  ```
  rules/bootstrap-core-policy.md
  skills/load-context/SKILL.md
  skills/coding-agents-prompt-authoring/SKILL.md
  workflows/init-workspace-flow.md
  ```
- **Applies to**: Both "all" mode (full dump) and folder listing modes

**Files Modified**:
1. `ims-mcp-server/ims_mcp/tools/validation.py` - Added `normalize_format()` validation function
2. `ims-mcp-server/ims_mcp/tools/instructions.py` - Updated `list_instructions()` to support format parameter and implement flat output
3. `ims-mcp-server/ims_mcp/server.py` - Updated MCP tool decorator to expose format parameter
4. `ims-mcp-server/validation/verify_mcp.py` - Added test cases for format parameter (default, flat, invalid)

**Testing**:
- **Unit tests** added to `tests/test_validation.py` (19 new test cases in `TestNormalizeFormat` class):
  - Default behavior: None, empty string, whitespace → "XML"
  - Case-insensitive: "xml", "XML", "Xml" → "XML"; "flat", "FLAT", "Flat" → "flat"
  - Invalid values: "JSON", "plain", "text", "compressed", etc. → error with helpful message
  - Non-string inputs: integer, list, dict → error
  - Custom field names in error messages
- **Full test suite**: All 281 tests pass (no regressions)
  - 51 validation tests (32 normalize_tags + 19 new normalize_format)
  - 230 other tests (bundler, query_builder, plan_manager, OAuth, etc.)
- **Integration tests** added to `validation/verify_mcp.py`:
  - Default behavior (XML format) unchanged
  - flat format returns plain text paths
  - Invalid format values rejected with clear error message
- Backward compatible: existing calls without format parameter continue to work

**Use Cases**:
- flat format useful for quick path enumeration without XML overhead
- Enables lightweight directory structure inspection
- Facilitates scripting and automation scenarios

**Risk Assessment**: LOW (read-only tool modification, backward compatible, no database changes)

### Recent Operations (2026-03-09) — JSON-encoded tags normalization

**Problem**: AI agents (including Cursor) were passing JSON-encoded arrays as strings to IMS MCP tools, e.g., `query_instructions(tags="[\"tag1\"]")` instead of `query_instructions(tags=["tag1"])`, causing validation errors.

**Solution**: Enhanced `normalize_tags()` in `ims_mcp/tools/validation.py` to automatically detect and decode JSON-encoded arrays:
- Checks if parameter is a string starting with `[` or `"` (JSON array or string indicators)
- Attempts JSON decode and validates result is a list
- Preserves all existing validation logic (deduplication, length checks, etc.)
- Backward compatible: native Python lists continue to work as before

**Testing**:
- Created comprehensive test suite: `tests/test_validation.py` with 32 test cases
- Covers: native lists, JSON-encoded arrays, edge cases, error conditions
- All 262 existing tests continue to pass (no regressions)
- Full MCP integration validation: `validation/verify_mcp.py` passes all checks

**Impact**: AI agents can now call with either format seamlessly:
- `tags=["tag1", "tag2"]` ✓ (native)
- `tags="[\"tag1\", \"tag2\"]"` ✓ (JSON-encoded, auto-decoded)

### Recent Operations (2026-03-09) — `list_instructions("all")`

- ✅ **IMS MCP full instruction listing mode added**
  - `ims_mcp/tools/instructions.py`: `list_instructions(path_prefix="all")` now returns a full flat listing of instruction `<rosetta:file />` entries without content. Files without `resource_path` are skipped, matching existing listing semantics.
  - The `all` response note explains that duplicate `path` values are bundled/combined when content is later acquired, and tells callers to use guaranteed unique 3-part/2-part tags for specific reads.
  - `ims_mcp/server.py`, `ims_mcp/tool_prompts.py`, and `ims-mcp-server/README.md`: tool contract text aligned to the `all` sentinel.
  - `ims-mcp-server/tests/test_bundler_and_query_builder.py` + `ims-mcp-server/tests/test_tool_contracts.py`: added regression coverage for duplicate-path listings and the `all` mode contract.
  - `ims-mcp-server/validation/verify_mcp.py`: added a live harness check for `list_instructions("all")` that verifies listing-only output, acquire/bundling note, and unique-tag guidance.
  - Verification: focused tests and live `verify_mcp.py` checks passed for both `VERSION=r2` and `VERSION=r1`.

### Recent Operations (2026-03-07) — OAuth hardening

- ✅ **Daily re-auth fix: offline_access scope + OAuth hardening**
  - Root cause: Keycloak `ssoSessionMaxLifespan` (24h) expires session-bound refresh tokens daily. Fix: request `offline_access` scope so Keycloak issues long-lived offline tokens (bounded by `offlineSessionMaxLifespan`, default 30 days).
  - `ims_mcp/constants.py`: added `ENV_OAUTH_SCOPE`, `ENV_OAUTH_REVOCATION_ENDPOINT`, `ENV_OAUTH_JWT_SIGNING_KEY`, `INTROSPECTION_CACHE_TTL_SECONDS` (15 min), `INTROSPECTION_NEGATIVE_CACHE_TTL_SECONDS` (60s).
  - `ims_mcp/config.py`: added `oauth_scope`, `oauth_revocation_endpoint`, `oauth_jwt_signing_key` fields.
  - `ims_mcp/auth/introspection_cache.py` (new): `CachedIntrospectionTokenVerifier` — wraps `IntrospectionTokenVerifier` with in-memory cache (TTL = min(token expiry, 15 min); 60s negative cache). Eliminates per-request Keycloak round-trips.
  - `ims_mcp/auth/oauth.py`: switched to `CachedIntrospectionTokenVerifier`; wired `extra_authorize_params` (scope override), `upstream_revocation_endpoint` (optional), `jwt_signing_key` (optional, decoupled from client secret).
  - `values-dev.yaml`, `values-prod.yaml`: added `ROSETTA_OAUTH_SCOPE=openid email offline_access`, `ROSETTA_OAUTH_REVOCATION_ENDPOINT`, `ROSETTA_JWT_SIGNING_KEY` (optional secret).
  - `tests/test_oauth.py`: added 8 new tests covering scope, revocation, JWT key, and cached verifier.
  - `docs/TODO.md`: documented postponed items — REDIS_URL substitution bug, consent screen evaluation, ROSETTA_MODE=SOFT in prod.
  - **Keycloak team action required**: enable `offline_access` scope on the client in both `evergreen` and `ims` realms; provision `ROSETTA_JWT_SIGNING_KEY` secret in ESO.

### Recent Operations (2026-03-07) — MCP contract hardening pass

- ✅ **Instruction/project/feedback tool validation tightened**
  - `ims_mcp/tools/validation.py` (new): centralized normalization and guardrails for repository names, relative paths, query lengths, tag lists, feedback fields, and content sizes.
  - `ims_mcp/tools/projects.py`: `query_project_context` now rejects calls without `query` or `tags`; `store_project_context` now rejects empty repository/document/content, rejects absolute or traversal document paths, requires 1-50 non-empty tags, and `discover_projects` now returns only readable projects in deterministic sorted order.
  - `ims_mcp/tools/instructions.py`: `query_instructions` now validates query/tag shapes and lengths; `list_instructions` now rejects invalid traversal-style path prefixes instead of silently treating them as virtual paths.
  - `ims_mcp/tools/resources.py`: `rosetta://{path*}` reads now enforce relative-path validation and the same read authorization gate as instruction tools.
  - `ims_mcp/tools/feedback.py`: `submit_feedback` now rejects blank `request_mode`, rejects empty required fields, and normalizes string/list `prompt_suggestions`.
  - `ims_mcp/constants.py`: added explicit tool-level payload limits for query length, tag count/length, project names, paths, content, and feedback fields.
  - `ims-mcp-server/README.md` + `ims_mcp/tool_prompts.py`: aligned public tool docs/prompts with the stricter runtime contract.
  - `ims-mcp-server/tests/test_tool_contracts.py` (new): added direct regression coverage for invalid-input paths and normalization behavior across instruction, project, feedback, and resource tools.
  - `ims-mcp-server/validation/verify_mcp.py`: added invalid-input live/in-memory harness checks for `query_project_context`, `store_project_context`, `submit_feedback`, and resource reads.

### Recent Operations (2026-03-07) — MCP cross-tool hardening follow-up

- ✅ **Cross-tool validation and prompt consistency tightened beyond plan_manager**
  - `ims_mcp/tools/validation.py`: relative-path validation now rejects repeated empty path segments such as `//` instead of silently collapsing them.
  - `ims_mcp/server.py`: blank string tag inputs are now rejected at the server edge with explicit `tags must not be empty` errors instead of ambiguous "query or tags required" fallbacks.
  - `ims_mcp/tools/projects.py`: `discover_projects` now sorts by project name rather than rendered XML string / dataset id order.
  - `ims_mcp/tool_prompts.py`: fixed malformed wrapper tags in server/get-context prompts (`<resources>` closing tag and SOFT-mode critical wrapper closing tag).
  - `ims-mcp-server/tests/test_project_naming.py`: added regression coverage for discover-project ordering by visible project name.
  - `ims-mcp-server/tests/test_resources.py` + `ims-mcp-server/tests/test_tool_contracts.py`: added regressions for double-slash paths and blank-string tag normalization at the server edge.
  - `ims-mcp-server/tests/test_prompts.py`: added prompt-markup sanity assertions so malformed wrappers fail fast in unit tests.
  - `ims-mcp-server/validation/verify_mcp.py`: corrected run instructions and added live/in-memory checks for blank-string tag inputs and double-slash document paths.

### Recent Operations (2026-03-07) — MCP cross-tool hardening pass 2

- ✅ **Project tool contracts, docs, and harness aligned**
  - Live MCP adversarial probing found a real runtime bug: `store_project_context` accepted path-like project names such as `../demo`, created malformed datasets, and `discover_projects` surfaced those names back to agents.
  - `ims_mcp/tools/projects.py`: `discover_projects` now filters out malformed legacy `project-*` dataset names instead of surfacing invalid names to callers.
  - `ims_mcp/server.py`: string-or-list tag coercion now trims scalar tags and rejects blank scalar tags with a direct contract error.
  - `ims_mcp/tool_prompts.py`: documented explicit size limits and root-listing semantics across `query_instructions`, `list_instructions`, `discover_projects`, `query_project_context`, `store_project_context`, and `submit_feedback`.
  - `ims-mcp-server/README.md`: documented the full 8-tool surface, added `list_instructions` and `plan_manager`, and aligned validation notes with runtime limits/constraints.
  - `ims-mcp-server/tests/test_project_naming.py` + `ims-mcp-server/tests/test_tool_contracts.py`: added regression coverage for path-like project names and server-edge blank-tag handling.
  - `ims-mcp-server/validation/verify_mcp.py`: added invalid-input probes for oversized `discover_projects.query` and updated blank-string tag expectations to the stricter server-edge behavior.
  - Verification: `ims-mcp-server/.venv/bin/pytest -q ims-mcp-server/tests` → `206 passed`; `VERSION=r2 ims-mcp-server/.venv/bin/python validation/verify_mcp.py` → `ALL CHECKS PASSED`.

### Recent Operations (2026-03-07) — HTTP origin hardening

- ✅ **Origin allowlist now blocks disallowed WebSocket handshakes**
  - `ims_mcp/server.py`: `OriginValidationMiddleware` previously rejected disallowed HTTP `Origin` headers but let disallowed WebSocket origins fall through to the app. It now closes those WebSocket requests with policy-violation close code `1008`.
  - `ims-mcp-server/tests/test_origin_middleware.py` (new): added focused coverage for blocked HTTP origins, blocked WebSocket origins, and missing-origin pass-through behavior.
  - Verification: focused auth/runtime tests passed (`37 passed`) and the full `ims-mcp-server/tests` suite passed at `209 passed`.

### Recent Operations (2026-03-07) — Config normalization hardening

- ✅ **Transport, port, and callback-path parsing made stricter**
  - `ims_mcp/config.py`: invalid `ROSETTA_TRANSPORT` values now fall back to `stdio` instead of leaving surprising non-http/non-stdio strings in runtime config.
  - `ims_mcp/config.py`: `ROSETTA_HTTP_PORT` is now range-checked and falls back to the default when out of bounds.
  - `ims_mcp/config.py`: OAuth callback paths now normalize to a leading slash at config load time.
  - `ims-mcp-server/tests/test_config.py`: added regression coverage for invalid transport fallback, port range enforcement, and callback-path normalization.
  - Verification: focused config/OAuth tests passed (`21 passed`) and the full `ims-mcp-server/tests` suite passed at `212 passed`.

### Recent Operations (2026-03-07)

- ✅ **plan_manager hardening + regression coverage**
  - `ims_mcp/tools/plan_manager.py`: rejected `update_status(target_id="entire_plan")`, added duplicate/collision ID validation, immutable ID validation, `phase_not_found` for missing parent phase, negative `limit` rejection, and blocked-phase filtering in `next`.
  - Follow-up hardening: `plan_name` must be non-empty, `upsert.data` accepts dict or JSON-object string, new items require explicit `data.kind`, invalid dependency refs/cycles are rejected on write, and `show_status` now exposes separate step/phase aggregates.
  - Added generous guardrails: max 100 phases, max 100 steps per phase, max 50 dependencies per item, max string length 20,000 chars, and max `plan_name` length 256.
  - `ims_mcp/tool_prompts.py`: simplified `plan_name` wording to a recommendation, documented root-status derivation, unique/immutable IDs, blocked-phase skipping, and `limit >= 0`.
  - `ims_mcp/server.py`: aligned parameter descriptions with the updated prompt semantics.
  - `tests/test_plan_manager.py`: expanded regression coverage from 89 to 113 passing tests.
  - `plans/plan-manager/*.md`: updated specs, design decisions, and execution notes with the findings and resolutions from deep MCP testing.

- ✅ **IMS MCP plan_manager tool**
  - New MCP tool: `plan_manager` — create and track AI execution plans stored in Redis or in-memory.
  - `ims_mcp/constants.py`: added `TOOL_PLAN_MANAGER`, `ENV_PLAN_TTL_DAYS`, `DEFAULT_PLAN_TTL_DAYS`, `PLAN_KEY_PREFIX`, `VALID_PLAN_STATUSES`.
  - `ims_mcp/config.py`: added `plan_ttl_days` field (`ROSETTA_PLAN_TTL_DAYS` env var, default 5 days).
  - `ims_mcp/services/plan_store.py`: `MemoryPlanStore` (lazy expiry + sweep-on-write), `RedisPlanStore` (write-based TTL), `build_plan_store` factory.
  - `ims_mcp/tools/plan_manager.py`: RFC 7396 merge-patch, merge-by-id arrays, bottom-up status propagation, commands: upsert / query / show_status / update_status / next.
  - `ims_mcp/tool_prompts.py`: added `PROMPT_PLAN_MANAGER`.
  - `ims_mcp/server.py`: registered `plan_manager` tool, created `_PLAN_STORE`.
  - `tests/test_plan_manager.py`: 98 unit tests (all passing), no Redis required.
  - `validation/verify_mcp.py`: added section 7 — plan_manager end-to-end integration tests.
  - `plans/plan-manager/open-questions.md`: design decisions documented (phase/step disambiguation, upward-only update_status, sweep-on-write, cross-phase deps, TTL).

### Recent Operations (2026-03-06)

- ✅ **IMS MCP bootstrap instructions cache TTL fix**
  - `ims_mcp/server.py`: Added 5-minute TTL (300 seconds) to `get_context_instructions` tool.
  - Added `import time`, `DOC_CACHE_TTL_SECONDS` to imports.
  - Added `_CONTEXT_INSTRUCTIONS_CACHE_TIME` timestamp variable.
  - Added `_is_context_instructions_stale()` function to check cache age.
  - Updated `get_context_instructions()` to refresh cache if older than 5 minutes.
  - Bootstrap instructions now reload from RAGFlow every 5 minutes instead of persisting indefinitely.

- ✅ **IMS MCP build workflow image tag reporting**
  - `.github/workflows/ims-mcp-build.yaml`: added a `report-image` job after the reusable build completes.
  - The workflow now writes the built image version, tag, and full image reference to `$GITHUB_STEP_SUMMARY` and emits a workflow notice with the tag.
  - Added task note: `plans/IMS-MCP-BUILD-TAG-REPORT/IMS-MCP-BUILD-TAG-REPORT-PLAN.md`.

### Recent Operations (2026-03-02)

- ✅ **MCP v2 OAuth Authentication & Authorization**
  - `ims_mcp/auth/oauth.py`: `build_oauth_provider()` creates FastMCP 3 `OAuthProxy` + `IntrospectionTokenVerifier` (Keycloak) for HTTP transports; returns `None` for STDIO.
  - `ims_mcp/services/authorizer.py`: `Authorizer` class with `can_read/can_write/can_create` — `aia-*` read-only, `project-*` per `ROSETTA_READ_POLICY`/`ROSETTA_WRITE_POLICY` (default: all). Team check stub.
  - `ims_mcp/services/invite.py`: `auto_invite()` stub (no-op, no exceptions).
  - `ims_mcp/config.py`: Added OAuth env vars, policy fields, user_email, invite_emails, project_dataset_template.
  - `ims_mcp/context.py`: Added `user_email` and `authorizer` to `CallContext`.
  - `ims_mcp/server.py`: Wired `auth=OAuthProxy` into `FastMCP()`, removed `PerRequestApiKeyMiddleware`, `_resolve_user_email()` from OAuth claims (HTTP) or env (STDIO).
  - `ims_mcp/tools/projects.py`: Transparent `project-{name}` prefix; `discover_projects` filters `project-*` and strips prefix; auth checks on read/write/create.
  - `ims_mcp/tools/instructions.py`: Auth check on read.
  - Tests: `test_authorizer.py` (16 cases), `test_oauth.py` (7 cases), `test_project_naming.py` (6 cases).

### Recent Operations (2026-03-01)

- ✅ **Path metadata and VFS parity fixes**
  - `tools/services/document_data.py`: path-related metadata now derives from one normalized instructions-relative parser; `original_path`, `doc_title`, `resource_path`, and path tags/domain/release are aligned for instructions docs.
  - `tools/services/document_data.py`: `content_hash` now includes `resource_path` so regular publish (without `--force`) repushes documents when this metadata field changes.
  - `tools/services/document_data.py`: `content_hash` now includes document name (`doc_title`) so name normalization changes are hash-driven and do not need extra runtime checks.
  - `tools/ragflow_client.py` + `tools/ims_publisher.py`: added `resource_path` to `DocumentMetadata` and upload `meta_fields`, fixing writer-side persistence.
  - `ims-mcp-server/ims_mcp/tools/resources.py`: added read-side path normalization before metadata query to match stored `resource_path` format reliably.
  - Tests: added/updated `tools/tests/test_document_data.py` and `ims-mcp-server/tests/test_resources.py`.
- ✅ **MCP verification script hardening**
  - `ims-mcp-server/tests/test_mcp_verification.py`: strict VFS mode is now default (`VFS_STRICT=1` behavior by default), `VERSION` env variable is required and documented in file header, and VFS error responses now fail the run instead of producing misleading pass output.

### Recent Operations (2026-02-27)

- ✅ **R2 Folder Structure Support**
  - CLI (`document_data.py`): Two-part tags (`parent/file`), three-part tags (`grandparent/parent/file`), R2+ domain extraction (folder after release), `resource_path` metadata field (R2: strip org prefix, R1: strip release prefix).
  - MCP (`server.py`, `tools/resources.py`): Resource template `rosetta://{path}` serving bundled documents by `resource_path` metadata.
  - MCP schema fix (`server.py`, `tool_prompts.py`): Moved parameter descriptions from `Args:`/`Returns:` prompt blocks to `Annotated[type, Field(description=...)]` so they appear in JSON schema `inputSchema`. Stripped Args/Returns from all 6 prompt strings.

### Operations (2026-02-26)

- ✅ **Coding-agents-prompt-authoring skill consistency pass (`instructions/r2/grid/skills/coding-agents-prompt-authoring`)**
  - Fixed `pa-meta-prompt.md` workflow/path references to align with `SKILL.md` workflow and `assets/pa-prompt-brief.md`.
  - Aligned artifact persistence policy: changelog is stored only in `plans/<FEATURE>/change-log.md`; small prompts may keep artifacts in memory and return via message.
  - Added explicit note that schema omissions in `SKILL.md` are intentional (delegated to `references/*`).
  - Resolved pattern-conflict wording by constraining reuse/mirroring rules to the current prompt family set.
  - Clarified progressive disclosure intent in hardening/draft limits (split long rules and 500+ token prompts into phased artifacts).
  - Fixed malformed tag in `pa-patterns.md` and clarified strict separation of task-level vs repository-level memory.
  - Updated `pa-knowledge-base.md` to use `agents/temp/`, include memory-level separation guidance, and recommend grep-by-headers auto-TOC for the large file.
- ✅ **Prompting workflow relocation + recreation**
  - Deleted legacy `instructions/r2/core/workflows/prompting-flow.md`.
  - Recreated lightweight schema-based flow at `instructions/r2/grid/workflows/coding-agents-prompting-flow.md`.
  - Aligned workflow shape to updated `docs/schemas/workflow.md` template with thin orchestration and short phase contracts.
  - Kept workflow intentionally thin: phase orchestration, state updates, HITL gates, and references only (skills hold implementation logic).
- ✅ **Coding-agents-prompting-flow hardening loop (2 passes)**
  - Pass 1 findings: duplicate subagent reference, audience not explicit, weak split contract wording, and minor clarity issues.
  - Applied surgical fixes to `instructions/r2/grid/workflows/coding-agents-prompting-flow.md`.
  - Pass 2 result: no critical conflicts; flow remains lightweight and schema-aligned.
- ✅ **Coding-agents-prompting-flow purpose section tightened**
  - Rewrote `description_and_purpose` with explicit flow scope and measurable validation proof criteria.
- ✅ **Coding-agents-prompting-flow contract correction**
  - Reworked workflow phases to exactly match `extract+intake -> blueprint -> for_each_prompt_loop(draft -> hardening -> edit) -> simulate -> validate`.
  - Removed skill-internal asset/template references from workflow body.
  - Enforced `Prompt Brief` as required carry artifact in downstream phases and checklist.
  - Added explicit phase-scoped loading rule: load only references needed for current phase.

### Recent Operations (2026-02-09)

- ✅ **RAGFlow query/filter capability documentation updated from source code**
  - Single source of truth: `docs/ARCHITECTURE.md` section `RAGFlow Documentation (Tested)` for exact contracts, parameter names/defaults, REST examples, SDK signatures, and exposure limits.
  - Per user instruction, parse issue is treated as known external blocker and no further parse-command runs were performed in this update pass.

### Recent Operations (2026-02-23)

- ✅ **FastMCP 2→3 upgrade + HTTP transport (ROSETTA-MCP-HTTP-P2)**
  - **FastMCP upgraded**: `fastmcp>=2.14.5,<3.0.0` → `fastmcp>=3.0.0,<4` (v3.0.2 confirmed)
  - **Import fixes**: `from mcp.server.fastmcp import ...` → `from fastmcp import ...` in `server.py` and `context.py`
  - **HTTP transport**: `ROSETTA_TRANSPORT=http` enables HTTP mode; `stdio` is unchanged default
  - **Session state**: `FastMCP(session_state_store=RedisStore(REDIS_URL))` — Redis when `REDIS_URL` set, `MemoryStore` fallback for local dev
  - **Redis optional dep**: `pip install "ims-mcp[redis]"` for production multi-instance; not required locally
  - **Origin validation**: `OriginValidationMiddleware` ASGI class; enforced when `ROSETTA_ALLOWED_ORIGINS` is set
  - **Per-session analytics**: `get_session_id(ctx)` reads `ctx.session_id` (HTTP: `mcp-session-id` header; stdio: static UUID7)
  - **New env vars**: `ROSETTA_TRANSPORT`, `ROSETTA_HTTP_HOST` (0.0.0.0), `ROSETTA_HTTP_PORT` (8000), `REDIS_URL`, `ROSETTA_ALLOWED_ORIGINS`
  - **Validated**: 15 tests pass; HTTP server responds `200 OK` on `/mcp` with valid MCP initialize response
  - **Plan**: `plans/HTTP-TRANSPORT/`

### Recent Operations (2026-02-13)

- ✅ **Prompt and server-metadata alignment update (Rosetta MCP)**
  - Updated `ims-mcp-server/ims_mcp/tool_prompts.py` `PROMPT_GET_CONTEXT_INSTRUCTIONS` with stricter prep-step wording, Rosetta terminology, chained-step requirement, KB aliases, and optional compact `topic` guidance.
  - Updated `ims-mcp-server/ims_mcp/server.py` to keep server-level instructions behavior explicit:
    - Kept dataset-based instructions loading path in code.
    - Kept `instructions=_MCP_SERVER_INSTRUCTIONS` disabled as commented line.
    - Enabled explicit `instructions=` text in `FastMCP(...)` using package version imported from `ims_mcp.__init__.__version__`.
    - Added note that server-level FastMCP instructions are not relied on because many IDE clients do not consistently inject them into agent context.
  - Scoped wording cleanup in `ims-mcp-server` comments/user-facing text: replaced `IMS` with `Rosetta` where applicable (without changing prompt files for that pass).
  - Synced architecture context in `docs/CONTEXT.md` to reflect current server-level instructions behavior (dataset path present in code, but not relied on for agent context injection).

### Recent Operations (2026-02-08)

- ✅ **ROSETTA-MCP-V2-P1 Implementation (in workspace)** - Refactored IMS MCP package to modular RAGFlow-based architecture
  - **New modules**: `constants.py`, `config.py`, `context.py`, `tool_prompts.py`, `clients/*`, `services/*`, `analytics/*`, `tools/*`
  - **Server rewrite**: `ims_mcp/server.py` now registers 6 V2 tools (`get_context_instructions`, `query_instructions`, `submit_feedback`, `query_project_context`, `store_project_context`, `discover_projects`) with stdio transport and startup instruction loading from RAGFlow (`[MCP_SERVER_INSTRUCTIONS]` tag)
  - **Packaging update**: `ims-mcp-server/pyproject.toml` switched to `ragflow-sdk`, added `fastmcp` dependency range, removed `r2r` dependency, and included subpackages
  - **Publisher metadata flow**: `tools/services/document_data.py` now parses frontmatter (`tags`, `sort_order`) with merged tags and deterministic hashing; `tools/ims_publisher.py` now propagates `sort_order` and instructions-only `original_path`
  - **CLI docs update**: `tools/ims_cli.py` help now documents frontmatter keys and `original_path` behavior
  - **Validation**: venv-based module import and compile checks passed; installed missing venv deps (`pytest`, `python-frontmatter`) and ran `PYTHONPATH=ims-mcp-server:tools tools/venv/bin/python -m pytest ims-mcp-server/tests tools/tests -q` successfully (9 passed)
- ✅ **ROSETTA-MCP-V2-P1 Debug/Validation Continuation** - CLI+MCP behavior hardening and end-to-end command checks
  - **IMS MCP fixes**:
    - `ims-mcp-server/ims_mcp/tools/instructions.py`: added guarded dataset/list/retrieve error handling, semantic-search fallback to keyword query, and robust tag extraction/filtering for SDK `Base` metadata objects.
    - `ims-mcp-server/ims_mcp/tools/projects.py`: added guarded dataset resolution/open/store paths and robust tag filtering behavior parity with instruction queries.
    - `ims-mcp-server/ims_mcp/services/query_builder.py`: preserved spec-compliant multi-tag keyword format (`[tag1] [tag2]`).
  - **IMS CLI fix**:
    - `tools/commands/parse_command.py`: `--parse-timeout` now overrides runtime timeout for the current parse command execution.
  - **Manual command validation**:
    - Ran all CLI command surfaces (`verify`, `publish`, `list-dataset`, `cleanup-dataset`, `parse`) including dry-run and force variants.
    - Ran two consecutive `publish instructions --no-parse` commands and verified no duplicate growth in dataset.
    - Exercised all 6 MCP tools (`get_context_instructions`, `query_instructions`, `submit_feedback`, `discover_projects`, `query_project_context`, `store_project_context`) with safe inputs.
  - **Current external blocker**:
    - Remote dataset parse remains `FAIL` across documents in `aia-r1`; this is server-side/environment behavior outside local code changes.

### Recent Operations (2026-02-03)

- ✅ **PostHog Analytics (v1.0.27-47)** - Usage tracking and error monitoring
  - **Implementation**: `@track_tool_call` decorator, `capture_error_to_posthog()` helper, `before_send` hook for param filtering
  - **Events**: Tool calls, `$pageview` (virtual URLs: `mcp://rosetta/{tool}`), `$web_vitals` (performance), `$exception` (errors)
  - **Properties**: username, repository (MCP roots), session_id (UUID7), `$browser`/`$browser_version` (AI agent from MCP client_info), duration_ms, status, error details
  - **Configuration**: Default enabled (injected key in CI/CD), disabled in local dev, override via `POSTHOG_API_KEY`
  - **Privacy**: Write-only key, parameter filtering, non-blocking, GeoIP enabled (runs on user machine)
  - **Latest Fix (v1.0.47)**: Corrected `capture_exception()` signature, added AI agent detection via `ctx.request_context.session.client_params.client_info`

- ✅ **Custom Icon Support (v1.0.42)** - Added Rosetta icon for MCP clients
  - **Modified Files**:
    - `ims-mcp-server/ims_mcp/server.py` (added load_rosetta_icon(), Icon import)
    - `ims-mcp-server/pyproject.toml` (version: 1.0.41 → 1.0.42, added *.png to package data)
    - `ims-mcp-server/build.sh` (copy rosetta-icon.png from docs/)
    - `docs/CONTEXT.md` (documented icon feature)
    - `agents/IMPLEMENTATION.md` (added implementation entry)
  - **New Files**:
    - `ims-mcp-server/ims_mcp/resources/rosetta-icon.png` (160x160 PNG, 25KB)
  - **Implementation Details**:
    - **Icon Loading**: `load_rosetta_icon()` function loads PNG from package resources using `importlib.resources`
    - **Data URI Encoding**: Base64-encodes PNG to data URI for portability (no external hosting needed)
    - **Icon Metadata**: `Icon(src=data_uri, mimeType="image/png", sizes=["160x160"])`
    - **FastMCP Integration**: `FastMCP(..., icons=[ROSETTA_ICON] if ROSETTA_ICON else [])`
    - **Module-Level Caching**: Icon loaded once at startup via `ROSETTA_ICON = load_rosetta_icon()`
    - **Graceful Degradation**: Returns `None` on error, server continues without icon
    - **Build Process**: `build.sh` copies icon from `docs/Rosetta-Icon-Only.png` to `ims_mcp/resources/rosetta-icon.png`
    - **Package Data**: Updated `pyproject.toml` to include `resources/*.png` in distribution
  - **Key Benefits**:
    - Rosetta branding visible in all MCP clients (Cursor, Windsurf, GitHub Copilot, Antigravity)
    - Zero external dependencies (embedded data URI)
    - Works offline, no hosting costs
    - Backward compatible (Icon field optional in MCP spec)
  - **Rationale**: Provide visual identification for Rosetta MCP server across all IDE integrations


### Recent Operations (2026-02-03)

- ✅ **PostHog Analytics (v1.0.27-47)** - Usage tracking and error monitoring
  - **Implementation**: `@track_tool_call` decorator, `capture_error_to_posthog()` helper, `before_send` hook for param filtering
  - **Events**: Tool calls, `$pageview` (virtual URLs: `mcp://rosetta/{tool}`), `$web_vitals` (performance), `$exception` (errors)
  - **Properties**: username, repository (MCP roots), session_id (UUID7), `$browser`/`$browser_version` (AI agent from MCP client_info), duration_ms, status, error details
  - **Configuration**: Default enabled (injected key in CI/CD), disabled in local dev, override via `POSTHOG_API_KEY`
  - **Privacy**: Write-only key, parameter filtering, non-blocking, GeoIP enabled (runs on user machine)
  - **Latest Fix (v1.0.47)**: Corrected `capture_exception()` signature, added AI agent detection via `ctx.request_context.session.client_params.client_info`

- ✅ **Custom Icon Support (v1.0.42)** - Added Rosetta icon for MCP clients
  - **Modified Files**:
    - `ims-mcp-server/ims_mcp/server.py` (added load_rosetta_icon(), Icon import)
    - `ims-mcp-server/pyproject.toml` (version: 1.0.41 → 1.0.42, added *.png to package data)
    - `ims-mcp-server/build.sh` (copy rosetta-icon.png from docs/)
    - `docs/CONTEXT.md` (documented icon feature)
    - `agents/IMPLEMENTATION.md` (added implementation entry)
  - **New Files**:
    - `ims-mcp-server/ims_mcp/resources/rosetta-icon.png` (160x160 PNG, 25KB)
  - **Implementation Details**:
    - **Icon Loading**: `load_rosetta_icon()` function loads PNG from package resources using `importlib.resources`
    - **Data URI Encoding**: Base64-encodes PNG to data URI for portability (no external hosting needed)
    - **Icon Metadata**: `Icon(src=data_uri, mimeType="image/png", sizes=["160x160"])`
    - **FastMCP Integration**: `FastMCP(..., icons=[ROSETTA_ICON] if ROSETTA_ICON else [])`
    - **Module-Level Caching**: Icon loaded once at startup via `ROSETTA_ICON = load_rosetta_icon()`
    - **Graceful Degradation**: Returns `None` on error, server continues without icon
    - **Build Process**: `build.sh` copies icon from `docs/Rosetta-Icon-Only.png` to `ims_mcp/resources/rosetta-icon.png`
    - **Package Data**: Updated `pyproject.toml` to include `resources/*.png` in distribution
  - **Key Benefits**:
    - Rosetta branding visible in all MCP clients (Cursor, Windsurf, GitHub Copilot, Antigravity)
    - Zero external dependencies (embedded data URI)
    - Works offline, no hosting costs
    - Backward compatible (Icon field optional in MCP spec)
  - **Rationale**: Provide visual identification for Rosetta MCP server across all IDE integrations


### Recent Operations (2026-01-29)

- ✅ **Refactored IMS CLI with Command Pattern & Performance Optimizations** - Complete architectural overhaul
  - **Modified Files**:
    - `tools/ims_cli.py` - Reduced from 1,158 to 333 lines (71% reduction), clean command dispatcher
    - `tools/commands/base_command.py` - Abstract base class for all commands (~75 lines)
    - `tools/commands/publish_command.py` - Publish command implementation (~180 lines)
    - `tools/commands/verify_command.py` - Verify command implementation (~50 lines)
    - `tools/commands/list_command.py` - List dataset command (~70 lines)
    - `tools/commands/cleanup_command.py` - Cleanup dataset command (~175 lines)
    - `tools/commands/parse_command.py` - Parse command implementation (~202 lines)
    - `tools/services/auth_service.py` - Authentication service (~80 lines)
    - `tools/services/dataset_service.py` - Dataset operations service (~120 lines)
    - `tools/services/document_service.py` - Document operations service (~308 lines)
    - `tools/services/document_data.py` - DocumentData value object (206 lines)
    - `tools/ims_publisher.py` - Integrated DocumentData, optimized for single file read
    - `tools/ragflow_client.py` - Enhanced with server-side filtering (888 lines)
    - `tools/ims_config.py` - Added page_size, parse_timeout configuration fields
  - **Architecture Improvements**:
    - Command Pattern: 7 separate command classes, each with single responsibility
    - Service Layer: 4 services (Auth, Dataset, Document, DocumentData) for shared logic
    - Base Command: Common timing, header printing, and initialization
    - Command Registry: Extensible dispatcher for easy addition of new commands
    - Eliminated repeated patterns: auth (5x→1x), dataset resolution (4x→1x), timing (5x→1x)
  - **Performance Optimizations**:
    - DocumentData value object: Files read once (not 3x), hash calculated once (not 3x)
    - 3x faster file processing: 67% reduction in file I/O operations
    - Server-side filtering: 50-70% less network traffic, metadata_condition & run parameters
    - Change detection: 77% faster for unchanged files
  - **Code Quality**:
    - Code duplication reduced from ~15% to ~5% (67% improvement)
    - Magic numbers externalized: page_size, parse_timeout configurable via env vars
    - Better testability: Unit tests possible for commands and services
    - Cleaner separation: CLI parsing, command logic, business logic all separated
  - **Impact**: More maintainable, extensible, testable codebase with significant performance gains

### Recent Operations (2026-01-26)

- ✅ **Updated IMS CLI to Support RAGFlow** - Transitioned from R2R to RAGFlow backend
  - **Modified Files**:
    - `tools/ims_cli.py` - Updated CLI commands for RAGFlow (1127 lines)
    - `tools/ims_config.py` - Configuration for RAGFlow API key auth (340 lines)
    - `tools/ims_auth.py` - Authentication module for RAGFlow (136 lines)
    - `tools/ims_publisher.py` - Document publishing for RAGFlow datasets (928 lines)
    - `tools/ragflow_client.py` - RAGFlow SDK wrapper (716 lines)
    - `tools/requirements.txt` - Updated to use ragflow-sdk>=0.23.1
    - `tools/env.template` - Environment configuration template
    - `tools/README.md` - Complete documentation 
  - **New Features**:
    - API key-based authentication (instead of email/password)
    - Dataset management with template resolution (aia-{release})
    - MD5 hash-based change detection for performance
    - Tag-in-title format: [tag1][tag2] filename.ext for searchability
    - Parse triggering and status tracking
  - **CLI Commands Supported**:
    - `publish` - Upload documents to RAGFlow datasets
    - `verify` - Test connection and system health
    - `list-dataset` - List documents in a dataset
    - `cleanup-dataset` - Delete documents with prefix filtering
    - `parse` - Re-trigger document parsing
  - **Performance**: ~77% faster with change detection (5 files, 1 changed: 15s vs 66s with R2R)
  - **Removed**: R2R Light server components (local.env, remote.env, r2r.toml, run-server.sh)
  - **Backend**: RAGFlow (Docker Compose or remote instance)
  - **Python Support**: 3.12-3.14 (required by ragflow-sdk 0.23.1)

### Recent Operations (2026-01-29)

- ✅ **Refactored IMS CLI with Command Pattern & Performance Optimizations** - Complete architectural overhaul
  - **Modified Files**:
    - `tools/ims_cli.py` - Reduced from 1,158 to 333 lines (71% reduction), clean command dispatcher
    - `tools/commands/base_command.py` - Abstract base class for all commands (~75 lines)
    - `tools/commands/publish_command.py` - Publish command implementation (~180 lines)
    - `tools/commands/verify_command.py` - Verify command implementation (~50 lines)
    - `tools/commands/list_command.py` - List dataset command (~70 lines)
    - `tools/commands/cleanup_command.py` - Cleanup dataset command (~175 lines)
    - `tools/commands/parse_command.py` - Parse command implementation (~202 lines)
    - `tools/services/auth_service.py` - Authentication service (~80 lines)
    - `tools/services/dataset_service.py` - Dataset operations service (~120 lines)
    - `tools/services/document_service.py` - Document operations service (~308 lines)
    - `tools/services/document_data.py` - DocumentData value object (206 lines)
    - `tools/ims_publisher.py` - Integrated DocumentData, optimized for single file read
    - `tools/ragflow_client.py` - Enhanced with server-side filtering (888 lines)
    - `tools/ims_config.py` - Added page_size, parse_timeout configuration fields
  - **Architecture Improvements**:
    - Command Pattern: 7 separate command classes, each with single responsibility
    - Service Layer: 4 services (Auth, Dataset, Document, DocumentData) for shared logic
    - Base Command: Common timing, header printing, and initialization
    - Command Registry: Extensible dispatcher for easy addition of new commands
    - Eliminated repeated patterns: auth (5x→1x), dataset resolution (4x→1x), timing (5x→1x)
  - **Performance Optimizations**:
    - DocumentData value object: Files read once (not 3x), hash calculated once (not 3x)
    - 3x faster file processing: 67% reduction in file I/O operations
    - Server-side filtering: 50-70% less network traffic, metadata_condition & run parameters
    - Change detection: 77% faster for unchanged files
  - **Code Quality**:
    - Code duplication reduced from ~15% to ~5% (67% improvement)
    - Magic numbers externalized: page_size, parse_timeout configurable via env vars
    - Better testability: Unit tests possible for commands and services
    - Cleaner separation: CLI parsing, command logic, business logic all separated
  - **Impact**: More maintainable, extensible, testable codebase with significant performance gains

### Recent Operations (2026-01-26)

- ✅ **Updated IMS CLI to Support RAGFlow** - Transitioned from R2R to RAGFlow backend
  - **Modified Files**:
    - `tools/ims_cli.py` - Updated CLI commands for RAGFlow (1127 lines)
    - `tools/ims_config.py` - Configuration for RAGFlow API key auth (340 lines)
    - `tools/ims_auth.py` - Authentication module for RAGFlow (136 lines)
    - `tools/ims_publisher.py` - Document publishing for RAGFlow datasets (928 lines)
    - `tools/ragflow_client.py` - RAGFlow SDK wrapper (716 lines)
    - `tools/requirements.txt` - Updated to use ragflow-sdk>=0.23.1
    - `tools/env.template` - Environment configuration template
    - `tools/README.md` - Complete documentation 
  - **New Features**:
    - API key-based authentication (instead of email/password)
    - Dataset management with template resolution (aia-{release})
    - MD5 hash-based change detection for performance
    - Tag-in-title format: [tag1][tag2] filename.ext for searchability
    - Parse triggering and status tracking
  - **CLI Commands Supported**:
    - `publish` - Upload documents to RAGFlow datasets
    - `verify` - Test connection and system health
    - `list-dataset` - List documents in a dataset
    - `cleanup-dataset` - Delete documents with prefix filtering
    - `parse` - Re-trigger document parsing
  - **Performance**: ~77% faster with change detection (5 files, 1 changed: 15s vs 66s with R2R)
  - **Removed**: R2R Light server components (local.env, remote.env, r2r.toml, run-server.sh)
  - **Backend**: RAGFlow (Docker Compose or remote instance)
  - **Python Support**: 3.12-3.14 (required by ragflow-sdk 0.23.1)

### Recent Operations (2026-01-22)

- ✅ **Bundled Bootstrap Instructions in IMS MCP Package (v1.0.11)** - Automatic PREP steps for LLMs on connection
  - **Modified Files**:
    - `ims-mcp-server/ims_mcp/server.py` (added load_bootstrap(), BOOTSTRAP_CONTENT, FastMCP instructions param)
    - `ims-mcp-server/pyproject.toml` (version: 1.0.10 → 1.0.11, added package data config)
    - `ims-mcp-server/ims_mcp/__init__.py` (version: 1.0.10 → 1.0.11)
    - `ims-mcp-server/README.md` (documented bootstrap feature)
    - `docs/CONTEXT.md` (added bootstrap to Features)
  - **New Files**:
    - `ims-mcp-server/ims_mcp/resources/bootstrap.md` (copied from `instructions/r1/bootstrap.md`)
    - `ims-mcp-server/build.sh` (automated build script: copies bootstrap.md, cleans, builds, verifies)
  - **Implementation**: Bundle bootstrap.md as package resource, load at startup, include in MCP metadata
    - Added `ims_mcp/resources/` directory with bootstrap.md file
    - Configured `pyproject.toml` package data: `ims_mcp = ["py.typed", "resources/*.md"]`
    - Implemented `load_bootstrap()` using `importlib.resources` (Python 3.10+ compatible)
    - Module-level `BOOTSTRAP_CONTENT` variable (loaded once, cached)
    - Updated `FastMCP(name="...", instructions=BOOTSTRAP_CONTENT)` to include bootstrap in server metadata
    - Graceful error handling: logs warning and continues if file missing/unreadable
  - **Rationale**: Eliminates need to manually copy bootstrap instructions to IDE configs, works on any installation without source repo access
  - **Impact**: LLMs connecting to IMS MCP automatically receive PREP step instructions, no manual configuration required
  - **Package Size**: +~2KB (negligible)
  - **Build Automation**: `build.sh` script automatically copies latest bootstrap.md from source before building, ensuring package always has current version
  - **CI/CD**: GitHub Actions workflow updated to use `build.sh` and trigger on bootstrap.md changes

### Recent Operations (2026-01-06)

- ✅ **Added Debug Mode for Conditional Logging (v1.0.10)** - Made stderr outputs conditional on IMS_DEBUG flag
  - **Modified Files**:
    - `ims-mcp-server/ims_mcp/server.py` (added DEBUG_MODE flag, debug_print() helper, graceful shutdown)
    - `ims-mcp-server/pyproject.toml` (version: 1.0.9 → 1.0.10)
    - `ims-mcp-server/ims_mcp/__init__.py` (version: 1.0.9 → 1.0.10)
    - `ims-mcp-server/README.md` (documented IMS_DEBUG variable)
  - **Implementation**: Environment variable-based debug control
    - Added `DEBUG_MODE = os.getenv('IMS_DEBUG', '').lower() in ('1', 'true', 'yes', 'on')`
    - Created `debug_print(msg)` helper function that only prints when DEBUG_MODE is enabled
    - Replaced all stderr print() calls with debug_print()
    - Configured Python logging to suppress R2R SDK's HTTP traces (httpx, httpcore, r2r loggers)
    - Added graceful shutdown handlers for SIGTERM and SIGINT signals
    - Cleanup function properly closes client connections and exits with code 0
    - Affected logging: version/config, login status, token expiry, HTTP request traces, shutdown messages
  - **Usage**: Set `IMS_DEBUG=1` or `IMS_DEBUG=true` to enable verbose logging
  - **Default Behavior**: Silent operation (no stderr output) unless debug flag is set
  - **Rationale**: Reduces noise in production environments while maintaining debugging capability when needed
  - **Impact**: Cleaner MCP client output by default, opt-in verbose logging for troubleshooting, no false "failure" messages on IDE shutdown

### Recent Operations (2026-01-02)

- ✅ **Fixed Pipeline to Fail on Duplicate Version** - Pipeline now fails instead of succeeding when version exists
  - **Modified File**: `.github/workflows/publish-ims-mcp.yml`
  - **Issue**: Pipeline detected duplicate versions but succeeded with warning, making it easy to miss
  - **Fix**: Changed "Skip publishing" step to "Fail if version exists" with `exit 1`
  - **Error Message**: Clear actionable instructions to increment version in both files
  - **Impact**: Developers immediately notified of version conflict, must update version before merge
  - **Documentation Updated**: `agents/IMPLEMENTATION.md` (Version Checking Logic section)

- ✅ **Added Manual Trigger to PyPI Publishing Pipeline** - Added `workflow_dispatch` for on-demand publishing
  - **Modified File**: `.github/workflows/publish-ims-mcp.yml`
  - **Enhancement**: Added `workflow_dispatch` trigger alongside automatic `push` trigger
  - **Benefit**: Can manually trigger PyPI publishing from GitHub Actions UI without pushing code
  - **Use Cases**: Retry failed publishes, publish after fixing secrets, test pipeline changes
  - **Consistency**: Now matches `publish-instructions.yml` workflow pattern

- ✅ **Fixed get_document Re-authentication (v1.0.6)** - Properly propagate auth errors from nested calls
  - **Modified Files**:
    - `ims-mcp-server/ims_mcp/server.py` (fixed exception handling in get_document)
    - `ims-mcp-server/pyproject.toml` (version: 1.0.5 → 1.0.6)
    - `ims-mcp-server/ims_mcp/__init__.py` (version: 1.0.5 → 1.0.6)
  - **Root Cause**: get_document had @retry_on_auth_error decorator, but caught ALL exceptions from nested client.retrieval.search() and client.documents.download() calls, converting them to error strings
  - **Issue**: Auth errors (401/403) were caught and converted to strings before decorator could see them, preventing re-authentication
  - **Fix**: Added specific R2RException handling that re-raises auth errors (401/403) while still catching other exceptions
  - **Impact**: get_document now properly re-authenticates on token expiry, consistent with other 5 tools
  - **Pattern**: 
    ```python
    except R2RException as e:
        if hasattr(e, 'status_code') and e.status_code in [401, 403]:
            raise  # Let decorator handle re-auth
        return f"Error: {str(e)}"  # Handle other R2R errors
    except Exception as e:
        return f"Error: {str(e)}"  # Handle non-R2R errors
    ```

- ✅ **Added Automatic Re-authentication on Token Expiry (v1.0.5)** - Decorator-based solution for server restart handling
  - **Modified Files**:
    - `ims-mcp-server/ims_mcp/server.py` (added @retry_on_auth_error decorator, applied to all 6 tools)
    - `ims-mcp-server/pyproject.toml` (version: 1.0.4 → 1.0.5)
    - `ims-mcp-server/ims_mcp/__init__.py` (version: 1.0.4 → 1.0.5)
  - **Implementation**: Python decorator pattern with `@functools.wraps`
    - Single `retry_on_auth_error()` decorator (~15 lines)
    - Catches R2RException with status_code 401/403
    - Invalidates cached client, re-authenticates, retries once
    - Applied to: search, rag, put_document, list_documents, get_document, delete_document
  - **Rationale**: When R2R server restarts, all auth tokens are invalidated; decorator automatically handles re-authentication
  - **Impact**: No Cursor restart needed after server restart, seamless user experience
  - **Documentation Updated**: `ims-mcp-server/README.md` (Troubleshooting section), `docs/CONTEXT.md` (Features)
  - **Code Quality**: DRY principle, single source of truth, Pythonic, testable, maintainable

### Recent Operations (2025-12-31)

- ✅ **Added GitHub Copilot Installation Instructions to README.md** - Comprehensive setup guide for VS Code and JetBrains
  - **Modified File**: `README.md`
  - **New Sections**: 
    - "Install in GitHub Copilot (VS Code)" - MCP configuration using `.vscode/mcp.json` format
    - "Install in GitHub Copilot (JetBrains)" - MCP configuration using JetBrains format
  - **Pattern**: Follows same two-step approach as other IDE installations (Cursor, Claude Code, Windsurf)
  - **Bootstrap Location**: `.github/copilot-instructions.md` (CORE root rule file for GitHub Copilot)
  - **Consistency**: Uses identical KnowledgeBase MCP server configuration across all IDEs
  - **Reference**: Based on Context7 README example and `instructions/configure/r1/github-copilot.md`

### Recent Operations (2025-12-30)

- ✅ **Changed list_documents default to compact_view=True** - Improved UX for document listing (v1.0.4)
  - **Modified Files**: 
    - `ims-mcp-server/ims_mcp/server.py` (compact_view default changed)
    - `ims-mcp-server/pyproject.toml` (version: 1.0.3 → 1.0.4)
    - `ims-mcp-server/ims_mcp/__init__.py` (version: 1.0.3 → 1.0.4)
  - **Change**: `compact_view: bool = False` → `compact_view: bool = True`
  - **Rationale**: Compact view (ID + title only) is more practical as default for most use cases
  - **Impact**: Users now get cleaner output by default; can still use `compact_view=False` for full details
  - **Documentation Updated**: `docs/CONTEXT.md`, `ims-mcp-server/README.md`

- ✅ **Published IMS MCP to PyPI** - First public release of the IMS MCP package
  - **Package Name**: `ims-mcp` (v1.0.0, updated to v1.0.1)
  - **PyPI URL**: https://pypi.org/project/ims-mcp/
  - **Installation**: `pip install ims-mcp` or `uvx ims-mcp`
  - **Build Process**: 
    - Used `python -m build` with setuptools backend
    - Generated wheel (`.whl`) and source distribution (`.tar.gz`)
    - Validated with `twine check dist/*`
    - Published via `twine upload` using project-scoped API token
  - **Package Structure**:
    - Module: `ims_mcp` (Python package)
    - Entry point: `ims-mcp` command (console script)
    - Dependencies: `r2r>=3.6.0`, `mcp>=1.0.0`
    - Python support: >=3.10
  - **Documentation**: Comprehensive README with usage examples for Cursor, Claude Desktop, and other MCP clients
  
- ✅ **Created GitHub Actions CI/CD Pipeline** - Automated build, test, and deployment
  - **File**: `.github/workflows/publish-ims-mcp.yml`
  - **Trigger**: Push to `main` branch with changes in `ims-mcp-server/` directory
  - **Workflow Steps**:
    1. Checkout code
    2. Set up Python 3.12
    3. Install build tools (build, twine, pytest)
    4. Build package with `python -m build`
    5. Validate package with `twine check`
    6. Run tests (if tests directory exists)
    7. **Check version on PyPI** using JSON API (curl-based, most reliable)
    8. Publish to PyPI only if version is new
    9. Display success/skip message
  - **Version Checking Logic**:
    - Uses PyPI JSON API: `https://pypi.org/pypi/ims-mcp/{version}/json`
    - HTTP 200 = version exists, **FAIL pipeline** with clear error message
    - HTTP 404 = new version, proceed with publishing
    - **Bug Fixed**: Original implementation used `pip index versions | grep` which had false positives
    - **Solution**: Direct API check is more reliable and avoids broken pipe errors
  - **Security**: Uses `IMS_MCP_PYPI_PASSWORD` repository secret for authentication
  - **Features**:
    - Smart version detection prevents duplicate publish attempts
    - **Pipeline fails if version exists** with actionable error message
    - Clear instructions to increment version in both files
    - Shows PyPI package URL on success
  
- ✅ **Version Management Best Practices**
  - Version must be updated in two files before publishing:
    1. `ims-mcp-server/pyproject.toml` (version field)
    2. `ims-mcp-server/ims_mcp/__init__.py` (__version__ variable)
  - PyPI does not allow re-publishing the same version
  - Workflow automatically detects and skips duplicate versions
  - Current version: 1.0.4 (ready for next publish)

### Recent Operations (2025-12-19)

- ✅ **aia-r1 Collection Refresh** - Cleaned up and republished all instructions
  - **Cleanup**: Deleted 80 documents from aia-r1 collection (68.09s)
  - **Publish**: Published 50 instruction files to aia-r1 (626.70s, ~12.5s per file)
  - **Result**: Fresh aia-r1 collection with current instruction set
  - **Environment**: Local IMS server (http://localhost:7272)
  - **Commands Used**: `cleanup-collection --collection aia-r1 --force`, `publish ../instructions`

### Recent Operations (2025-12-14)

- ✅ **Added Collection Naming Documentation** - Clarified collection naming convention across both READMEs
  - **Updated Files**: `README.md`, `tools/README.md`
  - **README.md Changes**:
    - New Section: "Collection Naming" (lines 141-172)
    - Collection naming table (aia, aia-r1, aia-r2, aia-r3)
    - Template explanation: `aia-{release}`
    - Collection resolution workflow
    - Status indicators: ✅ Active (r1), 🚧 Development (r2), 📋 Planned (r3)
    - Example showing release detection and collection resolution
    - MCP configuration example
  - **tools/README.md Changes**:
    - Enhanced "Collection Resolution" section (lines 467-481)
    - Added collection table with purpose and status
    - Added step 4: "Create collection if it doesn't exist"
  - **Rationale**: Users needed clarity on how collections are automatically created and the relationship between release folders and collection names
  - **Key Clarifications**:
    - `aia` = Base collection (fallback)
    - `aia-r1` = Current production release
    - `aia-r2` = Future release

- ✅ **README Documentation Consistency Update** - Ensured all README files consistently document ims_cli commands
  - **Updated Files**: `README.md`, `tools/README.md`
  - **Changes**: Added missing cleanup-collection options to both files
  - **New Examples Added**:
    - `--prefix <prefix>` - Selective deletion by title prefix (4 examples added)
    - `--dry-run` - Preview deletions before executing (2 examples added)
    - Combined usage patterns (e.g., `--prefix aqa --dry-run`)
  - **Verification**: Created `/plans/README-VERIFICATION-COMPLETE.md` with full consistency checklist
  - **Result**: 100% consistency - all 5 commands and all flags now documented in both README files
  - **Files Modified**: `README.md` (lines 195-230), `tools/README.md` (lines 130-150)

- ✅ **Enhanced cleanup-collection with Prefix Filter** - Added ability to selectively delete documents
  - **New Parameter**: `--prefix` to filter documents by title prefix (e.g., `--prefix aqa` deletes all "aqa*" documents)
  - **New Parameter**: `--dry-run` to preview what would be deleted without actually deleting
  - **Use Cases**:
    - Cleanup test documents: `cleanup-collection --collection aia-r1 --prefix test --dry-run`
    - Remove obsolete documents: `cleanup-collection --collection aia-r1 --prefix legacy`
    - Safe preview before deletion: Always use `--dry-run` first to verify
  - **Examples**:
    - Preview all "aqa" documents: `python ims_cli.py cleanup-collection --collection aia-r1 --prefix aqa --dry-run`
    - Delete all "backend" documents: `python ims_cli.py cleanup-collection --collection aia-r1 --prefix backend --force`
  - **Technical Implementation**:
    - Client-side filtering after fetching documents from collection
    - Checks document title with `startswith()` method
    - Works with both dict and object document formats
  - **Files Modified**: `tools/ims_cli.py`
  - **Documentation Updated**: `docs/CONTEXT.md`, `agents/IMPLEMENTATION.md`

### Recent Operations (2025-12-12)

- ✅ **Updated CLI Tool User Messages** - Changed user-facing text in `ims_cli.py`
  - Module docstring: "IMS CLI Tool" → "Rosetta CLI Tool"
  - Description: "publishing to IMS" → "publishing to Rosetta"
  - Argument parser: "IMS R2R Tools" → "Rosetta Tools"
  - Technical names preserved: `ims_cli.py`, `IMSAuthManager`, `IMSConfig`, imports unchanged

- ✅ **Enhanced README Overview** - Added comprehensive overview section
  - **New Sections**: Overview, Core Principles
  - **Key Additions**: 
    - Agent-agnostic design philosophy
    - Prepare-Research-Plan-Act workflow
    - Incremental loading and classification system
    - Evidence-based approach (references, assumptions, unknowns)
    - Meta-prompting and feature alignment
    - Battle-tested status and community-driven development
  - **Features Split**: Platform features vs Prompts & Rules features
  - **Confluence Link**: Added link to complete Rosetta documentation
    - URL: https://griddynamics.atlassian.net/wiki/spaces/DEX/pages/3903881253/Rosetta+-+Enterprise+Engineering+Governance+and+Instructions+Management+System
    - Prominent "Learn More" callout after Overview section
    - Primary reference in Support section
  - **Impact**: Clearer value proposition and comprehensive feature list

- ✅ **Brand Rename: IMS → Rosetta** - Public project name updated to Rosetta
  - **Full Name**: "Rosetta (Enterprise Engineering Governance and Instructions Management System)"
  - **Documentation Updated**: README.md, CONTEXT.md, IMPLEMENTATION.md, QUICKSTART.md, tools/README.md, ims-mcp-server/README.md
  - **Naming Rules**: "Rosetta" = project name, "IMS server" = technical component, `ims_*` = file/package names
  - **Rationale**: Similar to PostgreSQL naming - "PostgreSQL" is public name, "Postgres server" is component, `pg_*` is convention
  - **Plan**: `plans/RENAME-ROSETTA-PLAN.md`

### Recent Operations (2025-12-11)

- ✅ **Validation Complete: R2R → IMS Rebrand** - All changes verified and working
  - **Files Renamed**: 4 Python files (r2r_*.py → ims_*.py)
  - **Imports Updated**: All references to IMSConfig, IMSAuthManager, ContentPublisher
  - **MCP Package**: ims-mcp-server created with ims_mcp module (v1.0.0)
  - **CLI Functional**: `verify` and `list-collection` commands tested successfully
  - **Documentation**: README, CONTEXT, QUICKSTART, tools/README updated
  - **R2R SDK Preserved**: r2r.toml, `python -m r2r.serve`, R2R_* env vars, "R2R Light" refs
  - **No Linter Errors**: All Python files compile cleanly
  - **Fixed Issues**: 
    - Corrected 2 references to R2RAuthManager → IMSAuthManager in ims_cli.py
    - Updated tools/README.md class names and file references
  - **Plan**: `plans/REMOVE-R2R-REFERENCES-PLAN.md` (fully implemented)

- ✅ **End-to-End Testing Complete: aia-r1 Collection** - All features validated, ZERO ERRORS
  - **Issue Fixed**: verify command now properly handles local mode (no credentials)
  - **Collection**: aia-r1 with 50 documents (was 31, added 19 new files)
  - **Test 1**: Connection verify (local mode health check via collections.list) ✓
  - **Test 2**: Publish entire instructions folder (45 files, 20 new, 25 skipped) ✓
  - **Test 3**: List collection (50 docs total, all present) ✓
  - **Test 4**: Change detection revalidation (all 45 files skipped, 0 published) ✓
  - **Performance**:
    - Initial publish: 190.97s for 20 files (~9.5s per file with OpenAI embeddings)
    - Change detection: 15.90s for 45 files (~0.35s per file, **96% faster**)
    - List collection: ~1s for 50 documents
  - **Key Features Validated**:
    - MD5 hash-based change detection working perfectly
    - Automatic collection resolution (r1 → aia-r1)
    - Metadata extraction from folder structure
    - Upsert semantics (same UUID for same file path)
    - Recursive directory publishing
    - Local mode authentication handling
  - **Critical Fix Applied**:
    - `ims_auth.py`: verify_connection() now checks for credentials before login
    - Local mode: Uses collections.list() as health check
    - Remote mode: Uses users.login() for authentication
    - Result: **ZERO ERRORS** in all commands

### Previous Operations (2025-12-11)
- ✅ **Comprehensive Rebrand: CueBase → IMS with KB + R2R → IMS** - Complete project rebrand
  
  **Phase 1: Project Name** (CueBase → IMS with KB)
  - **Full Name (README.md only)**: "IMS with KB (Instruction Management Systems with Engineering Knowledge Base)"
  - **Short Name (All other files)**: "IMS"
  - **Technical Plan**: `plans/RENAME-IMS-KB-PLAN.md`
  - **Note**: Later renamed to "Rosetta" (see 2025-12-12 operations)
  
  **Phase 2: File Renames & Implementation Details** (R2R → IMS)
  - **Python Files Renamed** (4 files):
    - `tools/r2r_cli.py` → `tools/ims_cli.py`
    - `tools/r2r_auth.py` → `tools/ims_auth.py`
    - `tools/r2r_config.py` → `tools/ims_config.py`
    - `tools/r2r_publisher.py` → `tools/ims_publisher.py`
  
  - **Class Names Updated**:
    - `R2RConfig` → `IMSConfig`
    - `R2RAuthManager` → `IMSAuthManager`
    - `InstructionPublisher` → `ContentPublisher`
  
  - **MCP Package Created**:
    - Copied `r2r-mcp-server/` → `ims-mcp-server/` (kept original)
    - Package name: `r2r-mcp` → `ims-mcp` (v1.0.0)
    - Module name: `r2r_mcp` → `ims_mcp`
    - Command: `uvx r2r-mcp` → `uvx ims-mcp`
  
  - **Documentation Updated** (7+ files):
    - `README.md` - All user-facing R2R → IMS (later → Rosetta)
    - `docs/CONTEXT.md` - All user-facing R2R → IMS (later → Rosetta)
    - `docs/QUICKSTART.md` - Command references updated
    - `tools/README.md` - Tool references updated
    - `tools/setup.sh` - CLI references updated
    - All command examples: `python r2r_cli.py` → `python ims_cli.py`
  
  - **Preserved (R2R SDK Requirements)**:
    - `tools/r2r.toml` - R2R configuration file (unchanged)
    - `python -m r2r.serve` - R2R SDK command (unchanged)
    - `R2R_*` environment variables - SDK compatibility (unchanged)
    - "R2R Light" - Official product name (unchanged)
    - `from r2r import R2RClient` - External SDK import (unchanged)
  
  - **Impact**:
    - All CLI commands now use `ims_cli.py` instead of `r2r_cli.py`
    - MCP configuration uses `ims-mcp` package
    - Collection descriptions show "Rosetta Knowledge" after next publish
    - R2R SDK remains as underlying technology (like PostgreSQL in a DB app)
  
  - **Technical Plan**: `plans/REMOVE-R2R-REFERENCES-PLAN.md`

### Recent Operations (2025-11-26)
- ✅ **AQA (Automated QA) Flow Implementation** - New agent flow for test automation
  1. **Main Orchestrator**: `instructions/agents/r1/aqa.md` (~100 lines)
     - Sequential 6-phase execution model
     - State tracking via `agents/aqa-state.md`
     - HITL approval gate at Phase 4
     - Similar pattern to `modernization.md` flow
  
  2. **Phase Files** (6 files, ~100-120 lines each):
     - `aqa-phase1.md` - Requirements & Discovery (Fetch, Git, grep MCPs)
     - `aqa-phase2.md` - Test Strategy Planning (Context7, codebase_search)
     - `aqa-phase3.md` - Test Scenario Design (sequential-thinking MCP)
     - `aqa-phase4.md` - Test Case Specification (Given-When-Then, HITL gate)
     - `aqa-phase5.md` - Test Implementation (Git, Playwright MCP)
     - `aqa-phase6.md` - Execution & Reporting (Terminal, coverage analysis)
  
  3. **Agent Classification**: Updated `agents.md` with "aqa-md" classification
     - Triggers: "write tests for X", "QA automation for Y", "test coverage for Z"
     - Distinct from coding flow (QA-first vs implementation-first)
  
  4. **Key Features**:
     - Test automation lifecycle: requirements → scenarios → test cases → implementation → execution
     - Coverage target: 80%+ line, 70%+ branch
     - Test isolation: 1-second timeout, mocked externals (unit tests)
     - Scenario testing: Given-When-Then format for complex logic
     - Priority-based implementation: P0 → P1 → P2 → P3
     - E2E testing: Playwright MCP integration
  
  5. **Documentation Updates**:
     - `docs/CONTEXT.md` - Added AQA workflow section
     - `plans/AQA-FLOWS-PLAN.md` - Technical plan (10-12 hour implementation)
  
  6. **Design Principles**:
     - AI-focused instructions (brief, terms, no explanations)
     - Single source of truth per file
     - Evidence-based testing (all tests reference actual code)
     - Follow existing codebase patterns (grep for examples)

### Recent Operations (2025-11-25)
- ✅ **Enhanced R2R MCP Server (v0.1.3)** with two new capabilities:
  1. **`delete_document(document_id)`** - New MCP tool to delete documents by ID
     - Simple wrapper around R2R SDK's `client.documents.delete()`
     - Clear error handling for not found, permission, and network errors
     - Returns success message with document ID or descriptive error
     - ~30 lines of implementation in `r2r-mcp-server/r2r_mcp/server.py`
  
  2. **Tag Filtering in `list_documents()`** - Enhanced existing tool with optional filtering
     - New parameters: `tags: list[str]` and `match_all_tags: bool = False`
     - **ANY mode** (default): Document must have at least one provided tag
     - **ALL mode** (`match_all_tags=True`): Document must have all provided tags
     - Client-side filtering after fetching from R2R (R2R's list API doesn't support metadata filters)
     - Handles both list and string tag formats in document metadata
     - ~25 lines added to existing function
  
- ✅ **Version Updates**:
  - Bumped version to 0.1.3 in `pyproject.toml` and `__init__.py`
  - Built new distribution files: `r2r_mcp-0.1.3-py3-none-any.whl` and `r2r_mcp-0.1.3.tar.gz`
  
- ✅ **Documentation Updates**:
  - Updated `r2r-mcp-server/README.md` with delete_document tool and tag filtering examples
  - Updated `docs/CONTEXT.md` with new tools (now 6 tools total)
  - Updated `agents/IMPLEMENTATION.md` version history
  - Created technical plan: `plans/MCP-DELETE-AND-TAG-FILTER-PLAN.md`
  
- ✅ **Key Design Decisions**:
  - Tag filtering is client-side for simplicity and backwards compatibility
  - For large collections needing complex filtering, users should use `search()` with metadata filters
  - All changes are backwards compatible (new parameters are optional)

### Recent Operations (2025-11-04)
- ✅ Updated `instructions/configure/r1/cursor.md` Commands section with custom command configuration
  - Documented how to create custom slash commands in `.cursor/commands/` directory
  - Added example command files: review-code.md, write-tests.md, add-docs.md, refactor.md
  - Included command best practices and usage instructions
  - Updated file structure example to include commands directory
  - Enhanced Migration and Sharing section to include commands

- ✅ Updated `instructions/configure/r1/github-copilot.md` with custom agents and slash commands
  - Added Custom Agents section (`.github/copilot-agents/` directory configuration)
  - Example agents: test-specialist, code-reviewer, implementation-planner, doc-writer
  - Documented agent tools configuration and best practices
  - Added Slash Commands section clarifying built-in commands are NOT customizable
  - Built-in slash commands: /doc, /explain, /fix, /tests, /help
  - Comparison table showing Custom Agents ✅ YES, Custom Slash Commands ❌ NO
  - Updated file structure to include copilot-agents directory
  - Enhanced comparison tables with Cursor and Claude Code
  - Clarified that GitHub Copilot supports custom agents (@agent-name syntax) but not custom slash commands

- ✅ Updated `instructions/configure/r1/claude-code.md` with comprehensive configuration guide
  - **EMPHASIZED `.claude/claude.md` as ROOT CORE RULES/INSTRUCTION FILE** (bootstrap, highest priority)
  - Added Root Configuration File section with comprehensive claude.md example
  - Documented why claude.md is critical (always read first, acts as bootstrap, single source of truth)
  - Added Custom Slash Commands section (`.claude/commands/*.md`)
  - Example commands: review, deploy, test, doc with bash execution and arguments
  - Advanced features: arguments/placeholders ($1, $2, $ARGUMENTS), bash execution (!`cmd`), file references (@)
  - Added Agent Skills section (`.claude/skills/*/SKILL.md` - autonomous capabilities)
  - Added Plugins section (installable bundles via marketplaces, team distribution)
  - Updated file structure example showing claude.md at top with warning icon
  - Added comprehensive comparison table: Claude Code vs Cursor vs GitHub Copilot
  - Unique features: Skills ✅, Plugins ✅, Root claude.md ✅
  - Enhanced version control section emphasizing claude.md must be committed first
  - Added configuration hierarchy: claude.md → settings.json → commands → agents → skills
  - Documented custom slash commands ✅ YES (unlike GitHub Copilot ❌ NO)
  - **Added Multi-Agent Orchestration & Workflows section** with key orchestration patterns
  - **Added Production-Ready Community Resources section** featuring:
    - wshobson/agents (⭐ 19.8k) - 63 plugins, 85 agents, 47 skills, 15 orchestrators
    - wshobson/commands - 57 production slash commands (15 workflows + 42 tools)
  - Highlighted hybrid model orchestration (Haiku + Sonnet optimization)
  - Emphasized workflow examples: full-stack, security hardening, data-driven features
  - Stressed these are HIGHLY RECOMMENDED production-ready resources

### Previous Operations (2025-10-31)
- ✅ Added Onboard Mode (`onboard.md`) for codebase learning
- ✅ Updated agent classification to include "onboard-md"
- ✅ Integrated Repomix MCP + KnowledgeBase MCP for codebase onboarding
- Features: auto-detection (name, version, tech stack), Learning Flow generation, compressed XML
- ✅ Enhanced metadata extraction in `r2r_publisher.py` to add title as a tag for improved searchability
  - Title field: Only for text files (.md, .txt)
  - Title as tag: Added for ALL files (text and binary)
  - Verified: Published 22 files (203.78s), all files now have title tags (e.g., "agents.md")
  - Change detection tested: Second publish skipped all 22 unchanged files (6.71s, 97% faster)

### Previous Operations (2025-10-27)
- ✅ Published instructions to local R2R (7 changed files: backend-java.md, frontend-react.md, frontend-angular.md, frontend-typescript.md, frontend-vue.md, backend-rust.md, init.md; 8 unchanged skipped, ~74s)
- Collections: `aia` (bootstrap), `aia-r1` (agent instructions + development instructions)
- Added frontend development instructions: React, Angular, Vue, TypeScript
- Added backend development instruction: Rust
- Change detection working: efficiently skipping unchanged files

### Implemented Components

#### 1. Configuration Module (`tools/r2r_config.py`)
- ✅ Environment variable management with python-dotenv
- ✅ Support for multiple environments (local, dev, test, production)
- ✅ Secure credential storage in `.env` file
- ✅ Configurable collection name (default: "aia")
- **Key features**: `R2RConfig.from_env()`, credential saving

#### 2. Authentication Module (`tools/r2r_auth.py`)
- ✅ User login with R2R
- ✅ Direct password change with `client.users.change_password()`
- ✅ Password validation (min 8 characters)
- ✅ Automatic credential update in `.env` after password change
- ✅ Connection verification
- **API Used**: `client.users.login()`, `client.users.change_password()`, `client.users.logout()`

#### 3. Publisher Module (`tools/r2r_publisher.py`)
- ✅ Folder-based recursive publishing
- ✅ Single file publishing
- ✅ Automatic metadata extraction from folder structure
- ✅ Upsert semantics using file-path-based document IDs
- ✅ **MD5 Hash-Based Change Detection** (2025-10-05)
  - Stores `content_hash` in R2R document metadata
  - **Hashes both content AND metadata** (tags, domain, release)
  - Detects changes to file content OR folder structure/tags
  - Compares hashes before publishing to skip unchanged files
  - Retrieves existing documents via `client.documents.retrieve(doc_id)`
  - Performance: ~77% faster for typical workflows (5 files, 1 changed: 66s → 15s)
- ✅ Collection management (auto-create if not exists)
- ✅ Dry-run mode for testing
- ✅ Force mode (`--force` flag) to bypass change detection
- ✅ Comprehensive error handling and reporting
- **Key features**: `publish_folder()`, `publish_file()`, `_has_content_changed()`, metadata extraction

#### 4. CLI Interface (`tools/ims_cli.py`)
- ✅ **MUST use CLI interface for ALL IMS operations**
- ✅ Command: `publish` - Upload instructions to IMS
  - `--dry-run` flag for testing without publishing
  - `--force` flag to republish all files ignoring change detection (2025-10-05)
- ✅ Command: `change-password` - Change user password securely
- ✅ Command: `verify` - Test connection and authentication
- ✅ Command: `list-collection` - List documents in a collection
- ✅ Command: `cleanup-collection` - Delete documents from a collection (enhanced 2025-12-14)
  - `--prefix` filter to delete only documents with matching title prefix
  - `--dry-run` flag to preview what would be deleted without actually deleting
  - `--force` flag to skip confirmation prompt
- ✅ Global options: `--env`, `--dry-run`, `--force` (publish only)
- ✅ **Performance timing** - All commands show execution time breakdown
  - Authentication time (when applicable)
  - Total execution time
  - Helps identify bottlenecks (embedding generation ~10-13s per file)
- **Entry point**: `python ims_cli.py <command>`

#### 5. Supporting Files
- ✅ `requirements.txt` - Python dependencies (r2r>=3.0.0, python-dotenv>=1.0.0)
- ✅ `env.template` - Configuration template
- ✅ `.gitignore` - Protects sensitive credentials
- ✅ `README.md` - Comprehensive usage documentation

#### 6. Local R2R Light Server (2025-10-05)
- ✅ `local.env` - Local R2R Light config (copy to `.env` to activate)
  - **Server config**: R2R_POSTGRES_* for running local R2R Light
  - **Client config**: R2R_BASE_URL for CLI to connect (no auth in local mode)
- ✅ `remote.env` - Remote R2R publishing config (copy to `.env` to activate)
- ✅ `r2r.toml` - R2R Light server configuration
- ✅ `run-server.sh` - Local server startup script
  - **Port conflict detection**: Uses `lsof` to detect if port is in use
  - **Defensive behavior**: Detects but doesn't auto-kill existing servers
  - **Helpful suggestions**: Shows PID, command, and kill instructions
  - **Configuration awareness**: Warns that old config may be running
- **Backend**: Supabase PostgreSQL (free tier, Session Mode Pooler)
- **Connection**: aws-1-us-east-1.pooler.supabase.com:5432
- **Local URL**: http://localhost:7272 (auth disabled for dev)
- **Features**: Full R2R Light functionality with persistent storage
- **CLI Tested**: ✅ verify, ✅ publish commands working
- **Documentation**: Port conflict handling documented in `run-server.sh` script

#### 7. Cursor KnowledgeBase MCP Integration (2025-10-05, Enhanced 2025-10-19, Fixed 2025-10-20, Extended 2025-10-31, Published 2025-12-30, Updated v1.0.4 on 2025-12-30)
- ✅ `.cursor/mcp.json` - MCP server configuration for Cursor
- ✅ MCP server available as PyPI package: `ims-mcp` (v1.0.4)
- ✅ Connected to **local IMS server** at http://localhost:7272
- ✅ Target collection: `aia-r1`
- ✅ No authentication required (local dev mode)
- ✅ **Parameter Type Fix** (2025-10-20):
  - Changed integer parameters to `float` type to accept JSON "number" type from Cursor
  - Convert to `int` internally before passing to R2R API
  - Fixes validation error: "Parameter 'limit' must be one of types [integer, null], got number"
  - Affected functions: `search()`, `rag()`, `list_documents()`
  - Root cause: Cursor serializes numeric literals as generic "number" type
  - Solution: Accept `float` (maps to JSON "number"), convert to `int` in function body
- ✅ **Enhanced Tools** (2025-10-19):
  - **`search()`** - Advanced search with metadata filtering
    - Optional parameters: `filters`, `limit`, `use_semantic_search`, `use_fulltext_search`
    - Filter operators: `$eq`, `$neq`, `$gt`, `$gte`, `$lt`, `$lte`, `$like`, `$ilike`, `$in`, `$nin`
    - Example: `search("agents", filters={"tags": {"$in": ["r1"]}})`
  - **`rag()`** - RAG with filtering and generation config
    - Optional parameters: `filters`, `limit`, `model`, `temperature`, `max_tokens`
    - Control LLM behavior per query
  - **`put_document()`** - Upload/update documents with true upsert semantics
    - Parameters: `content`, `title`, `metadata?`, `document_id?`
    - Uses UUID5 for deterministic IDs (same title = same UUID)
    - Automatically handles updates via delete+recreate when document exists
  - **`get_document()`** - Retrieve a single document by ID or title (2025-10-31)
    - Parameters: `document_id?`, `title?` (at least one required)
    - Title search: case-insensitive exact match
    - If multiple documents match title, returns list of IDs
    - Returns full document details including metadata, chunks (first 3), and summary
    - Handles document not found errors gracefully
  - **`list_documents()`** - List documents with pagination
    - Parameters: `offset?`, `limit?`, `document_ids?`, `compact_view?`
    - Compact mode: Just ID and title
    - Full mode (default): All details including metadata, status, size, dates, summary
- ✅ **Backwards Compatibility**: All existing calls work unchanged
- **Installation**:
  - **PyPI Package** (recommended): `uvx ims-mcp` or `pip install ims-mcp`
  - **Alternative**: Uses absolute path to local `r2r/mcp.py` for development
- **Features**: 
  - Query AI agent instructions directly from Cursor
  - Advanced metadata filtering for precise results
  - Configurable search and generation behavior
  - Document management from IDE
  - Real-time RAG integration in IDE
  - Uses R2R Python SDK (r2r 3.6+)
  - Zero-config via environment variables (R2R_API_BASE, R2R_COLLECTION)
- **Documentation**: Integrated into `CONTEXT.md` and `IMPLEMENTATION.md`
- **CI/CD**: Automated publishing via GitHub Actions on main branch updates
- **Note**: To reload changes, disable/enable MCP server in Cursor settings (no restart needed)

#### 8. Onboard Mode (`instructions/agents/r1/onboard.md`) (2025-10-31)
- ✅ New agent mode for codebase onboarding and learning
- ✅ **Classification**: "onboard-md" added to agent classification system
- ✅ **Workflow**: 4-phase process (Discovery, Analysis, Publishing, Verification)
- ✅ **Auto-Detection**:
  - Project name: from package.json, pyproject.toml, pom.xml, Cargo.toml, or directory name
  - Version: from package files or "unknown"
  - Tech stack: from file extensions and package managers (nodejs, python, java, rust, etc.)
- ✅ **Repomix Integration**:
  - Uses `mcp_repomix_pack_codebase` with compression enabled (Tree-sitter)
  - Generates compact XML (signatures + structure, ~70% smaller)
  - Focus: "how to use it" not full implementation
- ✅ **Learning Flow Generation**:
  - Extracts usage steps from README and project structure
  - Format: XML comments with phases (3-5 words per step)
  - Example: "<!-- Phase 1: Setup -->", "<!--   - Install dependencies -->"
  - Prepended to XML before publishing
- ✅ **KnowledgeBase Publishing**:
  - Title format: `{project-name}-usage`
  - Tags: `["codebase", "{project-name}", "usage", ...tech-tags, ...version]`
  - Domain: "codebase"
  - Uses `mcp_KnowledgeBase_put_document` with upsert semantics
- ✅ **Verification**:
  - Searches by project name and "usage" tag
  - Displays Learning Flow summary
  - Confirms: "AI can now understand how to use {project-name}"
- **Features**: Minimal user interaction (1 question), auto-detects everything else, generates AI-readable documentation

#### 9. IMS MCP PyPI Package (`ims-mcp`) (2025-10-31, updated v1.0.4 on 2025-12-30)
- ✅ Published as standalone PyPI package on PyPI
- ✅ **Package Name**: `ims-mcp` (installable via `pip install ims-mcp` or `uvx ims-mcp`)
- ✅ **PyPI URL**: https://pypi.org/project/ims-mcp/
- ✅ **Version**: 1.0.4 (latest)
- ✅ **Previous Names**: Originally `r2r-mcp` (v0.1.x), renamed to `ims-mcp` as part of IMS rebrand
- ✅ **Structure**: Modern Python package with `pyproject.toml`
  - `ims_mcp/__init__.py` - Package metadata (`__version__ = "1.0.1"`)
  - `ims_mcp/server.py` - FastMCP server with 6 tools
  - `ims_mcp/__main__.py` - Entry point for module execution
  - `pyproject.toml` - Package config (MIT license, dependencies, entry points)
  - `README.md` - Comprehensive usage documentation
  - `LICENSE` - MIT license
  - `PUBLISHING.md` - Publishing guide for maintainers
  - `SECURITY.md` - Security considerations
  - `QUICKSTART.md` - Quick start guide
- ✅ **Entry Points**:
  - Console script: `ims-mcp` command (via `ims_mcp.server:main`)
  - Module execution: `python -m ims_mcp`
- ✅ **Environment Configuration**: Zero-config via environment variables
  - `R2R_API_BASE` or `R2R_BASE_URL`: Server URL
  - `R2R_COLLECTION`: Collection name
  - `R2R_API_KEY`: Authentication (optional)
- ✅ **Dependencies**: `r2r>=3.6.0`, `mcp>=1.0.0`
- ✅ **Build System**: setuptools with modern pyproject.toml (PEP 621)
- ✅ **License**: MIT license (powered by R2R technology)
- ✅ **Distribution Files**:
  - `dist/ims_mcp-1.0.4-py3-none-any.whl` (wheel)
  - `dist/ims_mcp-1.0.4.tar.gz` (source)
- ✅ **Version History**:
  - v0.1.0-0.1.3: Initial releases as `r2r-mcp`
  - v1.0.0: Rebranded to `ims-mcp`, first public PyPI release (2025-12-30)
  - v1.0.1-1.0.3: Incremental improvements
  - v1.0.4: Changed list_documents default to compact_view=True (2025-12-30)
- ✅ **CI/CD**: GitHub Actions workflow for automated publishing
  - Auto-triggered on changes to `ims-mcp-server/` in main branch
  - Smart version detection (skips duplicate versions)
  - Uses repository secret for PyPI authentication
- ✅ **Installation Methods**:
  - `uvx ims-mcp` (recommended, zero install)
  - `pip install ims-mcp` (from PyPI)
  - `pip install -e .` (development mode from source)
- ✅ **Use Cases**:
  - Cursor IDE MCP integration
  - Claude Desktop integration
  - Any MCP-compatible client
- **Features**: 
  - 6 MCP tools: search, rag, put_document, list_documents, get_document, delete_document
  - Tag filtering in list_documents (ANY/ALL modes)
  - Environment-based configuration (zero config required)
  - Portable and distributable
  - Connects to IMS (Rosetta) servers powered by R2R

### File Structure
```
/ims-mcp-server/            # PyPI Package (standalone directory)
  ims_mcp/                  # Python package
    __init__.py             # Package metadata (version 1.0.1)
    server.py               # FastMCP server with 6 tools
    __main__.py             # Module entry point
  pyproject.toml            # Package configuration
  README.md                 # Package documentation
  PUBLISHING.md             # Publishing guide
  QUICKSTART.md             # Quick start guide
  SECURITY.md               # Security documentation
  LICENSE                   # MIT license
  .gitignore                # Ignore build artifacts
  dist/                     # Built distributions (generated)
    ims_mcp-1.0.1-py3-none-any.whl
    ims_mcp-1.0.1.tar.gz

/.github/
  workflows/
    publish-ims-mcp.yml     # CI/CD pipeline for automated publishing

/tools/
  # RAGFlow Publishing Tools
  ims_cli.py              # CLI interface (1127 lines)
  ims_publisher.py        # Publishing logic (928 lines)
  ims_auth.py             # Authentication (136 lines)
  ims_config.py           # Configuration management (340 lines)
  ragflow_client.py       # RAGFlow SDK wrapper (716 lines)
  
  # Configuration Files
  env.template            # Environment configuration template
  .env.local              # Local RAGFlow config (example)
  .env.remote             # Remote RAGFlow config (example)
  .env                    # Active config (created from templates, gitignored)
  
  # Dependencies
  requirements.txt        # Python dependencies (ragflow-sdk==0.22.1)
  README.md               # RAGFlow tools documentation (1123 lines)
  venv/                   # Virtual environment

/r2r/
  # Cursor MCP Integration
  mcp.py              # Enhanced KnowledgeBase MCP server (346 lines)
                      # Tools: search(), rag(), put_document(), list_documents()

agents/
  # Architecture & Design
  CONTEXT.md                  # Project architecture and design (primary source of truth)
  IMPLEMENTATION.md           # Implementation status (this file)
  
  # Technical Guides
  ENV_SWITCHING.md            # Environment switching guide (detailed)
  
  # User Guides
  QUICKSTART.md               # Comprehensive quick start guide (local dev + publishing)
```

### Technical Implementation Details

#### Document Publishing Flow
1. Authenticate with RAGFlow using API key from `.env`
2. Ensure dataset exists (create if needed using template: aia-{release})
3. Scan for `.md` files in target folder
4. For each file:
   - Generate deterministic document ID from file path (UUID5-based)
   - Extract metadata from folder structure (tags, domain, release)
   - Calculate content hash (MD5) for change detection
   - Check if document exists and compare hashes
   - Skip if unchanged, upload if new/changed
   - Apply tag-in-title format: [tag1][tag2] filename.ext
5. Wait for parsing to complete (with configurable timeout)
6. Report results summary (published, skipped, failed)

#### Metadata Extraction Strategy
- **Folder names** → **tags**: Each folder becomes a tag
- **First folder** → **domain**: e.g., "instructions", "business"
- **Release folders** (r1, r2, r3...) → **release** field
- **Filename** → preserved with extension in title
- **Title format**: `[tag1][tag2][tag3] filename.ext` for server-side filtering
- **Tags stored in two places**:
  1. **Title**: For fast server-side keyword search
  2. **Metadata**: For precise client-side filtering
- **Content hash** → **content_hash** metadata (MD5 of file content)
  - Used for change detection
  - Stored in document metadata
  - Compared before each upload to skip unchanged files

#### Upsert Semantics
- Document ID derived from file path ensures idempotence (UUID5-based)
- Republishing same file updates existing document (no duplicates)
- Change detection compares content hashes to skip unchanged files
- Dataset auto-created if doesn't exist (using template: aia-{release})

## Technical Stack

- **Language**: Python 3.12-3.14 (required by ragflow-sdk 0.23.1)
- **SDK**: RAGFlow SDK (`ragflow-sdk>=0.23.1`)
- **Environment**: Virtual environment (venv)
- **Configuration**: python-dotenv for environment management
- **Authentication**: API key-based (generated via RAGFlow UI)
- **Backend**: RAGFlow (via Docker Compose or remote instance)
  - Built-in MySQL, Redis, Document Engine
  - Dataset-based organization

## Usage Quick Start

### Local Development with RAGFlow
```bash
# 1. Setup (one-time)
cd tools
source venv/bin/activate

# 2. Configure environment
cp env.template .env
nano .env  # Add RAGFLOW_BASE_URL and RAGFLOW_API_KEY

# 3. Verify connection
python ims_cli.py verify

# 4. Publish instructions
python ims_cli.py publish ../instructions
```

### Publish to Remote RAGFlow
```bash
# 1. Setup
cd tools
source venv/bin/activate

# 2. Switch to remote config
cp .env.remote .env

# 3. Verify connection
python ims_cli.py verify

# 4. Publish instructions
python ims_cli.py publish ../instructions

# 5. Switch back to local
cp .env.local .env
```

## Security Considerations

- ✅ API keys stored in `.env` files (gitignored)
- ✅ Support for HTTPS URLs in production
- ✅ Environment-based configuration
- ✅ No password storage (API key based authentication)

## Testing Status

- ⏳ Unit tests pending (planned: 80% coverage minimum)
- ✅ Manual testing completed successfully
- ✅ Dry-run mode available for safe testing

## Performance Characteristics

Based on timing measurements with RAGFlow:

| Operation | Time | Notes |
|-----------|------|-------|
| Publish 1 file | 10-15s | Includes embedding generation + parsing |
| Publish (unchanged) | <1s | Change detection skips upload |
| Publish (1 of 5 changed) | ~15s | **~77% faster with change detection** |
| List dataset | ~1-2s | Fast query performance |
| Cleanup dataset | ~1-2s per document | Document deletion |
| Parse (re-trigger) | 5-10s per document | Depends on document size |

**Performance Bottleneck**: Embedding generation (~10-15s per file)
- Text processing and vectorization
- Network latency to embedding service

**Change Detection Performance**:
- Hash check overhead: ~0.5s per file
- Massive savings: Skip unchanged files (15s → 0.5s per file)
- Typical workflow (5 files, 1 changed): 75s → 20s (77% faster)

## Future Enhancements

- Unit test suite with mocked R2R client
- Integration tests
- Support for YAML front-matter in markdown files
- Batch processing optimization
- Progress bars for large folders
- Rollback capability

## Rosetta MCP Hardening Notes

### Prompt/Schema Surface Cleanup

- Removed exposed validation-detail wording from public tool prompts for `submit_feedback`, `store_project_context`, and `plan_manager`.
- Simplified public field descriptions for `submit_feedback.feedback` and `plan_manager.plan_name`.
- Kept the `No JSON encoding.` hint only on `query_instructions.tags`, where it is needed for client interoperability.

### Cross-Tool Failure Handling

- Normalized unexpected `@track_tool_call` failures to the standard `Error:` string shape so wrapper-generated failures are not misclassified as successes.
- Added direct analytics-wrapper regression coverage in `ims-mcp-server/tests/test_analytics.py`.

### Feedback Tool Resilience

- Hardened `FeedbackService.submit()` so PostHog transport failures no longer break `submit_feedback`; the tool now degrades gracefully when analytics capture is unavailable.
- Added direct service coverage in `ims-mcp-server/tests/test_feedback_service.py`.
