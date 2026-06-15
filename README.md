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

Rosetta is a meta-prompting, context engineering, and centralized instructions management for AI coding agents. It provides structured context - rules, skills, workflows, and sub-agents - guiding AI systems to operate with a deep understanding of system architecture, domain constraints, and engineering standards. Rosetta accelerates project onboarding by reverse-engineering architecture and domain context, reducing further conversations token consumption and improving the reliability and consistency of AI-generated code.

Every AI interaction follows four phases: **Prepare** (load guardrails and context), **Research** (search the knowledge base), **Plan** (produce a reviewable plan), **Act** (execute with full context), and **Validate** (manual validation by AI). Read more in the [Usage Guide](USAGE_GUIDE.md#workflows).

If you want to quickly understand what problem Rosetta solves and why we built it, see the [Elevator Speech](ELEVATOR_SPEECH.md).

**DISCLAIMER**: If you are effectively using your current setup, writing your own skills, and managing AI using your own processes - you 99% don't need Rosetta.

## Supported IDEs and Agents

Cursor | Claude Code | VS Code / GitHub Copilot | JetBrains (Copilot, Junie) | Windsurf | Codex | Antigravity | OpenCode | Gemini CLI

Works with any MCP-compatible coding agent, though plugins are recommended.

## Quick Start

1. [Plugins and standalone installation are supported for Claude Code, Github Copilot (VSCode/JetBrains IDEA), Cursor](PLUGINS.md)
2. [MCP-based installation for the rest of coding agents](MCPs.md)

There will be conflict if you have similar plugins installed: JUXT, Superpowers, GSD, AI-DevKit. Use the ones you have the most experience with.

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

<details>
<summary><b>What Rosetta Adds to AI Coding Agents</b></summary>

## What Rosetta Adds to AI Coding Agents

AI coding agents can read code, generate code, and run commands. That is where it ends. They are missing nearly everything that makes a professional software engineer reliable. Each point below addresses a real, repeatedly observed failure mode — not a theoretical concern.

**Why these problems exist.** LLMs generate tokens sequentially based on probabilistic weights over their current context. If the model misses a point where it should consider a specific concern — security, existing conventions, an assumption it made three steps ago — it does not return to it. It gets carried away. It performs shallow reasoning on anything it treats as a side quest, leading to catastrophic decisions. This is not a temporary limitation of current models. It is how autoregressive token generation works. Coding agent system prompts do not contain engineering process guidance — their job is to make the AI call the right tools in the right format. They cannot contain project-specific guardrails, workflows, or quality standards because the system prompt has no idea what you are building: a PoC, a pet project, a study exercise, or enterprise software with regulated data. That guidance simply does not exist in the agent unless something provides it. Rosetta provides it — and more importantly, it guides the agent on how to acquire project-specific context, when to load it, and what to do with it. The right information, at the right time, loaded into context so the model acts on it instead of skipping it.

**Why this list is long.** Ask any AI coding agent to design a complete workflow for implementing a feature. It will produce two or three steps — "write code" and "run tests," maybe "create a plan." It will not think about loading project context first, classifying the request, assessing risk, creating specs separately from plans, getting approval before implementation, reviewing with fresh eyes, validating against specs, handling sensitive data, updating documentation, or recording lessons learned. It will forget about all of it. Every point below is something AI agents consistently skip.

1. **Deep project context instead of blind guessing.** Without structured context, coding agents read a few line ranges around the problem and guess the rest. They do not know the architecture, the business rules, the conventions, or the dependencies. They assume. The result is code that appears correct on the surface but violates constraints the agent never knew existed. Imagine hiring a developer from outside your organization, handing them ten lines of code with zero documentation, and asking them to fix the system properly. That is how every coding agent works by default. Planning mode partially addresses this — at much higher token cost — and the agent still has to guess the purpose and target because it has no business context.

    Rosetta instructions reverse this. During repository initialization, the agent — guided by Rosetta — reverse-engineers the project's architecture, tech stack, business context, coding patterns, and dependencies into structured workspace files. The agent reads these before every task. Context loads progressively — bootstrap rules first, then project context, then only the skills and workflow the current task needs. When a query returns more than five documents, Rosetta MCP switches to a listing so the agent picks exactly what it needs. Context stays lean. Reasoning stays sharp. Token efficiency is high because the agent is not loading irrelevant material or re-discovering the project from scratch on every request.

2. **Guardrails and enforced safe behavior.** Coding agents do not question their own actions. They do not question their understanding. They do not think about whether something is right or wrong. They just do it. They do not assess what they have access to — databases, cloud services, S3 buckets. They do not handle sensitive data with care. They actively copy personal data, credentials, and regulated information into logs, messages, and outputs. They do not evaluate whether an action is dangerous or irreversible.

    Rosetta instructions require the agent to: critically review every user request before execution, assess risk of the current environment and available tools, detect and block dangerous and potentially dangerous actions, mask sensitive data and never log or share it, follow transparency rules and behavior boundaries, respect orchestration contracts between agents, and handle deviations when execution diverges from intent. These guardrails load at bootstrap and cannot be turned off. They are not suggestions — the agent follows them as enforced constraints.

3. **Human-in-the-loop at decision points, not after the damage.** AI coding agents fully and unconditionally trust user input — even when it is factually incorrect. At the same time, they almost never ask deep questions. When they do ask, the questions are shallow and few. This is the reverse of how collaboration should work. Users are biased, forget to mention critical requirements, provide information without much thought, and rely on common project knowledge that the agent does not have. Once implementation starts, the agent never stops — even when real conflicts or blockers exist in the code. It gets carried away, burns tokens, hallucinates to fill gaps, and delivers the wrong result. There are no checkpoints. There is no pause to verify understanding.

    Rosetta workflows define approval gates at critical decision points: after specs, after plans, before risky actions, before test work continues. The agent batches questions (5–10 per round), prioritizes by impact, and targets a single decision per question. When something is unclear, the agent — instructed by Rosetta — stops and asks instead of guessing. It is almost always cheaper to stop and ask one question than to redo hours of wrong implementation.

4. **Source of truth and request classification.** AI does not establish or maintain a source of truth. It does the opposite — it mixes everything together, confuses its own outputs with ground truth, leaks abstractions, and blends responsibilities. It does not take time to think about systems, actors, relationships, and actions at a foundational level. On brownfield projects this is catastrophic: the agent cannot tell if the existing code is wrong, if the test is wrong, or if the user's request contradicts the actual system behavior. It just tries to make things fit.

    Rosetta instructions require the agent to handle requirements with traceability. Before any work begins, the agent — following Rosetta's bootstrap — auto-classifies every request into one of twelve workflow types: coding, testing, research, requirements, initialization, modernization, code analysis, QA automation, and others. Each type loads entirely different instructions, subagents, skills, and approval gates. A "fix this bug" request follows a completely different path than "analyze this architecture" or "write requirements for checkout." Classification eliminates the guessing that agents do when they receive an unstructured prompt and try to figure out on the fly what kind of work this is.

5. **Analysis before execution.** The majority of AI coding agents are optimized to start implementation as fast as possible. This is the opposite of quality. This is the opposite of enterprise software development, where the cost of an error is extremely high. A bug caught during development costs minutes. The same bug caught after release costs the combined time of the engineer who debugs it, the lead who triages it, QA who verifies the fix, the manager who tracks it, and every person involved in the review, release, and retest cycle. Even a small bug amplifies the total cost by an order of magnitude once it escapes local development.

    Rosetta workflows define explicit preparation, research, planning, and approval phases before any code is written. They instruct the agent to apply SMART, MECE, DRY, and SOLID principles during planning. They separate plans from specs — the plan says what to do and in what order; the spec says what the target state looks like and why. The process scales by task size: small tasks get lightweight planning, medium tasks get full planning with subagents, large tasks get extensive planning with heavy delegation. It is much cheaper to burn 2x tokens and spend a few extra minutes on analysis than to pay for the cascade of rework a missed defect triggers.

6. **Review by separate agent with fresh context.** AI makes mistakes. Sometimes it makes a lot of mistakes. The majority of those mistakes are trivially caught by review — but only if the reviewer has not been part of the implementation. A model reviewing its own work in the same context window rubber-stamps its own decisions. It cannot see its own blind spots. The accumulated assumptions, false starts, and iterative workarounds all feel correct because the model generated them.

    Rosetta workflows instruct the agent to delegate review to a separate subagent with a fresh context window. The reviewer has never seen the debugging session, the failed attempts, or the rationalizations. It inspects the implementation against the original specs and intent. This separation is what makes review actually catch problems instead of confirming the implementer's biases.

7. **Validation with real execution evidence.** Without validation requirements, AI changes multiple files, runs nothing, and declares success. Then it spends three times the original effort trying to fix cascading failures it could have caught immediately. It builds dependent artifacts on top of broken foundations.

    Rosetta instructions require the agent to build, run, and execute real tests at each foundation level before creating dependent work. The validator subagent runs in a clean context with actual execution evidence. This requirement — prove it works before moving on — is simple, and it transforms AI coding from "generate and hope" into "generate, verify, continue."

8. **Workflows designed from observed failure modes.** Ask any AI to create a complete coding workflow from scratch. It will produce something superficial — a few obvious steps that cover maybe 20% of what actually matters. It will focus on one or two concerns and completely forget about everything else. This is not a failure of intelligence. It is a failure of experience. The model has never watched itself fail across hundreds of real tasks and identified the patterns.

    Rosetta contains workflows created by humans who used AI extensively, observed every category of failure, identified root causes, and encoded solutions as structured processes. These workflows cover twelve SDLC activities. Each defines phases, subagents, skills, HITL gates, and artifact expectations. The agent with Rosetta workflows does not become smarter — it stops skipping the steps that matter. It discovers knowledge, conventions, and dependencies it would otherwise miss entirely. It installs the package that another project in the same solution already uses. It distinguishes planning from specs. It performs reviews and checkpoints at the moments where they catch the most errors.

9. **Self-learning and self-organization.** AI coding agents are only now getting basic memory features, but self-learning is not just memory. Self-organization is equally important. AI is fully capable of reorganizing files, restructuring its approach, cleaning up stale information, and adapting based on past mistakes — but it does not do any of this because it was never instructed to. It treats reorganization as deviation from the task. It treats cleanup as out of scope. It treats learning as someone else's job.

    Rosetta instructs the agent to maintain `agents/MEMORY.md` — root causes of errors, actions tried, lessons learned. The agent consults this during planning and records new lessons after failures. It is instructed to reorganize working files when context grows large, and to proactively clean up when work spans many files or sessions.

10. **State persistence turns crashes into checkpoints.** AI coding sessions are fragile. Context loss, timeout, or a crash means starting over. For anything beyond a small fix, this wastes significant time and money. The agent has no memory of what it already completed.

    Rosetta instructs the agent to write execution state — plans, specs, phase progress, flow status — to disk files. If a session fails, the next session resumes from the last recorded checkpoint. Medium and large tasks become resumable multi-session workflows instead of all-or-nothing gambles.

11. **Security by design — no source code leaves your perimeter.** Instruction delivery is deterministic: the agent requests content by tag, not by sending source code for analysis. There is no semantic search over your codebase. No code transfers to Rosetta servers. Write mode is disabled by default and requires explicit deployment configuration to enable. Schema-strict input validation rejects any unexpected payloads. The architecture is air-gap capable and runs entirely inside your organization's perimeter.

12. **One system, every AI tool, customizable at every level.** Rosetta works across Cursor, Claude Code, VS Code, JetBrains, Windsurf, Codex, Antigravity, OpenCode, and any MCP-compatible IDE. Instructions are written once and adapt to each environment. Organizations that switch between AI tools or use multiple tools simultaneously keep their entire instruction investment intact. No vendor lock-in. No per-tool maintenance.

    Three layers merge at runtime: core (universal best practices shipped with Rosetta), organization (your company's conventions and policies), and project (local constraints and context). Teams customize without forking. Improvements to higher layers propagate to every project automatically. Release-based versioning (r1, r2, r3) lets instruction authors develop and test new versions without breaking agents on stable releases. Rollback is immediate. AI behavior is authored in markdown, version-controlled in Git, reviewed in pull requests, and approved before deployment — the same engineering rigor applied to the instructions that control your AI agents.

</details>

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
      "url": "https://mcp.rosetta.griddynamics.net/mcp"
    }
  }
}
```

**Claude Code:**

```sh
claude mcp add --transport http Rosetta https://mcp.rosetta.griddynamics.net/mcp
```

**Codex:**

```sh
codex mcp add Rosetta --url https://mcp.rosetta.griddynamics.net/mcp
codex mcp login Rosetta
```

Complete the OAuth flow when prompted. Then ask:

**Greenfield (new repository):** *"Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ..."*

**Brownfield (existing repository):** *"Initialize this repository using the respective Rosetta workflow[, this is a composite workspace][, additional information]"*

STDIO transport is available for air-gapped environments. [All IDEs and detailed setup](INSTALLATION.md). Read more in the [Quickstart](QUICKSTART.md).

## Contributing

Use Rosetta plugins to develop Rosetta.

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and expectations.

## Community

- [Website](https://griddynamics.github.io/rosetta/)
- [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)

## Notice

> [!WARNING]
> Rosetta is intended for legitimate software engineering workflows.
> Users are responsible for ensuring their use complies with applicable laws, regulations, and contractual obligations.

## License

See [LICENSE](LICENSE) for details.
