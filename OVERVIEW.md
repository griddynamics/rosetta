# Overview

**Who is this for?** Engineers and leads who want to understand how Rosetta works before contributing or evaluating it.

**When should I read this?** After the [README](README.md), before diving into [Architecture](docs/ARCHITECTURE.md) or [Contributing](CONTRIBUTING.md).

## Problem Rosetta Solves

- AI coding agents miss conventions, constraints, and business rules. Rejection rates are high.
- Writing effective instructions is hard. Keeping them current across evolving tools and models is harder.
- Reusable instructions across different IDEs and AI agents barely exist.
- Knowledge stays siloed. No way to share proven patterns across projects or enforce consistent behavior at scale.

## Core Mental Model

Rosetta gives your AI coding agent the right instructions for each request — the rules, skills, workflows, and subagents it needs — so the agent knows your architecture, conventions, and engineering standards. On a new project, Rosetta can read the code first and extract that context into files the agent uses on every later request, so it doesn't have to re-learn the project each time.

Design principles:

**Agent-agnostic.** Works across Cursor, Claude Code, VS Code, Windsurf, JetBrains (Copilot, Junie), GitHub Copilot, Codex, Antigravity, OpenCode, and any MCP-compatible IDE. Adopts agent-specific features where available, simulates them where not.

**Stage-by-stage loading.** Instructions load in stages — universal policies first, then the workflow for your specific request, then anything else as needed. The agent never gets the full instruction set; it gets only what the current task needs. This [prevents context overflow](docs/ARCHITECTURE.md#context-overflow-prevention).

**Classification-first.** Every request is auto-classified into a [workflow type](USAGE_GUIDE.md#workflows) before any work begins. The classification drives which instructions, skills, and rules load.

**Release-based versioning.** Instructions are organized by release (r1, r2, r3). New instructions can be developed without breaking agents on stable versions. Rollback is always possible. See [Architecture — Tradeoffs](docs/ARCHITECTURE.md#tradeoffs) for rationale.

**Rules-as-code.** AI behavior is authored, versioned, reviewed, and approved through standard engineering workflows. Same rigor as application code. See [Developer Guide — Overall Development Flow](DEVELOPER_GUIDE.md#overall-development-flow) for the authoring process, and [Contributing — Prompt Change PRs](CONTRIBUTING.md#prompt-change-prs) for PR requirements.

**Security by design.** No source code transfer. Air-gap capable. Runs inside the organization's perimeter. See [Context — Design Philosophy](docs/CONTEXT.md#design-philosophy) for the full set.

**Inversion of control.** Rosetta is designed to not see or process source code or project data. It exposes guardrails, common best practices, and a menu of available instructions. The coding agent selects only what it needs; Rosetta delivers just those — keeping context lean and IP protected.

**Batteries included.** Ships proven defaults from real-world projects. Makes the right thing the easy thing.

## Terminology

See [TERMINOLOGY.md](TERMINOLOGY.md) for definitions of bootstrap, classification, workflow, skill, rule, subagent, template, release, guardrails, HITL, meta-prompting, prompt, and shells.


## How Rosetta Fits into Your Workflow

Your IDE and coding agent ask Rosetta for instructions on each request.

**Request types.** Twelve workflow types cover the SDLC: coding, requirements documentation authoring, automated QA, test generation, research, initialization, modernization, external library onboarding, code analysis, coding agents prompting, help, and ad-hoc. See the [Usage Guide — Workflows](USAGE_GUIDE.md#workflows) for details on each.

**Four-phase pattern.** Every workflow has four phases: Prepare, Research, Plan, Act. Each phase can use subagents, skills, and HITL approval gates.

**Prepare** runs once when you first initialize the repository. The agent reads your code and extracts your business context, architecture, tech stack, and conventions into workspace files. Every later workflow uses those files. See [Usage Guide — Init Workspace](USAGE_GUIDE.md#workflows) for the full phase breakdown.

**Scaling by size:**

- Small: lightweight planning, tech-specs skill
- Medium: full planning, tech-specs, subagents
- Large: extensive planning, tech-specs, heavy subagent delegation

## Session Lifecycle

Read more about the [bootstrap flow](docs/ARCHITECTURE.md#bootstrap-flow) in the Architecture doc.

```
1. Start       Agent starts, loads rules/skills/commands
                ↓
2. Bootstrap   Agent receives universal policies and guardrails
                ↓
               [Users describe what they need]
                ↓
3. Classify    Rosetta classifies users request (coding, research, init, etc.)
                ↓
4. Load        The matching workflow, skills, and guardrails load progressively
                ↓
5. Execute     The workflow runs its four phases:
                  • Prepare  — load context (CONTEXT.md, ARCHITECTURE.md), guardrails
                  • Research — investigate code, requirements, prior decisions
                  • Plan     — produce reviewable spec and plan (HITL approval gate)
                  • Act      — implement with subagents, validate, loop

```

## Three-Layer Architecture

Instructions are organized in three layers that merge at runtime:

- **Core (OSS)** — universal instructions shipped with Rosetta
- **Organization** — your company's conventions and policies
- **Project** — local repo docs and configs

When the same file path exists in multiple layers, Rosetta merges them at runtime. It's customization by layer, not separate tenants. See [Architecture](docs/ARCHITECTURE.md) for component details and data flow.

## What Rosetta Does Not Do

- **Not a code executor.** Rosetta guides coding agents. Coding agents plan and modify code.
- **Not real-time monitoring.** No continuous observation of agent behavior during execution.
- **Not a project manager.** No scheduling, assignment, or progress tracking.
- **Not for non-SDLC work.** Guardrails enforce this.
- **Not a replacement for thinking.** HITL gates exist because human judgment matters at critical points.

## Related Docs

- [Quick Start](QUICKSTART.md) — zero to working setup
- [Usage Guide](USAGE_GUIDE.md) — how to use Rosetta flows
- [Contributing](CONTRIBUTING.md) — fastest path to a merged PR
- [Architecture](docs/ARCHITECTURE.md) — system structure, components, data flow
- [Developer Guide](DEVELOPER_GUIDE.md) — repo navigation, where to change what
- [Troubleshooting](TROUBLESHOOTING.md) — symptom-first diagnosis

