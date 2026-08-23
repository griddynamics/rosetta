<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/web/assets/brand/rosetta-logo-full-color-white-text.png">
    <img src="docs/web/assets/brand/rosetta-logo-full-color-black-text.png" alt="Rosetta" width="200">
  </picture>
  <p><strong>Engineering governance and context for AI coding agents — shared instructions, architecture, standards, workflows, and guardrails in every session.</strong></p>
  <p>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/v/rosetta-mcp.svg" alt="MCP"></a>
    <a href="https://pypi.org/project/rosetta-mcp/"><img src="https://img.shields.io/pypi/dm/rosetta-mcp.svg" alt="Downloads"></a>
    <a href="https://pypi.org/project/rosetta-cli/"><img src="https://img.shields.io/pypi/v/rosetta-cli.svg" alt="CLI"></a>
    <a href="https://pypi.org/project/rosetta-cli/"><img src="https://img.shields.io/pypi/dm/rosetta-cli.svg" alt="Downloads"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml/badge.svg" alt="Instructions"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0"></a>
  </p>
</div>

AI coding agents are impressive on their own — but on a real team they don't know your architecture, your conventions, or your rules. So they read a couple of open files and confidently do the wrong thing.

Rosetta fixes that. It loads your team's shared engineering knowledge into every agent session, so the agent works the way an experienced teammate would: understand the codebase first, propose a plan, get your sign-off, do the work, then check it actually works.

It's not a new AI agent and it doesn't replace the tools you already have. It plugs into Claude Code, Cursor, GitHub Copilot, Codex, Antigravity, and other MCP-compatible agents, and makes them behave better.

## 1. Install

Install Rosetta as a plugin in your agent. Or connect through MCP.

- **Plugin** (recommended) — **[PLUGINS](PLUGINS.md)**
- **MCP** (evaluation, or agents with no plugin support) — **[MCPs](MCPs.md)**

> [!TIP]
> Choose your model with care. Use Sonnet 5 medium, GPT-5.4-medium, gemini-3.1-pro, or newer. Do not use Auto. Rosetta conflicts with JUXT, Superpowers, GSD, and AI-DevKit. Keep the tool you already use.

## 2. Onboard (required)

Run the init workflow once per repository. The agent reads your code and writes the context files every later task needs.

- **[How to run it](user-guide/03-initialize-your-repository.md#how-to-run-it)**

## 3. Configure Ecosystem (optional — recommended)

Connect the agent to your other tools, such as a code graph or test runner. Add your organization's own rules on top of the core instructions.

- **[CONFIGURATION](CONFIGURATION.md)**

## 4. All-In-One Workflows

Those are implemented to fully cover entire area of work as All-In-One. If full workflow is not needed you can ask or use skills directly.

**Getting started**

### 4.1 Help Workflow

Finds the right workflow for your request and hands off directly into it.

Use it when you do not know what Rosetta can do, or which workflow fits.

**Skills:** [`/natural-writing`](instructions/r3/core/skills/natural-writing/SKILL.md), [`/reasoning`](instructions/r3/core/skills/reasoning/SKILL.md)

[Help Workflow Details](https://griddynamics.github.io/rosetta/docs/help-flow/)

**Coding**

### 4.2 Coding Workflow

Orchestrates subagents and executes: discovery, design, specifications, hitl, implementation, review, unit/integration/e2e testing, final manual validation by AI.

Covers E2E and gives a fully implemented and tested solution. Intended for medium to large tasks.

**Skills:** [`/requirements-use`](instructions/r3/core/skills/requirements-use/SKILL.md), [`/tech-specs`](instructions/r3/core/skills/tech-specs/SKILL.md), [`/planning`](instructions/r3/core/skills/planning/SKILL.md), [`/coding`](instructions/r3/core/skills/coding/SKILL.md), [`/testing`](instructions/r3/core/skills/testing/SKILL.md)

[Coding Workflow Details](https://griddynamics.github.io/rosetta/docs/coding-flow/)

### 4.3 Ad-hoc Workflow

Builds a custom plan from reusable building blocks, then executes it with tracking.

Use it for small or unusual tasks that do not fit any other workflow.

**Skills:** [`/planning`](instructions/r3/core/skills/planning/SKILL.md), [`/reasoning`](instructions/r3/core/skills/reasoning/SKILL.md), [`/tech-specs`](instructions/r3/core/skills/tech-specs/SKILL.md)

[Ad-hoc Workflow Details](https://griddynamics.github.io/rosetta/docs/adhoc-flow/)

**Quality engineering (QE)**

### 4.4 API AQA Workflow

Turns API contracts and test cases into working, corrected, automated tests. Gated by your approval.

Use it to automate backend API tests from OpenAPI specs or request/response cases.

**Skills:** [`/data-collection`](instructions/r3/core/skills/data-collection/SKILL.md), [`/qa-knowledge`](instructions/r3/core/skills/qa-knowledge/SKILL.md), [`/qa-structure`](instructions/r3/core/skills/qa-structure/SKILL.md), [`/reverse-engineering`](instructions/r3/core/skills/reverse-engineering/SKILL.md), [`/coding`](instructions/r3/core/skills/coding/SKILL.md), [`/testing`](instructions/r3/core/skills/testing/SKILL.md), [`/debugging`](instructions/r3/core/skills/debugging/SKILL.md)

[API AQA Workflow Details](https://griddynamics.github.io/rosetta/docs/api-aqa-flow/)

### 4.5 UI AQA Workflow

Turns a test case into a working automated UI test. Follows your repo's existing page objects.

Use it to automate browser or end-to-end tests, or to fix a failing one.

**Skills:** [`/data-collection`](instructions/r3/core/skills/data-collection/SKILL.md), [`/qa-knowledge`](instructions/r3/core/skills/qa-knowledge/SKILL.md), [`/qa-structure`](instructions/r3/core/skills/qa-structure/SKILL.md), [`/reverse-engineering`](instructions/r3/core/skills/reverse-engineering/SKILL.md), [`/coding`](instructions/r3/core/skills/coding/SKILL.md), [`/testing`](instructions/r3/core/skills/testing/SKILL.md), [`/debugging`](instructions/r3/core/skills/debugging/SKILL.md)

[UI AQA Workflow Details](https://griddynamics.github.io/rosetta/docs/ui-aqa-flow/)

### 4.6 Test Case Generation Workflow

Turns a ticket into a requirements document and a set of manual test cases.

Use it when you need designed test scenarios with traceability, before any automation code exists.

**Skills:** [`/data-collection`](instructions/r3/core/skills/data-collection/SKILL.md), [`/qa-knowledge`](instructions/r3/core/skills/qa-knowledge/SKILL.md), [`/hitl`](instructions/r3/core/skills/hitl/SKILL.md), [`/coding`](instructions/r3/core/skills/coding/SKILL.md)

[Test Case Generation Workflow Details](https://griddynamics.github.io/rosetta/docs/testgen-flow/)

**Requirements, specs & research**

### 4.7 Requirements Authoring Workflow

Drafts and validates requirements as small, atomic units. Each unit needs your approval.

Use it when behavior is unclear or high-impact, or when you need traceability.

**Skills:** [`/hitl`](instructions/r3/core/skills/hitl/SKILL.md), [`/requirements-authoring`](instructions/r3/core/skills/requirements-authoring/SKILL.md), [`/reverse-engineering`](instructions/r3/core/skills/reverse-engineering/SKILL.md)

[Requirements Authoring Workflow Details](https://griddynamics.github.io/rosetta/docs/requirements-authoring-flow/)

### 4.8 Code Analysis Workflow

Reverse-engineers a codebase into architecture documentation. Every claim traces to real code.

Use it to understand a system before you plan, refactor, or migrate it.

**Skills:** [`/requirements-authoring`](instructions/r3/core/skills/requirements-authoring/SKILL.md), [`/reverse-engineering`](instructions/r3/core/skills/reverse-engineering/SKILL.md), [`/reasoning`](instructions/r3/core/skills/reasoning/SKILL.md), [`/large-workspace-handling`](instructions/r3/core/skills/large-workspace-handling/SKILL.md), [`/questioning`](instructions/r3/core/skills/questioning/SKILL.md)

[Code Analysis Workflow Details](https://griddynamics.github.io/rosetta/docs/code-analysis-flow/)

### 4.9 Research Workflow

Drafts a research prompt for your approval, then runs it and documents the answer.

Use it for deep investigation or a technology comparison before you choose an approach.

**Skills:** [`/reasoning`](instructions/r3/core/skills/reasoning/SKILL.md), [`/research`](instructions/r3/core/skills/research/SKILL.md)

[Research Workflow Details](https://griddynamics.github.io/rosetta/docs/research-flow/)

**Modernization**

### 4.10 Modernization Workflow

Migrates or upgrades a system through sequential, spec-first phases. Each phase needs your approval.

Use it for a real migration: a language conversion, a framework upgrade, or a persistence change.

**Skills:** [`/hitl`](instructions/r3/core/skills/hitl/SKILL.md), [`/load-project-context`](instructions/r3/core/skills/load-project-context/SKILL.md), [`/orchestration`](instructions/r3/core/skills/orchestration/SKILL.md)

[Modernization Workflow Details](https://griddynamics.github.io/rosetta/docs/modernization-flow/)

### 4.11 External Library Onboarding Workflow

Packages an external library into reference material and a short learning guide.

Use it when your project depends on an internal SDK or external client, without source access.

**Skills:** [`/hitl`](instructions/r3/core/skills/hitl/SKILL.md), [`/load-project-context`](instructions/r3/core/skills/load-project-context/SKILL.md), [`/orchestration`](instructions/r3/core/skills/orchestration/SKILL.md)

[External Library Onboarding Workflow Details](https://griddynamics.github.io/rosetta/docs/external-lib-flow/)

**Governance & prompt authoring**

### 4.12 Security Workflow

Runs an authorized security review and prepares remediation inputs. It never fixes code itself.

Use it for an authorized review of an application, a repository, or an AI system.

**Skills:** [`/hitl`](instructions/r3/core/skills/hitl/SKILL.md), [`/security`](instructions/r3/core/skills/security/SKILL.md), [`/risk-assessment`](instructions/r3/core/skills/risk-assessment/SKILL.md), [`/dangerous-actions`](instructions/r3/core/skills/dangerous-actions/SKILL.md), [`/sensitive-data`](instructions/r3/core/skills/sensitive-data/SKILL.md), [`/subagent-directives`](instructions/r3/core/skills/subagent-directives/SKILL.md)

[Security Workflow Details](https://griddynamics.github.io/rosetta/docs/security-flow/)

### 4.13 Coding Agents Prompting Workflow

Authors or adapts prompts for AI agents: skills, subagents, workflows, and rules.

Use it to create, refactor, review, or port a prompt to another agent.

**Skills:** [`/coding-agents-prompt-authoring`](instructions/r3/core/skills/coding-agents-prompt-authoring/SKILL.md)

[Coding Agents Prompting Workflow Details](https://griddynamics.github.io/rosetta/docs/coding-agents-prompting-flow/)

## Skills

40 skills power these workflows. Browse them [here](instructions/r3/core/skills).

## Documentation

<details>
<summary><b>Every document, and when to read it</b></summary>

| Read this | When |
| --- | --- |
| **[PLUGINS](PLUGINS.md)** · **[MCPs](MCPs.md)** | You are picking a delivery mode, or installing one |
| **[CONFIGURATION](CONFIGURATION.md)** | Engineers setting up a workspace (in the VS Code sense) for the first time, so AI coding agents work well in it |
| **[OVERVIEW](OVERVIEW.md)** | Engineers, leads, and architects who want to understand how Rosetta works before contributing or evaluating it |
| **[CONTEXT](docs/CONTEXT.md)** | Contributors, architects, and stakeholders who need to understand the business purpose, domain, and requirements behind Rosetta |
| **[TROUBLESHOOTING](TROUBLESHOOTING.md)** · **[FAQ](FAQ.md)** | Anyone blocked while using or developing Rosetta |
| **[CHANGELOG](CHANGELOG.md)** | Weekly change log |
| **[ARCHITECTURE](docs/ARCHITECTURE.md)** · **[MCP-ARCHITECTURE](docs/MCP-ARCHITECTURE.md)** | Contributors who need to understand how Rosetta works before changing it |
| **[USER GUIDE](user-guide/README.md)** | Guide helps you use Rosetta |
| **[CONTRIBUTING](CONTRIBUTING.md)** · **[DEVELOPER_GUIDE](DEVELOPER_GUIDE.md)** | First-time and active contributors |
| **[REVIEW](REVIEW.md)** | Reviewers and PR authors |
| **[SECURITY](SECURITY.md)** | Discover a security vulnerability in Rosetta |

</details>

## Community and support

- Ask your agent: `/help-flow What can Rosetta help me with?`
- Email: [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)
- Website: <https://griddynamics.github.io/rosetta/>
- Issues and discussions: [github.com/griddynamics/rosetta](https://github.com/griddynamics/rosetta/issues)

## For AI agents

Machine-readable instruction bundle: [`llms-full.txt`](llms-full.txt).

## Demo

<details>
<summary><b>Watch the demo</b></summary>

https://github.com/user-attachments/assets/6df6e217-3e5c-4691-84ed-7440701a87de

</details>

## Tech Demo

<details>
<summary><b>Init and Coding</b></summary>

https://github.com/user-attachments/assets/fc0ef06a-2f9c-49fa-bc05-68001dadd286

</details>

<details>
<summary><b>Frontend Migration</b></summary>

https://github.com/user-attachments/assets/8a48ce2e-a8f6-4d80-a208-4e808ab502df

</details>

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
