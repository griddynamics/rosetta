---
layout: user-guide
title: User Guide
permalink: /user-guide/
search_exclude: true
---

# User Guide
Welcome! This guide helps you **use** Rosetta — no internals, no server administration, just the steps you need to get real work done with an AI coding agent.

If you can install a plugin in your IDE and type a message to your coding assistant, you can use Rosetta.

## What is Rosetta, in one sentence

Rosetta gives your AI coding agent (Claude Code, Cursor, Copilot, Codex, Antigravity, and others) your team's engineering know-how — so it reads your architecture and conventions first, asks before doing risky things, and follows a proper Prepare → Research → Plan → Act → Validate process instead of guessing.

## Start here

Read these in order the first time. After that, jump to whatever you need.

1. **[What is Rosetta?](/rosetta/user-guide/what-is-rosetta/)** — What it does for you and what to expect. 5-minute read.
2. **[Install Rosetta](/rosetta/user-guide/install/)** — Add the plugin to your IDE and confirm it works.
3. **[Set up your repository](/rosetta/user-guide/initialize/)** — Run once per project so the agent understands your codebase.
4. **[Configure your ecosystem](/rosetta/user-guide/configure/)** — CLIs, MCPs, and reference code the agent needs for your scenarios.
5. **[Tips & troubleshooting](/rosetta/user-guide/tips/)** — Model choice, managing sessions, fixing common problems, and a plain-language glossary.

Then pick your task from [Scenarios at a glance](#scenarios-at-a-glance) below.

## See it visually

Open the **[workflow map](/rosetta/user-guide/workflow-map/)** — a diagram that starts from *"what do I want to do?"*, routes you to the right command, and shows the shape every workflow shares. It's the fastest way to get oriented.

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
- **Pick a good model.** Use a *medium* reasoning model such as **Sonnet 5 (medium)**, **GPT-5.6-terra-medium**, or **gemini-3.7-flash-high**. Avoid "Auto" model selection. This matters a lot for both quality and cost — see [Tips & troubleshooting](/rosetta/user-guide/tips/#choosing-a-model).
- **Watch for plugin conflicts.** If you already use JUXT, Superpowers, GSD, or AI-DevKit, they can conflict with Rosetta. Stick with the one you know best.

## Scenarios at a glance

Each task has its own page. Jump straight in.

### Build & change

| I want to…                             | Scenario                                                  | Command                        |
| -------------------------------------- | --------------------------------------------------------- | ------------------------------ |
| Write a feature, fix a bug, add tests  | [Write or change code](/rosetta/user-guide/scenarios/coding/)               | `/coding-flow`                 |
| Define what to build first             | [Author requirements](/rosetta/user-guide/scenarios/requirements/)          | `/requirements-authoring-flow` |
| Handle a small or unusual task         | [Ad-hoc task](/rosetta/user-guide/scenarios/adhoc-task/)                    | `/adhoc-flow`                  |

### Test & QA

| I want to…                             | Scenario                                                  | Command          |
| -------------------------------------- | --------------------------------------------------------- | ---------------- |
| Design test cases from a ticket        | [Generate test cases](/rosetta/user-guide/scenarios/generate-test-cases/)   | `/testgen-flow`  |
| Automate a UI test                     | [Automate UI tests](/rosetta/user-guide/scenarios/automate-ui-tests/)       | `/ui-aqa-flow`   |
| Automate an API test                   | [Automate API tests](/rosetta/user-guide/scenarios/automate-api-tests/)     | `/api-aqa-flow`  |

### Understand

| I want to…                             | Scenario                                                  | Command               |
| -------------------------------------- | --------------------------------------------------------- | --------------------- |
| Understand an existing codebase        | [Analyze a codebase](/rosetta/user-guide/scenarios/analyze-a-codebase/)     | `/code-analysis-flow` |
| Investigate or compare options         | [Research a question](/rosetta/user-guide/scenarios/research/)              | `/research-flow`      |

### Transform

| I want to…                             | Scenario                                                  | Command               |
| -------------------------------------- | --------------------------------------------------------- | --------------------- |
| Migrate or upgrade a system            | [Modernize / migrate](/rosetta/user-guide/scenarios/modernize/)             | `/modernization-flow` |
| Teach the agent a library              | [Onboard a library](/rosetta/user-guide/scenarios/onboard-a-library/)       | `/external-lib-flow`  |

### Govern quality

| I want to…                             | Scenario                                                  | Command                         |
| -------------------------------------- | --------------------------------------------------------- | ------------------------------- |
| Run a security review                  | [Review security](/rosetta/user-guide/scenarios/security-review/)           | `/security-flow`                |
| Author or adapt agent prompts          | [Author agent prompts](/rosetta/user-guide/scenarios/author-agent-prompts/) | `/coding-agents-prompting-flow` |

### Not sure?

| I want to…                             | Scenario                                                  | Command      |
| -------------------------------------- | --------------------------------------------------------- | ------------ |
| Find the right workflow                | [Get help](/rosetta/user-guide/scenarios/get-help/)                         | `/help-flow` |

## Getting help

- Not sure which command to use? Just ask your agent: `/help-flow What can Rosetta help me with?`
- Something went wrong on a run? Ask your agent to run `/post-mortem` — it diagnoses what happened and suggests fixes.
- Email: [rosetta-support@griddynamics.com](mailto:rosetta-support@griddynamics.com)
- Website: <https://griddynamics.github.io/rosetta/>

---

*This user guide is a friendlier companion to the full documentation. For deeper technical detail, the developer-focused docs live in the repository root ([README](/rosetta/user-guide/), [USAGE_GUIDE](/rosetta/docs/usage-guide/), [INSTALLATION](/rosetta/docs/installation/)) and the [`docs/`](/rosetta/docs/introduction/) folder. Each scenario page links to the exact workflow definition it describes.*

