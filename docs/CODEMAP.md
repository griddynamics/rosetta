Code map of the Rosetta workspace — modules, key files, and entry points, 3-4 levels deep.

## / — repo root (7,095 tracked files; 1,923 excluding the generated `plugins/` tree)

README.md OVERVIEW.md QUICKSTART.md USAGE_GUIDE.md DEVELOPER_GUIDE.md CONTRIBUTING.md
INSTALLATION.md TROUBLESHOOTING.md REVIEW.md SECURITY.md
CHANGELOG.md AGENTS.md NOTICE LICENSE
requirements.txt mypy.ini src/validate-types.sh
.mcp.json .gitignore .claude-plugin .cursor-plugin .cursorignore

## src/rosetta-mcp-server/ — core MCP server package (rosetta-mcp on PyPI)

pyproject.toml README.md Dockerfile build.sh DEBUGGING.md

### src/rosetta-mcp-server/rosetta_mcp/ — main Python package

server.py tool_prompts.py config.py constants.py context.py migrations.py typing_utils.py

#### src/rosetta-mcp-server/rosetta_mcp/auth/ — OAuth 2.1 and OAuthProxy support

oauth.py loopback_redirect_fix.py offline_refresh_fix.py

#### src/rosetta-mcp-server/rosetta_mcp/clients/ — RAGFlow API clients

ragflow.py dataset.py document.py doc_cache.py

#### src/rosetta-mcp-server/rosetta_mcp/services/ — core business logic

bundler.py authorizer.py query_builder.py keyword_search.py

#### src/rosetta-mcp-server/rosetta_mcp/tools/ — MCP tool implementations

instructions.py projects.py resources.py execution_controller.py feedback.py validation.py

#### src/rosetta-mcp-server/rosetta_mcp/analytics/ — usage tracking

tracker.py user_context.py

### src/rosetta-mcp-server/tests/ — unit tests (21 files)

test_bundler_and_query_builder.py test_instructions.py test_execution_controller.py test_oauth.py
test_analytics.py test_authorizer.py test_migrations.py test_resources.py
test_tool_contracts.py test_prompts.py test_validation.py test_config.py
test_cache_ttl.py test_dataset_lookup.py test_document_client.py test_feedback_service.py
test_keyword_search.py test_invite.py test_origin_middleware.py test_project_naming.py
conftest.py

### src/rosetta-mcp-server/validation/ — integration / end-to-end testing

verify_mcp.py

## src/rosetta-cli/ — CLI publisher package (rosetta-cli on PyPI)

pyproject.toml README.md env.template cli_entry.py

### src/rosetta-cli/rosetta_cli/ — main Python package

cli.py rosetta_publisher.py ragflow_client.py rosetta_config.py rosetta_auth.py typing_utils.py

#### src/rosetta-cli/rosetta_cli/commands/ — CLI command implementations

publish_command.py parse_command.py verify_command.py list_command.py cleanup_command.py base_command.py

#### src/rosetta-cli/rosetta_cli/services/ — publishing services

document_service.py dataset_service.py auth_service.py document_data.py

### src/rosetta-cli/tests/ — unit tests (7 files)

test_cli.py test_command_auth_order.py test_document_data.py test_rosetta_config_validate.py
test_packaged_runtime_assumptions.py test_publish_domain_scoped_orphan_cleanup.py
test_ragflow_client_upload_exception_handling.py

## src/rosetta-mcp-server/ — thin re-export package (rosetta-mcp on PyPI)

pyproject.toml README.md

## instructions/ — prompt library (published to RAGFlow)

Five sibling domain sets live under `instructions/r3/`: `core`, `advanced`, `qe`, `search`, `modernization`. Every top-level folder under a release is one of these. They partition the library by subject and none overrides another.

### instructions/r3/core/ — composable components, rules, bootstrap (current release)

#### instructions/r3/core/skills/ — 36 skill folders

backlog/ codemap/ coding/ coding-agents-farm/ coding-agents-hooks-authoring/
coding-agents-prompt-authoring/ dangerous-actions/ data-collection/ debugging/ design/
deviation/ discovery/ harness/ hitl/ large-workspace-handling/ load-project-context/
natural-writing/ orchestration/ planning/ post-mortem/ questioning/ reasoning/
requirements-authoring/ requirements-use/ research/ reverse-engineering/ risk-assessment/
rosetta/ security/ self-learning/ self-organization/ sensitive-data/ specflow-use/
subagent-directives/ tech-specs/ testing/

The eight per-IDE configure guides live inside one of these:
`skills/harness/references/configure/` (antigravity.md claude-code.md codex.md cursor.md
github-copilot.md jetbrains-junie.md opencode.md windsurf.md). There is no plugin-root
`configure/` folder.

#### instructions/r3/core/workflows/ — 17 files, 3 entry-point flows

arrange-workspace-flow.md help-flow.md init-workspace-flow.md
(arrange-workspace-flow-*, init-workspace-flow-* phase files)

#### instructions/r3/core/rules/ — 5 rule files

bootstrap-alwayson.md
local-files-mode.md mcp-files-mode.md plugin-files-mode.md speckit-integration-policy.md

#### instructions/r3/core/templates/ — shell-schema templates

shell-schemas/ (workflow-shell.md agent-shell.md skill-shell.md)

### instructions/r3/advanced/ — subagents and orchestrated workflows

#### instructions/r3/advanced/agents/ — 10 agents (20 files)

architect.md discoverer.md engineer.md executor.md planner.md
prompt-engineer.md requirements-engineer.md researcher.md reviewer.md validator.md
(each has a `~profile-lightweight-only~overwrite~.md` twin, hence 20 files)

#### instructions/r3/advanced/workflows/ — 17 files (18 with the light twin), 9 entry-point flows

adhoc-flow.md code-analysis-flow.md coding-agents-prompting-flow.md coding-flow.md
coding-light-flow.md external-lib-flow.md requirements-authoring-flow.md research-flow.md
security-flow.md
(security-flow-* phase files; coding-flow has a `~profile-lightweight-only~overwrite~` twin)

### instructions/r3/qe/ — test automation and test generation

#### instructions/r3/qe/skills/ — 2 skill folders

qa-knowledge/ qa-structure/

#### instructions/r3/qe/workflows/ — 27 files, 4 entry-point flows

api-aqa-flow.md aqa-flow.md testgen-flow.md ui-aqa-flow.md
(api-aqa-flow-*, testgen-flow-*, ui-aqa-flow-* phase files)

`aqa-flow.md` is a backward-compat router over `ui-aqa-flow`, `api-aqa-flow`, and
`testgen-flow`.

### instructions/r3/search/ — Solr and search engineering

#### instructions/r3/search/skills/ — 4 skill folders

solr-extending/ solr-query/ solr-schema/ solr-semantic-search/

### instructions/r3/modernization/ — conversion and re-architecture

#### instructions/r3/modernization/workflows/ — 9 files, 1 entry-point flow

modernization-flow.md
(modernization-flow-* phase files)

### instructions/r2/core/ — previous release, backported fixes only (146 tracked files)

Across all five r3 sets: 42 skills, 70 workflow files, 5 rules, 10 agents (20 files).
17 of the workflow files are entry points (frontmatter `tags: ["workflow"]`); 15 of those
are distinct request types, since `aqa-flow` is a backward-compat router over
`ui-aqa-flow`/`api-aqa-flow`/`testgen-flow` and `coding-light-flow` is a variant of
`coding-flow`.

## plugins/ — IDE plugin definitions (auto-generated, never hand-edited)

One `npx -y rosettify-plugins@latest` call reads `src/rosettify-plugins/plugins.json` and
writes every folder here. Folders are named `<set>-<ide>`: six sets across seven IDE
targets, plus a `-light` variant of the `rosetta` set, for 49 folders.

### plugins/rosetta-<ide>/ — the full plugin, all five domain sets

agents/ hooks/ rules/ skills/ workflows/ (folder names vary per IDE; Cursor uses
`commands/`, Copilot `prompts/`, Codex and Antigravity restructure workflows into skills)

### plugins/rosetta-<ide>-light/ — same content, lightweight profile

### plugins/core-<ide>/ — the `core` set only

hooks/ rules/ skills/ workflows/ — no agents

### plugins/advanced-<ide>/, qe-<ide>/, search-<ide>/, modernization-<ide>/ — one set each

These carry content, not wiring. Bootstrap and the advisory hooks ship only in the
`rosetta`, `rosetta-light`, and `core` plugins. No plugin contains an `INDEX.md`.

## docs/ — project documentation and website

### docs/web/ — Jekyll static site (GitHub Pages)

_config.yml index.md overview.md roadmap.md contribute.md search.json Gemfile

#### docs/web/_includes/

nav.html try-rosetta.html

#### docs/web/_layouts/

default.html docs.html

#### docs/web/assets/

styles.css brand/

### docs/ — architecture and reference docs

CONTEXT.md ARCHITECTURE.md MCP-CONTEXT.md MCP-ARCHITECTURE.md TODO.md
TECHSTACK.md CODEMAP.md DEPENDENCIES.md
definitions/ images/ requirements/ schemas/ mcp/

### docs/mcp/ — MCP-only deep reference (self-hosted deployment)

AUTHENTICATION.md RAGFLOW.md DEPLOYMENT_GUIDE.md

## agents/ — workspace agent state files

IMPLEMENTATION.md MEMORY.md init-workspace-flow-state.md TEMP/

## scripts/ — developer tooling

pre_commit.py bump_versions.sh

## test-library/ — integration test scenarios

aqa/ code-analysis/ coding/ help/ init/ modernization/ planning/
prompting/ questions/ reasoning/ research/ techspecs/ testgen/

## .github/workflows/ — CI/CD pipelines (12 files)

publish-ims-mcp.yml publish-rosetta-cli.yml publish-rosetta-mcp.yml
publish-instructions.yml pages.yml rosetta-mcp-dockerhub.yaml
validate-prompts.yml validate-test-cases.yml repo-analysis.yml
repo-implement.yml repo-plan.yml repo-triage.yml
