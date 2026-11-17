<!--
Thanks for contributing to Rosetta. One concern per PR. Small PRs merge faster.
Delete sections that do not apply. Never paste secrets, credentials, or PII.
See CONTRIBUTING.md and REVIEW.md for the full standards.
-->

## Summary

<!-- What changes and WHY (rationale, expected impact), not only what. -->

Closes #

## Type of change

- [ ] Prompt artifact (agent, skill, workflow, rule, template) in `instructions/`
- [ ] Plugin or hook (`plugins/`, `src/hooks`, `src/rosettify-plugins`)
- [ ] MCP server, CLI, or tooling (`src/rosetta-mcp-server`, `src/rosetta-cli`, `src/ims-mcp-server`, `src/rosettify`, `src/curiocity`)
- [ ] CI, workflows, or automation (`.github/`)
- [ ] Documentation or website (`docs/`, `*.md`, `docs/web/`)
- [ ] Bug fix
- [ ] Breaking change (migration path described below)

## Behavior impact

<!--
Required for prompt, rule, skill, workflow, and bootstrap changes: they alter agent behavior
in every project using Rosetta. Provide before/after examples or scenario results.
For code changes: describe user-visible or contract-level impact, or write "None".
-->

| Before | After |
|---|---|
|  |  |

## Validation

<!-- Paste evidence, not claims: command output, run logs, screenshots, scenario comparison. -->

- [ ] Build and lint pass for each touched `src/` component (see its package scripts)
- [ ] Type checks pass (`src/validate-types.sh`: mypy and TypeScript typecheck only)
- [ ] Tests pass (`src/run-tests.sh`); new or changed behavior is covered
- [ ] Skipped suites listed: <!-- none, or which. Both scripts skip suites with missing dependencies (venv, `node_modules`) and still exit 0. -->
- [ ] Verified end to end where applicable (`verify_mcp.py`, plugin local install, `scripts/verify/`)
- [ ] Prompt changes: static AI review and scenario comparison pipelines checked, no unresolved flags

## Environments tested

<!-- Tick what you actually ran. Prompt and bootstrap changes must hold across agents and models (see REVIEW.md). -->

**Coding agent**

- [ ] Claude Code
- [ ] Codex
- [ ] GitHub Copilot
- [ ] Cursor
- [ ] Antigravity
- [ ] Other:
- [ ] Not applicable (no agent-facing change)

**Delivery mode**

- [ ] Plugin (local install, see `docs/TESTING-PLUGINS.md`)
- [ ] Rosetta MCP (local or hosted)
- [ ] Local files
- [ ] Not applicable

**Models, OS, runtime**

| Item | Version / value |
|---|---|
| Model(s) |  |
| OS |  |
| Runtime (Python, Node, Docker, etc.) |  |
| Rosetta version or commit |  |

## Checklist

- [ ] Scope is narrow; no unrelated or AI-generated drive-by changes
- [ ] Versions bumped for changes in `src/` (`scripts/bump_versions.sh`)
- [ ] Architecture or behavior changes update `docs/ARCHITECTURE.md`, `docs/CONTEXT.md`, or other affected docs in this PR
- [ ] Safety, privacy, and approval (HITL) checkpoints preserved; no duplicate or conflicting rules
- [ ] No secrets, credentials, PII, or hardcoded paths and environment values
- [ ] Backward compatible for plugin consumers, MCP clients, and CLI users, or the break is documented
- [ ] Commits are signed off (`git commit -s`, [DCO](https://developercertificate.org/))
- [ ] If AI-assisted: I reviewed every line and can explain it

## Risk and rollback

<!-- Blast radius (auth, data handling, deployment, guardrails, bootstrap policy) and how to revert. "Low, revert the commit" is fine when true. -->

## Notes for reviewers

<!-- Optional: where to start, trade-offs considered, follow-ups tracked as issues. -->
