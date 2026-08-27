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

Rosetta is open-source engineering governance and context for AI coding agents: it loads your team's shared instructions, architecture and constraints into every session of the tools you already use (Claude Code, Cursor, Copilot, Codex, and other MCP-compatible agents), so the agent works from your standards instead of guessing from a few open files.

**Teach agents how to think, not what to do.** The model already knows Python and React; what it lacks is your engineering discipline. That's what Rosetta encodes.

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

### Build & change

| I want to…                            | Scenario                                                    | Command                        | What it does                                                                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Write a feature, fix a bug, add tests | [Write or change code](user-guide/scenarios/coding.md)      | `/coding-flow`                 | Scales to the size of the change: specs and architecture options before code, implementation and tests by subagents, independent agent review and real validation, your approval at every gate. |
| Define what to build first            | [Author requirements](user-guide/scenarios/requirements.md) | `/requirements-authoring-flow` | Captures intent, proposes a MECE outline, then drafts requirements as atomic units, each agent-reviewed and approved by you before it enters the traceable final set.                           |
| Handle a small or unusual task        | [Ad-hoc task](user-guide/scenarios/adhoc-task.md)           | `/adhoc-flow`                  | Composes a bespoke plan from reusable building blocks instead of a fixed sequence, reviews it with you before execution, then runs it with tracking and a closing summary.                      |

### Test & QA

| I want to…                      | Scenario                                                           | Command         | What it does                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Design test cases from a ticket | [Generate test cases](user-guide/scenarios/generate-test-cases.md) | `/testgen-flow` | Rebuilds a requirements baseline from ticket and wiki sources, turns gaps and contradictions into questions for you, then derives traceable test cases and exports them to your TMS. |
| Automate a UI test              | [Automate UI tests](user-guide/scenarios/automate-ui-tests.md)     | `/ui-aqa-flow`  | Grounds tests in your existing page objects and conventions, agrees ambiguous selectors with you, then implements, runs, diagnoses failures and corrects until the suite passes.     |
| Automate an API test            | [Automate API tests](user-guide/scenarios/automate-api-tests.md)   | `/api-aqa-flow` | Reads the API spec against your test cases, clarifies gaps before any code is written, then specifies, implements, executes and corrects tests until they pass.                      |

### Understand

| I want to…                      | Scenario                                                         | Command               | What it does                                                                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Understand an existing codebase | [Analyze a codebase](user-guide/scenarios/analyze-a-codebase.md) | `/code-analysis-flow` | Reverse-engineers behaviour into documents where every claim links back to code, splits large codebases across parallel agents, raises unknowns as questions and proposes no changes. |
| Investigate or compare options  | [Research a question](user-guide/scenarios/research.md)          | `/research-flow`      | Meta-prompting: your question becomes a research prompt you approve, executed in an isolated subagent and returned as a documented answer with grounded references.                   |

### Transform

| I want to…                  | Scenario                                                       | Command               | What it does                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrate or upgrade a system | [Modernize / migrate](user-guide/scenarios/modernize.md)       | `/modernization-flow` | Recovers specs from the old code and maps dependencies before any target decision, then implements in small approved batches, preserving behaviour and test coverage.        |
| Teach the agent a library   | [Onboard a library](user-guide/scenarios/onboard-a-library.md) | `/external-lib-flow`  | Packages a private library into a compressed, searchable reference plus a short learning guide, wires it into your project docs, and verifies the agent can actually use it. |

### Govern quality

| I want to…                    | Scenario                                                             | Command                         | What it does                                                                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Run a security review         | [Review security](user-guide/scenarios/security-review.md)           | `/security-flow`                | Works only inside the scope you authorize: deterministic gates and threat-model-driven inspection, evidence behind every finding, independent review, then a sanitized report with remediation inputs. |
| Author or adapt agent prompts | [Author agent prompts](user-guide/scenarios/author-agent-prompts.md) | `/coding-agents-prompting-flow` | Extracts intent into an approved brief and blueprint, drafts each prompt through a hardening loop, then simulates realistic runs and validates against intent before anything is saved.                |

### Not sure?

| I want to…              | Scenario                                     | Command      | What it does                                                                                                                                                      |
| ----------------------- | -------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Find the right workflow | [Get help](user-guide/scenarios/get-help.md) | `/help-flow` | Lists what your installation actually offers, matches your request to a capability, explains how to use it, and hands off into that workflow in the same session. |

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
