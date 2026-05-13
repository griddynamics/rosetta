# Context

**Who is this for?** Contributors, architects, and stakeholders who need to understand the business purpose, domain, and requirements behind Rosetta.

**When should I read this?** When you need to understand *why* Rosetta exists, who it serves, and what success looks like. 
Read the [README](../README.md) first. For technical details, see [Architecture](ARCHITECTURE.md).

**What this document is.** Business context, stakeholder perspective, and target state. Bulleted, concise, no technical implementation details. Source of truth for project purpose and business requirements.

**What this document is not.** Not architecture, not a user guide, not a changelog.

## Why Rosetta Exists

- Every engineer writes their own prompts, rules, and guardrails (or none at all)
- AI agents lack business context, conventions, architecture knowledge, and compliance requirements
- Knowledge stays trapped in silos and senior engineers' heads
- No visibility, no consistency, no enforcement of AI behavior at scale
- Low adoption rates due to compliance exposure and reinvented wheels
- Expertise walks out the door with no way to capture or transfer it

**Result:** Slow AI adoption, compliance risk, duplicated effort, lost institutional knowledge.

## What Rosetta Is

Rosetta is a meta-prompting, context engineering, and centralized instructions management for AI coding agents. It provides structured context - rules, skills, workflows, and sub-agents - guiding AI systems to operate with a deep understanding of system architecture, domain constraints, and engineering standards. Rosetta also accelerates project onboarding by reverse-engineering architecture and domain context, improving the reliability and consistency of AI-generated code.

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
- [Progressive disclosure](../OVERVIEW.md#core-mental-model): agents load only what they need, when they need it
- Works with existing tools and workflows, no process overhaul required

### Scale

- Same instructions, same behavior across all teams and projects
- Organization-wide rollout from a single instructions repository
- Release-based versioning (r1, r2, r3) for safe evolution and rollback
- Layered customization: core baseline + organization overrides + project-specific tweaks
- Plugin distribution via IDE marketplaces (Claude Code, Cursor) for instant installation across projects. See [Installation — Plugin-Based Installation](../INSTALLATION.md#plugin-based-installation)

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
- Integrates via [Model Context Protocol (MCP)](ARCHITECTURE.md#rosetta-mcp), the standard transport for AI agent instructions
- Security model: Rosetta is designed to only serve knowledge and instructions to agents — it does not see or process source code. No code leaves the organization's perimeter by design. Rosetta itself does not store any project data. Opt-in features (project datasets, plan_manager, submit_feedback, usage analytics) can be enabled in your deployment for cross-project intelligence, execution tracking, and adoption visibility; when enabled, your infrastructure stores the data and you are responsible for it. plan_manager receives execution plans created by AI, which may contain project-specific information. Usage analytics (PostHog) collects basic operational metadata — IP address, user email, coding agent with version, tool called, and tool parameters — when you deploy and configure a PostHog instance on your infrastructure.
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

For a comparison of installation modes (HTTP, STDIO, Plugin, Offline), see the [Installation — Choose Your Mode](../INSTALLATION.md#choose-your-mode) table.

## Design Philosophy

These principles shape every product and architectural decision:

- **Agent-agnostic.** Never lock users into one IDE or AI model.
- **Progressive disclosure.** Load instructions in stages. Prevent context overflow. Give agents only what the current task requires.
- **Classification-first.** Every request is auto-classified before work begins. Classification drives what loads. See [Usage Guide — Workflows](../USAGE_GUIDE.md#workflows) for available request types.
- **Release-based versioning.** Develop new instructions without breaking agents on stable versions.
- **Rules-as-code.** AI behavior is authored, versioned, reviewed, and approved through standard engineering workflows.
- **Security by design.** No source code transfer. Air-gap capable. Runs inside the organization's perimeter.
- **Batteries included.** Ship proven defaults. Make the right thing the easy thing.

## Related Docs

- [README](../README.md): What Rosetta is and where to start
- [Overview](../OVERVIEW.md): Mental model, terminology, design principles
- [Architecture](ARCHITECTURE.md): System structure, components, data flow
- [Developer Guide](../DEVELOPER_GUIDE.md): Repo navigation, where to change what
- [Contributing](../CONTRIBUTING.md): Fastest path to merged PR
- [Review](../REVIEW.md): What reviewers verify, what authors provide
- [Quickstart](../QUICKSTART.md): Zero to working setup
- [Usage Guide](../USAGE_GUIDE.md): How to use Rosetta day-to-day
- [Deployment Guide](../DEPLOYMENT_GUIDE.md): Server and infrastructure setup
- [Troubleshooting](../TROUBLESHOOTING.md): Symptom-first diagnosis
- [Installation](../INSTALLATION.md): Full setup reference for complex environments

