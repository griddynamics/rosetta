# FAQ

**Who is this for?** Anyone evaluating, installing, or using Rosetta who has a quick question that isn't a bug or setup issue.
**When should I read this?** Before opening an issue — most meta-questions are answered here. For setup problems see [INSTALLATION.md](INSTALLATION.md); for things that aren't working see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Installation & Detection

**How do I know if Rosetta is installed and configured for this repo?**

Four signals, in order of reliability:

1. After you send your first prompt in a new chat session, the agent's reply opens with `I have loaded context using Rosetta: ...`. This is the definitive sign — Rosetta successfully bootstrapped for the session. (Subsequent prompts in the same session reuse the loaded context and won't repeat the line.)
2. The MCP server shows as connected in your IDE's MCP settings (Rosetta endpoint reachable). See [INSTALLATION.md](INSTALLATION.md) for setup or [TROUBLESHOOTING.md](TROUBLESHOOTING.md#connection--authentication) if it's disconnected.
3. A bootstrap rule file exists in the repo (e.g. `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, or your IDE's instruction file) and contains the Rosetta bootstrap block. This is the fallback when MCP isn't available.
4. The Rosetta entry exists in your IDE's configuration. The [Uninstalling section in INSTALLATION.md](INSTALLATION.md#uninstalling) lists exactly where Rosetta lives for each IDE and mode — invert it to check for presence:
   - **Plugin:** run `claude plugin list` (Claude Code), check installed Copilot agents (VS Code), or look for extracted plugin files in the repo (Codex)
   - **MCP:** run `claude mcp list` / `codex mcp list`, or open your IDE's MCP config file (Cursor, VS Code, Windsurf, JetBrains, Antigravity, OpenCode) and look for a `Rosetta` entry
   - **Offline:** confirm an `instructions/` directory exists in the repo

If none of these are true, Rosetta is not active for this session. See [INSTALLATION.md](INSTALLATION.md).

**How do I install Rosetta for the first time?**

See the [Get Started section in README.md](README.md#get-started) for the fastest path, or [INSTALLATION.md](INSTALLATION.md) for the full setup including the fallback bootstrap rule. Once installed, [QUICKSTART.md](QUICKSTART.md) walks you through your first session.

**Which Rosetta release should I use?**

**R2** is the current stable release — use it for production work.

**R3** is in active development and not for production use yet. (Internal contributors testing R3 do so by switching to the `V3` branch — see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).)

Rosetta uses release-based versioning so new instructions can be developed without breaking agents on stable releases, and rollback is always possible. See [OVERVIEW.md](OVERVIEW.md) for the rationale.

**How do I upgrade from R1 to R2?**

Open a new chat in your IDE and type: `Initialize this repository using Rosetta (upgrade R1 to R2)`. Rosetta will detect the existing R1 layout and migrate it.

**Plugin install or MCP install — which should I use?**

Use the **plugin** when one is available for your IDE. Plugins bundle the bootstrap rule, skills, agents, and workflows directly into the IDE and the agent loads them locally — no live connection to a Rosetta server at request time. In practice this means:

- Faster session start, no MCP OAuth expirations dropping the agent mid-task, no dependency on the Rosetta server being reachable from your network.
- No outbound calls to an external service means no data-egress or privacy review — you're installing static instruction files into the repo. That's a much shorter conversation with security and compliance than authorizing a new external MCP endpoint.

Use the **MCP** install when no plugin path exists for your IDE — e.g. Windsurf, Antigravity, OpenCode, or JetBrains Junie. See [PLUGINS.md](PLUGINS.md) for the IDEs that currently ship a plugin, and [INSTALLATION.md](INSTALLATION.md) for MCP setup.

---

## Token Usage & Performance

**Does an AI agent consume more tokens with Rosetta?**

Yes, but with a purpose. Rosetta loads bootstrap rules, the workflow for your request type, and any skills needed for the task — typically a few thousand extra tokens up front. In return you get:

- Fewer wrong-path executions that would burn far more tokens being undone
- Less back-and-forth because the agent asks the right questions early (HITL)
- Reusable plans, specs, and memory that compound across sessions

For small/trivial tasks the overhead can feel high relative to the task. For medium/large tasks the overhead is small relative to total work and the reliability gain usually pays for itself. <!-- TODO: link to any published benchmarks if available -->

**Why does the first message in a session take longer?**

Rosetta runs prep steps once per session: it loads context, classifies the request, picks a workflow, and reads relevant project files (`CONTEXT.md`, `ARCHITECTURE.md`, etc.). Subsequent messages reuse this context and are fast.

---

## Behavior & Modes

**Does Rosetta work in plan mode, Auto mode, or `danger-full-access`?**

Yes. Rosetta runs in every mode. Permission modes and Auto mode only change what the agent is *allowed* to do without asking — they do not turn off Rosetta's prep steps, workflows, or HITL gates. The only way to opt out of HITL is to explicitly tell the agent `fully autonomous` or `no HITL`.

**Can I skip the prep steps for a trivial one-line change?**

No. Prep steps are a blocking gate and run once per session. They are lightweight (load context, classify request, pick workflow) and are designed so even trivial tasks get the right routing. The savings from skipping are tiny; the cost of skipping and getting the wrong answer is high.

**How do I opt out of HITL (human-in-the-loop) for a single task?**

Include the literal phrase `fully autonomous` or `no HITL` in your request. This is the only accepted opt-out; ambiguous phrasing won't disable HITL by design. Use sparingly — HITL exists to catch ambiguous intent and risky actions.

**The agent stopped following Rosetta mid-session. What happened?**

Most likely an expired MCP OAuth token. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#agent-not-using-rosetta) — re-authenticate through your IDE's MCP settings.

---

## Concepts

**How does Rosetta compare to other AI agent tools (superpowers, GSD, etc.)?**

Most similar tools focus on one meta-flow — usually coding. Rosetta covers ~12 SDLC workflows: coding, test generation, AQA, modernization, research, code analysis, requirements authoring, external library onboarding, workspace init, prompt authoring, and more. See [USAGE_GUIDE.md](USAGE_GUIDE.md) for the full list.

Rosetta also adds guardrails, HITL approval gates, sensitive-data handling, and risk assessment that apply across all workflows.

If you already have a sophisticated harness for the one workflow you care about, you may not need Rosetta. If you want a broad, consistent foundation across many engineering activities, that's where Rosetta fits.

**What's the difference between a skill, workflow, agent, and rule?**

- **Rule** — always-on policy the agent must follow (e.g. guardrails, HITL questioning, file naming). Loaded at the start of every session.
- **Skill** — a focused capability the agent invokes for a specific need (e.g. `load-context`, `questioning`, `tech-specs`). Invoked on demand.
- **Workflow** — an end-to-end multi-phase process for a class of request (e.g. coding, modernization, research). One per top-level request.
- **Agent / subagent** — a specialized role spawned by the orchestrator to do delegated work in isolation (e.g. reviewer, researcher, engineer).

See [OVERVIEW.md](OVERVIEW.md) for the full picture.

**Where do I put project-specific overrides?**

In `gain.json` at the repo root. It defines SDLC setup and locations of Rosetta files and wins in any conflict with default Rosetta conventions. See [bootstrap-rosetta-files](https://github.com/griddynamics/rosetta/blob/main/instructions/r2/core/rules/bootstrap-rosetta-files.md?plain=1) for the canonical file list.

**What files does Rosetta create in my repo?**

The headline ones are `docs/CONTEXT.md` and `docs/ARCHITECTURE.md`. The full set (including `TODO.md`, `ASSUMPTIONS.md`, `TECHSTACK.md`, `DEPENDENCIES.md`, `CODEMAP.md`, `IMPLEMENTATION.md`, `MEMORY.md`, and the `plans/` and `refsrc/` directories) is documented in the `bootstrap-rosetta-files` rule. <!-- TODO: link to a user-friendly explainer once one exists -->

---

## Contributing & Support

**Where do I report bugs or request features?**

Open an [issue](https://github.com/griddynamics/rosetta/issues).

**Where do I propose changes to Rosetta itself?**

See [CONTRIBUTING.md](CONTRIBUTING.md) and [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).
