---
layout: docs
title: Usage Guide
permalink: /docs/usage-guide/
---

# Usage Guide

**Who is this for?** Engineers, leads, and architects using Rosetta in their daily work.

**When should I read this?** After [Quick Start](/docs/quickstart/). When you want to understand what Rosetta offers and how to use each flow.

For terminology and mental model, see [Overview](/docs/overview/). For setup, see [Quick Start](/docs/quickstart/) or [Installation](/docs/installation/).

---

## How Rosetta Works

Describe what you need in plain language. Rosetta handles the rest.

1. Your AI coding agent loads Rosetta's [bootstrap rules](/docs/architecture/#bootstrap-flow) automatically
2. Rosetta classifies your request (coding, research, init, etc.)
3. The matching workflow, skills, and guardrails load into context
4. The agent executes with the right instructions, approval gates, and safety constraints

No special syntax. No commands to memorize. [Progressive disclosure](/docs/overview/#core-mental-model) keeps context clean: only what the current task needs gets loaded.

## Workflows

Rosetta classifies your request and loads the matching workflow. Each workflow defines phases, produces traceable artifacts, and enforces approval gates where decisions matter.

<details markdown="1">
<summary><b>Init Workspace</b></summary>

Sets up a new or existing repository for AI-assisted development. Handles fresh repos, upgrades, and plugin mode.

**Phases:**
1. Context — detect workspace mode (fresh, upgrade, plugin) and build file inventory
2. Shells — generate IDE/agent shell files from KB schemas
3. Discovery — produce TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md
4. Rules — configure local agent rules (optional, when explicit all-local rules requested)
5. Patterns — extract recurring coding and architectural patterns
6. Documentation — create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md
7. Questions — clarifying questions about gaps and assumptions
8. Verification — completeness check and catch-up for missed artifacts

```
"Initialize this repository using Rosetta"
"Initialize subagents and workflows"
```

For composite workspaces, init each repository separately, then init at workspace level.

</details>

<details markdown="1">
<summary><b>Self Help</b></summary>

Answers questions about Rosetta itself. If you decide to act, hands off to the real workflow without leaving the session.

**Phases:**
1. List capabilities — catalog all workflows, skills, and agents from the KB
2. Match and acquire — find capabilities matching your question, load their descriptions
3. Guide — explain matched capabilities and offer to launch the real workflow
4. Handoff — transfer to the matching workflow if you accept (optional)

```
"What workflows are available?"
"How do I use the research flow?"
"What can Rosetta help me with?"
```

</details>

<details markdown="1">
<summary><b>Coding</b></summary>

The main development workflow. Scales with task size: small tasks skip phases marked (M,L).

**Phases:**
1. Discovery — gather context, codebase, dependencies, affected areas (M,L)
2. Tech plan — architect defines specs, contracts, interfaces, and execution plan (all)
3. Review plan — reviewer inspects specs and plan against intent (M,L)
4. User review plan — you approve the plan before implementation (all)
5. Implementation — engineer executes the approved plan (all)
6. Review code — reviewer inspects implementation against specs (all)
7. Impl validation — validator runs actual checks against specs (M,L)
8. User review impl — you review the implementation (all)
9. Tests — engineer writes and runs tests, 80%+ coverage (all)
10. Review tests — reviewer inspects test coverage and quality (M,L)
11. Final validation — end-to-end verification (M,L)

```
"Add password reset functionality"
"Fix the race condition in payment processing"
"Implement the notification service"
```

</details>

<details markdown="1">
<summary><b>Requirements Authoring</b></summary>

Produces structured, testable, approved requirements. Saves to `docs/REQUIREMENTS/`.

**Phases:**
1. Discovery — collect project and scope signals
2. Research — gather standards, prior decisions, and domain context
3. Intent capture — capture what you actually need, surface assumptions
4. Outline — propose MECE (mutually exclusive, collectively exhaustive) requirement layout
5. Draft — author atomic requirement units with per-requirement approval
6. Validate — check correctness, conflicts, gaps, and contradictions
7. Deliver — finalize requirement artifacts with traceability matrix

```
"Define requirements for the checkout flow covering discount codes, tax, and retries"
"Write requirements for the user onboarding experience"
```

</details>

<details markdown="1">
<summary><b>Ad-hoc</b></summary>

Adaptive meta-workflow for tasks that do not fit a fixed structure. Constructs a custom execution plan from building blocks and adapts mid-execution. Good for cross-cutting work, experiments, or anything that spans multiple concerns.

Building blocks: discover, reason, plan, execute, review, validate.

**Phases:**
1. Analyze — classify request and select building blocks
2. Build plan — compose execution plan from selected blocks
3. Review plan — plan reviewer validates approach (medium, large tasks)
4. Execute plan — run steps with plan manager tracking (loops until done)
5. Review and summarize — final review and delivery

```
"Ad-hoc: write a quick script to parse these CSV files"
"Refactor the logging across three services"
```

</details>

<details markdown="1">
<summary><b>Code Analysis <span class="badge-pro">PRO</span></b></summary>

Systematic understanding of existing codebases. Distinguishes small and large analysis targets.

```
"Explain how the authentication system works"
"What is the architecture of the payment module?"
```

</details>

<details markdown="1">
<summary><b>Research <span class="badge-pro">PRO</span></b></summary>

Deep, project-grounded investigation using meta-prompting. Every claim backed by evidence.

```
"Research best practices for microservices authentication"
"Investigate OAuth 2.0 implementation options for our stack"
"Compare event sourcing vs CRUD for our order service"
```

</details>

<details markdown="1">
<summary><b>Automated QA <span class="badge-pro">PRO</span></b></summary>

Test automation workflow with approval gate before implementation.

```
"Write tests for the user registration feature"
"Create QA automation for the checkout flow"
```

</details>

<details markdown="1">
<summary><b>Test Case Generation <span class="badge-pro">PRO</span></b></summary>

Generates test cases from Jira tickets and Confluence documentation.

```
"Generate test cases for PROJ-123"
"Create test scenarios from EPIC-789 and export to TestRail"
```

</details>

<details markdown="1">
<summary><b>Modernization <span class="badge-pro">PRO</span></b></summary>

Large-scale code conversions, upgrades, and re-architecture.

```
"Migrate from Java 8 to Java 21"
"Re-architect monolith to microservices"
```

</details>

<details markdown="1">
<summary><b>External Library <span class="badge-pro">PRO</span></b></summary>

Onboards private or external libraries for AI understanding. Uses Repomix for codebase analysis, generates compressed documentation, publishes to the knowledge base, and extracts usage patterns.

```
"Teach AI about our internal authentication library"
"Document the shared utilities package"
```

</details>

<details markdown="1">
<summary><b>Coding Agents Prompting <span class="badge-pro">PRO</span></b></summary>

Specialized workflow for authoring and adapting prompts for AI coding agents. Built for teams that create or maintain instruction sets for AI tools.

```
"Create a coding workflow prompt for our internal AI agent"
"Adapt this Claude prompt for Cursor"
"Write prompts for our onboarding automation agent"
```

</details>

### Always Active

Every request benefits from these regardless of workflow.

- **Execution policies** enforce plan-driven work, incremental validation, and memory-based self-learning. The agent consults `agents/MEMORY.md` during planning and records lessons learned. See [Architecture — Workspace Files](/docs/architecture/#workspace-files) for the full file list.
- **HITL and questioning rules** govern how the agent interacts with you. Questions are batched (5-10 per round), prioritized by impact, each targeting a single decision. If something is unclear, Rosetta stops and asks.
- **[Subagent orchestration](/docs/architecture/#rosetta-mcp)** defines how work gets delegated. Subagents start with fresh context, receive explicit scope boundaries, and return concise results. Independent work runs in parallel.

## Customization

Custom overrides work in all installation modes. You do not need to modify any Rosetta files.

### Project Context Files

The single most effective way to improve AI output. These files tell the AI what your project is, how it works, and what matters. Run initialization to generate them, then customize.

- **`docs/CONTEXT.md`** (the why) — purpose, business context, design principles, key workflows, constraints
- **`docs/ARCHITECTURE.md`** (the how) — system structure, component relationships, data flow, deployment
- **`docs/TECHSTACK.md`** (the what) — technologies, frameworks, tools, and reasoning behind each choice

The more your team invests in these three files, the fewer follow-up questions Rosetta asks and the better the output gets. See [Installation — Workspace Files Created](/docs/installation/#workspace-files-created) for the full list of files Rosetta manages.

### Custom Rules

Add project-specific rules alongside Rosetta without touching its files.

| IDE / Agent | Core rules file | Additional rules |
|-------------|----------------|-----------------|
| Cursor | `.cursor/rules/agents.mdc` | `.cursor/rules/*.mdc` |
| Claude Code | `CLAUDE.md` | `.claude/rules/*.md` |
| GitHub Copilot | `.github/copilot-instructions.md` | |
| Windsurf | `.windsurf/rules/*.md` | All `.md` files auto-load |
| JetBrains (Junie + AI Assistant) | `.aiassistant/rules/agents.md` | `.junie/guidelines.md` |
| Antigravity / Google IDX | `.agent/rules/agents.md` | `.agent/rules/*.md` |
| OpenCode | `AGENTS.md` | `.opencode/agent/*.md` |

### Recommended MCP Servers

MCPs give the AI eyes and hands beyond the codebase.

- **[Context7](https://github.com/upstash/context7)** — up-to-date library documentation
- **[Playwright MCP](https://github.com/microsoft/playwright-mcp)** — interact with web pages through structured accessibility snapshots
- **[Chrome DevTools](https://github.com/ChromeDevTools/chrome-devtools-mcp)** — full browser control with console, network tab, snapshots
- **[GitNexus](https://github.com/abhigyanpatwari/GitNexus)** — indexes any codebase into a knowledge graph
- [Figma MCP](https://github.com/GLips/Figma-Context-MCP) — Figma integration so AI can see designs directly
- [Jira & Confluence MCP](https://www.atlassian.com/platform/remote-mcp-server) — tickets, comments, and documentation
- [Fetch](https://github.com/modelcontextprotocol/servers/tree/main/src/fetch) — retrieve and process content from APIs and web pages
- [Repomix MCP](https://repomix.com/guide/mcp-server) — documentation for AI to use existing client libraries
- [DeepWiki](https://docs.devin.ai/work-with-devin/deepwiki-mcp) — up-to-date documentation
- [Database MCPs](https://glama.ai/mcp/servers?attributes=category%3Adatabases) — read schema, read data

Bold entries are strongly recommended. The rest depend on your project needs.

<details markdown="1">
<summary><b>Skills</b></summary>

Reusable units of work that workflows and subagents invoke. Each skill focuses on one type of task.

| Skill | What it does |
|-------|-------------|
| **Coding** | Implementation with KISS/SOLID/DRY principles, multi-environment awareness, systematic validation |
| **Testing** | Thorough, isolated, idempotent tests with 80% minimum coverage and scenario-driven testing |
| **Tech Specs** | Clear, testable specifications defining target state architecture, contracts, and interfaces |
| **Planning** | Execution-ready plans from approved specs using sequenced WBS and HITL checkpoints |
| **Reasoning** | Structured meta-cognitive reasoning using canonical 7D for complex problems |
| **Questioning** | Targeted clarification questions when high-impact unknowns block safe execution |
| **Debugging** | Root cause investigation before attempting fixes for errors, test failures, unexpected behavior |
| **Load Context** | Fast, automated loading of current project context for planning and understanding user intent |
| **Reverse Engineering** | Extract what a system does and why from source files, stripped of implementation details |
| **Requirements Authoring** | Atomic requirement units with EARS format, explicit user approval, and traceability |
| **Requirements Use** | Consume approved requirements to drive planning, implementation, and validation |
| **Coding Agents Prompt Adaptation** | Adapt prompts from one coding agent/IDE to another while preserving intent and strategy |
| **Large Workspace Handling** | Partition large workspaces (50+ files) into scoped subagent tasks |
| **Init Workspace Context** | Classify initialization mode and build existing file inventory |
| **Init Workspace Discovery** | Produce TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md from workspace analysis |
| **Init Workspace Documentation** | Create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, MEMORY.md |
| **Init Workspace Patterns** | Extract recurring coding and architectural patterns into reusable templates |
| **Init Workspace Rules** | Create local cached agent rules configured for IDE/OS/project context |
| **Init Workspace Shells** | Generate IDE/CodingAgent shell files from KB schemas |
| **Init Workspace Verification** | Verify initialization completeness and run catch-up for missed artifacts |
| **Backward Compatibility** <span class="badge-pro">PRO</span> | Ensure changes preserve backward compatibility |
| **Code Review** <span class="badge-pro">PRO</span> | Structured code review against standards and intent |
| **Context Engineering** <span class="badge-pro">PRO</span> | Advanced context construction and optimization |
| **Data Generation** <span class="badge-pro">PRO</span> | Generate test data and synthetic datasets |
| **Design** <span class="badge-pro">PRO</span> | System and API design patterns |
| **Discovery** <span class="badge-pro">PRO</span> | Deep codebase and domain discovery |
| **Documentation** <span class="badge-pro">PRO</span> | Technical documentation authoring |
| **Git** <span class="badge-pro">PRO</span> | Git operations and workflow management |
| **Large File Handling** <span class="badge-pro">PRO</span> | Process files too large for single-pass context |
| **Plan Review** <span class="badge-pro">PRO</span> | Review execution plans for completeness and risk |
| **Prompt Diagnosis** <span class="badge-pro">PRO</span> | Diagnose and fix underperforming prompts |
| **Research** <span class="badge-pro">PRO</span> | Systematic deep research using meta-prompting with grounded references and self-validation |
| **Scenarios Generation** <span class="badge-pro">PRO</span> | Generate test scenarios from requirements |
| **Security** <span class="badge-pro">PRO</span> | Security analysis and vulnerability assessment |
| **Simulation** <span class="badge-pro">PRO</span> | Simulate prompt execution for validation |
| **Technical Summarization** <span class="badge-pro">PRO</span> | Concise technical summaries of complex content |
| **Template Execution** <span class="badge-pro">PRO</span> | Execute parameterized prompt templates |
| **Coding Agents Prompt Authoring** <span class="badge-pro">PRO</span> | Author, update, and validate prompts for AI coding agents with analytics artifacts |
| **Coding Agents Farm** <span class="badge-pro">PRO</span> | Orchestrate multiple coding agents in parallel on isolated git worktrees |
| **Natural Writing** <span class="badge-pro">PRO</span> | Clear, human-sounding text without AI cliches or marketing hype |

</details>

<details markdown="1">
<summary><b>Agents</b></summary>

Workflows delegate phases to specialized subagents. Each has a focused role, its own context window, and access to relevant skills. The orchestrator coordinates sequence, state, and approvals.

| Agent | Role |
|-------|------|
| **Discoverer** | Lightweight. Gathers context from codebase and external sources before any work begins |
| **Executor** | Lightweight. Runs simple commands and summarizes results to prevent context overflow |
| **Planner** | Produces sequenced execution plans scaled to request size with quality gates |
| **Architect** | Transforms requirements into technical specifications and architecture decisions |
| **Engineer** | Executes implementation and testing tasks |
| **Reviewer** | Inspects artifacts against intent and contracts, provides recommendations |
| **Validator** | Verifies implementation through actual execution and evidence-based validation |
| **Analyst** <span class="badge-pro">PRO</span> | Business and technical requirements analysis |
| **Orchestrator** <span class="badge-pro">PRO</span> | Manages a team of subagents, owns delegation quality end-to-end |
| **Researcher** <span class="badge-pro">PRO</span> | Deep research with grounded references and systematic exploration |
| **Prompt Engineer** <span class="badge-pro">PRO</span> | Authors and adapts prompt artifacts under explicit HITL approvals |

</details>

<details markdown="1">
<summary><b>In Practice</b></summary>

### Feature Development

```
You: "Add password reset functionality"

What happens:
1. Rosetta loads the coding workflow
2. Agent reads CONTEXT.md and ARCHITECTURE.md
3. Agent discovers existing auth code and email service
4. Creates tech spec in plans/PASSWORD-RESET/
5. Creates implementation plan
6. Waits for your approval
7. Implements the feature
8. Separate reviewer inspects the code
9. Writes tests (80%+ coverage)
10. Validator verifies against specs
```

### Requirements Before Building

```
You: "Define requirements for the checkout flow"

What happens:
1. Rosetta loads the requirements workflow
2. Agent researches your codebase and asks clarifying questions
3. Drafts atomic requirements in EARS format
4. You approve each requirement individually
5. Validates for conflicts, gaps, and contradictions
6. Delivers to docs/REQUIREMENTS/ with traceability matrix
```

### Project Initialization

```
You: "Initialize this repository using Rosetta"

What happens:
1. Agent scans your tech stack, dependencies, and project structure
2. Generates TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md
3. Creates CONTEXT.md and ARCHITECTURE.md
4. Asks clarifying questions about your project
5. Verifies all generated docs
```

### Research

```
You: "Investigate OAuth 2.0 options for our stack"

What happens:
1. Rosetta loads the research workflow
2. Agent reads your project context
3. Crafts an optimized research prompt
4. You approve the research direction
5. Dedicated subagent runs the investigation
6. Delivers documented analysis with grounded references
```

</details>

<details markdown="1">
<summary><b>How Rosetta Protects You</b></summary>

These rules are always active. They cannot be turned off.

| Rule | What it means |
|------|---------------|
| **Approval before action** | Produces a plan and waits for your explicit approval before making changes |
| **No data deletion** | Never deletes data from servers or generates scripts that do so |
| **Sensitive data protection** | Personal, financial, and regulated data is masked and never shared or logged |
| **Bounded scope** | Tasks kept to a manageable size (up to 2 hours of work, 15 files, spec files under 350 lines) |
| **Tracks assumptions** | When something is unclear, asks rather than guesses |
| **Risk assessment** | Checks for access to dangerous tools (databases, cloud, S3) and assigns a risk level. High risk requires confirmation. Critical risk blocks execution |
| **SDLC only** | All requests must be development-related. No personal or private chats |
| **Context monitoring** | Warns at 65% context usage and escalates at 75% to prevent degraded output |

</details>

## Plugins

Rosetta is distributed as plugins for Claude Code and Cursor.

- **core** — 20 skills, 7 agents, 5 workflows, 11 rules, 7 IDE templates. Full OSS foundation bundled locally.
- **grid** — 4 skills, 2 agents, 2 workflows, 2 rules. Enterprise extensions (requires core).
- **rosetta** — bootstrap rule and MCP connection only. Smallest footprint, all instructions loaded from MCP on demand.

See [Installation — Plugin-Based Installation](/docs/installation/#plugin-based-installation) for install commands.

## Best Practices

- **Talk naturally.** Describe what you need. Rosetta figures out the right workflow.
- **Be specific.** More context means better output and fewer questions. "Define requirements for the checkout flow covering discount codes, tax calculation, and payment retries" beats "Write requirements for checkout."
- **Read plans before approving.** The plan is your last checkpoint before work begins. Check scope, approach, and what will change.
- **Answer questions fully.** When Rosetta asks, it targets a specific gap. Short answers lead to incomplete solutions.
- **Write requirements first.** The requirements workflow prevents scope creep and gives you a clear acceptance baseline.
- **Invest in context files.** CONTEXT.md and ARCHITECTURE.md benefit every developer on the project.
- **Point Rosetta at existing specs.** Reference requirements, API contracts, or design documents in CONTEXT.md. Rosetta uses them as constraints instead of generating assumptions.
- **Clean up dead code before onboarding.** Unused code confuses AI the same way it confuses new developers.
- **Do not approve plans you have not read.** The approval gate only protects you if you use it.
- **Do not delete files in `docs/`.** They are Rosetta's project knowledge. Deleting them means starting over.

## Video Tutorials

**Setup:**
- [Install Using MCP](https://drive.google.com/file/d/16N2h5R_0JYMiE_PhfPVRcaCcH_52_qvG/view?usp=drive_link) (3 min)
- [Install without MCP](https://drive.google.com/file/d/1ClktG-QxZJr3nkCVHJ815ZJ1esp2WI6F/view?usp=drive_link) (2 min)
- [Initialize Repo](https://drive.google.com/file/d/1BcloxAXzrvdY1Uc5rNF6b_g1MzePLYpn/view?usp=drive_link) (4 min)

**Configuration:**
- [Subagents, Skills, Commands, and Workflows in Claude Code](https://drive.google.com/file/d/1GnFLr6ljAV29e4lHPDj0u6qYNQat0CDk/view?usp=drive_link)

**Workflows:**
- [Code, Validate, QA, Integration Testing, E2E testing](https://drive.google.com/file/d/1FFgXYGT3A5OjLqjdKe6o07qAF1zz3Yi6/view?usp=drive_link)
- [Code Comprehension](https://drive.google.com/file/d/1aSEjPSsD3M750t8WES4ExXdYeISW5v7Q/view?usp=drive_link)
- [Help, Research, and Modernization](https://drive.google.com/file/d/1CjqqddtgCChM6TUyQZyuQ3xF-vpA5qyf/view?usp=drive_link)

These videos were recorded in different IDEs to show that Rosetta works everywhere.

## Getting Help

- [Discord](https://discord.gg/QzZ2cWg36g)
- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## Related Docs

- [Overview](/docs/overview/) — mental model and terminology
- [Quick Start](/docs/quickstart/) — zero to working setup
- [Installation](/docs/installation/) — all setup modes and environment variables
- [Architecture](/docs/architecture/) — system structure, components, data flow
- [Deployment](/docs/deployment/) — org-wide deployment
- [Contributing](/docs/contributing/) — fastest path to a merged PR
- [Troubleshooting](/docs/troubleshooting/) — symptom-first diagnosis

---
