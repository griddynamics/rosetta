---
layout: docs
title: Introduction
permalink: /docs/introduction/
---

<div align="center">
  <img class="intro-logo intro-logo--dark" src="{{ '/assets/brand/rosetta-logo-full-color-white-text.png' | relative_url }}" alt="Rosetta" width="200">
  <img class="intro-logo intro-logo--light" src="{{ '/assets/brand/rosetta-logo-full-color-black-text.png' | relative_url }}" alt="Rosetta" width="200">
  <p><strong>Engineering governance and context for AI coding agents — shared instructions, architecture, standards, workflows, and guardrails in every session.</strong></p>
  <p>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/v/rosetta-mcp.svg" alt="PyPI"></a>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/dm/rosetta-mcp.svg" alt="Downloads"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
  </p>
</div>

## What is Rosetta

<table>
  <tr>
    <td width="50%">
      <video src="https://github.com/user-attachments/assets/6df6e217-3e5c-4691-84ed-7440701a87de" controls width="100%"></video>
    </td>
    <td width="50%">
      AI coding agents are powerful, but hard to use consistently across a real team. Rosetta is open-source engineering governance and context for AI coding agents. It works with the tools you already use and loads your team's shared engineering instructions into every session. Everything is versioned in Git and can run inside your perimeter.
    </td>
  </tr>
</table>

Rosetta-guided work follows five phases: **Prepare** (load guardrails and context), **Research** (gather relevant knowledge), **Plan** (produce a reviewable plan), **Act** (execute with full context), and **Validate** (verify with real execution evidence). Read more in the [Usage Guide](/rosetta/docs/usage-guide/#workflows).

## Skills

Reusable units of work the AI loads on demand. Workflows pick them for you, and most can also be called by name.

**Let Rosetta decide**

1. [`rosetta`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/rosetta/README.md): You want Rosetta to handle it itself. Classifies your request, picks the matching workflow, and runs it end to end.

**Understand what exists**

1. [`load-project-context`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/load-project-context/README.md): Gives the AI your project's business context, architecture, and past decisions before any work starts.
2. [`codemap`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/codemap/README.md): Gives the AI a structural map of the repo to navigate by. Uses your LSP or code-graph tooling when available.
3. [`discovery`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/discovery/README.md): Evidence-backed picture of what exists today, including whether this was already attempted and done wrong.
4. [`reverse-engineering`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/reverse-engineering/README.md): Recovers domain rules and intent from code into business specs.
5. [`research`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/research/README.md): Researches any question grounded in your project, with real sources. Compares options and validates its own conclusions.

**Decide what to build**

1. [`requirements-authoring`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/requirements-authoring/README.md): Precise and atomic requirement units: EARS acceptance criteria, rationale, alternatives, dependencies, traceability. You combine them into stories or features.
2. [`requirements-use`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/requirements-use/README.md): Plans and builds from approved requirements. Every task, test, and result traces back to a requirement ID.
3. [`design`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/design/README.md): Deep architecture decisions with defended rejections, plus domain playbooks: distributed systems, multi-tenancy, payments, regulated data, migrations.
4. [`tech-specs`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/tech-specs/README.md): Produces target-state interfaces, API contracts, data models, and security considerations. Forces the AI to read the real code, grounding its assumptions.
5. [`planning`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/planning/README.md): An ordered graph of AI sessions for automated execution, each with its own scope, checklist, and handoff.
6. [`backlog`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/backlog/README.md): Turns a thin ticket into a buildable one: gaps found, questions posed, facts written back. Also produces a WBS for people.
7. [`reasoning`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/reasoning/README.md): Breaks a hard problem down, identifies roles, boundaries, events, models. Works via Tree-of-Thoughts, expanding every alternative to its conclusion before committing.

**Build it**

1. [`coding`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/coding/README.md): Simple, minimal, in-scope changes following KISS/SOLID/DRY. Systematic dependency-ordered validation: database, API, web, mobile. Covers IaC.
2. [`testing`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/testing/README.md): Isolated and idempotent at 80%+ coverage, external calls mocked only. Scenario tests start from a sequence diagram: what depends on what, what is shared setup, then the test.
3. [`debugging`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/debugging/README.md): OODA. Root cause with evidence before any fix, one hypothesis at a time, prevention recommended. Three failed fixes means a design problem.
4. [`security`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/security/README.md): Threat modeling plus code, dependency, IaC, container, cloud, and API review. Secrets gated before ingestion, active testing only where authorized. Output is remediation tasks.
5. [`natural-writing`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/natural-writing/README.md): Strips AI giveaways: hype words, em-dashes, rhetorical questions, fake engagement. For docs, emails, posts, release notes.

**Test automation and QA**

1. [`qa-knowledge`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/qa-knowledge/README.md): QA engineering end to end: sources into requirements, gap analysis, Given-When-Then specs, TMS export, runnable API and UI tests, failure triage. Every case is implemented or recorded as a gap, never dropped.
2. [`qa-structure`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/qa-structure/README.md): Canonical paths, slugs, and state files for QA runs. Each session in its own folder, so parallel runs never collide and a long flow knows which phase is done.
3. [`data-collection`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/data-collection/README.md): Read-only pull from issue tracker, test management, wiki, and the codebase. A ticket gets recorded, not acted on. Gaps and permission walls recorded, never guessed.

**Delegate the work**

1. [`orchestration`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/orchestration/README.md): Sizes the work, builds and briefs a subagent team, and gates every result through fresh eyes instead of self-review. Large plans run with phases, steps, and tasks.
2. [`subagent-directives`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/subagent-directives/README.md): Requested automatically by the orchestrator for every subagent: stay in scope, stop and report when blocked rather than improvise, prove each claim with links and line ranges.
3. [`large-workspace-handling`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/large-workspace-handling/README.md): Use when a repository is too big to handle at once. Splits into non-overlapping scopes, one subagent each, then a second wave verifies the work.
4. [`coding-agents-farm`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/coding-agents-farm/README.md): Runs Claude, Codex, Copilot, Gemini and others in parallel on isolated git worktrees, for throughput or cross-model validation. Burns money fast, so it is gated behind explicit consent.

**Keep the session on track**

1. [`hitl`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/hitl/README.md): Makes the AI work together with you. Approval gates at specs, implementation, and closing, with review in small batches. A clear affirmative counts.
2. [`questioning`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/questioning/README.md): A few high-impact questions before work starts, each one decision, with why it matters and a recommended answer. Anything researchable it answers itself.
3. [`self-organization`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/self-organization/README.md): Keeps work organized as it grows: splits oversized tasks and files, clears stale content, flags when a session should restart. Announces before it reorganizes.

**Stay safe**

1. [`sensitive-data`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/sensitive-data/README.md): Secrets, keys, PII, PHI, and payment data never get read, printed, logged, or committed. Masked on sight, and the same care applies to the code it writes.
2. [`dangerous-actions`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/dangerous-actions/README.md): Before anything irreversible: blast radius first, safer alternatives offered, explicit approval required. Higher environments are off limits.
3. [`risk-assessment`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/risk-assessment/README.md): Checks what the AI can actually reach, such as databases, cloud accounts, and production servers. Rates the risk and blocks outright when it is critical.

**Recover when it goes wrong**

1. [`deviation`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/deviation/README.md): Stops the moment work no longer matches what you asked, or the AI cannot stand behind its own solution. Escalates instead of pressing on.
2. [`self-learning`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/self-learning/README.md): After a failure or a wrong result, stops and finds the cause, then records a reusable rule in the repo's memory so it does not repeat.
3. [`post-mortem`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/post-mortem/README.md): Diagnoses why a session went wrong across your prompt, workspace docs, local config, Rosetta instructions, and tooling. Can file a sanitized issue when Rosetta is at fault.

**Extend**

1. [`harness`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/harness/README.md): Builds what the AI needs to run and check your system: command-line and MCP actions, dev containers, skills, subagents, workflows, hooks, and unattended automation. Encoded once, proved on every run.
2. [`coding-agents-prompt-authoring`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/coding-agents-prompt-authoring/README.md): Write, review, harden, and port your own skills, subagents, workflows, and rules, including between different IDEs and agents.
3. [`coding-agents-hooks-authoring`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/coding-agents-hooks-authoring/README.md): Author, register, and debug hooks that fire on agent actions across every supported IDE.

**Domain packs**

1. [`solr-query`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/solr-query/README.md): Apache Solr queries that return what you meant: eDisMax, block join, JSON facets, kNN, explain output, relevancy tuning.
2. [`solr-schema`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/solr-schema/README.md): Apache Solr schema and solrconfig, audit or design: field types, analyzer symmetry, docValues, synonyms, commit strategy.
3. [`solr-extending`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/solr-extending/README.md): Custom Apache Solr plugins: SearchComponent, DocTransformer, QParser, update processors, function queries, and their solrconfig wiring.
4. [`solr-semantic-search`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/solr-semantic-search/README.md): Phrase-tagging semantic search on Solr: concept tagging, taxonomy, graph paths, ambiguity resolution. Lexical, not vector.
5. [`specflow-use`](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/specflow-use/README.md): Connects your workspace to Grid Dynamics SpecFlow through its MCP.

## [Top Workflows](/rosetta/docs/usage-guide/#workflows)

1. `coding-flow`: AI creates features, fixes defects, and performs refactoring, everything end-to-end. AI performs discovery, design, specs and a plan, user review, then AI implements and runs separate review and validation passes (including running application). Most useful for medium to large coding tasks, and for controlled component-by-component migration/modernization work.
2. `requirements-authoring-flow`: AI works with user and raw artifacts to define entire-application requirements. AI discovers context and existing constraints, captures intent, drafts atomic requirement units, validates them, and finalizes traceability artifacts. This is the most efficient use of coding agents. Requirements then Coding.
3. `security-flow`: AI runs an authorized, evidence-preserving security review through mandatory specialist subagents. It gates secret-bearing files before source ingestion, bounds active testing to approved pre-production targets, independently reviews evidence, and prepares concise inputs for a later coding flow without starting remediation.
4. `testgen-flow`, `api-aqa-flow`, `ui-aqa-flow`: AI handles QA-related work such as generating test cases and creating API or UI automation tests. AI first collects project context, requirements, and existing QA assets, clarifies gaps, and only after that generates test cases or automation tests.
5. `code-analysis-flow`: AI creates grounded analysis documents based on the codebase. AI first loads project context, asks clarification questions, then produces either one focused analysis document or parallel module analyses plus a summary.
6. `help-flow`: AI explains available Rosetta workflows, skills, and agents. Most useful when the user is unsure which Rosetta capability to use.
7. `init-workspace-flow`: AI sets up a repository for AI use in both brownfield and greenfield projects. AI first analyzes the workspace, builds baseline docs, asks gap-filling questions, and verifies the result. Use it once per repository as its purpose is to build context for subsequent sessions.

If you prefer to follow your own workflows, check the skills above.

## Why use it

- **Context engineering, not prompt hacking.** Agents receive your conventions, architecture, and business rules automatically — structured, versioned, and ready before the first line of code. See [how it fits your workflow](/rosetta/docs/overview/#how-rosetta-fits-into-your-workflow).
- **Write once, run everywhere.** Agent-agnostic design adapts to any IDE and any tech stack. No per-tool maintenance.
- **Guardrails built in.** Approval gates, risk assessment, and data protection ensure consistent AI behavior across teams. See [how Rosetta protects you](/rosetta/docs/usage-guide/#how-rosetta-protects-you).
- **One-command onboarding.** New repo, new developer — productive immediately with best practices baked in.
- **Instructions as code.** Prompts version-controlled with release management — single source of truth for all teams.

## How it works

Your IDE loads Rosetta as a plugin — the default, with no server and no live connection needed — or connects to the Rosetta MCP server if your IDE has no plugin or you need centrally-managed instructions. Either way, Rosetta exposes guardrails and common best practices, and provides a menu of available instructions — workflows and coding conventions. The coding agent selects only what it needs for the current task; Rosetta delivers just those, keeping the agent's context lean. By design, no source code or project data reaches Rosetta.

Rosetta is designed to not see your source code or IP. It only serves knowledge and instructions to the agent. The agent loads only what it needs per request (progressive disclosure) and follows your organization's workflows.

## Get Started

| Option                              | Best for                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| **[Plugins](/rosetta/docs/plugins/)** — recommended | Everyone with a supported IDE (Claude Code · Cursor · Copilot · Codex). Files install locally — no server, no live connection needed. |
| **[Hosted MCP](/rosetta/docs/mcps/)** — evaluation only | Try Rosetta with zero setup, or use any other MCP-compatible agent (Devin/Windsurf · Junie · OpenCode). Public demo endpoint — do not point production or sensitive repos at it. |
| **[Self-hosted MCP](/rosetta/docs/deployment/)** — optional | MCP in production: your own MCP server and RAGFlow inside your perimeter. Only needed if you specifically require centrally-managed, always-fresh instructions with nothing copied into repos — most teams don't. |

After installation, ask:

**Greenfield (new repository):**

```
Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ...
```

**Brownfield (existing repository):**

Ask the agent to initialize the repository:

```
Initialize this repository using the respective Rosetta workflow
```

Optionally, add details to that same request. If your workspace contains multiple repositories:

```
Initialize this repository using the respective Rosetta workflow, this is a composite workspace
```

To tell the agent where dead code or existing specs live:

```
Initialize this repository using the respective Rosetta workflow, dead code is in <path>, existing specs are in <path>
```

STDIO transport is available for environments with limited internet access. [All IDEs and detailed setup](/rosetta/docs/installation/). Read more in the [Quick Start](/rosetta/docs/quickstart/).

## Tech Demo: Init and Coding

<video src="https://github.com/user-attachments/assets/fc0ef06a-2f9c-49fa-bc05-68001dadd286" controls width="100%"></video>

## Tech Demo: Frontend Migration

<video src="https://github.com/user-attachments/assets/8a48ce2e-a8f6-4d80-a208-4e808ab502df" controls width="100%"></video>

## Supported IDEs and Agents

- Cursor
- Claude Code
- VS Code / GitHub Copilot
- JetBrains (Copilot, Junie)
- Windsurf
- Codex
- Antigravity
- OpenCode

Works with any other IDE too — via a plugin where supported, via MCP otherwise.

## Documentation

| I want to... | Read |
|---|---|
| Understand what Rosetta is and how to think about it | [Overview](/rosetta/docs/overview/) |
| Set up Rosetta | [Quick Start](/rosetta/docs/quickstart/) |
| Learn how to use Rosetta flows | [Usage Guide](/rosetta/docs/usage-guide/) |
| Understand the system architecture | [Architecture](/rosetta/docs/architecture/) |
| Navigate the codebase | [Developer Guide](/rosetta/docs/developer-guide/) |
| Contribute a change | [Contributing](/rosetta/docs/contributing/) |
| Debug a problem | [Troubleshooting](/rosetta/docs/troubleshooting/) |
| Self-host MCP for my organization (optional, rare) | [Deployment](/rosetta/docs/deployment/) |

## Contributing

Contributions welcome. See [Contributing](/rosetta/docs/contributing/) for workflow and expectations.

## Community

- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## License

See [LICENSE](https://github.com/griddynamics/rosetta/blob/main/LICENSE) for details.
