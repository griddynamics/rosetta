# Usage Guide

**Who is this for?** Engineers, leads, and architects using Rosetta in their daily work.

**When should I read this?** After [QUICKSTART.md](QUICKSTART.md). When you want to understand what Rosetta offers and how to use each flow.

For terminology and mental model, see [OVERVIEW.md](OVERVIEW.md). For setup, see [QUICKSTART.md](QUICKSTART.md) or [INSTALLATION.md](INSTALLATION.md).

---

## How Rosetta Works

Use the slash command for the respective workflow and type your request naturally. The workflow guides AI and you along the way.

1. Your AI coding agent loads Rosetta's [bootstrap rules](docs/ARCHITECTURE.md#bootstrap-flow) automatically
2. You use the slash command for the respective workflow (e.g. `/coding-flow`, `/research-flow`)
3. The matching workflow, skills, and guardrails load into context
4. The agent executes with the right instructions, approval gates, and safety constraints

[Progressive disclosure](OVERVIEW.md#core-mental-model) keeps context clean: only what the current task needs gets loaded.

## Workflows

Each workflow is invoked with its slash command. Use the slash command, add your request, and the workflow guides AI and you along the way. Each workflow defines phases, produces traceable artifacts, and enforces approval gates where decisions matter.

<details>
<summary><b>Init Workspace</b></summary>

Sets up a repository so AI coding agents can work with Rosetta context from the first real task. Use it for fresh repositories, upgrades, plugin-based setups, and composite workspaces that need a top-level documentation registry.

**Use when:** initialize or upgrade a repo, generate IDE/agent shell files, create workspace documentation, extract patterns, or inspect an existing codebase before feature work.

**Phases:**
1. Context — detect fresh, upgrade, plugin, or composite mode; inventory existing Rosetta files and create `agents/init-workspace-flow-state.md`
2. Shells — generate shell files for skills, agents, and workflows unless plugin mode makes local shells unnecessary
3. Discovery — analyze project structure and produce `docs/TECHSTACK.md`, `docs/CODEMAP.md`, and `docs/DEPENDENCIES.md`
4. Rules — optional local rule configuration; present in the workflow but disabled by default
5. Patterns — extract reusable coding and architecture patterns into `docs/PATTERNS/`
6. Documentation — create or update `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `agents/IMPLEMENTATION.md`, `docs/ASSUMPTIONS.md`, and memory
7. Questions — ask targeted gap questions and update affected docs through subagents
8. Verification — validate completeness, report remediation, and require a new chat session

**Expect:** built-in subagents for mode detection, discovery, pattern extraction, documentation, gap filling, and verification. Your responsibility is to answer domain and architecture questions, review generated docs, and restart the chat after initialization so new shell/context files are loaded.

```
# Greenfield (new repository)
"Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ..."

# Brownfield (existing repository)
"Initialize this repository using the respective Rosetta workflow[, this is a composite workspace][, additional information]"

"Upgrade this repository from Rosetta R1 to R2"
"Initialize subagents and workflows"
```

For composite workspaces, init each repository separately, then init at workspace level. The rules phase exists but is disabled by default.

</details>

<details>
<summary><b>Self Help</b></summary>

Explains what Rosetta can do and how to use it in the current workspace. It is a conversational discovery workflow, not an implementation workflow, but it can hand off to a real workflow when you decide to act.

**Use when:** you want available workflows, help choosing the right workflow, an explanation of a Rosetta capability, or a handoff from guidance into execution.

**Phases:**
1. List capabilities — catalog available workflows, skills, and agents
2. Match and acquire — match your question to relevant Rosetta capabilities and load their descriptions
3. Guide — explain when to use each matched capability, required inputs, artifacts, and approval gates
4. Handoff — optionally switch into the selected workflow if you explicitly ask to proceed

**Expect:** usually no files. A discoverer subagent may prepare the catalog and matching. Your responsibility is to state the outcome you want and explicitly approve any handoff into execution.

```
/self-help-flow What workflows are available?
/self-help-flow How do I use the research flow?
/self-help-flow What can Rosetta help me with?
```

</details>

<details>
<summary><b>Coding</b></summary>

Use this for implementation work after you know what needs to change. Rosetta turns the request into specs, a plan, code, reviews, validation, and tests, with human approval before implementation and before test work continues.

**Use when:** add, change, or fix application code; inspect the repo before implementation; or require reviewer and validator gates instead of one agent coding straight through.

**Phases:**
1. Discovery — gather affected code, dependencies, constraints, requirements, and existing patterns for medium/large tasks
2. Tech plan — architect writes specs and an implementation plan; small tasks may receive these in chat
3. Review plan — reviewer checks specs and plan against intent for medium/large tasks
4. User review plan — you approve the plan before implementation
5. Implementation — engineer implements only the approved scope; build must succeed, tests are separate
6. Review code — reviewer inspects implementation against approved specs
7. Implementation validation — validator checks diff, coverage of specs, gaps, and execution evidence for medium/large tasks
8. User review implementation — you approve implementation before tests continue
9. Tests — engineer writes and runs isolated, idempotent tests
10. Review tests — reviewer checks scenario coverage and mocking quality for medium/large tasks
11. Final validation — validator performs final end-to-end verification for medium/large tasks

**Expect:** discoverer, architect, engineer, executor, reviewer, and validator subagents. Artifacts can include discovery notes, specs, plans, review findings, validation findings, tests, and concise Rosetta doc updates. Your responsibility is to provide acceptance criteria, review plans before approving, and call out scope changes before implementation starts.

```
/coding-flow Add password reset functionality
/coding-flow Fix the race condition in payment processing
/coding-flow Implement the notification service
```

</details>

<details>
<summary><b>Requirements Documentation Authoring</b></summary>

Use this before building when expected behavior is unclear, high impact, or needs traceability. Rosetta captures intent first, then drafts atomic requirements in small batches with explicit approval for each requirement unit.

**Use when:** create, improve, review, or validate requirements for a feature, workflow, interface, or non-functional concern.

**Phases:**
1. Discovery — collect existing requirements, glossary terms, assumptions, constraints, affected files, and scope signals
2. Research — gather standards, prior decisions, and reusable requirement patterns when local context is not enough
3. Intent capture — restate intent, list assumptions and questions, then wait for approval before structure or drafting
4. Outline — propose MECE requirement areas, file mapping, ID strategy, and traceability plan
5. Draft — author atomic requirement units in small batches, using EARS for functional requirements and measurable NFR thresholds
6. Validate — check correctness, conflicts, gaps, contradictions, and source-to-goal-to-requirement-to-test traceability
7. Finalization — deliver approved requirements, validation pack, traceability matrix, index updates, and change log

**Expect:** requirements-engineer and requirements-reviewer subagents. HITL gates approve intent, structure, each requirement unit, and validation findings. Your responsibility is to define actors, goals, scope boundaries, non-goals, priorities, measurable thresholds, and approval decisions.

```
/requirements-authoring-flow Define requirements for the checkout flow covering discount codes, tax, and retries
/requirements-authoring-flow Write requirements for the user onboarding experience
```

</details>

<details>
<summary><b>Ad-hoc</b></summary>

Builds a custom workflow when no fixed Rosetta workflow fits the request. It composes building blocks such as discovery, requirements capture, reasoning, planning, execution, review, validation, HITL gates, and memory updates.

**Use when:** the task is small or unusual, spans several concerns, needs adaptive planning, or requires lightweight structure without forcing a specialized workflow.

**Phases:**
1. Prep and classify — complete Rosetta prep, classify task size, and choose building blocks such as discover, requirements, reasoning, plan, execute, review, validate, simulate, or HITL
2. Build plan — create a plan-manager plan with sequenced steps, roles, models, dependencies, and expected outputs
3. Review plan — for medium/large tasks, reviewer checks completeness, sequencing, dependencies, and prompt clarity; you approve before execution
4. Execute plan — loop through plan-manager steps, delegate to subagents or execute directly, and update status after each step
5. Review and summarize — validate against original intent, update memory when needed, and summarize outcomes

**Expect:** a tailored plan rather than a fixed artifact set. Depending on selected blocks, outputs may include a plan, specs, requirements notes, validation results, code changes, or memory updates. Your responsibility is to keep intent clear, approve or reject the plan, and decide when discoveries should change scope.

```
/adhoc-flow Write a quick script to parse these CSV files
/adhoc-flow Refactor the logging across three services
```

</details>

<details>
<summary><b>Code Analysis</b></summary>

Reverse-engineers an existing codebase into grounded architecture documentation before planning, refactoring, testing, onboarding, or modernization. The workflow scales from a single focused analysis document to parallel per-module analysis with a cross-module summary.

**Use when:** analyze a repository, module, feature, or API; explain component responsibilities; document data flow and integrations; create an architecture baseline; or extract requirements from existing code when explicitly requested.

**Phases:**
1. Context load — read project context and identify entry points such as APIs, webhooks, CLIs, and cron jobs
2. Scope and classify — classify SMALL vs LARGE, record paths, boundaries, non-goals, and module list when needed
3. Clarify unknowns — ask only critical/high questions that affect analysis accuracy; persist resolved and unresolved assumptions
4. Requirements branch — only when requested, extract SMART/MECE/EARS requirements into `docs/<feature>/REQUIREMENTS/`
5. Analyze small — for SMALL scope, produce one `docs/<feature>/analysis.md` with components, data models, flows, edge cases, dependencies, and diagrams
6. Analyze large parallel — for LARGE scope, partition modules and produce `docs/<feature>/module-<module>.md` files in parallel
7. Summarize — for LARGE scope, combine modules into `docs/<feature>/summary.md`
8. Review — check groundedness, scope coverage, assumptions, diagrams, and absence of implementation suggestions
9. User review — you approve with "Yes, I reviewed the analysis" or provide feedback
10. Finalize — update state and add a brief pointer to produced artifacts

**Expect:** discoverer, architect, and reviewer subagents. Every claim should trace to code/docs; diagrams must be readable in light and dark themes; generated code and refactor suggestions are out of scope. Your responsibility is to define scope, answer high-impact questions, and review whether the explanation matches real system intent.

```
/code-analysis-flow Explain how the authentication system works
/code-analysis-flow What is the architecture of the payment module?
/code-analysis-flow Analyze the REST API architecture and write the result to analysis.md
/code-analysis-flow Reverse-engineer requirements from the billing module
```

</details>

<details>
<summary><b>Research</b></summary>

Use this for project-related research, investigation, or technical comparison that needs systematic exploration and grounded references. Rosetta first turns the request into a focused research prompt, then runs the approved prompt through a dedicated research pass.

**Use when:** you need deep investigation before choosing an approach, research tied to current project context, or a documented answer rather than a quick opinion.

**Phases:**
1. Context load — researcher reads project context, architecture, and implementation state
2. Prompt craft — researcher creates `research-prompt.md` in the feature plan folder; you approve the research direction
3. Execute research — dedicated researcher executes the approved prompt using the research skill
4. Finalize — produce `docs/<feature>-research.md` and mark `research-flow-state.md` complete

**Expect:** a researcher subagent, a prompt artifact before the research runs, and grounded final analysis. Your responsibility is to review the prompt because it controls what the research will and will not answer.

```
/research-flow Research best practices for microservices authentication
/research-flow Investigate OAuth 2.0 implementation options for our stack
/research-flow Compare event sourcing vs CRUD for our order service
```

</details>

<details>
<summary><b>Automated QA</b></summary>

Creates or updates automated UI tests from a TestRail case, Confluence context, and the project test architecture. The workflow reads requirements first, clarifies assertions, analyzes existing tests and Page Objects, identifies selectors from source or page HTML, implements the test, then waits for execution results before proposing fixes.

**Use when:** automate a TestRail case or QA scenario, reuse existing Page Objects and helpers, avoid guessed selectors, or analyze a failing automated test report.

**Phases:**
1. Data Collection — collect TestRail, Confluence, project instructions, and create `agents/plans/aqa-<test-name>.md`
2. Requirements Clarification — ask assertion and behavior questions; wait for answers before code analysis
3. Code Analysis — inspect frontend code, Page Objects, existing tests, utilities, and project conventions
4. Selector Identification — map steps to UI elements; request page source only when selectors cannot be found
5. Selector Implementation — add or update selectors in Page Objects using project conventions
6. Test Implementation — implement the automated test and stop so you can run it
7. Test Report Analysis — read test report output, categorize failures, and identify root causes
8. Test Corrections — prepare fixes and require approval before applying changes

**Expect:** sequential state-driven execution with QA/frontend/test implementation focus. HITL gates occur in phases 2, 6, 7, and 8; phase 4 asks for page HTML only if needed. Your responsibility is to provide the TestRail case, Confluence context, answers, page HTML when requested, run the test, and provide the report.

```
/aqa-flow Write tests for the user registration feature
/aqa-flow Create QA automation for the checkout flow
```

</details>

<details>
<summary><b>Test Case Generation</b></summary>

Generates structured requirements and TestRail-ready test cases from Jira and Confluence. The workflow collects source material, identifies contradictions and gaps, asks targeted clarification questions, creates a requirements document, generates optimized test scenarios, and can export them to TestRail.

**Use when:** a Jira ticket, epic, or story needs QA scenarios; requirements need traceability to Jira and Confluence; or gaps and contradictions must be resolved before tests are written.

**Phases:**
0. Project Config Loading — load/create project test generation config and initialize `agents/testgen/{TICKET-KEY}/`
1. Data Collection — retrieve Jira fields, comments, linked docs, Confluence pages, and child pages into `raw-data.md`
2. Gap and Contradiction Analysis — identify contradictions, gaps, ambiguities, risks, and source conflicts in `analysis.md`
3. Question Generation and User Input — generate `questions.md`, wait for answers, and save `answers.md`
4. Requirements Document Generation — produce `requirements.md` with stories, FRs, NFRs, constraints, assumptions, glossary, and traceability
5. Test Case Generation — produce `test-scenarios.md` with priorities, steps, expected results, test data, and coverage matrix
6. Test Case Export — optionally export to TestRail after you provide project, suite, and section details

**Expect:** one phase at a time with `testgen-state.md` updated after each phase. The required HITL gate is phase 3 before requirements generation. Your responsibility is to provide Jira input, Confluence links when auto-search is insufficient, answers, review decisions, and TestRail destination details for export.

```
/testgen-flow Generate test cases for PROJ-123
/testgen-flow Create test scenarios from EPIC-789 and export to TestRail
```

</details>

<details>
<summary><b>Modernization</b></summary>

Large migration workflow for code conversions, platform upgrades, framework upgrades, containerization, Linux enablement, and rearchitecture. Rosetta documents what exists, validates behavior with evidence, maps the target design, gets approval, then implements from approved specs.

**Use when:** migrating C++ to Java, .NET Framework to modern .NET, Java 8 to Java 21, Windows services to Linux containers, monolith to services, SQL-centric code to a new persistence model, or any change where skipping analysis risks lost behavior.

**Phases:**
1. Existing Library Analysis — inspect reusable target-state libraries and create `docs/reference-code-specs-<lib/project>.md`
2. Old Code Analysis — document legacy behavior, tests, dependencies, public contracts, edge cases, and database usage in `docs/original-code-specs-<lib/project>.md`
3. Test Coverage — optional; measure and fill original behavior coverage in `docs/original-test-coverage-<lib/project>.md`
4. Class Group Analysis — identify bounded contexts, dependency chains, tightly coupled classes, and cross-group flows
5. Cross-Project Analysis — compare projects, detect shared flows and inconsistencies, and create `docs/cross-project-analysis.md`
6. Implementation Mapping — choose target approach and create `docs/target-code-specs-<lib/project>.md`
7. Final Review — review all specs for consistency, unresolved unknowns, dependencies, and readiness
8. Implementation — after explicit approval, implement one project at a time from approved specs and validate behavior

**Expect:** heavy subagent use, often one focused subagent per phase or project. HITL confirms applicable phases, phase transitions, target-spec approval, public API changes, and implementation start. Your responsibility is to provide source/target expectations, compatibility requirements, test expectations, deployment constraints, and careful spec review.

```
/modernization-flow Migrate from Java 8 to Java 21
/modernization-flow Re-architect monolith to microservices
```

</details>

<details>
<summary><b>External Library</b></summary>

Onboards an external or private codebase so AI agents can use it in the current project without direct source access during later work. Rosetta packages the external project, extracts a compact learning flow, publishes reference material, and verifies that agents can find it.

**Use when:** agents need to understand an internal SDK, shared library, external service client, or source outside the current workspace.

**Phases:**
1. Discovery — ask for project path, validate access, detect project name, version, and tech stack
2. Analysis — package codebase with compressed Repomix XML, read README, identify entry points, and generate a short learning flow
3. Publishing — publish `{project-name}.xml` and `{project-name}-onboarding.md`, confirm document IDs, and clean temporary files
4. Verification — search by project name, verify tags, display the learning flow, and confirm onboarding

**Expect:** sequential orchestration rather than named subagents. Artifacts include compressed XML for AI consumption, a short onboarding document, and an architecture rule telling agents to use the reference source. Your responsibility is to provide an accessible path and correct detected metadata if needed.

```
/external-lib-flow Teach AI about our internal authentication library
/external-lib-flow Document the shared utilities package
```

</details>

<details>
<summary><b>Coding Agents Prompting</b></summary>

Authors or adapts prompts for AI coding agents. Rosetta keeps orchestration thin, records state after every phase, carries an approved Prompt Brief through the work, and validates that the final prompt set traces back to the original intent.

**Use when:** creating prompts, rules, or instruction sets for coding agents; adapting a prompt from one IDE or agent to another; or validating prompt quality before persistence.

**Phases:**
1. Discover — collect local context, prompt-family artifacts, and required references; produce Discovery Notes and Reference Set
2. Extract and Intake — extract source-prompt requirements, ask clarifications, and produce a Prompt Brief plus Open Questions
3. Blueprint — design structure, actors, contracts, and boundaries for the target prompt set
4. Draft Loop — draft target prompts from the approved Prompt Brief and Blueprint
5. Hardening and Edit Loop — review and edit each target prompt until pass criteria or HITL decision
6. Simulate — run realistic execution traces and check context/cognitive load across the prompt chain
7. Validate — produce Final Prompt Set and Validation Pack with checklist results, tests, failure modes, and traceability

**Expect:** discoverer and prompt-engineer subagents. Required artifacts include state, Discovery Notes, Reference Set, Prompt Brief, Blueprint, Draft Prompt Set, Prompt Set, Simulation Notes, and Validation Pack. HITL gates include Prompt Brief approval, ambiguous blueprint tradeoffs, stalled loops, major simulation risk, and final approval before persistence.

```
/coding-agents-prompting-flow Create a coding workflow prompt for our internal AI agent
/coding-agents-prompting-flow Adapt this Claude prompt for Cursor
/coding-agents-prompting-flow Write prompts for our onboarding automation agent
```

</details>

### Always Active

Every request benefits from these regardless of workflow.

- **Execution policies** enforce plan-driven work, incremental validation, and memory-based self-learning. The agent consults `agents/MEMORY.md` during planning and records lessons learned. See [Architecture — Workspace Files](docs/ARCHITECTURE.md#workspace-files) for the full file list.
- **HITL and questioning rules** govern how the agent interacts with you. Questions are batched (5-10 per round), prioritized by impact, each targeting a single decision. If something is unclear, Rosetta stops and asks.
- **[Subagent orchestration](docs/ARCHITECTURE.md#rosetta-mcp)** defines how work gets delegated. Subagents start with fresh context, receive explicit scope boundaries, and return concise results. Independent work runs in parallel.

## Customization

Custom overrides work in all installation modes. You do not need to modify any Rosetta files.

### Project Context Files

The single most effective way to improve AI output. These files tell the AI what your project is, how it works, and what matters. Run initialization to generate them, then customize.

- **`docs/CONTEXT.md`** (the why) — purpose, business context, design principles, key workflows, constraints
- **`docs/ARCHITECTURE.md`** (the how) — system structure, component relationships, data flow, deployment
- **`docs/TECHSTACK.md`** (the what) — technologies, frameworks, tools, and reasoning behind each choice

The more your team invests in these three files, the fewer follow-up questions Rosetta asks and the better the output gets. See [Installation — Workspace Files Created](INSTALLATION.md#workspace-files-created) for the full list of files Rosetta manages.

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
- **[GitNexus](https://github.com/abhigyanpatwari/GitNexus)** — indexes any codebase into a knowledge graph. Third-party tool will have access to IP. Review license and policy with your manager. Free for non-commercial or personal use; PAID for commercial or business use — see [GitNexus Enterprise Licensing](https://github.com/abhigyanpatwari/GitNexus?tab=readme-ov-file#enterprise).
- **[Graphify](https://github.com/safishamsi/graphify)** — MIT-licensed alternative that turns a project into a queryable knowledge graph. Third-party tool will have access to IP. Review license and policy with your manager.
- [Figma MCP](https://github.com/GLips/Figma-Context-MCP) — Figma integration so AI can see designs directly
- [Jira & Confluence MCP](https://www.atlassian.com/platform/remote-mcp-server) — tickets, comments, and documentation
- [Fetch](https://github.com/modelcontextprotocol/servers/tree/main/src/fetch) — retrieve and process content from APIs and web pages
- [Repomix MCP](https://repomix.com/guide/mcp-server) — documentation for AI to use existing client libraries
- [DeepWiki](https://docs.devin.ai/work-with-devin/deepwiki-mcp) — up-to-date documentation
- [Database MCPs](https://glama.ai/mcp/servers?attributes=category%3Adatabases) — read schema, read data

Bold entries are strongly recommended. The rest depend on your project needs.

<details>
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
| **Requirements Documentation Authoring** | Atomic requirement units with EARS format, explicit user approval, and traceability |
| **Requirements Use** | Consume approved requirements to drive planning, implementation, and validation |
| **Coding Agents Prompt Adaptation** | Adapt prompts from one coding agent/IDE to another while preserving intent and strategy |
| **Large Workspace Handling** | Partition large workspaces (100+ files) into scoped subagent tasks |
| **Init Workspace Context** | Classify initialization mode and build existing file inventory |
| **Init Workspace Discovery** | Produce TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md from workspace analysis |
| **Init Workspace Documentation** | Create CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, MEMORY.md |
| **Init Workspace Patterns** | Extract recurring coding and architectural patterns into reusable templates |
| **Init Workspace Rules** | Create local cached agent rules configured for IDE/OS/project context |
| **Init Workspace Shells** | Generate IDE/CodingAgent shell files from Rosetta schemas |
| **Init Workspace Verification** | Verify initialization completeness and run catch-up for missed artifacts |
| **Backward Compatibility** | Ensure changes preserve backward compatibility |
| **Code Review** | Structured code review against standards and intent |
| **Context Engineering** | Advanced context construction and optimization |
| **Data Generation** | Generate test data and synthetic datasets |
| **Design** | System and API design patterns |
| **Discovery** | Deep codebase and domain discovery |
| **Documentation** | Technical documentation authoring |
| **Git** | Git operations and workflow management |
| **Large File Handling** | Process files too large for single-pass context |
| **Plan Review** | Review execution plans for completeness and risk |
| **Prompt Diagnosis** | Diagnose and fix underperforming prompts |
| **Research** | Systematic deep research using meta-prompting with grounded references and self-validation |
| **Scenarios Generation** | Generate test scenarios from requirements |
| **Security** | Security analysis and vulnerability assessment |
| **Simulation** | Simulate prompt execution for validation |
| **Technical Summarization** | Concise technical summaries of complex content |
| **Template Execution** | Execute parameterized prompt templates |
| **Coding Agents Prompt Authoring** | Author, update, and validate prompts for AI coding agents with analytics artifacts |
| **Coding Agents Farm** | Orchestrate multiple coding agents in parallel on isolated git worktrees |
| **Natural Writing** | Clear, human-sounding text without AI cliches or marketing hype |

</details>

<details>
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
| **Analyst** | Business and technical requirements analysis |
| **Orchestrator** | Manages a team of subagents, owns delegation quality end-to-end |
| **Researcher** | Deep research with grounded references and systematic exploration |
| **Prompt Engineer** | Authors and adapts prompt artifacts under explicit HITL approvals |

</details>

<details>
<summary><b>In Practice</b></summary>

### Feature Development

```
You: /coding-flow Add password reset functionality

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
You: /requirements-authoring-flow Define requirements for the checkout flow

What happens:
1. Rosetta loads the requirements workflow
2. Agent researches your codebase and asks clarifying questions
3. Drafts atomic requirements in EARS format
4. You approve each requirement individually
5. Validates for conflicts, gaps, and contradictions
6. Delivers to docs/REQUIREMENTS/ with traceability matrix
```

### Project Initialization

**Greenfield (new repository):**
```
You: "Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ..."

What happens:
1. Agent scans your tech stack, dependencies, and project structure
2. Generates TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md
3. Creates CONTEXT.md and ARCHITECTURE.md
4. Asks clarifying questions about your project
5. Verifies all generated docs
```

**Brownfield (existing repository):**
```
You: "Initialize this repository using the respective Rosetta workflow[, this is a composite workspace][, additional information]"

What happens:
1. Agent scans your tech stack, dependencies, and project structure
2. Generates TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md
3. Creates CONTEXT.md and ARCHITECTURE.md
4. Asks clarifying questions about your project
5. Verifies all generated docs
```

### Research

```
You: /research-flow Investigate OAuth 2.0 options for our stack

What happens:
1. Rosetta loads the research workflow
2. Agent reads your project context
3. Crafts an optimized research prompt
4. You approve the research direction
5. Dedicated subagent runs the investigation
6. Delivers documented analysis with grounded references
```

</details>

<details>
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

Rosetta is distributed as a single plugin for supported IDEs. The plugin bundles the full Rosetta instruction set locally, including workflows, skills, agents, rules, templates, and bootstrap guardrails.

See [PLUGINS.md](PLUGINS.md) for install commands.

## Best Practices

- **Use slash commands.** Once initialized, use the slash command for the respective workflow and type your request naturally — the workflow guides AI and you along the way. See [Workflows](#workflows) for the full list.
- **Be specific.** More context means better output and fewer questions. `/requirements-authoring-flow Define requirements for the checkout flow covering discount codes, tax calculation, and payment retries` beats `/requirements-authoring-flow Write requirements for checkout.`
- **Read plans before approving.** The plan is your last checkpoint before work begins. Check scope, approach, and what will change.
- **Answer questions fully.** When Rosetta asks, it targets a specific gap. Short answers lead to incomplete solutions.
- **Write requirements first.** The requirements workflow prevents scope creep and gives you a clear acceptance baseline.
- **Invest in context files.** CONTEXT.md and ARCHITECTURE.md benefit every developer on the project.
- **Point Rosetta at existing specs.** Reference requirements, API contracts, or design documents in CONTEXT.md. Rosetta uses them as constraints instead of generating assumptions.
- **Clean up dead code before onboarding.** Unused code confuses AI the same way it confuses new developers.
- **Do not approve plans you have not read.** The approval gate only protects you if you use it.
- **Do not delete files in `docs/`.** They are Rosetta's project knowledge. Deleting them means starting over.
- **Switch sessions at 65% context.** Monitor context usage. If it goes above 65%, queue the message or wait for the earliest ability to switch over to a new session:

  `Please save execution state, workflow state, findings, original intent with clarifications, and tasks left to do as concise "agents/TEMP/execution-state.md" so that I can start a fresh new session and continue execution where you left it off.`

  Once file saved, start the new session with the same original slash command:

  `/<original-command> Please resume execution saved in "agents/TEMP/execution-state.md" according to flow instructions`

## Compaction

It is **NOT** recommended to perform compaction, but if there is reason and you cannot leave session - use this as a starting point:

```
/compact Compact context by high token compression using terms, patterns, unicode characters, terse phrases, remove formatting-except-essential/duplicates/wrong-decisions/wrong-thinking/incorrect/non-relevant information, keep regulation/policies/hitl/catalogs compressed, user intent and q&a mostly verbatim, decisions/key-points/tasks/workflows mostly verbatim, still relevant files/tool calls compressed, and etc. Main goal: able to fully continue execution without noise, keep it factual, exact, specific, actionable, etc. Avoid general summarization that looses value.
```

## Video Tutorials

**Setup:**
- [Install Using MCP](https://vimeo.com/1174124251/f38e017d8d?fl=ml&fe=ec) (3 min)
- [Install without MCP](https://vimeo.com/1174124213/c50179147c?fl=ml&fe=ec) (2 min)
- [Initialize Repo](https://vimeo.com/1174124165/8f5fbd7775?fl=ml&fe=ec) (4 min)

**Configuration:**
- [Subagents, Skills, Commands, and Workflows in Claude Code](https://vimeo.com/1174124272/96056d5cc5?fl=ml&fe=ec)

**Workflows:**
- [Code, Validate, QA, Integration Testing, E2E testing](https://vimeo.com/1174123935/07e3dd6e97?fl=ml&fe=ec)
- [Code Comprehension](https://vimeo.com/1174124062/972091d57c?fl=ml&fe=ec)
- [Help, Research, and Modernization](https://vimeo.com/1174124096/b928f43fcf?fl=ml&fe=ec)

These videos were recorded in different IDEs to show that Rosetta works everywhere.

## Getting Help

- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## Related Docs

- [Overview](OVERVIEW.md) — mental model and terminology
- [Quick Start](QUICKSTART.md) — zero to working setup
- [Installation](INSTALLATION.md) — all setup modes and environment variables
- [Architecture](docs/ARCHITECTURE.md) — system structure, components, data flow
- [Deployment Guide](DEPLOYMENT_GUIDE.md) — org-wide deployment
- [Contributing](CONTRIBUTING.md) — fastest path to a merged PR
- [Troubleshooting](TROUBLESHOOTING.md) — symptom-first diagnosis
