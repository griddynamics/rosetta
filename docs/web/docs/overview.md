---
layout: docs
title: Overview
permalink: /docs/overview/
---

# Overview

**Who is this for?** Engineers, leads, and architects who want to understand how Rosetta works before contributing or evaluating it.

**When should I read this?** After the [Introduction](/docs/introduction/), before diving into [Architecture](/docs/architecture/) or [Contributing](/docs/contributing/).

---

## Problem Rosetta Solves

- AI coding agents miss conventions, constraints, and business rules. Rejection rates are high.
- Writing effective instructions is hard. Keeping them current across evolving tools and models is harder.
- Reusable instructions across different IDEs and AI agents barely exist.
- Knowledge stays siloed. No way to share proven patterns across projects or enforce consistent behavior at scale.

## Core Mental Model

Rosetta is a **consulting control plane for AI coding agents**. It consults them with versioned, expert-prepared instructions so every agent follows your organization's rules, conventions, and knowledge — from day one.

Design principles:

**Agent-agnostic.** Works across Cursor, Claude Code, VS Code, Windsurf, JetBrains (Copilot, Junie), GitHub Copilot, Codex, Antigravity, OpenCode, and any MCP-compatible IDE. Adopts agent-specific features where available, simulates them where not.

**Progressive disclosure.** Instructions load in stages (bootstrap, classification, workflow-specific, sub-instructions) to [prevent context overflow](/docs/architecture/#context-overflow-prevention). The agent gets only what it needs for the current task.

**Classification-first.** Every request is auto-classified into a [workflow type](/docs/usage-guide/#workflows) before any work begins. Classification drives which instructions, skills, and rules load. Provided workflows are used as templates.

**Release-based versioning.** Instructions are organized by release (r1, r2, r3). New instructions can be developed without breaking agents on stable versions. Rollback is always possible. See [Architecture — Tradeoffs](/docs/architecture/#tradeoffs) for rationale.

**Rules-as-code.** AI behavior is authored, versioned, reviewed, and approved through standard engineering workflows. Same rigor as application code. See [Contributing — Prompt Changes](/docs/contributing/#prompt-changes) for the authoring process.

**Security by design.** No source code transfer. Air-gap capable. Runs inside the organization's perimeter. See [Context — Design Philosophy](/docs/context/#design-philosophy) for the full set.

**Batteries included.** Ships proven defaults from real-world projects. Makes the right thing the easy thing.

## Key Concepts

These terms are defined here and referenced everywhere else.


| Term               | Definition                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bootstrap**      | Critical universal policies (core, execution, hitl, guardrails) loaded at agent startup.                                                    |
| **Classification** | Auto-detection of request type (coding, testing, research, init, etc.) that routes to a specific workflow.                                  |
| **Workflow**       | Multi-phase pipeline coordinating subagents for a specific request type. Defines phases, steps, and approval gates. Alias **Command**       |
| **Skill**          | Reusable unit of work loaded into agents on demand. Skills define *how* to accomplish a specific task.                                      |
| **Rule**           | Persistent constraint applied globally or by path pattern. Defines best practices, guardrails, guidelines.                                  |
| **Subagent**       | Delegated specialist with fresh context and its own system prompt. Alias: **Agent**. Examples: orchestrator, planner, executor, and others. |
| **Template**       | Parameterized prompt with variables and validated placeholders.                                                                             |
| **Release**        | Versioned instruction set (r1, r2, r3). Enables safe evolution, rollback, and A/B testing.                                                  |
| **Guardrails**     | Safety measures: scope limits, data protection, transparency rules, approval gates, risk assessment.                                        |
| **HITL**           | Human-in-the-loop. Approval gates at critical decision points (specs, plans, risky actions).                                                |
| **Meta-prompting** | Rosetta MCP consults the AI agent on what should be done and how using meta-prompts.                                                        |
| **Rosetta**        | MCP and CLI of Instruction and Knowledge Management System.                                                                                 |
| **Prompt**         | Skill, Rule, Workflow, Command, Subagent, Agent, Template, or any generic prompt. **Rosetta prompt** prompt for Rosetta.                    |
| **Shells**         | Small prompt proxies with proper fronmatters created during onboarding so that coding agents are aware of skill, agents, commands.          |


## How Rosetta Fits into Your Workflow

Your IDE and coding agent ask Rosetta for instructions on each request.

**Request types.** Twelve workflow types cover the SDLC: coding, requirements authoring, automated QA, test generation, research, initialization, modernization, external library onboarding, code analysis, coding agents prompting, help, and ad-hoc. See the [Usage Guide — Workflows](/docs/usage-guide/#workflows) for details on each.

**Standard pattern (P-RPA).** Every workflow follows Prepare, Research, Plan, Act. Each phase can involve subagents, skills, and HITL approval gates.

**Prepare** is executed once during repository initialization and maintained automatically by AI. It reverse-engineers business context, architecture, tech stack, and coding patterns into workspace files that every subsequent workflow uses. See [Usage Guide — Init Workspace](/docs/usage-guide/#workflows) for the full phase breakdown.

**Scaling by size:**

- Small: lightweight planning, tech-specs skill
- Medium: full planning, tech-specs, subagents
- Large: extensive planning, tech-specs, heavy subagent delegation

## Session Lifecycle

Read more about the [bootstrap flow](/docs/architecture/#bootstrap-flow) in the Architecture doc.

```
1. Start       Agent starts, loads rules/skills/commands
                ↓
2. Bootstrap   Agent receives universal policies and guardrails
                ↓
3. Classify    Request type auto-detected from your input
                ↓
4. Load        Workflow-specific instructions, skills, and rules load progressively
                ↓
5. Execute     Plan, approve (HITL gate), execute with subagents, validate, loop
                ↓
6. Evolve      New releases developed safely; rollback if needed
```

## Three-Layer Architecture

Instructions are organized in three layers that merge at runtime:

- **Core (OSS)** — universal instructions shipped with Rosetta
- **Organization** — your company's conventions and policies
- **Project** — local repo docs and configs

Layers at the same resource path get [bundled together](/docs/architecture/#bundler). This is layered customization, not multi-tenancy. See [Architecture](/docs/architecture/) for component details and data flow.

## What Rosetta Does Not Do

- **Not a code executor.** Rosetta guides coding agents. Coding agents plan and modify code.
- **Not real-time monitoring.** No continuous observation of agent behavior during execution.
- **Not a project manager.** No scheduling, assignment, or progress tracking.
- **Not for non-SDLC work.** Guardrails enforce this.
- **Not a replacement for thinking.** HITL gates exist because human judgment matters at critical points.

## Related Docs

- [Quick Start](/docs/quickstart/) — zero to working setup
- [Usage Guide](/docs/usage-guide/) — how to use Rosetta flows
- [Contributing](/docs/contributing/) — fastest path to a merged PR
- [Architecture](/docs/architecture/) — system structure, components, data flow
- [Developer Guide](/docs/developer-guide/) — repo navigation, where to change what
- [Troubleshooting](/docs/troubleshooting/) — symptom-first diagnosis
