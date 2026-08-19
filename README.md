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

## Installation (30-second setup)

Get the plugin into your agent — files install locally, no server, no live connection at request time. Install for **one** agent only: two installations leave you with duplicate tools, commands and context.

<details>
<summary><b>Claude Code</b> — marketplace</summary>

```sh
claude plugin marketplace add griddynamics/rosetta
claude plugin install rosetta@rosetta
```

</details>

<details>
<summary><b>Cursor</b> — marketplace or standalone</summary>

Cursor detects Claude Code plugins automatically. If you already installed there, you are done — do not install again here.

**Marketplace** (needs a Teams or Enterprise plan): import `https://github.com/griddynamics/rosetta` into your team marketplace, following [Cursor's team marketplace docs](https://cursor.com/docs/plugins#team-marketplaces).

**Standalone:** download `core-cursor-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest), extract it into your repository, then check that `.cursor/agents/architect.md` exists and that there is no `.cursor/.cursor` folder.

</details>

<details>
<summary><b>GitHub Copilot</b> (VS Code, JetBrains) — marketplace or standalone</summary>

**Marketplace:** add `https://github.com/griddynamics/rosetta` to `chat.plugins.marketplaces` in VS Code settings, or to the same setting under the Copilot plugin in JetBrains. Then open the Copilot chat panel → gear icon → **Browse Marketplaces** → install `rosetta`.

**Standalone:** download `core-copilot-standalone-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest) and extract it into your repository. If `.github/copilot-instructions.md` already exists, merge rather than overwrite — Rosetta first, your original content after. Then check that `.github/agents/architect.agent.md` exists and that there is no `.github/.github` folder.

Do not combine the two: VS Code detects the standalone install as well, and you get everything twice.

</details>

<details>
<summary><b>Codex</b> — standalone only</summary>

Download `core-codex-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest), extract it into your repository, then enable hooks:

```sh
codex features enable hooks
```

Codex plugins currently support hooks, MCPs and skills only.

</details>

<details>
<summary><b>Antigravity</b> (2.0, CLI, IDE) — standalone only</summary>

One plugin serves all three surfaces. Download `core-antigravity-*.zip` from the [latest release](https://github.com/griddynamics/rosetta/releases/latest), create `.agents/plugins/rosetta/` at your workspace root, and extract the archive into it. Then check that `.agents/plugins/rosetta/plugin.json` exists and that there is no nested `core-antigravity` folder.

For every workspace instead of one, extract into `~/.gemini/config/plugins/rosetta/` — same contents.

</details>

<details>
<summary><b>MCP</b> — evaluation, or an agent with no plugin</summary>

A public demo endpoint — do not point production or sensitive repositories at it. **[MCPs](MCPs.md)** for the hosted setup, **[docs/mcp/DEPLOYMENT_GUIDE](docs/mcp/DEPLOYMENT_GUIDE.md)** if your team needs a self-hosted, centrally-managed deployment instead.

</details>

> [!TIP]
> Pick the model deliberately — Sonnet 5 medium, GPT-5.4-medium, gemini-3.1-pro or newer, and avoid Auto selection; it changes both quality and cost substantially. And if you already run JUXT, Superpowers, GSD or AI-DevKit, they conflict with Rosetta; stay with the one you know.

## Set up your repository

Before Rosetta can help with real tasks, it needs to understand your project. You do this once per repository with the init workspace workflow. The agent studies your code, writes a handful of context documents, and asks you a few questions to fill gaps.

To run it just ask the agent in plain language, which runs `/init-workspace-flow`.

### Existing project (brownfield)

Most common case — you already have code:

```
Initialize this repository using the respective Rosetta workflow
```

### New project (greenfield)

Starting from an empty or near-empty repo? Tell it what you're building:

```
Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ...
```

### Multiple repositories in one workspace (composite)

Initialize each repository on its own first, then run this at the workspace level:

```
Initialize this repository using the respective Rosetta workflow, this is a composite workspace
```

## Workflows

Each one covers an entire area of work end to end. If a full workflow is not needed you can ask directly, or use a skill on its own.

- **[Get help](user-guide/scenarios/get-help.md)**: A conversational way to discover what Rosetta can do and pick the right workflow, then hand off straight into it.
- **[Write or change code](user-guide/scenarios/coding.md)**: Discovery, a design you approve, a plan you approve, implementation, and a separate review-and-validation pass — for features, bug fixes, refactors, and unit tests.
- **[Ad-hoc task](user-guide/scenarios/adhoc-task.md)**: Composes discovery, requirements capture, planning and other building blocks into a bespoke plan for work that doesn't fit any other scenario.
- **[Author requirements](user-guide/scenarios/requirements.md)**: Drafts, reviews and validates requirements as small, atomic, testable units, each one approved by you.
- **[Analyze a codebase](user-guide/scenarios/analyze-a-codebase.md)**: Reverse-engineers an existing codebase into grounded architecture documentation — every claim traced to real code.
- **[Automate API tests](user-guide/scenarios/automate-api-tests.md)**: Turns API contracts and test cases into working, corrected, passing automated tests, HITL-gated.
- **[Automate UI tests](user-guide/scenarios/automate-ui-tests.md)**: Turns a test case into a working automated UI/browser test that follows your repo's existing page objects and conventions.
- **[Generate test cases](user-guide/scenarios/generate-test-cases.md)**: Turns a ticket into a structured requirements document and manual test cases, then exports them to your test management system.
- **[Review security](user-guide/scenarios/security-review.md)**: Runs an authorized, evidence-preserving security review that ends with sanitized findings and remediation-task inputs — it reviews and reports, not fixes.
- **[Modernize / migrate](user-guide/scenarios/modernize.md)**: Migrates or upgrades a system through strictly sequential, spec-first phases — document, prove behavior with evidence, map the target, get approval, then implement one piece at a time.
- **[Onboard a library](user-guide/scenarios/onboard-a-library.md)**: Packages an external or private library into compact reference material plus a short learning guide, so the agent can use its API without source access.
- **[Author agent prompts](user-guide/scenarios/author-agent-prompts.md)**: Authors or adapts prompts for AI coding agents — skills, subagents, workflows, rules — through discover → brief → blueprint → draft/harden → simulate → validate.
- **[Research a question](user-guide/scenarios/research.md)**: Writes the research prompt for your approval, then runs it and produces a documented, grounded answer.

## Skills

Workflows are what you type; skills are the 40 reusable disciplines underneath. They don't split cleanly into "you call it" and "it calls itself" — most are stitched into a specific workflow phase and are never invoked on their own. Four honest groups, by how each is actually engaged:

**Always active** — engage on every task, or every task for a given role, regardless of what you asked for:

- **[hitl](instructions/r3/core/skills/hitl/SKILL.md)**: Owns the approval gates and the questioning rounds — the reason the agent asks before acting.
- **[sensitive-data](instructions/r3/core/skills/sensitive-data/SKILL.md)**: Activates when anything that might be a secret, credential or PII is about to be read, written or echoed.
- **[dangerous-actions](instructions/r3/core/skills/dangerous-actions/SKILL.md)**: Activates when an action, or its consequence, could be destructive or irreversible.
- **[risk-assessment](instructions/r3/core/skills/risk-assessment/SKILL.md)**: Activates when the environment can reach databases, cloud services, or anything above local.
- **[deviation](instructions/r3/core/skills/deviation/SKILL.md)**: Activates when intent is unclear, something came as a surprise, or you asked to undo.
- **[self-learning](instructions/r3/core/skills/self-learning/SKILL.md)**: Activates when a run failed, or produced something other than what you asked for.
- **[self-organization](instructions/r3/core/skills/self-organization/SKILL.md)**: Activates past 65% context usage or a large multi-file scope, before the session sprawls into stale, unreviewable state.
- **[orchestration](instructions/r3/core/skills/orchestration/SKILL.md)**: Owns how the agent delegates to subagents — spawning one without it is treated as a defect, not a choice.
- **[questioning](instructions/r3/core/skills/questioning/SKILL.md)**: Asks targeted clarifying questions, but only when an unknown is high-impact enough to block safe execution.
- **[load-project-context](instructions/r3/core/skills/load-project-context/SKILL.md)**: Loads `CONTEXT.md` and `ARCHITECTURE.md` at the start of every session, so the agent starts from your project, not a blank slate.
- **[subagent-directives](instructions/r3/core/skills/subagent-directives/SKILL.md)**: The duties every spawned subagent inherits automatically, regardless of task.

**Built into the workflows above** — not invoked directly; each is a phase inside one or more of the 14 workflows:

- **[coding](instructions/r3/core/skills/coding/SKILL.md)**: The implementation discipline behind the coding workflow — KISS/SOLID/DRY, multi-environment awareness, systematic validation.
- **[testing](instructions/r3/core/skills/testing/SKILL.md)**: Thorough, isolated, idempotent tests — 80%+ coverage, external-only mocking, scenario-driven.
- **[debugging](instructions/r3/core/skills/debugging/SKILL.md)**: Root-causes errors and test failures before attempting a fix, instead of patching the symptom.
- **[tech-specs](instructions/r3/core/skills/tech-specs/SKILL.md)**: Turns approved requirements into testable technical specs — target architecture, contracts, interfaces.
- **[planning](instructions/r3/core/skills/planning/SKILL.md)**: Builds an execution-ready plan from approved specs: sequenced work breakdown, checklists, HITL checkpoints.
- **[reverse-engineering](instructions/r3/core/skills/reverse-engineering/SKILL.md)**: Extracts behavior and domain logic from existing code into a spec — the what and why, not the how.
- **[qa-knowledge](instructions/r3/core/skills/qa-knowledge/SKILL.md)**: The QA engineering core: requirements/gap analysis, scenario and spec design, test implementation, failure triage.
- **[qa-structure](instructions/r3/core/skills/qa-structure/SKILL.md)**: Resolves QA session paths, identifiers, and state-file shape, so QA workflows share one consistent layout.
- **[data-collection](instructions/r3/core/skills/data-collection/SKILL.md)**: Gathers QA source artifacts from the issue tracker, wiki, or test management system before a workflow starts.
- **[security](instructions/r3/core/skills/security/SKILL.md)**: Runs the authorized, evidence-preserving review behind the security workflow and prepares remediation inputs — never fixes anything itself.
- **[natural-writing](instructions/r3/core/skills/natural-writing/SKILL.md)**: Rewrites agent output into clear, honest human tone — no AI slop, no hype.
- **[codemap](instructions/r3/core/skills/codemap/SKILL.md)**: Generates, maintains, and queries a structural map of the codebase.
- **[large-workspace-handling](instructions/r3/core/skills/large-workspace-handling/SKILL.md)**: Splits a 100+ file workspace into scoped subagent tasks when one context window can't hold it all.
- **[requirements-authoring](instructions/r3/core/skills/requirements-authoring/SKILL.md)**: Drafts, updates, and validates requirements as atomic, user-approved units.
- **[requirements-use](instructions/r3/core/skills/requirements-use/SKILL.md)**: Consumes already-approved requirements for planning, implementation, and validation, with traceability back to them.
- **[coding-agents-prompt-authoring](instructions/r3/core/skills/coding-agents-prompt-authoring/SKILL.md)**: The authoring discipline behind writing or adapting a skill, agent, workflow, or rule — brief, contract, validation pack.

**Standalone** — no workflow calls these; invoke by name, or the agent reaches for one on its own judgment when the description matches:

- **[design](instructions/r3/core/skills/design/SKILL.md)**: Decides architecture — lays out alternatives and tradeoffs, commits to one with a stated rationale and boundaries.
- **[discovery](instructions/r3/core/skills/discovery/SKILL.md)**: Establishes what already exists — affected areas, current behavior, prior attempts, dependencies — before any plan is drafted.
- **[research](instructions/r3/core/skills/research/SKILL.md)**: Deep, grounded investigation — the agent drafts the research prompt for your approval, then runs it and documents the answer.
- **[post-mortem](instructions/r3/core/skills/post-mortem/SKILL.md)**: Root-causes a run that disappointed you, and can file a sanitized issue with your approval.
- **[reasoning](instructions/r3/core/skills/reasoning/SKILL.md)**: Structured meta-cognitive reasoning for a hard problem — the one skill here that only runs when explicitly asked.
- **[rosetta](instructions/r3/core/skills/rosetta/SKILL.md)**: Reads a plain request and routes it to the workflow that best matches — the engine behind `/rosetta`.
- **[coding-agents-farm](instructions/r3/core/skills/coding-agents-farm/SKILL.md)**: Runs parallel coding agents on isolated git worktrees.
- **[coding-agents-hooks-authoring](instructions/r3/core/skills/coding-agents-hooks-authoring/SKILL.md)**: Authors, registers, and tests Rosetta's own hooks — for extending Rosetta itself, not for using it.
- **[specflow-use](instructions/r3/core/skills/specflow-use/SKILL.md)**: Connects Rosetta to Grid Dynamics SpecFlow MCP — relevant only if SpecFlow is already installed.

**Solr specialism** — domain-specific, not part of the general Rosetta flow:

- **[solr-schema](instructions/r3/core/skills/solr-schema/SKILL.md)**: Designs and audits Solr schemas — field types, analyzers, docValues, solrconfig.
- **[solr-query](instructions/r3/core/skills/solr-query/SKILL.md)**: Builds and debugs Solr queries — eDisMax, block join, JSON facets, kNN, explain.
- **[solr-extending](instructions/r3/core/skills/solr-extending/SKILL.md)**: Builds Solr plugins — SearchComponent, QParser, URP, DocTransformer.
- **[solr-semantic-search](instructions/r3/core/skills/solr-semantic-search/SKILL.md)**: Builds Solr phrase-tagging semantic search — concept tagging, taxonomy, graph paths.

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
