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

## [Top Workflows](/rosetta/docs/usage-guide/#workflows)

1. `coding-flow`: AI creates features, fixes defects, and performs refactoring, everything end-to-end. AI performs discovery, design, specs and a plan, user review, then AI implements and runs separate review and validation passes (including running application). Most useful for medium to large coding tasks, and for controlled component-by-component migration/modernization work.
2. `requirements-authoring-flow`: AI works with user and raw artifacts to define entire-application requirements. AI discovers context and existing constraints, captures intent, drafts atomic requirement units, validates them, and finalizes traceability artifacts. This is the most efficient use of coding agents. Requirements then Coding.
3. `security-flow`: AI runs an authorized, evidence-preserving security review through mandatory specialist subagents. It gates secret-bearing files before source ingestion, bounds active testing to approved pre-production targets, independently reviews evidence, and prepares concise inputs for a later coding flow without starting remediation.
4. `testgen-flow`, `api-aqa-flow`, `ui-aqa-flow`: AI handles QA-related work such as generating test cases and creating API or UI automation tests. AI first collects project context, requirements, and existing QA assets, clarifies gaps, and only after that generates test cases or automation tests.
5. `code-analysis-flow`: AI creates grounded analysis documents based on the codebase. AI first loads project context, asks clarification questions, then produces either one focused analysis document or parallel module analyses plus a summary.
6. `help-flow`: AI explains available Rosetta workflows, skills, and agents. Most useful when the user is unsure which Rosetta capability to use.
7. `init-workspace-flow`: AI sets up a repository for AI use in both brownfield and greenfield projects. AI first analyzes the workspace, builds baseline docs, asks gap-filling questions, and verifies the result. Use it once per repository as its purpose is to build context for subsequent sessions.

If you prefer more vibe-coding, check the guardrails and useful skills below.

## Top Guardrails

1. Dangerous actions detection and handling: AI will think about blast radius and will not take unsafe actions without clear acceptance from a user.
2. Sensitive data handling (Secrets, PCI, PHI, PII, etc): AI will not read, query, or distribute (affects itself), and it will code respecting that (affects code).
3. Shared infrastructure understanding: AI will not behave as if the environment belongs only to it.
4. Deviation control: AI will detect drift and will try to overcome that.
5. Human-in-the-Loop: AI will ask for user review or approval whenever it is needed.
6. Risk assessment: AI will review current workspace setup, if there is a chance AI can damage - it will report.
7. Self-learning and organization: AI learns on mistakes (repo-level) and organizes its own work.

## [Top Skills](/rosetta/docs/usage-guide/)

1. `planning`, `tech-specs`: Turn a request into a clear plan and actionable specs.
2. `orchestration`: Coordinate an efficient team of subagents for large tasks (also request "team manager" capability for full experience).
3. `questioning`, `hitl`: AI to work with human, not over or behind, to be more human-oriented.
4. `research`, `reverse-engineering`: Repository grounded research and logical reverse engineering (business logic extraction).
5. `coding`, `debugging`, `testing`: Implementation, debugging with root-cause analysis, and validation.
6. `security`: Run authorized security reviews with secret-first safety gates, bounded testing, lossless evidence, independent review, and remediation-task preparation.
7. `reasoning`: Requires AI to decompose and recompose the problem, boundaries, actors, roles, gaps, contradictions, and perform recursive tree-of-thoughts reasoning.
8. `solr-*`: AI will help to build SOLR search-related artifacts.

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
