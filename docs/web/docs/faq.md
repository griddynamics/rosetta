---
layout: docs
title: FAQ
permalink: /docs/faq/
---

# FAQ

**Who is this for?** Anyone evaluating, installing, or using Rosetta who has a quick question that isn't a bug or setup issue.
**When should I read this?** Before opening an issue — most meta-questions are answered here. For setup problems see [INSTALLATION.md](/rosetta/docs/installation/); for things that aren't working see [TROUBLESHOOTING.md](/rosetta/docs/troubleshooting/).

---

## Installation & Detection

**How do I know if Rosetta is installed and configured for this repo?**

1. AI coding agent loads CONTEXT.md and ARCHITECTURE.md files - if not it misses the entire context
2. AI coding agent loads workflow - if not it is taking shortcut delivering subpar results
3. AI coding agent loads hitl and orchestrator-contract - if not it will not engage user and hallucinate

If none of these are true, Rosetta is not active for this session. See [INSTALLATION.md](/rosetta/docs/installation/).

**How do I install Rosetta for the first time?**

See the [Quick Start Guide](/rosetta/docs/quickstart/) for the fastest path, or [INSTALLATION.md](/rosetta/docs/installation/) for the full setup including the fallback bootstrap rule. Once installed, [QUICKSTART.md](/rosetta/docs/quickstart/) walks you through your first session.

**Which Rosetta release should I use?**

**R2** is the current stable release — use it for production work.

Rosetta supports the current release and the one before it (N-1) so when a new release ships, the previous one keeps working while you migrate. See [OVERVIEW.md](/rosetta/docs/overview/) for the rationale.

**How do I upgrade from R1 to R2?**

Open a new chat in your IDE and type: `Initialize this repository using the respective Rosetta workflow (upgrade R1 to R2)`. Rosetta will detect the existing R1 layout and migrate it.

**Plugin install or MCP install — which should I use?**

Use the **plugin** when one is available for your IDE. Plugins bundle the bootstrap rule, skills, agents, and workflows directly into the IDE and the agent loads them locally — no live connection to a Rosetta server at request time. In practice this means:

- Faster session start, no MCP OAuth expirations dropping the agent mid-task, no dependency on the Rosetta server being reachable from your network.
- No outbound calls to an external service means no data-egress or privacy review — you're using local static instruction files. That's a much shorter conversation with security and compliance than authorizing a new external MCP endpoint.

Use the **MCP** install when no plugin path exists for your IDE — e.g. Windsurf, Antigravity, OpenCode, or JetBrains Junie. See [PLUGINS.md](/rosetta/docs/plugins/) for the IDEs that currently ship a plugin, and [INSTALLATION.md](/rosetta/docs/installation/) for MCP setup.

**I ran init — am I ready to go?**

No. Init generates a starting skeleton, but the agent only knows what the workspace tells it. Before real work, give it the three things it cannot infer from code:

- **Business context** → `CONTEXT.md`: the project goal, domain rules, stakeholders, issue tracker, and how a ticket becomes shipped work.
- **Technical context** → `ARCHITECTURE.md`: how to run/build/test it, service and external-library dependencies, auth and routing, and your coding/style standards.
- **Reference code** → `refsrc/`: read-only copies of code the agent can't otherwise see (e.g. the backend for a frontend repo, corporate libraries, a recently-updated framework), listed in `refsrc/INDEX.md`.

Then define reusable **patterns** so generated code stays consistent, and configure your **ecosystem** (a few MCPs/CLIs). Add this yourself — do not just ask the AI to "improve" the generated docs; without new facts it only rephrases them and often makes them worse.

See [CONFIGURATION.md](/rosetta/docs/configuration/) for the full per-repository checklist and the multi-repo / modernization layouts.

---

## Token Usage & Performance

**Does an AI agent consume more tokens with Rosetta?**

Yes, but with a purpose. Rosetta loads bootstrap rules, the workflow for your request type, and any skills needed for the task — typically a few thousand extra tokens up front. In return you get:

- Fewer wrong-path executions that would burn far more tokens being undone
- Guardrails, security, sensitive-data handling, and risk assessment of your current config — protections a bare agent doesn't apply
- Less back-and-forth because the agent asks the right questions early (HITL)
- Spec-Driven Development extended with Discovery, Design, Review, and Validation phases
- More reliable results overall

For small/trivial tasks AI treats them as just small change and never executes tests nor validate results of changes. Very often small changes have side effects, which AI must figure out first. This leads to low quality unpredictable results.

**Why does the first message in a session take longer?**

Rosetta runs prep steps once per session: it loads context and reads relevant project files (`CONTEXT.md`, `ARCHITECTURE.md`, etc.). Subsequent messages reuse this context and are fast.

**Which model should I use, and why did Rosetta burn through my token budget?**

Pick a **medium** model — **Sonnet 5**, **GPT-5.4-medium**, or **gemini-3.1-pro** — and avoid Auto model selection. The two most common cost mistakes:

- **Running everything on a high-reasoning/Opus model.** Opus-class models spend heavily on reasoning and can exhaust a daily balance in one sitting. Rosetta already assigns an appropriate model per subagent and switches automatically, so you do not need to force the most expensive model for the whole session.
- **Letting Auto pick the model.** Auto often downgrades to a weaker model mid-task, producing low-quality results. Choose the model explicitly.

See the model guidance in [Quickstart](/rosetta/docs/quickstart/).

---

## Behavior & Modes

**Does Rosetta work in plan mode, Auto mode, or `danger-full-access`?**

Yes. Rosetta runs in every mode. Permission modes and Auto mode only change what the agent is *allowed* to do without asking — they do not turn off Rosetta's prep steps, workflows, or HITL gates. The only way to opt out of HITL is to explicitly tell the agent `fully autonomous` or `no HITL`.

**Can I skip the prep steps for a trivial one-line change?**

No. Prep steps are a blocking gate and run once per session. They are lightweight (load context, read project files) and are designed so even trivial tasks start from the right context. The savings from skipping are tiny; the cost of skipping and getting the wrong answer is high.

**How do I opt out of HITL (human-in-the-loop) for a single task?**

Include the literal phrase `fully autonomous` or `no HITL` in your request. This is the only accepted opt-out; ambiguous phrasing won't disable HITL by design. Use sparingly — HITL exists to catch ambiguous intent and risky actions.

**The agent stopped following Rosetta mid-session. What happened?**

Most likely an expired MCP OAuth token. See [TROUBLESHOOTING.md](/rosetta/docs/troubleshooting/#agent-not-using-rosetta) — re-authenticate through your IDE's MCP settings.

**When should I start a new chat session versus continue in the same one?**

- **Same session** for follow-ups on the work just done — the agent fixed something the wrong way, missed an edge case, or you want to refine the same change.
- **New session** when you move to a different feature, a new dependency, or an unrelated change. Each top-level request should start fresh so context stays lean.

Reusing one long session for many unrelated tasks bloats context and degrades results. (A common mistake is running every task in a chat that started with "what can you do?" — start a new session for the real task.)

---

## Concepts

**How does Rosetta compare to other AI agent tools (superpowers, GSD, etc.)?**

Most similar tools focus on one meta-flow — usually coding. Rosetta covers ~12 SDLC workflows: coding, test generation, AQA, modernization, research, code analysis, requirements authoring, external library onboarding, workspace init, prompt authoring, and more. See [USAGE_GUIDE.md](/rosetta/docs/usage-guide/) for the full list.

Rosetta also adds guardrails, HITL approval gates, sensitive-data handling, and risk assessment that apply across all workflows.

If you already have a sophisticated harness for the one workflow you care about, you may not need Rosetta. If you want a broad, consistent foundation across many engineering activities, that's where Rosetta fits.

**What's the difference between a skill, workflow, agent, and rule?**

- **Rule** — always-on policy the agent must follow (e.g. guardrails, HITL questioning, file naming). Loaded at the start of every session.
- **Skill** — a focused capability the agent invokes for a specific need (e.g. `load-context`, `questioning`, `tech-specs`). Invoked on demand.
- **Workflow** — an end-to-end multi-phase process for a class of request (e.g. coding, modernization, research). One per top-level request.
- **Agent / subagent** — a specialized role spawned by the orchestrator to do delegated work in isolation (e.g. reviewer, researcher, engineer).

See [OVERVIEW.md](/rosetta/docs/overview/) for the full picture.

**Where do I put project-specific overrides?**

In `gain.json` at the repo root. It defines SDLC setup and locations of Rosetta files and wins in any conflict with default Rosetta conventions. See the [load-project-context skill](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/skills/load-project-context/SKILL.md?plain=1) (`<bootstrap_rosetta_files>`) for the canonical file list.

**What files does Rosetta create in my repo?**

The headline ones are `docs/CONTEXT.md` and `docs/ARCHITECTURE.md`. The full set (including `TODO.md`, `ASSUMPTIONS.md`, `TECHSTACK.md`, `DEPENDENCIES.md`, `CODEMAP.md`, `IMPLEMENTATION.md`, `MEMORY.md`, and the `plans/` and `refsrc/` directories) is documented in the `load-project-context` skill (`<bootstrap_rosetta_files>` section). <!-- TODO: link to a user-friendly explainer once one exists -->

---

## Contributing & Support

**Where do I report bugs or request features?**

Open an [issue](https://github.com/griddynamics/rosetta/issues). Whenever a run fails or you see something you'd like improved, the `post-mortem` skill (`/post-mortem`) root-causes it and drafts a sanitized issue for you — submitted only with your explicit approval, with no private code or data included.

**Where do I propose changes to Rosetta itself?**

See [CONTRIBUTING.md](/rosetta/docs/contributing/) and [DEVELOPER_GUIDE.md](/rosetta/docs/developer-guide/).