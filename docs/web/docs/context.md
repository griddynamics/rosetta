---
layout: docs
title: Context
permalink: /docs/context/
---

# Context

**Who is this for?** Contributors, architects, and stakeholders who need to understand the business purpose, domain, and requirements behind Rosetta.

**When should I read this?** When you need to understand *why* Rosetta exists, who it serves, and what success looks like.
Read the [Introduction](/docs/introduction/) first. For technical details, see [Architecture](/docs/architecture/).

**What this document is.** Business context, stakeholder perspective, and target state. Bulleted, concise, no technical implementation details. Source of truth for project purpose and business requirements.

**What this document is not.** Not architecture, not a user guide, not a changelog.

---

## Why Rosetta Exists

- Every engineer writes their own prompts, rules, and guardrails (or none at all)
- AI agents lack business context, conventions, architecture knowledge, and compliance requirements
- Knowledge stays trapped in silos and senior engineers' heads
- No visibility, no consistency, no enforcement of AI behavior at scale
- Low adoption rates due to compliance exposure and reinvented wheels
- Expertise walks out the door with no way to capture or transfer it

**Result:** Slow AI adoption, compliance risk, duplicated effort, lost institutional knowledge.

## What Rosetta Is

Rosetta is a consulting control plane for AI coding agents. It consults them with versioned, expert-prepared instructions so every agent follows your organization's rules, conventions, and knowledge — regardless of IDE, model, or team.

It comes preloaded with battle-tested best practices from real-world projects.

Not reactive like gateways. Not static like prompt libraries. Verified, project-specific, and tool-agnostic.

## Value Delivery

### For Engineers

- Standardized, expert-prepared workflows with batteries included
- Quick onboarding with automatic synchronization of best practices
- Reduced need for prompt engineering expertise
- Universal compatibility across any coding agent and tech stack
- Human-in-the-loop support built into workflows

### For Managers

- Consistent instruction setup across the organization
- Built-in guardrails reduce AI risks and rework
- Complete workflows cover steps that junior engineers forget
- Optimized token consumption across workflows
- Team mobility across projects without performance loss

### For Directors

- Adoption and usage tracking with per-feature visibility
- Department-wide governance with centralized management
- Always-current technology information and curated business knowledge
- A/B testing capability for SDLC experimentation
- Risk mitigation through secure internal deployment

### For VPs and Executive Leadership

- Measurable outcomes with reduced implementation risk
- Governance and compliance coverage
- Transparent adoption and usage metrics
- Cost efficiency when introducing AI to the organization
- IP protection preventing intellectual property leakage
- Future-proofing: adapts to new models and tools with minimal effort

## Business Requirements

### Speed

- Onboarding a new repository: minutes, not weeks (target: 15 minutes vs. 2 weeks manual setup)
- Coding task preparation: copy a story and review a spec, not 60 minutes of manual prompt crafting
- Instruction updates: author, review, publish, and roll out without downtime
- Publishing: change detection ensures only modified instructions are pushed (seconds, not full republish)

### Simplicity

- One-command installation for any supported IDE
- No local dependencies beyond a standard development environment
- [Progressive disclosure](/docs/overview/#core-mental-model): agents load only what they need, when they need it
- Works with existing tools and workflows, no process overhaul required

### Scale

- Same instructions, same behavior across all teams and projects
- Organization-wide rollout from a single instructions repository
- Release-based versioning (r1, r2, r3) for safe evolution and rollback
- Layered customization: core baseline + organization overrides + project-specific tweaks
- Plugin distribution via IDE marketplaces (Claude Code, Cursor) for instant installation across projects. See [Installation — Plugin-Based Installation](/docs/installation/#plugin-based-installation)

### Governance

- Instructions are versioned, reviewed, and approved like code (rules-as-code)
- Built-in guardrails, risk assessment, and human-in-the-loop checkpoints
- Adoption tracking and usage analytics per feature, team, and project
- Runs inside the organization's perimeter (air-gap capable)

### Quality

- Preloaded with proven patterns from real-world engagements
- Evaluation and judge pipelines for instruction quality
- Consistent agent behavior reduces hallucinations and rework
- Observed time savings per coding task: with Rosetta, ~5 min to type, ~5 min to review, ~15 min for AI to execute (25 min total). Without Rosetta, ~30 min to type, ~15 min back-and-forth in planning mode, ~15 min to execute, ~15 min to catch up (75 min total). In practice, we see productivity scale to 3x-5x, though individual results vary by task complexity

## Domain and Operating Context

- Rosetta operates across the full Software Development Lifecycle: planning, requirements, implementation, QA, release, and operations
- Agent-agnostic: works with Cursor, Claude Code, VS Code, Windsurf, JetBrains (Copilot, Junie), GitHub Copilot, Codex, Antigravity, OpenCode, and any MCP-compatible IDE
- Integrates via [Model Context Protocol (MCP)](/docs/architecture/#rosetta-mcp), the standard transport for AI agent instructions
- Security model: Rosetta serves knowledge to agents. It never sees source code. No code leaves the organization's perimeter. No IP is shared with Rosetta by default. Project datasets and plan_manager (shared execution state) are opt-in features that must be enabled explicitly.
- Grounded in production experience, not theory. Active feedback loop from real projects.

## Target State

- Every AI coding agent in the organization receives consistent, expert-prepared instructions from day one
- Knowledge is versioned, searchable, and automatically synchronized
- Best practices evolve safely with rollback capability
- Business context flows to agents via semantic search, not manual copy-paste
- Organizations govern AI behavior with the same rigor they govern code
- Instruction authoring, review, and publishing is a standard engineering workflow

## Editions

- **OSS Edition:** Fully open-source, complete source code, self-hosted, community-driven. Includes core agents, workflows, skills, rules, and templates.
- **Enterprise Edition:** Everything in OSS plus advanced capabilities: automated QA, modernization tools, cross-project knowledge sharing, specialized agents, and dedicated support.

For a comparison of installation modes (HTTP, STDIO, Plugin, Offline), see the [Installation — Choose Your Mode](/docs/installation/#choose-your-mode) table.

## Design Philosophy

These principles shape every product and architectural decision:

- **Agent-agnostic.** Never lock users into one IDE or AI model.
- **Progressive disclosure.** Load instructions in stages. Prevent context overflow. Give agents only what the current task requires.
- **Classification-first.** Every request is auto-classified before work begins. Classification drives what loads. See [Usage Guide — Workflows](/docs/usage-guide/#workflows) for available request types.
- **Release-based versioning.** Develop new instructions without breaking agents on stable versions.
- **Rules-as-code.** AI behavior is authored, versioned, reviewed, and approved through standard engineering workflows.
- **Security by design.** No source code transfer. Air-gap capable. Runs inside the organization's perimeter.
- **Batteries included.** Ship proven defaults. Make the right thing the easy thing.

## Related Docs

- [Introduction](/docs/introduction/): What Rosetta is and where to start
- [Overview](/docs/overview/): Mental model, terminology, design principles
- [Architecture](/docs/architecture/): System structure, components, data flow
- [Developer Guide](/docs/developer-guide/): Repo navigation, where to change what
- [Contributing](/docs/contributing/): Fastest path to merged PR
- [Review Standards](/docs/review/): What reviewers verify, what authors provide
- [Quick Start](/docs/quickstart/): Zero to working setup
- [Usage Guide](/docs/usage-guide/): How to use Rosetta day-to-day
- [Deployment](/docs/deployment/): Server and infrastructure setup
- [Troubleshooting](/docs/troubleshooting/): Symptom-first diagnosis
- [Installation](/docs/installation/): Full setup reference for complex environments
