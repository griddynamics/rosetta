# Workspace Configuration

**Who is this for?** Engineers setting up a workspace (in the VS Code sense) for the first time, so AI coding agents work well in it.

**When should I read this?** After you connect Rosetta (see [Quick Start](QUICKSTART.md)), and before you start real coding or modernization work.

---

## Why this matters

AI agents do not see your source code or your business. They only know what the workspace tells them. Good setup gives the agent three things: business context, technical context, and reference code it can read. With these, the agent makes fewer wrong guesses and produces more consistent, correct code. This page is the checklist to provide them.

If you are migrating or modernizing a codebase, do the steps below first, then read [Modernization Additional Setup](#4-modernization-additional-setup) for the extra steps.

---

## 1. Install and Onboard

1. Connect Rosetta to your IDE — follow the [Quick Start](QUICKSTART.md).
2. Onboard the repository to Rosetta (Quick Start, Step 3). This is required before the steps below.

---

## 2. Set Up the Repository

Work through these five steps once per repository.

### Step 1 — Capture business context in `CONTEXT.md`

Ask Opus-class model or GPT-5.5 to help you with:

```
Read and record the non-technical and engineering behavior facts about the project in `docs/CONTEXT.md`:

- Its overall goal.
- What it does in the client's wider ecosystem.
- The source and the target of the work.
- The issue tracker you use.
- How a story goes from ticket to implemented.
- Who the users and key stakeholders are.
- Core business rules and domain constraints.
- Any compliance or regulatory requirements.
- Accepted SDLC, DoD, and processes related to the project.
- References to documentation and ways to access it (example, acli or mcp for atlassian).
- Example DoD: ACs fully met, all builds are without errors and warnings, changes covered with unit+integration+e2e tests at 85%+, database correct and migration present, backend starts and succeeds with expected responses for affected areas validated directly, frontend/mobile/app starts and affected areas fully functional validated directly, validation perform using manual QA by AI using fresh subagent

Interview me relentlessly about every aspect of this plan until we reach a full shared understanding.
Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.
For each question, provide recommended and alternative answers, which are enterprise-ready, strict, specific, following best practices.
Ask the questions one at a time.
If a question can be answered by web search, exploring the codebase, do it first.
Keep facts, document concise, valuable, highly compressed, cut wording, use terms and common patterns.
Audience: AI like you.
```

### Step 2 — Capture technical context in `ARCHITECTURE.md`

Similarly, ask Opus-class model or GPT-5.5 to help you with:

```
Read and record the technical facts about the project in `docs/ARCHITECTURE.md`:

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
- Recommended allowed tooling (gh cli, MCPs, see https://raw.githubusercontent.com/griddynamics/rosetta/refs/heads/main/CONFIGURATION.md)
- Name standards for coding, linting, formatting (e.g. Google Java Style, Microsoft .NET code style) — not the rules!
- Architecture defines how to build/lint/test/run overall solution in concise unambigous manner

Interview me relentlessly about every aspect of this plan until we reach a full shared understanding.
Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.
For each question, provide recommended and alternative answers, which are enterprise-ready, strict, specific, following best practices.
Ask the questions one at a time.
If a question can be answered by web search, exploring the codebase, do it first.
Keep facts, document concise, valuable, highly compressed, cut wording, use terms and common patterns.
Audience: AI like you.
```

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

#### Available CLIs

- `rtk` ([github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk)) — CLI proxy that reduces LLM token consumption by 60–90% on common dev commands. **MUST** review with client! This can see the actual client IP!

#### Useful MCPs

MCPs are the eyes and hands of the AI — add them, but keep it balanced. Enable only what the task needs. **MUST** confirm with client!

**Essential**

| MCP             | URL                                                                   | Use it for                                                                            |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Context7        | <https://github.com/upstash/context7>                                 | Up-to-date library documentation.                                                     |
| Playwright MCP  | <https://github.com/microsoft/playwright-mcp>                         | Drive web pages via accessibility snapshots — no screenshots or vision models needed. |
| Fetch           | <https://github.com/modelcontextprotocol/servers/tree/main/src/fetch> | Retrieve and process content from web pages and APIs.                                 |
| Chrome DevTools | <https://github.com/ChromeDevTools/chrome-devtools-mcp>               | Full browser control: console, network tab, snapshots.                                |
| GitNexus        | <https://github.com/abhigyanpatwari/GitNexus>                         | Index a large codebase into a knowledge graph. Third-party tool will have access to IP. Review license and policy with your manager. Free for non-commercial or personal use; PAID for commercial or business use — see [GitNexus Enterprise Licensing](https://github.com/abhigyanpatwari/GitNexus?tab=readme-ov-file#enterprise). |
| Graphify        | <https://github.com/safishamsi/graphify>                              | MIT-licensed alternative that turns a project into a queryable knowledge graph. Third-party tool will have access to IP. Review license and policy with your manager. |

Use **either Playwright or Chrome DevTools, not both.**

**Recommended**

| MCP                   | URL                                                            | Use it for                                |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| Figma MCP             | <https://github.com/GLips/Figma-Context-MCP>                   | Read designs directly from Figma.         |
| Jira & Confluence MCP | <https://www.atlassian.com/platform/remote-mcp-server>         | Tickets, comments, and documentation.     |
| Repomix MCP           | <https://repomix.com/guide/mcp-server>                         | Docs for using existing client libraries. |
| DeepWiki              | <https://docs.devin.ai/work-with-devin/deepwiki-mcp>           | Up-to-date documentation.                 |
| Database MCPs         | <https://glama.ai/mcp/servers?attributes=category%3Adatabases> | Read schema and data.                     |

---

## 3. Choose a Workspace Layout

Pick the layout that fits your project. These options apply to any multi-repository project — regular development, microservices, or modernization:

1. Single Repo Workspace is the most useful when changes are implemented independently on each repository: single code change, single PR.
2. Composite Workspace is the most useful when changes are spread across multiple repositories (feature implementation end-to-end): multiple code changes, multiple PRs.

**Option 1 — Single Repo Workspace.** The workspace is a single, writable repository. AI agents can only write to this repository. All other codebases the agent needs to read are brought in via `refsrc/` as read-only references. This is the simplest option and the recommended starting point.

```
<new git repo root>
├── docs/
│   ├── ARCHITECTURE.md   # main service architecture and goals
│   └── CONTEXT.md        # main service business context
├── refsrc/
│   ├── <old code>/       # read-only: legacy codebase
│   ├── microservice2/    # read-only: peer service API reference
│   ├── shared-lib/       # read-only: corporate shared library
│   └── frontend/         # read-only: UI codebase for reference
└── <new code>
```

Setup actions:

- Open the repository in your IDE.
- Clone any read-only reference codebases into `refsrc/` as subfolders.
- Initialize Rosetta (see [Quick Start](QUICKSTART.md)).

<details>
<summary><b>Detailed examples what should be in RefSrc folder</b></summary>

1. Example what integration or e2e testing repository needs:

```
api-integration-testing
|- src
|  |- main.py
|  |- tests
|  |  |- test_api_integration.py
|  |  |- test_api_integration_2.py
|  |  |- test_api_integration_3.py
|  |  |- test_api_integration_4.py
|  |  |- test_api_integration_5.py
|  |  |- test_api_integration_6.py
|  |  |- test_api_integration_7.py
|  |  |- test_api_integration_8.py
|  |  |- test_api_integration_9.py
|  |  |- test_api_integration_10.py
|- requirements.txt
|- README.md
|- .gitignore
|- .env
|- refsrc
|  |- backend-api
|  |  |- api.py
|  |  |- endpoints.py
|  |  |- models.py
|  |  |- schemas.py
|  |  |- utils.py
|  |  |- tests
|  |  |  |- test_api.py
|  |  |  |- test_api_2.py
|  |  |  |- test_api_3.py
|  |  |  |- test_api_4.py
|  |  |  |- test_api_5.py
|- docs
```

2. Example what frontend repository will need:

```
frontend-app
|- src
|  |- main.js
|  |- index.html
|  |- style.css
|  |- script.js
|- refsrc
|  |- backend-api
|  |  |- api.py
|  |  |- endpoints.py
|  |  |- models.py
|  |  |- schemas.py
|  |  |- utils.py
|  |  |- tests
|  |  |  |- test_api.py
|  |  |  |- test_api_2.py
|  |  |  |- test_api_3.py
|  |  |  |- test_api_4.py
|  |  |  |- test_api_5.py
|  |- corporate-bootstrap-theme
|  |  |- src
|  |  |  |- assets
|  |  |  |  |- css
|  |  |  |  |  |- js
|  |  |  |  |  |- images
|  |  |  |  |  |- fonts
|  |  |  |  |  |- index.html
```

3. Example what backend repository will need:

```
backend-api
|- src
|  |- main.py
|  |- tests
|  |  |- test_api.py
|  |  |- test_api_2.py
|  |  |- test_api_3.py
|  |  |- test_api_4.py
|  |  |- test_api_5.py
|- refsrc
|  |- iac-terraform
|  |  |- main.tf
|  |  |- variables.tf
|  |  |- outputs.tf
|  |  |- README.md
|  |- iac-values
|  |  |- values.yaml
|  |  |- values-dev.yaml
|  |  |- values-prod.yaml
|  |- jenkins-pipeline
|  |  |- Jenkinsfile
|  |  |- Jenkinsfile-dev
|  |  |- Jenkinsfile-prod
```

</details>

---

**Option 2 — Composite Workspace with Submodules.** A top-level envelope repository holds each sub-repository as a git submodule. This integrates cleanly with standard git tooling and avoids manual gitignore maintenance. This layout needs the `large-workspace-handling` skill.

```
<workspace git repo>
├── docs/
│   ├── ARCHITECTURE.md   # index: technical purpose of each sub-repo
│   └── CONTEXT.md        # index: business purpose of each sub-repo
├── <old repo>/            # git submodule — e.g. old-app
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── <new repo>/            # git submodule — e.g. new-app
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── microservice1/         # git submodule
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── frontend/              # git submodule
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
└── shared-lib/            # git submodule
    ├── docs/ARCHITECTURE.md
    ├── docs/CONTEXT.md
    └── <source files>
```

Setup actions:

- Create a new empty git repository to serve as the composite workspace envelope.
- Request AI to add each sub-repository (code, infra, QA, frontend, shared libraries, etc.) as a git submodule and clone them into the envelope.
- Initialize Rosetta in the envelope workspace, telling it this is a composite workspace and that `ARCHITECTURE.md` must record that submodules are used for dynamic and optionally sparse-checkout (see [Quick Start](QUICKSTART.md)).
- Development teams can then use sparse-checkout on modules and/or they can select submodules they need.
- AI can dynamically check out a missing submodule at any point: `git submodule update --init <name>`.

---

**Option 3 — Composite Workspace with gitignore.** A top-level folder holds all repositories as plain directories. Each sub-repo folder is excluded from the envelope's git tracking via `.gitignore`. The downsides: the workspace must be tracked in git, and `.gitignore` and doc routing need ongoing care. This layout needs the `large-workspace-handling` skill.

```
<workspace git repo>
├── docs/
│   ├── ARCHITECTURE.md   # index: technical purpose of each sub-repo
│   └── CONTEXT.md        # index: business purpose of each sub-repo
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
├── microservice1/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
├── frontend/
│   ├── docs/ARCHITECTURE.md
│   ├── docs/CONTEXT.md
│   └── <source files>
└── .gitignore             # excludes the cloned repo folders
```

Setup actions:

- Create a new empty git repository to serve as the composite workspace envelope.
- Clone each sub-repository (code, infra, QA, frontend, shared libraries, etc.) into the envelope as a plain folder.
- Add each cloned folder to `.gitignore` so it is excluded from the envelope's git tracking.
- Initialize Rosetta in the envelope workspace, telling it this is a composite workspace (see [Quick Start](QUICKSTART.md)).

---

## 4. Modernization Additional Setup

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
