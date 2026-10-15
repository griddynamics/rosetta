Code map of the Rosetta workspace — modules, key files, and entry points, 3-4 levels deep.

How the modules connect is drawn in [architecture/system-context.svg](architecture/system-context.svg); this file says where things live.

## / — repo root (~7.1k tracked files; ~5.2k are generated `plugins/`)

README.md OVERVIEW.md QUICKSTART.md USAGE_GUIDE.md DEVELOPER_GUIDE.md CONTRIBUTING.md
INSTALLATION.md PLUGINS.md MCPs.md CONFIGURATION.md TROUBLESHOOTING.md REVIEW.md SECURITY.md FAQ.md
CHANGELOG.md AGENTS.md CLAUDE.md NOTICE LICENSE gain.json llms-full.txt
requirements.txt mypy.ini .mcp.json

## instructions/ — AI coding agent instructions (the product; not documentation)

### instructions/r3/core/ — current release, OSS foundation layer

#### instructions/r3/core/skills/ — 42 skill folders (`SKILL.md` + optional `README.md`, `references/`, `assets/`)

backlog/ codemap/ coding/ coding-agents-farm/ coding-agents-hooks-authoring/
coding-agents-prompt-authoring/ dangerous-actions/ data-collection/ debugging/ design/
deviation/ discovery/ harness/ hitl/ large-workspace-handling/ load-project-context/
natural-writing/ orchestration/ planning/ post-mortem/ qa-knowledge/ qa-structure/
questioning/ reasoning/ requirements-authoring/ requirements-use/ research/
reverse-engineering/ risk-assessment/ rosetta/ security/ self-learning/ self-organization/
sensitive-data/ solr-extending/ solr-query/ solr-schema/ solr-semantic-search/
specflow-use/ subagent-directives/ tech-specs/ testing/

#### instructions/r3/core/agents/ — 10 subagents (+ 10 `~profile-lightweight-only~overwrite~` twins)

architect.md discoverer.md engineer.md executor.md planner.md
prompt-engineer.md requirements-engineer.md researcher.md reviewer.md validator.md

#### instructions/r3/core/workflows/ — 18 workflow entry files (+ phase files)

adhoc-flow.md api-aqa-flow.md aqa-flow.md arrange-workspace-flow.md
code-analysis-flow.md coding-agents-prompting-flow.md coding-flow.md coding-light-flow.md
external-lib-flow.md help-flow.md init-workspace-flow.md modernization-flow.md
requirements-authoring-flow.md research-flow.md security-flow.md self-help-flow.md
testgen-flow.md ui-aqa-flow.md
(phase files: `<flow>-<phase>.md`, e.g. api-aqa-flow-*, modernization-flow-*, security-flow-*;
profile variant: coding-flow~profile-lightweight-only~overwrite~.md)

aqa-flow is a backward-compat router over ui-aqa-flow, api-aqa-flow and testgen-flow;
self-help-flow is the deprecated alias of help-flow.

#### instructions/r3/core/rules/ — 5 rule files

bootstrap-alwayson.md (always loaded)
plugin-files-mode.md mcp-files-mode.md local-files-mode.md (exactly one loaded per session)
speckit-integration-policy.md

#### instructions/r3/core/configure/ — 8 per-IDE configure specs

antigravity.md claude-code.md codex.md cursor.md github-copilot.md
jetbrains-junie.md opencode.md windsurf.md

#### instructions/r3/core/templates/shell-schemas/ — MCP-mode shell templates

### instructions/r2/ — previous release (KTLO, backported fixes only)

## plugins/ — generated IDE plugins (do not edit; regenerate via `scripts/pre_commit.py`)

core-claude/ core-cursor/ core-copilot/ core-codex/ core-antigravity/
core-cursor-standalone/ core-copilot-standalone/
and a `-light` sibling of each (lightweight profile), 14 folders total.

## src/ — solution components

### src/rosettify-plugins/ — plugin generator (`npx rosettify-plugins`, TypeScript)

src/cli.ts src/generate.ts — entry and pipeline
src/spec/ — targets, releases, profiles, model maps, bootstrap manifest
src/plugin-processors/ — per-stage processors (copy, rewrite references, render templates, generate indexes, sync bundles, assemble bootstrap, ...)
src/vfs/ src/file-processors/ src/serialize/ src/escaping/ src/bootstrap/
plugins/core-*/ — generator input: preserved manifests and `hooks.json.tmpl` per target
profiles/lightweight.json — build profile

### src/hooks/ — IDE hook runtime (TypeScript, esbuild per-IDE bundles)

src/adapter.ts — IDE detection and normalization
src/adapters/ — per-IDE input mapping and `formatOutput` (antigravity, claude-code, codex, copilot, cursor, windsurf)
src/entrypoints/ — one `adapter-<ide>.ts` per bundle
src/hooks/ — codemap-refresh, dangerous-actions (+ dangerous-actions/), lint-format-advisory, loose-files, md-file-advisory, read-once, read-once-reset
src/runtime/ — defineHook, run loop, state store, result helpers, debug log
scripts/build-bundles.mjs — builds `dist/bundles/<plugin>/<hook>.js` (not committed)
tests/ — vitest unit tests + log-replay E2E (`tests/e2e/`)

### src/rosettify/ — local plan/specs CLI + MCP (`npx rosettify`, TypeScript)

src/bin/rosettify.ts — entry
src/frontends/cli.ts src/frontends/mcp.ts — dual frontend over one registry
src/registry/ — static `ToolDef` registry
src/commands/plan/ — create, next, update_status, show_status, query, upsert, templates
src/commands/specs/ — add, get, query, update, approve, validate, graph, render, migrate, ...
src/shared/ — envelope, dispatch, doc-io (atomic write + backup chain), errors

### src/rosetta-mcp-server/ — MCP server package (`rosetta-mcp` on PyPI, Python)

#### src/rosetta-mcp-server/rosetta_mcp/ — main package

server.py (tools + `rosetta://{path}` resource) tool_prompts.py config.py constants.py
context.py migrations.py (Redis schema) tracing.py typing_utils.py
auth/ — OAuth 2.1 / OAuthProxy support
clients/ — RAGFlow API clients and document cache
services/ — bundler, authorizer, query builder, keyword search
tools/ — instructions, projects, resources, execution controller, feedback, validation
analytics/ — usage tracking (opt-in)
resources/ — static assets (icon)

tests/ — pytest unit tests; validation/verify_mcp.py — end-to-end check
Dockerfile build.sh DEBUGGING.md

### src/ims-mcp-server/ — deprecated `ims-mcp` alias package (depends on `rosetta-mcp`)

### src/rosetta-cli/ — instruction publisher (`rosetta-cli` on PyPI, Python)

rosetta_cli/cli.py rosetta_publisher.py ragflow_client.py rosetta_config.py rosetta_auth.py
rosetta_cli/commands/ — publish, parse, verify, list, cleanup
rosetta_cli/services/ — document, dataset, auth services
tests/

### src/helm-charts/rosetta-mcp-server/ — Helm chart for self-hosted MCP

### src/curiocity/ — eval harness driving agent CLIs over a PTY (`npx curiocity`, TypeScript)

src/orchestrator/ — Curiocity orchestrator; src/curion/ — per-trial worker
src/agents/ — agent adapters (Claude Code, Codex, mock)
src/evaluators/ src/combiners/ src/stats/ src/reporters/ src/results/ — scoring pipeline
src/terminal/ src/interaction/ src/llm/ src/cases/ src/config/ src/cli/
docs/architecture.md — binding design

### src/rosettify-prompts/ — prompt A/B/N bench against the Anthropic API (dev tool, `evals.json`)

src/run-tests.sh src/validate-types.sh — repo-wide test and type-check entry points

## docs/ — project documentation

CONTEXT.md ARCHITECTURE.md MCP-CONTEXT.md MCP-ARCHITECTURE.md AUTOMATION-ARCHITECTURE.md
CODEMAP.md TECHSTACK.md DEPENDENCIES.md ASSUMPTIONS.md MODERNIZATION.md TODO.md
SecurityOnePager.md TESTING-PLUGINS.md hooks-verify.md hooks-verify-run-logs.md

architecture/ — D2 diagram sources + rendered SVGs ([index](architecture/README.md))
hooks/ — verified per-IDE hook contracts (`<ide>.md`) and captured wire logs
mcp/ — MCP-only deep reference: AUTHENTICATION.md DEPLOYMENT_GUIDE.md RAGFLOW.md
requirements/ — authoritative specs (plugin-generator, rosetta-cli, rosettify)
PATTERNS/ — coding and architectural patterns (INDEX.md)
definitions/ schemas/ prompts/ qa/ reviews/ stories/ manual-tests/ images/
web/ — Jekyll site (GitHub Pages); `web/user-guide/` is synced from `/user-guide/`

## user-guide/ — scenario guides and workflow map (source for the website user guide)

## agents/ — workspace agent state (IMPLEMENTATION.md, MEMORY.md, init-workspace-flow-state.md)

## plans/ — feature plans and specs

## scripts/ — developer tooling

pre_commit.py (hook bundles, tests, plugin sync standard + light) bump_versions.sh sync_user_guide_web.py

## test-library/ — scenario prompts and sample projects for manual/integration testing

aqa/ code-analysis/ coding/ help/ hooks/ init/ modernization/ planning/ prompting/
questions/ reasoning/ research/ techspecs/ test-cases/ testgen/ + sample project zips

## tests/e2e-tests/ — repo-level end-to-end tests

## .github/workflows/ — CI/CD (26 files)

ci-*.yml — per-component CI (curiocity, rosetta-cli, rosetta-hooks, rosetta-mcp, rosettify, rosettify-plugins, rosettify-prompts)
publish-*.yml — npm/PyPI/Helm/instructions releases; rosetta-mcp-dockerhub.yaml
pages.yml — website; codeql.yml; e2e-testing.yml (curiocity against plugins/core-claude)
validate-prompts.yml validate-test-cases.yml
repo-analysis.yml repo-plan.yml repo-implement.yml repo-triage.yml — board automation ([AUTOMATION-ARCHITECTURE.md](AUTOMATION-ARCHITECTURE.md))
