# Changelog

## R3 Migration Guide

**Release:** R3 (2026-06-01)

This guide covers breaking changes between R2 and R3 for prompt and workflow authors, plugin packagers, and anyone who ACQUIRE's Rosetta instructions by name. No compatibility shims are provided; cutover is hard at the R3 release boundary.

---

### 1. `plan-manager` skill renamed to `operation-manager`

- **What changed.** The R2 skill `plan-manager` is removed in R3 and replaced by `operation-manager` at `instructions/r3/core/skills/operation-manager/`. The skill scope is unchanged (plan create / next / update_status / query / show_status / upsert), but the canonical name, command alias (`OPERATION_MANAGER`), and bootstrap references all use the new name. The schema asset was renamed `pm-schema.md` → `om-schema.md`.
- **Who is affected.** Prompt authors, workflow authors, and any rule/skill that ACQUIRE's `plan-manager` by name or references the `PLAN_MANAGER` alias.
- **Required action.** Replace name and alias across authored content:
  ```text
  ACQUIRE plan-manager FROM KB        ->  ACQUIRE operation-manager FROM KB
  PLAN_MANAGER                        ->  OPERATION_MANAGER
  plan-manager next <plan_file>       ->  operation-manager next <plan_file>
  plan-manager upsert ...             ->  operation-manager upsert-with-template ...
  pm-schema.md                        ->  om-schema.md
  ```
  Recommended grep before merging:
  ```bash
  grep -rn -e 'plan-manager' -e 'PLAN_MANAGER' -e 'pm-schema.md' .
  ```
- **Rollout / cutover note.** Hard cutover at R3. No alias, no deprecation window, no shim. R2 consumers stay on the `plan-manager` skill until they upgrade. Any residual `plan-manager` reference in an R3 authored prompt is a bug and will fail to resolve through Rosetta MCP `query_instructions`.

---

### 2. `bootstrap-hitl-questioning.md` removed

- **What changed.** The bootstrap rule `bootstrap-hitl-questioning.md` (present in R2 at `instructions/r2/core/rules/`) is removed in R3. HITL enforcement is now consolidated into the on-demand `hitl` skill at `instructions/r3/core/skills/hitl/`, and the entry point is `bootstrap-guardrails.md`, which references the skill. This is part of the bootstrap size reduction shipped in R3.
- **Who is affected.** Authors who linked to `bootstrap-hitl-questioning.md` by path or filename, plugin packagers who copied the rule file into IDE bundles, and any rule/workflow that ACQUIRE's HITL questioning content by the old filename.
- **Required action.** Replace direct references to the deleted rule with a skill invocation:
  ```text
  ACQUIRE bootstrap-hitl-questioning FROM KB
      ->  USE SKILL `hitl`

  instructions/.../rules/bootstrap-hitl-questioning.md
      ->  instructions/r3/core/skills/hitl/SKILL.md  (load via the skill, not by path)
  ```
  The guardrails entry point already wires this in — authors typically only need to remove the explicit reference and trust `bootstrap-guardrails.md` to route to the skill on demand.
- **Known coverage gaps** to be aware of when migrating: six items from the R2 `bootstrap-hitl-questioning.md` were not fully ported into the R3 `hitl` skill — see [docs/TODO.md](docs/TODO.md) "hitl skill — R2 coverage gaps" for the enumerated list. None of these block R3 release, but downstream consumers relying on R2-specific HITL phrasing (graduated MEDIUM/HIGH/CRITICAL escalation, cognitive-load limits, mismatch root-cause memory update) should review before upgrading.
- **Rollout / cutover note.** Hard removal in R3. No file at the old path. Plugin bundles that still ship the R2 file should drop it on their next sync; the `hitl` skill folder is included in every R3 plugin under `skills/hitl/`.

---

### 3. New skill families added in R3

- **What changed.** R3 introduces three new skill families under `instructions/r3/core/skills/`. Plugin packagers must include these folders in downstream bundles or the corresponding workflows will fail to resolve at runtime.
  - **QA workflow family.** Skills supporting the QA, AQA, and TestGen workflows: `qa-*`, `aqa-*`, `automation-*`, `api-test-spec-authoring`, `testrail-*`, `mcp-jira-data-collection`, `mcp-confluence-data-collection`, `mcp-testrail-data-collection`, `swagger-contracts-analysis`, `confluence-source-harvesting`, `aqa-requirements-elicitation`, `gap-and-contradiction-analysis`.
  - **Utility skills.** General process and authoring skills new in R3: `sequential-workflow-execution`, `requirements-synthesis`, `user-approved-code-changes`, `repository-implementation-standards`, `load-context-instructions`, `load-workflow`.
  - **GitNexus tools.** Code-graph integration skills: `gitnexus-setup`, `gitnexus-cli`, `gitnexus-tools`.
- **Who is affected.** Plugin packagers (`core-claude`, `core-cursor`, `core-cursor-standalone`, `core-copilot`, `core-copilot-standalone`, `core-codex`) and any downstream distribution that copies skill folders selectively rather than mirroring `instructions/r3/core/skills/` wholesale.
- **Required action.** Re-run the plugin sync so the new skill folders are picked up. After sync, verify each plugin's `skills/` directory contains the three new families above. For selective packagers, add the family prefixes (`qa-*`, `aqa-*`, `automation-*`, `mcp-*-data-collection`, `testrail-*`, `gitnexus-*`) to the include list.
- **Rollout / cutover note.** Additive only — no removals in this item. Workflows that depend on these skills (QA, AQA, TestGen, GitNexus-enabled flows) will not function in a plugin that lacks the folders. Mirror the full `skills/` tree if in doubt.

---

### How to apply

1. **Re-run plugin sync.** Regenerate every plugin bundle so the renamed `operation-manager` skill, the removed `bootstrap-hitl-questioning.md`, and the new skill families are picked up consistently. Note that `plugin_generator.py` `DEFAULT_RELEASE` is now `r3` (was `r2`); existing CI / pre-commit invocations no longer need to pass `--release r3` explicitly.
2. **Grep for stale names.** From the repo root:
   ```bash
   grep -rn -e 'plan-manager' -e 'PLAN_MANAGER' -e 'bootstrap-hitl-questioning' -e 'pm-schema.md' .
   ```
   Any hit in R3 authored content or in a plugin bundle is a defect — fix before release.
3. **ACQUIRE re-check.** For each authored prompt or workflow that previously ran `ACQUIRE plan-manager` or `ACQUIRE bootstrap-hitl-questioning`, re-resolve against the R3 KB and confirm the new name (`operation-manager`) or the new path (`hitl` skill) returns a document.
4. **Smoke test workflows.** Run one workflow per affected family (operation-manager driven plan, a HITL gated step, one QA workflow, one GitNexus enabled session) to confirm end-to-end resolution before announcing the cutover.

---

## R2

### Overview

Rosetta is a meta-prompting, context engineering, and centralized instructions management for AI coding agents. R2 is the production release that moves teams from individual developer prompting to governed, organization wide AI assisted development.

### Highlights

- Zero friction developer onboarding through HTTP mode and IDE plugins
- Multi agent execution with specialized roles and review gates
- Architecture aware AI development through automatic pattern extraction
- Modular instructions aligned with native coding agent capabilities
- Structured workflows for requirements, prompts, and debugging

### Detailed Changes

#### Zero Friction Deployment

- **HTTP mode.** Developers connect to Rosetta over HTTP with OAuth. No local installation, no CLI setup, and no dependencies on developer machines. Add one JSON config to the IDE and start working.
- **Plugins for Claude Code and Cursor.** Installation is available from IDE marketplaces with one click. Additional IDE plugins are planned.
- **Reduced bootstrap size.** Smaller initial prompts load faster and use less context, leaving more room for the actual task.

#### Multi Agent Architecture

- **Subagent orchestration.** Work is split into phases handled by specialized agents. One can implement while another reviews, potentially on a different model. Architect, engineer, reviewer, and validator each work with focused context and a clear scope.
- **Deterministic plan manager.** Execution plans are tracked step by step with phase completion gates. It is in battle testing with limited scope and is designed to make AI work resumable and auditable.
- **Large workspace handling.** Repositories with more than 100 files are partitioned into scoped subagent tasks to prevent context overflow and keep quality stable at scale.
- **Automated review gates.** After implementation and testing, a separate reviewer agent checks the result against the spec before it reaches human reviewers.

#### Knowledge and Patterns

- **Automatic building block extraction.** During repository initialization, Rosetta identifies recurring codebase patterns, such as how to create a controller, a domain service, or a data grid, and turns them into reusable templates for the agent.
- **Project knowledge datasets.** Each project builds a structured knowledge base that covers architecture, tech stack, dependencies, and conventions. This enables cross project flows where the agent understands how services relate to each other and improves work across multiple repos.

#### Modular Instruction Architecture

- **Skills, rules, commands, workflows, and subagents are separated.** Each instruction type maps to native coding agent features such as Cursor rules or Claude Code commands. Agents use built-in capabilities instead of workarounds.
- **OSS, Grid, and custom split.** OSS provides the foundation. Grid adds advanced workflows. Organizations can layer their own customizations without forking the core.

#### New Workflows and Skills

- **Requirements documentation authoring.** A structured workflow produces testable, atomic requirements with traceability. Those requirements then drive planning, implementation, and validation.
- **Prompt authoring.** Teams that create and maintain AI agent instruction sets now have a dedicated workflow with specialized subagents for each phase.
- **Debugging skill.** The agent investigates root cause before attempting a fix, which makes debugging more systematic and less dependent on guesswork.

#### Safety and Hook Hardening

- **Two-tier dangerous-actions hook.** The `PreToolUse` hook now classifies every pattern as either `reconsider` (dangerous but recoverable, AI may self-approve after blast-radius analysis) or `hard-deny` (catastrophic, human confirmation required). `curl | sh` is hard-deny. Previously all denies were permanent HITL gates.
- **AI-autonomous retry via `# Rosetta-AI-reviewed`.** For `reconsider`-tier patterns, the AI may append the marker token to a user-visible field and retry after reconsidering blast radius. The marker is validated by strict regex; legacy `# Rosetta-reviewed` is rejected.
- **Single-traversal pattern evaluation.** Pattern matching and policy lookup now share one traversal (`detectDanger`), eliminating the structural divergence risk where a hard-deny pattern could slip through if the two parallel scans returned different results.
- **Stateless hook design.** Cooldown store and audit log removed. The hook is safe across worktrees, CI runners, and parallel sessions without shared state.
- **Windsurf adapter deny feedback.** `permissionDecisionReason` is surfaced as `additionalContext` so Windsurf agents receive actionable denial explanations.

## R3

### Overview

R3 advances Rosetta from governed assistance to deterministic, self-guarding execution. Where R2 made organization wide AI development consistent, R3 makes it reproducible and safe by default: a deterministic operation manager drives every workflow step, a cross IDE hooks runtime enforces guardrails and advisories at the moment of action, and the bootstrap that loads on every session is roughly half its former size. R3 ships dormant alongside R2 — R2 remains the default served release — so teams adopt the new model deliberately.

### Highlights

- Deterministic execution: every workflow runs as a tracked, resumable plan driven by the operation manager
- Cross IDE hooks runtime with a two tier dangerous-actions safety gate and advisory nudges
- GitNexus code graph integration for architecture aware navigation and automatic reindexing
- Roughly 57% smaller bootstrap through skill extraction and de-duplication
- Public OSS MCP and RAGFlow deployment plus GitHub authentication
- Foundations for role specific workflows (IaC, discovery, mobile, automated QA)

### Detailed Changes

#### Deterministic Execution

- **Operation manager.** Plan creation, tracking, and step by step execution are handled by `rosettify` — a local CLI and stdio MCP that stores execution plans as JSON. It replaces ad hoc planning with a deterministic, resumable, auditable loop (create → next → execute → update) with sequential phase gates and atomic writes.
- **Bootstrap integrated planning.** Preparation steps, guardrails, HITL, documentation, and risk assessment are expressed as explicit plan phases and steps, so the agent commits to the process up front instead of improvising. Plan and act modes are supported directly.
- **Graceful fallback.** When the operation manager is unavailable, a fallback rule routes the agent to built in todo tracking, so execution discipline never depends on a single tool.

#### Cross IDE Hooks Runtime

- **Common input adapter.** A single adapter normalizes the differing hook input schemas of Claude Code, Cursor, Copilot, Codex, and Windsurf into one canonical shape, so each hook is authored once and runs everywhere.
- **Declarative hook framework.** Hooks declare their activation (event, tool kind, file predicates) and the runtime gates, throttles, and debounces them. Each hook is bundled per IDE with isolation guarantees so a bundle carries only its own adapter code.
- **dangerous-actions safety gate (PreToolUse).** A deterministic, stateless last resort tripwire on destructive shell, file, and MCP operations, safe across worktrees and parallel sessions. Two tiers: `reconsider` (recoverable — the agent may self-approve with a `Rosetta-AI-reviewed` marker in a user visible field after a blast radius check) and `hard-deny` (catastrophic, for example `curl | sh` — human review required). A single traversal detection avoids policy divergence bypasses, and Windsurf agents receive the denial reason as actionable context.
- **Advisory hooks.** `md-file-advisory` nudges on stray markdown placement, `lint-format-advisory` prompts a syntax/type/lint/format step after code edits, and `loose-files` flags `.py`/`.js` files created without a module marker (on file creation events only).
- **GitNexus refresh hook.** Detects a stale code graph index after source mutations and asks the agent to reindex, with trailing edge debouncing so only the last edit in a burst triggers work.
- **Authoring skill.** A `hooks-authoring` skill documents entry rules, tool kind registration, and pitfalls for contributors adding new hooks.

#### GitNexus Integration

- **Code graph navigation.** GitNexus is integrated as opt in skills (`gitnexus-setup`, `gitnexus-cli`, `gitnexus-tools`) and wired into workspace initialization, giving the agent architecture aware navigation. It works in ad hoc mode with Claude Code and ships in the plugins.

#### Leaner Bootstrap and Modular Skills

- **Roughly 57% smaller bootstrap.** Bootstrap rules were refactored — JSON schemas pulled into skills and templates, duplicated orchestration rules merged, and HITL questioning moved entirely into the on demand `hitl` skill. The per session `bootstrap-*.md` payload dropped from 31,711 to 13,510 bytes, a 57.4% reduction (the MCP mode `bootstrap.md` entry is excluded — still being optimized).
- **Strengthened, self-initializing prep.** Preparation enforcement was tightened and workflow selection was folded into the orchestrator contract, so orchestrators and subagents self-initialize — load context, select the workflow, and commit to phases before acting.
- **New bootstrap skills.** `load-context-instructions` and `load-workflow` make context loading and workflow selection explicit, reliable steps rather than implicit expectations.

#### Release Model and Upcoming Work

- **Rolling releases going forward.** R3 is the last large, version-branch style release. From here Rosetta moves to a rolling model — changes ship continuously in small, incremental releases rather than long-lived branches and major cutovers like v3.
- **Incremental workflow delivery.** The v3 Workflows track has delivered an IaC workflow and SpecFlow integration. The remaining workflows — discovery, mobile apps, test harness engineering, and automated QA / test generation — will arrive through these smaller releases rather than a single shift.

#### Platform and Deployment

- **Public OSS deployment.** A public Rosetta MCP and RAGFlow deployment supports OSS and demo environments.
- **GitHub authentication.** OAuth through GitHub is supported for MCP access.
- **Analytics fix.** PostHog now reports the correct user identity.
