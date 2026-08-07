Code map of the Rosetta workspace — modules, key files, and entry points, 3-4 levels deep.

## / — repo root (519 files total)

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

bundler.py authorizer.py query_builder.py keyword_search.py _ragflow_team_api.py

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

### instructions/r3/core/ — OSS foundation layer (current release)

#### instructions/r3/core/skills/ — 38 skill folders

codemap/ coding/ coding-agents-farm/ coding-agents-hooks-authoring/
coding-agents-prompt-authoring/ dangerous-actions/ data-collection/ debugging/
deviation/ hitl/ large-workspace-handling/ load-project-context/ natural-writing/
orchestration/ planning/ post-mortem/ qa-knowledge/ qa-structure/ questioning/
reasoning/ requirements-authoring/ requirements-use/ research/ reverse-engineering/
risk-assessment/ rosetta/ security/ self-learning/ self-organization/ sensitive-data/
solr-extending/ solr-query/ solr-schema/ solr-semantic-search/ specflow-use/
subagent-directives/ tech-specs/ testing/

#### instructions/r3/core/agents/ — 10 agent files

architect.md discoverer.md engineer.md executor.md planner.md
prompt-engineer.md requirements-engineer.md researcher.md reviewer.md validator.md

#### instructions/r3/core/workflows/ — 17 top-level workflow files, 14 request types (+ phase files)

adhoc-flow.md api-aqa-flow.md aqa-flow.md arrangement-workspace-flow.md
code-analysis-flow.md coding-agents-prompting-flow.md coding-flow.md external-lib-flow.md
help-flow.md init-workspace-flow.md modernization-flow.md requirements-authoring-flow.md
research-flow.md security-flow.md self-help-flow.md testgen-flow.md ui-aqa-flow.md
(init-workspace-flow-*, aqa-flow-*, arrangement-workspace-flow-*, modernization-flow-*,
security-flow-*, testgen-flow-* phase files)

13 request types: ui-aqa-flow + api-aqa-flow are one QA-automation type, aqa-flow is a
backward-compat router over them plus testgen-flow, and self-help-flow is the deprecated
alias of help-flow.

#### instructions/r3/core/rules/ — 5 rule files

bootstrap-alwayson.md
local-files-mode.md mcp-files-mode.md plugin-files-mode.md speckit-integration-policy.md

#### instructions/r3/core/configure/ — 8 configure files

antigravity.md claude-code.md codex.md cursor.md github-copilot.md
jetbrains-junie.md opencode.md windsurf.md

#### instructions/r3/core/templates/ — shell-schema templates

shell-schemas/ (workflow-shell.md agent-shell.md skill-shell.md)

## plugins/ — IDE plugin definitions (156 files, auto-generated)

### plugins/core-claude/ — Claude Code plugin (generated from instructions/r3/core/)

agents/ configure/ rules/ skills/ templates/

### plugins/core-cursor/ — Cursor plugin (generated from instructions/r3/core/)

agents/ configure/ rules/ skills/ templates/

### plugins/rosetta/ — bootstrap-only plugin

rules/

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
