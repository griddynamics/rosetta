<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/web/assets/brand/rosetta-logo-full-color-white-text.png">
    <img src="docs/web/assets/brand/rosetta-logo-full-color-black-text.png" alt="Rosetta" width="200">
  </picture>
  <p><strong>Meta-prompting, context engineering, and centralized instructions management for AI coding agents</strong></p>
  <p>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/v/ims-mcp.svg" alt="MCP"></a>
    <a href="https://pypi.org/project/ims-mcp/"><img src="https://img.shields.io/pypi/dm/ims-mcp.svg" alt="Downloads"></a>
    <a href="https://pypi.org/project/rosetta-cli/"><img src="https://img.shields.io/pypi/v/rosetta-cli.svg" alt="CLI"></a>
    <a href="https://pypi.org/project/rosetta-cli/"><img src="https://img.shields.io/pypi/dm/rosetta-cli.svg" alt="Downloads"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-ims-mcp.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-ims-mcp.yml/badge.svg" alt="Rosetta MCP"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-rosetta-cli.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-rosetta-cli.yml/badge.svg" alt="Rosetta CLI"></a>
    <a href="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml"><img src="https://github.com/griddynamics/rosetta/actions/workflows/publish-instructions.yml/badge.svg" alt="Instructions"></a>
    <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.12+-blue.svg" alt="Python 3.12+"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0"></a>
  </p>
</div>

## What is Rosetta

Rosetta is a meta-prompting, context engineering, and centralized knowledge management for AI coding agents. It provides structured context - rules, skills, workflows, and sub-agents - guiding AI systems to operate with a deep understanding of system architecture, domain constraints, and engineering standards. Rosetta also accelerates project onboarding by reverse-engineering architecture and domain context, improving the reliability and consistency of AI-generated code.

Every AI interaction follows four phases: **Prepare** (load guardrails and context), **Research** (search the knowledge base), **Plan** (produce a reviewable plan), **Act** (execute with full context). Read more in the [Usage Guide](USAGE_GUIDE.md#workflows).

## Rosetta vs Standard Setup

Rosetta dramatically improves performance of coding agents by:

1. **Quick onboarding, Rich business and technical context. High token efficiency.** Without it coding agents perform very shallow analysis and usually read only few line ranges, as the result coding agents assume and guess a lot. LLM having limited context cannot make proper decision, leading to critical judgement failures. Imagine getting new developer completely from outside of the organization, give him/her few lines of code and ask to fix it properly. This is how coding agents work without Rosetta. Planning mode only partially solves this problem at much higher token cost, as AI still have to guess the purpose and target.
2. **Guardrails and safe behavior.** Coding agents do not question user input, do not question their understanding, do not think if something is right or wrong. They just do. Coding agents do not assess risks of current setup, do not handle with care sensitive data, moreover they actively distribute this information via logs, messages with user, etc. Rosetta enforces proper detection and handling of sensitive data, including possibly sensitive data. Guardrails include: critically reviewing user request, risk assessment handling, dangerous and potentially dangerous actions, transparency rules, behavior rules, orchestrating contracts, deviation handling, and many others (check all bootstrap rules and skills linked by it).
3. **Human-in-the-loop.** AI is on side fully unconditionally trusts user input (even if it is totally incorrect) and at the same time never asks deep questions, usually limiting itself to few questions. This is reverse of reality. Usually people are biased, forget to mention critical requirements, provide information without much thinking, rely on common project knowledge, and so on. To make this worse, AI never stops once it starts implementing, it just tries to fit user task even if there are real conflicts or blockers exist in the code. This makes even worse, as there are no HITL checkpoints, so AI just get carried away, burns tokens, hallucinates, and getting result wrong. It is very often much better just to stop and ask question from user.
4. **Source of truth.** AI does not catalog and saves source of truth. AI actually does the opposite - it mixes everything and everybody in one - confuses itself and the user. AI does not take time to think foundational: systems, actors, relationships, actions. As the result it is "leaking abstractions", "mixing responsibilities". This gets much worse on brownfield project. AI just does not know if the code is wrong, is the test is wrong, is user request is wrong. Rosetta enforces proper handling of requirements. Rosetta enforces proper classification.
5. **Unwarranted Urgency.** Majority of coding agents require LLM to go straight to execution as fast as possible. This is the opposite of quality and analysis. This is the opposite of enterprise software development where cost of error is extremely high. It is much cheaper to burn 2x tokens and spend few extra minutes vs salary of the engineer using it and the cost of the error. Even small bug caught before the release amplifies the total cost if factor in all the efforts engineer, leads, QA, managers need to invest to review, analyze, fix, and test it. Rosetta defines steps AI to follow to reliably execute task and to highly reduce risks of error surviving even local development.
6. **Self-learning, Self-organization.** AI coding agents are only now getting memory features, but reality is self-learning is not only memory. Reality is self-organization is very important. AI is more than capable to re-organize files and its work, but it is not doing so, because it was not instructed to do so. Because it considers that as deviation.
7. **Review after change.** One of important components of Rosetta is concept of reviewing the work, updating documentation, and verifying. AI makes mistakes. Sometimes it makes a lot of mistakes. Majority of those mistakes are very easily caught by review process. Review is handled by separate subagent with fresh context. 
8. **Validate.** The critical part that Rosetta solves is use of validation. It requires AI to validate all the work. It requires AI to build, run, and to execute real use tests of foundation before it moves to create dependent artifacts. Without it AI changes everything and then nothing works. Spends a lot of time and money fixing. This simple approach makes AI to work normally.
9. **Workflows.** Rosetta at last contains a set of workflows created by humans using AI, who saw all issues it makes, identified root cause, and formulated it as workflows. Without workflows AI makes changes and sometimes runs unit tests. AI with Rosetta workflows "suddenly" discovers knowledge and processes it would otherwise missed. Example: it installs proper package that already used by this solution in another project, it uses SMART, MECE, DRY, SOLID principles for planning, it designs the solution, it distinguishes plan vs specs, it performs reviews and HITL checkpoints when it is the most valuable.
10. **One Solution.** Rosetta provides skills, subagents, workflows, rules, commands, guardrails, best practices, and the way for AI to think about the problem, not WHAT to think, but HOW to think. This solution works with all common AI IDEs and AI Coding Agents exactly the same. Rosetta allows extensibility and customization at build and runtime.

Technically LLMs and System Prompts already knows all that, but reality is - it never follows and never activates that behavior. It just prioritizes what is in context. AI generates a next set of tokens based on probabilistic weights based off context. The sequence of tokens is single-threaded also. If LLM misses a point when it should think about specific aspect, it will never return back it as its gets carried away from it. Moreover, it performs very shallow reasoning on what it considers as a side quest, leading to catastrophic decisions.

## How Rosetta Achieves This

The previous section describes what goes wrong without structured context. This section explains the design decisions that solve those problems and what measurable results they produce.

1. **Progressive disclosure prevents context overflow.** AI coding agents have limited context windows. Loading all instructions at once wastes tokens and degrades reasoning quality. Rosetta loads instructions in stages: bootstrap rules first, then project context, then only the workflow-specific skills the current task needs. When a query matches more than five documents, Rosetta returns a listing instead of full content, so the agent can request exactly what it needs. The result: context stays lean and reasoning stays sharp, regardless of how large the instruction set grows.

2. **Classification-first routing loads the right instructions.** Before any work begins, Rosetta auto-classifies the request into one of twelve workflow types (coding, testing, research, requirements, initialization, modernization, and others). Each workflow defines its own phases, subagents, skills, and approval gates. A "fix this bug" request loads different instructions than "analyze this architecture." Neither loads what it does not need. This eliminates the guessing that agents normally do when they receive an unstructured prompt.

3. **Subagent orchestration with fresh context eliminates drift.** Long conversations degrade AI reasoning — the model accumulates noise, earlier conclusions bias later ones, and hallucinations compound. Rosetta delegates phases to specialized subagents (discoverer, architect, engineer, reviewer, validator), each starting with a clean context window and a focused scope. The reviewer who inspects your code has never seen the iterative debugging session. The validator runs against the original specs with no memory of the implementation struggles. This separation is what makes review and validation actually catch real problems instead of rubber-stamping the agent's own work.

4. **State persistence turns fragile sessions into resumable workflows.** For medium and large tasks, Rosetta writes execution state — plans, specs, phase progress — to disk. If the agent loses context, crashes, or times out, a new session resumes from the last checkpoint instead of starting from scratch. This transforms AI coding from single-shot attempts into reliable, multi-session work.

5. **Three-layer architecture enables customization without forking.** Rosetta ships universal best practices (core layer). Your organization adds its conventions and policies (organization layer). Each project adds local constraints (project layer). All three merge at runtime through a deterministic bundling mechanism. Teams customize behavior without modifying Rosetta itself, and every project inherits improvements from core and organization layers automatically.

6. **Release-based versioning with instant rollback.** Instructions are organized by release (r1, r2, r3). New versions are developed and tested without affecting agents on stable releases. If a change causes problems, rollback is immediate — switch the server-controlled version flag and every agent reverts. Instruction authors get the same deployment safety application developers expect from their code.

7. **Security by design — Rosetta never sees your code.** Instruction delivery is deterministic: the agent requests content by tag, not by sending source code for analysis. There is no semantic search over your codebase, no code transfer to Rosetta servers. The architecture is air-gap capable and runs entirely inside your organization's perimeter. Write mode is disabled by default and requires explicit deployment configuration to enable. Schema-strict input validation rejects any unexpected payloads.

8. **Cross-project intelligence makes agents system-aware (opt-in).** By default, AI coding agents see only one repository. With cross-project datasets enabled, agents can trace data flows across services, detect breaking API changes before they ship, and assess blast radius of a change across the portfolio. This turns isolated repo-level AI into organization-level AI.

9. **Rules-as-code applies engineering rigor to AI behavior.** Guardrails, workflows, skills, and conventions are authored in markdown, version-controlled in Git, reviewed in pull requests, and approved before deployment. The same rigor you apply to application code applies to the instructions that control your AI agents. Changes are tracked, rollback is possible, and no one person can silently alter how AI behaves across the organization.

10. **Agent-agnostic: one investment, every tool.** Rosetta works across Cursor, Claude Code, VS Code, JetBrains, Windsurf, Codex, Antigravity, OpenCode, and any MCP-compatible IDE. Instructions are written once and adapt to each environment. Organizations switching between AI tools keep their entire instruction investment intact. There is no vendor lock-in and no per-tool maintenance.

11. **Measurable outcomes from production usage.** A typical coding task with Rosetta takes roughly 25 minutes: 5 min to describe the task, 5 min to review the plan, 15 min for the AI to execute. Without Rosetta, the same task takes roughly 75 minutes: 30 min of prompt crafting, 15 min of back-and-forth in planning mode, 15 min of execution, 15 min catching errors afterward. Repository onboarding drops from weeks to minutes. Production teams report 3x–5x productivity improvement, varying by task complexity.

## Why use it

- **Context engineering, not prompt hacking.** Agents receive your conventions, architecture, and business rules automatically — structured, versioned, and ready before the first line of code. See [how it fits your workflow](OVERVIEW.md#how-rosetta-fits-into-your-workflow).
- **Write once, run everywhere.** Agent-agnostic design adapts to any IDE and any tech stack. No per-tool maintenance.
- **Guardrails built in.** Approval gates, risk assessment, and data protection ensure consistent AI behavior across teams. See [how Rosetta protects you](USAGE_GUIDE.md#how-rosetta-protects-you).
- **Cross-project intelligence** *(opt-in).* Publish business and technical context from every project into a shared knowledge base. Agents see the system, not just one repo — trace flows across services, catch breaking API changes before they ship, and assess blast radius of any change across the portfolio.
- **One-command onboarding.** New repo, new developer — productive immediately with best practices baked in.
- **Instructions as code.** Prompts version-controlled with release management — single source of truth for all teams.

## How it works

Your IDE connects to the Rosetta MCP server. The server exposes guardrails and common best practices, and provides a menu of available instructions — workflows and coding conventions. The coding agent selects only what it needs for the current task; Rosetta delivers just those, keeping the agent's context lean. By design, no source code or project data reaches Rosetta.

Rosetta is designed to not see your source code. It only serves knowledge and instructions to the agent. The agent loads only what it needs per request (progressive disclosure) and follows your organization's workflows.

Rosetta is engineered to prevent the unintentional transmission of sensitive data through the following architectural controls:
- **Deterministic Instruction Serving**: Instructions are delivered as MCP resources in a strictly deterministic manner. By eliminating the need for semantic search, coding agents are never required to transmit source code or sensitive context to Rosetta to retrieve instructions.
- **Read-Only Default State**: "Write" mode is disabled and hidden by default. Enabling write capabilities requires an explicit, intentional configuration at deployment, ensuring that data persistence remains entirely outside of the end-user's control.
- **Schema-Strict Input Validation**: All MCP tool inputs undergo rigorous validation against predefined schemas. This ensures the system rejects any unexpected payloads or "over-sharing" of data that does not match the required parameters.

## Get Started

**Cursor** — add to `~/.cursor/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "Rosetta": {
      "url": "<rosetta MCP production server URL>"
    }
  }
}
```

**Claude Code:**

```sh
claude mcp add --transport http Rosetta <rosetta MCP production server URL>
```

**Codex:**

```sh
codex mcp add Rosetta --url <rosetta MCP production server URL>
codex mcp login Rosetta
```

Complete the OAuth flow when prompted. Then ask: *"Initialize this repository using Rosetta"*

STDIO transport is available for air-gapped environments. [All IDEs and detailed setup](INSTALLATION.md). Read more in the [Quickstart](QUICKSTART.md).

## Supported IDEs and Agents

Cursor | Claude Code | VS Code / GitHub Copilot | JetBrains (Copilot, Junie) | Windsurf | Codex | Antigravity | OpenCode

Works with any MCP-compatible tool.

## Documentation

| I want to... | Read |
|---|---|
| Understand what Rosetta is and how to think about it | [OVERVIEW.md](OVERVIEW.md) |
| Set up Rosetta | [QUICKSTART.md](QUICKSTART.md) |
| Learn how to use Rosetta flows | [USAGE_GUIDE.md](USAGE_GUIDE.md) |
| Deploy Rosetta for my organization | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| Understand the system architecture | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Navigate the codebase | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) |
| Contribute a change | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Debug a problem | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| See release history | [CHANGELOG.md](CHANGELOG.md) |
| Security Policy | [SECURITY.md](SECURITY.md) |

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and expectations.

## Community

- [Discord](https://discord.gg/QzZ2cWg36g)
- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## Notice

> [!WARNING]
> Rosetta is intended for legitimate software engineering workflows.
> Users are responsible for ensuring their use complies with applicable laws, regulations, and contractual obligations.

## License

See [LICENSE](LICENSE) for details.
