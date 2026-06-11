Code map of the Rosetta workspace — modules, key files, and entry points, 3-4 levels deep.

## / — repo root (512 files total)

README.md OVERVIEW.md QUICKSTART.md USAGE_GUIDE.md DEVELOPER_GUIDE.md CONTRIBUTING.md
DEPLOYMENT_GUIDE.md INSTALLATION.md TROUBLESHOOTING.md REVIEW.md SECURITY.md
CHANGELOG.md AGENTS.md NOTICE LICENSE
requirements.txt mypy.ini validate-types.sh
.mcp.json .gitignore .claude-plugin .cursor-plugin .cursorignore

## ims-mcp-server/ — core MCP server package (ims-mcp on PyPI)

pyproject.toml README.md Dockerfile build.sh DEBUGGING.md

### ims-mcp-server/ims_mcp/ — main Python package

server.py tool_prompts.py config.py constants.py context.py migrations.py typing_utils.py

#### ims-mcp-server/ims_mcp/auth/ — OAuth 2.1 and OAuthProxy support

oauth.py loopback_redirect_fix.py offline_refresh_fix.py

#### ims-mcp-server/ims_mcp/clients/ — RAGFlow API clients

ragflow.py dataset.py document.py doc_cache.py

#### ims-mcp-server/ims_mcp/services/ — core business logic

bundler.py authorizer.py query_builder.py keyword_search.py plan_store.py
feedback.py invite.py _ragflow_team_api.py

#### ims-mcp-server/ims_mcp/tools/ — MCP tool implementations

instructions.py projects.py resources.py plan_manager.py feedback.py validation.py

#### ims-mcp-server/ims_mcp/analytics/ — usage tracking

tracker.py user_context.py

### ims-mcp-server/tests/ — unit tests (21 files)

test_bundler_and_query_builder.py test_instructions.py test_plan_manager.py test_oauth.py
test_analytics.py test_authorizer.py test_migrations.py test_resources.py
test_tool_contracts.py test_prompts.py test_validation.py test_config.py
test_cache_ttl.py test_dataset_lookup.py test_document_client.py test_feedback_service.py
test_keyword_search.py test_invite.py test_origin_middleware.py test_project_naming.py
conftest.py

### ims-mcp-server/validation/ — integration / end-to-end testing

verify_mcp.py

## rosetta-cli/ — CLI publisher package (rosetta-cli on PyPI)

pyproject.toml README.md env.template ims_cli.py

### rosetta-cli/rosetta_cli/ — main Python package

cli.py ims_publisher.py ragflow_client.py ims_config.py ims_auth.py typing_utils.py

#### rosetta-cli/rosetta_cli/commands/ — CLI command implementations

publish_command.py parse_command.py verify_command.py list_command.py cleanup_command.py base_command.py

#### rosetta-cli/rosetta_cli/services/ — publishing services

document_service.py dataset_service.py auth_service.py document_data.py

### rosetta-cli/tests/ — unit tests (7 files)

test_cli.py test_command_auth_order.py test_document_data.py test_ims_config_validate.py
test_packaged_runtime_assumptions.py test_publish_domain_scoped_orphan_cleanup.py
test_ragflow_client_upload_exception_handling.py

## rosetta-mcp-server/ — thin re-export package (rosetta-mcp on PyPI)

pyproject.toml README.md

## instructions/ — prompt library (published to RAGFlow)

### instructions/r2/core/ — OSS foundation layer

#### instructions/r2/core/skills/ — 20 skill folders (34 files total)

coding/ debugging/ init-workspace-context/
init-workspace-discovery/ init-workspace-documentation/ init-workspace-patterns/
init-workspace-rules/ init-workspace-shells/ init-workspace-verification/
large-workspace-handling/ load-context/ planning/ questioning/ reasoning/
requirements-authoring/ requirements-use/ reverse-engineering/ tech-specs/ testing/

#### instructions/r2/core/agents/ — 7 agent files

architect.md discoverer.md engineer.md executor.md planner.md reviewer.md validator.md

#### instructions/r2/core/workflows/ — 14 workflow files

init-workspace-flow.md init-workspace-flow-discovery.md init-workspace-flow-shells.md
init-workspace-flow-context.md init-workspace-flow-patterns.md init-workspace-flow-rules.md
init-workspace-flow-documentation.md init-workspace-flow-questions.md init-workspace-flow-verification.md
coding-flow.md adhoc-flow.md code-analysis-flow.md requirements-authoring-flow.md self-help-flow.md

#### instructions/r2/core/rules/ — 10 rule files

bootstrap-core-policy.md bootstrap-execution-policy.md bootstrap-guardrails.md
bootstrap-rosetta-files.md bootstrap.md
local-files-mode.md plugin-files-mode.md requirements-best-practices.md
requirements-use-best-practices.md speckit-integration-policy.md

#### instructions/r2/core/configure/ — 7 configure files

IDE/agent configuration instructions

#### instructions/r2/core/templates/ — 3 template files

Reusable prompt templates

## plugins/ — IDE plugin definitions (156 files, auto-generated)

### plugins/core-claude/ — Claude Code plugin (generated from instructions/r2/core/)

agents/ configure/ rules/ skills/ templates/

### plugins/core-cursor/ — Cursor plugin (generated from instructions/r2/core/)

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

CONTEXT.md ARCHITECTURE.md AUTHENTICATION.md RAGFLOW.md TODO.md
TECHSTACK.md CODEMAP.md DEPENDENCIES.md
definitions/ images/ requirements/ schemas/

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
