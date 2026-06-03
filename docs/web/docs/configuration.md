---
layout: docs
title: Configuration
permalink: /docs/configuration/
---

# Workspace Configuration

**Who is this for?** Engineers setting up a workspace (in the VS Code sense) for the first time, so AI coding agents work well in it.

**When should I read this?** After you connect Rosetta (see [Quick Start](/rosetta/docs/quickstart/)), and before you start real coding or modernization work.

---

## Why this matters

AI agents do not see your source code or your business. They only know what the workspace tells them. Good setup gives the agent three things: business context, technical context, and reference code it can read. With these, the agent makes fewer wrong guesses and produces more consistent, correct code. This page is the checklist to provide them.

If you are migrating or modernizing a codebase, do the steps below first, then read [Modernization Additional Setup](#3-modernization-additional-setup) for the extra steps.

---

## 1. Install and Onboard

1. Connect Rosetta to your IDE — follow the [Quick Start](/rosetta/docs/quickstart/).
2. Onboard the repository to Rosetta (Quick Start, Step 3). This is required before the steps below.

---

## 2. Set Up the Repository

Work through these five steps once per repository.

### Step 1 — Capture business context in `CONTEXT.md`

Record the non-technical facts about the project:

- Its overall goal.
- What it does in the client's wider ecosystem.
- The source and the target of the work.
- The issue tracker you use.
- How a story goes from ticket to implemented.
- Who the users and key stakeholders are.
- Core business rules and domain constraints.
- Any compliance or regulatory requirements.
- References to documentation and ways to access it (example, acli or mcp for atlassian).

### Step 2 — Capture technical context in `ARCHITECTURE.md`

Record how the project is built and run:

- How to start the application(s) locally.
- Where and when integration tests and e2e tests are created.
- Any AI agentic harnesses to use.
- Dependencies on external or private libraries.
- Technical and architectural targets.
- Known issues or technical gaps.
- Service dependencies.
- Authentication, authorization, and routing for the deployed application.
- A brief description of the deployment infrastructure and environments.
- The build and CI/CD pipeline.
- Name standards for coding, linting, formatting (e.g. Google Java Style, Microsoft .NET code style) — name them, not the rules.

### Step 3 — Provide reference source code

Give the agent read-only code it cannot otherwise see. Clone each codebase into `refsrc/` as its own subfolder (for example, `refsrc/fastmcp-3.3.1` or `refsrc/private-ui-lib`).

Provide code such as:

- Backend code, when this is a frontend repository.
- Custom or corporate libraries and packages.
- A new or refreshed public framework that had a major or breaking update in the last 365 days.

Then add these Rosetta exceptions to the repository root `.gitignore` if they are missing:

```
agents/TEMP/
refsrc/
!refsrc/INDEX.md
```

Finally, create or update `refsrc/INDEX.md`, using a Markdown header per entry to say what each folder is for:

```
## "refsrc/fastmcp-3.3.1" - main framework for MCP handling
## "refsrc/private-ui-lib" - must use corporate styles for TailwindCSS
```

### Step 4 — Define reusable patterns

List the patterns the agent should reuse so generated code stays consistent — for example: components, state management, databases, API protocols, messaging, controllers, and CRUD verticals.

### Step 5 — Configure the ecosystem

- Install and configure MCPs and CLIs. Keep at most three MCPs enabled at a time, and prefer CLIs — they are always available and do not consume context.
- Install and configure plugins and extensions.
- Install and configure AI coding agent CLIs (Copilot CLI, Claude, Codex, and so on).

#### Recommended CLIs

Prefer a CLI over the matching MCP when one exists — it costs no context.

- `gh` — GitHub CLI: pull requests, issues, releases, and CI checks.
- `acli` — Atlassian CLI: Jira and Confluence from the terminal.
- `rtk` ([github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk)) — CLI proxy that reduces LLM token consumption by 60–90% on common dev commands.

#### Useful MCPs

MCPs are the eyes and hands of the AI — add them, but keep it balanced. Enable only what the task needs.

**Essential**

| MCP | URL | Use it for |
|---|---|---|
| Context7 | <https://github.com/upstash/context7> | Up-to-date library documentation. |
| Playwright MCP | <https://github.com/microsoft/playwright-mcp> | Drive web pages via accessibility snapshots — no screenshots or vision models needed. |
| Fetch | <https://github.com/modelcontextprotocol/servers/tree/main/src/fetch> | Retrieve and process content from web pages and APIs. |
| Chrome DevTools | <https://github.com/ChromeDevTools/chrome-devtools-mcp> | Full browser control: console, network tab, snapshots. |
| GitNexus | <https://github.com/abhigyanpatwari/GitNexus> | Index a large codebase into a knowledge graph. |

Use **either Playwright or Chrome DevTools, not both.**

**Recommended**

| MCP | URL | Use it for |
|---|---|---|
| Figma MCP | <https://github.com/GLips/Figma-Context-MCP> | Read designs directly from Figma. |
| Jira & Confluence MCP | <https://www.atlassian.com/platform/remote-mcp-server> | Tickets, comments, and documentation. |
| Repomix MCP | <https://repomix.com/guide/mcp-server> | Docs for using existing client libraries. |
| DeepWiki | <https://docs.devin.ai/work-with-devin/deepwiki-mcp> | Up-to-date documentation. |
| Database MCPs | <https://glama.ai/mcp/servers?attributes=category%3Adatabases> | Read schema and data. |

---

## 3. Modernization Additional Setup

Read this section only if you are converting, migrating, upgrading, or re-architecting a codebase. These steps are **in addition to** Section 2 — do those first.

### Onboard both repositories

Onboard the old repository and the new repository. If everything lives in one repository, state clearly in `CONTEXT.md` what is old and what is new.

The old code in `refsrc/` keeps its own `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` — reference them rather than copying their content.

### Add to each setup step

- **`CONTEXT.md` (Step 1):** state the modernization or migration goals and the processes you follow.
- **`ARCHITECTURE.md` (Step 2):** state the modernization target and how the new application is introduced, including:
  - The patterns you follow (for example: component replacement, the strangler fig pattern, or an API gateway that routes between old and new).
  - The limits of the modernization.
  - A reference to a separate target architecture document that defines how the new app is structured and organized.
  - What stays, what changes, and how it changes (for example: old state management → new state management).
  - Practical tips (for example: copy the CSS and then adapt it, skip onboarding UI, use data generation).
  - How unit and e2e tests are handled: copied and fixed, or fully regenerated.
  - How modernized application will be introduced and deployed.
  - Will modernized application work side-by-side or big bang deployment? Routing?
- **Reference source (Step 3):** provide the original old source code.
- **Patterns (Step 4):** also map old patterns to their new ("to be") equivalents.

### Generate specs and test coverage for the old code

- Use `/requirements-authoring-flow` or `Allium` to generate specs from the existing old code.
- Use `/coding-flow` for unit tests and `/aqa-flow` for e2e tests to cover the old code before you change it.

### Choose a workspace layout

Pick one of two layouts.

**Option 1 — Reference Source.** The workspace is just the new repository; it pulls in the old code through `refsrc/`. This is the easiest and fastest option. The downside: you can only edit one repository, so you need a separate window per repository.

```
<new git repo root>
├── docs/
│   ├── ARCHITECTURE.md   # new app + modernization target; references the old code's docs/ARCHITECTURE.md
│   └── CONTEXT.md        # new app + modernization process; references the old code's docs/CONTEXT.md
├── refsrc/
│   └── <old code>/
│       ├── docs/ARCHITECTURE.md
│       ├── docs/CONTEXT.md
│       └── <source files>
└── <new code>
```

**Option 2 — Composite Workspace.** A top-level folder holds the old and new repositories together, plus any others. This is useful for cross-service work. The downsides: the workspace itself must be tracked in git, the `.gitignore` and doc routing need care, and overall complexity is higher. This layout needs the `large-workspace-handling` skill.

```
<workspace git repo>
├── docs/
│   ├── ARCHITECTURE.md   # short index: technical purpose of each sub-repo, modernization processes, etc.
│   └── CONTEXT.md        # short index: business purpose of each sub-repo, modernization target, etc.
├── <old repo 1>/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── <old repo 2>/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── <new repo>/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
└── .gitignore            # excludes the cloned repo folders (old 1, old 2, new)
```
