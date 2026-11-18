<!--
Delete sections that do not apply. Go through the Checklist at the end before requesting review.
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
For other changes: describe user-visible or contract-level impact, or write "None".
-->

| Before | After |
|---|---|
|  |  |

## Validation

<!-- Paste evidence, not claims: command output, run logs, screenshots, scenario comparison. -->

- [ ] `scripts/pre_commit.py` passes (hooks build, plugin sync, `scripts/verify/` checks, type checks, tests; regenerates `plugins/`). Result, and any skipped suites (missing dependencies are skipped and still exit 0):
- [ ] MCP server changes: `src/rosetta-mcp-server/validation/verify_mcp.py` passes (needs `.env` and `VERSION`, see `DEVELOPER_GUIDE.md`). Result:
- [ ] Prompt changes: static AI review and scenario comparison pipelines checked, no unresolved flags

## Environments tested

<!--
Only for prompt, plugin, hook, and bootstrap changes (they must hold across agents and models, see REVIEW.md).
Delete this section for everything else.
-->

- **Coding agent:** <!-- Claude Code / Codex / GitHub Copilot / Cursor / Antigravity / other -->
- **Delivery mode:** <!-- Plugin (see `docs/TESTING-PLUGINS.md`) / Rosetta MCP / Local files -->
- **Models, OS, Rosetta version or commit:**

## Risk and rollback

<!-- Blast radius (auth, data handling, deployment, guardrails, bootstrap policy) and how to revert. "Low, revert the commit" is fine when true. -->

## Checklist

Before requesting review:

- [ ] Scope is narrow and explicit: one concern per PR
- [ ] No secrets, credentials, or PII in the description, diff, or logs
- [ ] No duplicate rules or ambiguous wording introduced
- [ ] Safety, privacy, and approval checkpoints preserved
- [ ] Prompt changes include a brief, examples, and validation evidence
- [ ] Architecture changes update [`docs/ARCHITECTURE.md`](https://github.com/griddynamics/rosetta/blob/main/docs/ARCHITECTURE.md) in the same changeset
- [ ] Local validation passes (see Validation above)
- [ ] PR description explains *why*, not just *what*
