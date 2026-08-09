<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/web/assets/brand/rosetta-logo-full-color-white-text.png">
    <img src="docs/web/assets/brand/rosetta-logo-full-color-black-text.png" alt="Rosetta" width="200">
  </picture>
  <p><strong>An instruction layer for AI coding agents — your architecture, standards, workflows, and guardrails in every session.</strong></p>
  <p>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/v/rosetta-mcp.svg" alt="MCP"></a>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/dm/rosetta-mcp.svg" alt="Downloads"></a>
    <a href="https://pypi.org/project/rosetta-cli/"><img src="https://img.shields.io/pypi/v/rosetta-cli.svg" alt="CLI"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-rosetta-mcp.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-rosetta-mcp.yml/badge.svg" alt="Rosetta MCP"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml/badge.svg" alt="Instructions"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0"></a>
  </p>
  <p>
    <a href="#quick-start">Quick start</a> ·
    <a href="#the-recommended-path">Recommended path</a> ·
    <a href="#whats-inside-the-skill-library">Skills</a> ·
    <a href="USAGE_GUIDE.md">Usage Guide</a> ·
    <a href="https://griddynamics.github.io/rosetta/">Website</a>
  </p>
</div>

Rosetta works with the agent you already use — Claude Code, Cursor, Copilot, Codex, Antigravity, or any
MCP-compatible agent. It changes how the agent approaches a task: read your project context first, agree a
plan with you, then prove the result by running it — instead of guessing from whichever files happen to be
open and calling it done. **Teach agents how to think, not what to do.**

Everything is markdown, versioned in Git, and runs inside your perimeter.

<details>
<summary><b>What is Rosetta — watch the intro</b></summary>

https://github.com/user-attachments/assets/6df6e217-3e5c-4691-84ed-7440701a87de

</details>

### Do you need it?

You probably do if any of these sound like your week:

- The agent writes plausible code that ignores a convention or a shared component you already have.
- You re-explain the same project context in every new chat.
- Everyone on the team has their own prompt file, and none of them agree.
- The agent starts editing before you have agreed what to build, and you review a large diff afterwards.
- It reports "done" without having run anything.

You probably don't if you already write your own skills, have a process you trust, and it works.

---

## Quick start

Four steps from an empty setup to your first workflow.

> [!IMPORTANT]
> **Two recommendations before you start.**
> - **Model:** claude-sonnet-5, gpt-5.6-terra-medium, gemini-3.1-pro, grok-4.5, or newer, at **medium**
>   reasoning effort. Avoid Auto selection and high-reasoning/Opus-class models — they burn tokens on
>   reasoning that the workflows already structure for you.
> - **One instruction system at a time:** Rosetta conflicts with JUXT, Superpowers, GSD, and AI-DevKit.
>   Use whichever you know best, not several at once.

### 1. Install

Pick one delivery mode. **Plugins are the recommended default** — files install locally, no server and no
live connection required.

| Mode | Use it when |
| --- | --- |
| **[Plugins](PLUGINS.md)** — recommended | You use Claude Code, Cursor, Copilot, Codex, or Antigravity. |
| **[Hosted MCP](MCPs.md)** — evaluation only | You want zero setup, or use another MCP agent (Windsurf, Junie, OpenCode). Public demo endpoint — do not point production or sensitive repos at it. |
| **[Self-hosted MCP](docs/mcp/DEPLOYMENT_GUIDE.md)** — optional | You specifically need centrally-managed, always-fresh instructions with nothing copied into repos. Most teams don't. |

Then install the plugin for your IDE:

| IDE | Install |
| --- | --- |
| **Claude Code** | `claude plugin marketplace add griddynamics/rosetta`<br>`claude plugin install rosetta@rosetta` |
| **Cursor** | Plugins installed in Claude Code are picked up automatically. For a team marketplace, import `https://github.com/griddynamics/rosetta`. |
| **GitHub Copilot** (VS Code, JetBrains) | Add `https://github.com/griddynamics/rosetta` to `chat.plugins.marketplaces`, then install `rosetta` from **Browse Marketplaces** in the Copilot chat customizations panel. |
| **Codex, Antigravity, standalone** | Download the matching `core-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest) and extract it into your repository. |

**Verify the install.** Ask the agent `What can you do, Rosetta?` — a correct install answers with the
Rosetta capability list.

### 2. Initialize the repository (once)

Rosetta needs project context before it is useful. Ask the agent:

```
Initialize this repository using the respective Rosetta workflow

# on a new repository, state the target in the same sentence:
Initialize this repository using the respective Rosetta workflow, this is a new repository,
target tech stack: ..., target architecture: ..., business context: ...
```

It analyzes your stack, asks gap-filling questions, and writes `docs/CONTEXT.md`,
`ARCHITECTURE.md`, `TECHSTACK.md`, `DEPENDENCIES.md`, and `CODEMAP.md` —
[what each one holds](INSTALLATION.md#workspace-files-created). **Your code stays yours:** Rosetta only
serves instructions to your agent — it never receives, processes, or stores your source code. See
[SECURITY.md](SECURITY.md).

### 3. Review and commit the generated files

Every later session reads them, so they belong in Git like any other source of truth. Left uncommitted,
every teammate starts from nothing again.

```sh
git add <the files the agent just generated>
git commit -m "docs: add project context"
```

### 4. Run your first workflow

Start a new chat session first — the generated context is only picked up by a fresh one.

A workflow is a slash command plus plain language — `/<workflow> <what you want>`. Pick the one that
matches what you are about to do:

| You are about to... | Run |
| --- | --- |
| Work in code you don't know well | `/code-analysis-flow` |
| Research a topic or an option, with references | `/research-flow` |
| Use a private or external library the agent can't read | `/external-lib-flow` |
| Figure out what the ticket really asks for | `/requirements-authoring-flow` |
| Implement a feature, fix, or refactor | `/coding-flow` |
| Add or fix tests | `/coding-flow` (unit) · `/ui-aqa-flow` · `/api-aqa-flow` · `/testgen-flow` |
| Check a change is safe before it ships | `/security-flow` |
| Move a whole service to something else | `/modernization-flow` |
| Write or adapt prompts for coding agents | `/coding-agents-prompting-flow` |
| Do a quick task — lightweight docs, build, tracking, sync | `/adhoc-flow` |

Not sure? Ask `/help-flow` to walk you through the options, or let Rosetta choose with
`/rosetta <your request>`.

> [!TIP]
> **Cut your token bill.** Add the line below to your workspace `AGENTS.md` / `CLAUDE.md`. It
> compresses the agent's thinking, planning, and chat output while leaving final artifacts, tool calls, and
> code untouched.
>
> ```
> MUST ALWAYS think, reason, plan, chat, document in compressed/terse/unicode chars/terms/always/no hieroglyphs; Exclude final artifacts, any tool calls, all code, etc.
> ```

---

## The recommended path

This is how we recommend working a task through Rosetta, and the order the workflows are designed around.
You do not have to follow all five steps for every ticket — but the further you skip ahead, the more the
agent has to guess.

Every workflow runs the same five phases internally — **Prepare → Research → Plan → Act → Validate** —
with approval gates at the decisions that are expensive to get wrong.

### Step 1 — Get the context in place

The part most engineers do by reading for an hour, and most agents skip entirely. It comes in two sizes.

**Once per project.** Initialization reads your code, so the agent has the technical picture. It cannot
read your business — what the project is for, how a ticket becomes an implementation, which reference
codebases the agent may learn from, which patterns are house style. Filling that in is what separates a
decent result from a good one: [CONFIGURATION.md](CONFIGURATION.md) is the checklist.

**Per task.** Before touching an unfamiliar area, have the agent map it first.

| Workflow | Use it for |
| --- | --- |
| `/code-analysis-flow` | Grounded architecture and per-module analysis of what is already there — before refactoring, testing, or onboarding. Reads entry points first: APIs, webhooks, CLIs, cron. |
| `/research-flow` | Deep, project-related research with references you can check. |
| `/external-lib-flow` | Teach agents an external or private codebase they have no source access to. |

```
/code-analysis-flow Analyze the checkout module and document how orders move through it
```

### Step 2 — Pin down what to build

| Workflow | Use it for |
| --- | --- |
| `/requirements-authoring-flow` | Turn a vague ticket into atomic, testable requirements (EARS) with per-unit approval, measurable NFR thresholds, and traceability back to the source. On brownfield, start by extracting the requirements the code already implements. |

Requirements are the source of truth for both the code and the tests, so this is the highest-leverage
place to spend agent time. Requirements first, then coding.

```
/requirements-authoring-flow extract high-level business and technical requirements at endpoint level
for controllers matching <glob>, using subagents. Once done, spawn a subagent to validate and repeat
until no issues remain.
```

### Step 3 — Implement it

| Workflow | Use it for |
| --- | --- |
| `/coding-flow` | Features, bug fixes, refactoring, unit-test coverage. Discovery → specs and plan → **your approval** → implementation → a reviewer subagent with fresh context → a validator that runs the build and tests. This is the flow you will use most. |
| `/adhoc-flow` | Nothing fits — compose a custom pipeline from discovery, planning, execution, and review blocks. |

```
/coding-flow Implement the sidebar on the home page, reuse the existing layout components
/coding-flow Identify and implement a fix for the race condition in payment processing
/coding-flow Improve unit test coverage to 85% for <module>
```

### Step 4 — Test it

Unit tests are part of `/coding-flow`. The flows below are for QA work that starts from a test case or a
specification rather than from code you just wrote.

| Workflow | Use it for |
| --- | --- |
| `/testgen-flow` | Structured requirements and TestRail-ready test cases from Jira and Confluence. |
| `/ui-aqa-flow` | Automated UI tests from a test case — reuses your Page Objects, never guesses selectors. |
| `/api-aqa-flow` | Automated API tests — contracts come from OpenAPI or your routes, schemas are never invented. |

Each one collects project context, requirements, and existing QA assets first, clarifies gaps with you,
and only then writes anything.

```
/ui-aqa-flow Automate the test case for the checkout flow, ...
/api-aqa-flow Implement automation for the API test cases in suite ...
```

### Step 5 — Check it before it ships

| Workflow | Use it for |
| --- | --- |
| `/security-flow` | Authorized, evidence-preserving security review through mandatory specialist subagents. Gates secret-bearing files before anything enters the model's context, bounds active testing to approved pre-production targets, reviews its own evidence independently, and prepares inputs for a later coding flow. It never starts remediation itself. |

### The path on real work

<details>
<summary><b>Init and coding</b></summary>

https://github.com/user-attachments/assets/fc0ef06a-2f9c-49fa-bc05-68001dadd286

</details>

<details>
<summary><b>Frontend migration</b></summary>

https://github.com/user-attachments/assets/8a48ce2e-a8f6-4d80-a208-4e808ab502df

</details>

Full phase-by-phase reference for every workflow: [USAGE_GUIDE.md](USAGE_GUIDE.md#workflows).

---

## What's inside: the skill library

The path above is the process. Skills are what that process is made of — a workflow decides which phases
run and where you approve, and the skills decide how each phase is actually done. The agent loads only the
ones the current work needs.

This is the full library shipped with Rosetta, grouped by what it is for.

### Core engineering

- **`planning`** — execution-ready work breakdown from specs, with HITL gates.
- **`tech-specs`** — testable target-state architecture, contracts, and interfaces.
- **`coding`** — KISS/SOLID/DRY, multi-environment awareness, systematic validation.
- **`debugging`** — root-cause analysis before any fix.
- **`testing`** — isolated, idempotent tests, ≥80% coverage, external dependencies mocked only.
- **`codemap`** — keeps the code map accurate as the project changes.

### Thinking and working with you

- **`reasoning`** — decompose and recompose the problem: boundaries, actors, roles, gaps, contradictions, with recursive tree-of-thoughts reasoning.
- **`questioning`** — batched, prioritized, single-decision questions instead of shallow ones.
- **`hitl`** — work *with* the human, not over or behind them.
- **`orchestration`** — coordinate an efficient team of subagents on large tasks.
- **`subagent-directives`** — the input contract every subagent must receive.
- **`natural-writing`** — plain output, no filler.

### Requirements, research, analysis

- **`requirements-authoring`** — EARS units, per-unit approval, traceability.
- **`requirements-use`** — treat approved requirements as the source of truth.
- **`research`** — repository-grounded research with references.
- **`reverse-engineering`** — extract business logic from existing code.
- **`data-collection`** — gather inputs from code, tickets, and docs before work starts.
- **`post-mortem`** — diagnose a failed run and draft an issue from it.

### Security

- **`security`** — authorized reviews with a filename-only secret gate before ingestion, a tool contract before reliance, lossless finding integrity with dispositions, sanitized `docs/security/<run-id>/` output, and fix-similarity task inputs for a later coding flow.

### QA

- **`qa-knowledge`** — QA practice and terminology for test design.
- **`qa-structure`** — where test assets live and how they are organized.
- **`specflow-use`** — SpecFlow conventions.

### Prompt and agent engineering

- **`coding-agents-prompt-authoring`** — author and adapt prompts for coding agents.
- **`coding-agents-hooks-authoring`** — author hooks.
- **`coding-agents-farm`** — run parallel agents on isolated Git worktrees.

### Domain integrations

- **`solr-query`**, **`solr-schema`**, **`solr-extending`**, **`solr-semantic-search`** — build Solr search artifacts: queries, schemas, extensions, semantic search.

### Always active

These load at bootstrap and apply to every request in every workflow.

- **`rosetta`** — classify the request and select the right workflow.
- **`load-project-context`** — read project context before acting.
- **`risk-assessment`** — review the workspace setup and report where the agent could cause damage.
- **`dangerous-actions`** — assess blast radius; no unsafe action without your explicit acceptance.
- **`sensitive-data`** — never read, query, log, or distribute secrets, PCI, PHI, or PII, and generate code that respects that.
- **`deviation`** — detect drift from the plan and correct it.
- **`self-learning`** — record root causes and lessons in `agents/MEMORY.md`, and consult them during planning.
- **`self-organization`** — reorganize working files and clean up as work spans sessions.
- **`large-workspace-handling`** — keep context lean on big repositories.

Two guardrails come from the workflows rather than a single skill: **shared infrastructure** — the agent
does not act as if the environment belongs only to it — and **human-in-the-loop approval gates** at the
points where a wrong turn is expensive.

---

## Go deeper

Everything above is the short version. Rosetta is documented in full — each document answers one question
for one reader.

<details>
<summary><b>All documentation, and what each one is for</b></summary>

| Document | What it is for |
| --- | --- |
| [PLUGINS.md](PLUGINS.md) | Installing the plugin, per IDE, with screenshots. |
| [MCPs.md](MCPs.md) | Installing over MCP — optional, for agents with no plugin path. |
| [INSTALLATION.md](INSTALLATION.md) | Every install mode and transport, and every file initialization creates. |
| [CONFIGURATION.md](CONFIGURATION.md) | Setting up the workspace after install. What makes output good rather than passable. |
| [USAGE_GUIDE.md](USAGE_GUIDE.md) | Every workflow phase by phase, plus the full skill and subagent inventory. |
| [FAQ.md](FAQ.md) | Fast answers to recurring questions. |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Recovering when setup or a run breaks. |
| [CHANGELOG.md](CHANGELOG.md) | What changed between releases. |
| [OVERVIEW.md](OVERVIEW.md) | The mental model, and what Rosetta deliberately does not do. |
| [ELEVATOR_PITCH.md](ELEVATOR_PITCH.md) | The 30-second version, for explaining it to someone else. |
| [docs/CONTEXT.md](docs/CONTEXT.md) | Why Rosetta exists and who it serves. No technical detail. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System structure, and how instructions reach your agent. |
| [SECURITY.md](SECURITY.md) | The security posture, the data boundary, and how to report a vulnerability. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Making a correct contribution. Start here. |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Navigating and building the codebase. |
| [REVIEW.md](REVIEW.md) | The standards a change is evaluated against. |
| [docs/MCP-ARCHITECTURE.md](docs/MCP-ARCHITECTURE.md) | `rosetta-mcp` server internals. Only if you touch the server. |
| [docs/mcp/DEPLOYMENT_GUIDE.md](docs/mcp/DEPLOYMENT_GUIDE.md) | Self-hosting MCP and RAGFlow. Rare — most organizations never need it. |
| [llms-full.txt](https://griddynamics.github.io/rosetta/llms-full.txt) | The whole project in one machine-readable file, for AI agents. |

</details>

---

## Community

Questions, ideas, and everything else — [GitHub Discussions](https://github.com/griddynamics/rosetta/discussions).

## Commercial services

Rosetta is Apache-2.0 and free to use, on your own, forever. If you are rolling it out across an
enterprise and would benefit from commercial support, additional tooling, or help with adoption, write to
[rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com).

## License

Apache-2.0 — see [LICENSE](LICENSE).
