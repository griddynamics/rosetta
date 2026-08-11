# What is Rosetta?

*[← Back to the guide](README.md) · Next: [Install Rosetta →](02-install.md)*

## The short version

AI coding agents are impressive on their own — but on a real team they don't know *your* architecture, *your* conventions, or *your* rules. So they read a couple of open files and confidently do the wrong thing.

Rosetta fixes that. It loads your team's shared engineering knowledge into every agent session, so the agent works the way an experienced teammate would: understand the codebase first, propose a plan, get your sign-off, do the work, then check it actually works.

It's not a new AI agent and it doesn't replace the tools you already have. It plugs into Claude Code, Cursor, GitHub Copilot, Codex, Antigravity, and other MCP-compatible agents, and makes them behave better.

## What changes when you use it

Here's the difference on a typical request like *"Add rate limiting to the checkout API."*

| Without Rosetta                                  | With Rosetta                                       |
| ------------------------------------------------ | -------------------------------------------------- |
| Jumps straight into editing the handler          | Reads your architecture and conventions first      |
| Duplicates code that already exists               | Reuses your shared patterns and libraries          |
| No plan, no checkpoint                            | Proposes a plan and asks you to approve it          |
| Reviews its own work in the same breath           | A fresh reviewer double-checks it                  |
| "Generate and hope"                               | Runs the tests and validates with real evidence    |

The core idea: **teach the agent how to *think*, not what to do.** The model already knows Python, Java, and React. What it's missing is your engineering discipline — and that's what Rosetta supplies.

## How a task actually flows

Every kind of task follows the same five phases, with **approval gates** where your judgment matters:

```text
Prepare  →  Research  →  Plan  →  Act  →  Validate
(context)   (discover)   (specs)  (build)  (run & verify)
              ▲                ▲
              you review the plan before any code is written
```

- **Prepare** happens once when you set up a repo (see [Set up your repository](03-initialize-your-repository.md)). The agent reverse-engineers your architecture, tech stack, and context into a few documents it reuses on every future task.
- **Research → Plan** is where the agent figures out what to change and writes it up for you.
- You approve the plan. **This is your main checkpoint** — read it before you say yes.
- **Act → Validate** is implementation, followed by a separate review and a real test run.

You'll see the agent pause and ask for approval at the important moments. That pause is a feature, not a delay — it's the difference between catching a wrong turn now versus untangling it later.

## What you get out of the box

Rosetta covers about a dozen everyday engineering activities, each launched with a simple slash command:

- Writing features, fixing bugs, refactoring (`/coding-flow`)
- Writing requirements before you build (`/requirements-authoring-flow`)
- Generating test cases and automating UI/API tests (`/testgen-flow`, `/ui-aqa-flow`, `/api-aqa-flow`)
- Understanding an unfamiliar codebase (`/code-analysis-flow`)
- Research and technical comparisons (`/research-flow`)
- Large migrations and upgrades (`/modernization-flow`)
- Security reviews (`/security-flow`)
- And a built-in helper (`/self-help-flow`) that explains what's available

See the [scenarios](scenarios/README.md) for how to run each one — one page per task.

Underneath, it also applies guardrails you don't have to think about: it won't take dangerous actions without your OK, it avoids reading or leaking sensitive data (secrets, PII, and the like), and it flags risky setups before it can break something.

## What Rosetta does *not* do

So you know where the edges are:

- **It doesn't run or change your code by itself.** Your coding agent does that; Rosetta guides it.
- **It doesn't watch your agent in real time.** It sets things up; it doesn't monitor mid-run.
- **It isn't a project manager.** No scheduling, assignments, or ticket tracking.
- **It isn't for non-engineering work.** Its guardrails keep it focused on the software lifecycle.
- **It doesn't replace your judgment.** The approval gates exist precisely because human decisions matter.

## Do you even need it?

Honest answer: if you already have a polished personal setup — your own prompts, your own skills, your own process — and it works well for you, you may not need Rosetta. It shines when a *team* wants one consistent, high-quality way of working across many projects and many kinds of tasks.

---

*Next: [Install Rosetta →](02-install.md) · Or jump to the visual [workflow map](workflow-map.md).*
