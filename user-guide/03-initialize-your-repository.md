# Set up your repository

*[← Install Rosetta](02-install.md) · [Back to the guide](README.md) · Next: [Pick a scenario →](scenarios/README.md)*

Before Rosetta can help with real tasks, it needs to understand your project. You do this **once per repository** with the *init workspace* workflow. The agent studies your code, writes a handful of context documents, and asks you a few questions to fill gaps.

Think of it as onboarding a new teammate: an hour of orientation now saves confusion on every task later.

## How to run it

Just ask the agent in plain language. Use the version that matches your situation.

### Existing project (brownfield)

Most common case — you already have code:

```text
Initialize this repository using the respective Rosetta workflow
```

You can add detail to the same message to save time, for example telling it where old/unused code or existing specs live:

```text
Initialize this repository using the respective Rosetta workflow, dead code is in <path>, existing specs are in <path>
```

### New project (greenfield)

Starting from an empty or near-empty repo? Tell it what you're building:

```text
Initialize this repository using the respective Rosetta workflow, this is a new repository, target tech stack: ..., target architecture: ..., business context: ...
```

### Multiple repositories in one workspace (composite)

Initialize each repository on its own first, then run this at the workspace level:

```text
Initialize this repository using the respective Rosetta workflow, this is a composite workspace
```

### Upgrading an older setup

If a repo was set up on an earlier Rosetta release:

```text
Upgrade this repository from Rosetta R1 to R3
```

## What happens during setup

The agent works through several phases and does most of the heavy lifting itself:

1. Detects the situation (fresh, upgrade, plugin, or composite).
2. Analyzes your project structure and tech stack.
3. Extracts reusable coding and architecture patterns.
4. Writes the context documents (below).
5. **Asks you targeted questions** about domain and architecture that it can't infer from code.
6. Verifies everything is complete.

**Your job during setup:** answer the questions thoughtfully and skim the generated documents to make sure they match reality. The better your answers, the better every future task goes.

## What Rosetta creates

Setup produces a small set of Markdown documents in your repo — this is your project's shared "brain" that every future task reads from. The two you'll care about most:

| File                  | What it holds                                              |
| --------------------- | --------------------------------------------------------- |
| `docs/CONTEXT.md`     | Business context — what the project is and why            |
| `docs/ARCHITECTURE.md`| Technical context — how the system is built               |

Setup also generates supporting files such as `docs/TECHSTACK.md`, `docs/CODEMAP.md`, `docs/DEPENDENCIES.md`, and `docs/ASSUMPTIONS.md`, plus working folders like `plans/` and `refsrc/`.

> **Important:** don't delete files in `docs/`. They're Rosetta's memory of your project — removing them means starting the setup over.

## After setup: restart your session

Once initialization finishes, **start a fresh chat session** before your first real task. Setup creates new files that the agent only loads at the start of a session, so a restart makes sure it picks them up.

## Make setup pay off

A few habits that noticeably improve results:

- **Invest in `CONTEXT.md` and `ARCHITECTURE.md`.** Every developer and every task benefits from these being accurate.
- **Point Rosetta at existing specs.** If you have requirements, API contracts, or design docs, mention them in `CONTEXT.md` so the agent treats them as constraints instead of guessing.
- **Clean up dead code first.** Unused code confuses an AI agent the same way it confuses a new hire.

## Next step

Your repo is ready. Time to do actual work — [pick a scenario →](scenarios/README.md), or open the visual [workflow map](workflow-map.md).
