# Rosetta User Guide

Welcome! This guide helps you **use** Rosetta — no internals, no server administration, just the steps you need to get real work done with an AI coding agent.

If you can install a plugin in your IDE and type a message to your coding assistant, you can use Rosetta.

## What is Rosetta, in one sentence

Rosetta gives your AI coding agent (Claude Code, Cursor, Copilot, Codex, Antigravity, and others) your team's engineering know-how — so it reads your architecture and conventions first, asks before doing risky things, and follows a proper Prepare → Research → Plan → Act → Validate process instead of guessing.

## Start here

Read these in order the first time. After that, jump to whatever you need.

1. **[What is Rosetta?](01-what-is-rosetta.md)** — What it does for you and what to expect. 5-minute read.
2. **[Install Rosetta](02-install.md)** — Add the plugin to your IDE and confirm it works.
3. **[Set up your repository](03-initialize-your-repository.md)** — Run once per project so the agent understands your codebase.
4. **[Pick a scenario](scenarios/README.md)** — One page per task: coding, requirements, QA, analysis, and more.
5. **[Tips & troubleshooting](05-tips-and-troubleshooting.md)** — Model choice, managing sessions, fixing common problems, and a plain-language glossary.

## See it visually

Open the **[workflow map](workflow-map.html)** — an interactive diagram that starts from *"what do I want to do?"*, routes you to the right command, and shows the shape every workflow shares. It's the fastest way to get oriented.

## The 60-second path

```text
Install the plugin  →  Initialize your repo (once)  →  Start a task with a slash command
```

```text
/coding-flow Add password reset to the auth service
```

That's the whole loop. Everything else in this guide is detail on those three steps.

## Before you begin

- **Get approval first.** Confirm with your manager and company that you're allowed to use Rosetta on your work.
- **Pick a good model.** Use a *medium* reasoning model such as **Sonnet 5 (medium)**, **GPT-5.4-medium**, or **gemini-3.1-pro**. Avoid "Auto" model selection. This matters a lot for both quality and cost — see [Tips & troubleshooting](05-tips-and-troubleshooting.md#choosing-a-model).
- **Watch for plugin conflicts.** If you already use JUXT, Superpowers, GSD, or AI-DevKit, they can conflict with Rosetta. Stick with the one you know best.

## Scenarios at a glance

Each task has its own page — see the full [scenarios index](scenarios/README.md) or jump straight in:

| I want to…                                   | Scenario                                                     | Command                          |
| -------------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| Write a feature, fix a bug, add tests        | [Write or change code](scenarios/coding.md)                  | `/coding-flow`                   |
| Define what to build first                    | [Author requirements](scenarios/requirements.md)             | `/requirements-authoring-flow`   |
| Design test cases from a ticket               | [Generate test cases](scenarios/generate-test-cases.md)      | `/testgen-flow`                  |
| Automate a UI or API test                     | [UI](scenarios/automate-ui-tests.md) · [API](scenarios/automate-api-tests.md) | `/ui-aqa-flow` · `/api-aqa-flow` |
| Understand an existing codebase               | [Analyze a codebase](scenarios/analyze-a-codebase.md)        | `/code-analysis-flow`            |
| Investigate or compare options                | [Research a question](scenarios/research.md)                 | `/research-flow`                 |
| Migrate or upgrade a system                   | [Modernize / migrate](scenarios/modernize.md)                | `/modernization-flow`            |
| Run a security review                         | [Review security](scenarios/security-review.md)              | `/security-flow`                 |
| Teach the agent a library                     | [Onboard a library](scenarios/onboard-a-library.md)          | `/external-lib-flow`             |
| Author or adapt agent prompts                 | [Author agent prompts](scenarios/author-agent-prompts.md)    | `/coding-agents-prompting-flow`  |
| Handle a small or unusual task                | [Ad-hoc task](scenarios/adhoc-task.md)                       | `/adhoc-flow`                    |
| Find the right workflow                        | [Get help](scenarios/get-help.md)                            | `/help-flow`                     |

## Getting help

- Not sure which command to use? Just ask your agent: `/help-flow What can Rosetta help me with?`
- Something went wrong on a run? Ask your agent to run `/post-mortem` — it diagnoses what happened and suggests fixes.
- Email: [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)
- Website: <https://griddynamics.github.io/rosetta/>

---

*This user guide is a friendlier companion to the full documentation. For deeper technical detail, the developer-focused docs live in the repository root ([README](../README.md), [USAGE_GUIDE](../USAGE_GUIDE.md), [INSTALLATION](../INSTALLATION.md)) and the [`docs/`](../docs) folder. Each scenario page links to the exact workflow definition it describes.*
