---
layout: docs
title: Architecture
permalink: /docs/architecture/
---

# Architecture

**Who is this for?** Contributors who need to understand how Rosetta works before changing it.

**When should I read this?** After [Overview](/rosetta/docs/overview/). Before touching MCP tools, CLI publishing, instruction content, or folder structure.

For terminology (workflow, skill, rule, subagent, bootstrap, etc.), see [Overview — Key Concepts](/rosetta/docs/overview/#key-concepts).

---

## Two Repositories

Rosetta operates across two distinct repository types:

**Instructions repository** (this repo). Where common instructions are defined: skills, agents, workflows, rules, templates. Published to RAGFlow via the CLI. Maintained by instruction authors.

**Target repository** (any project). Where Rosetta is applied. The coding agent runs here, receives instructions from Rosetta MCP, and maintains workspace files (`docs/CONTEXT.md`, `agents/IMPLEMENTATION.md`, etc.). Maintained by developers using AI coding agents.

The instructions repo defines *how agents should behave*. The target repo is *where agents do the work*.

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│              Target Repository + IDE                    │
│  Cursor · Claude Code · VS Code · JetBrains · Codex     │
│  Windsurf · Antigravity · OpenCode                      │
│                         │                               │
│                    MCP Protocol                         │
│             (Streamable HTTP + OAuth)                   │
└────────────────────────┬────────────────────────────────┘
                         │ PULL
              ┌──────────▼──────────┐
              │    Rosetta MCP      │
              │   (ims-mcp on PyPI) │
              │                     │
              │  VFS resource paths │
              │  Bundler · Tags     │
              │  Context headers    │
              └──────────┬──────────┘
                         │ PULL
              ┌──────────▼──────────┐
              │   RAGFlow (Server)  │
              │  (document engine)  │
              │                     │
              │  parse · chunk      │
              │  embed · retrieve   │
              └──────────▲──────────┘
                         │ PUSH
              ┌──────────┴──────────┐
              │    Rosetta CLI      │
              │ (rosetta-cli PyPI)  │
              │                     │
              │  publish · parse    │
              │  verify · cleanup   │
              └──────────▲──────────┘
                         │ PUSH
              ┌──────────┴──────────┐
              │  Instructions Repo  │
              │  /instructions/r3/  │
              │                     │
              │  core/ · <org>/     │
              │  skills · agents    │
              │  workflows · rules  │
              └─────────────────────┘
```

Instructions flow up: files are published by the CLI into RAGFlow, served by Rosetta MCP to IDEs. Rosetta does not see or process your source code — by design, it only delivers knowledge and instructions.

---

## Key Principles

**Inversion of control.** Rosetta is designed to not see or process source code or project data. It exposes guardrails, common best practices, and a menu of available instructions. The coding agent selects only what it needs; Rosetta delivers just those — keeping context lean and IP protected.

---

## Environments

- **Rosetta Server (RAGFlow) prod:** `[RAGFlow production server URL]` — document engine backend, dataset management, API keys
- **Rosetta Server (RAGFlow) dev:** `[RAGFlow development server URL]` — dev instance for testing publishes
- **Rosetta HTTP MCP prod:** `[rosetta MCP production server URL]` — production MCP endpoint for end users
- **Rosetta HTTP MCP dev:** `[rosetta MCP development server URL]` — dev MCP endpoint for integration testing

> **Note:** The repo's `.mcp.json` (Claude Code contributor config) intentionally points to the **dev** MCP endpoint. Contributors developing Rosetta connect to dev so their in-progress instruction changes are reflected immediately. End users should connect to the production endpoint — see [Installation](/rosetta/docs/installation/) and [Quickstart](/rosetta/docs/quickstart/).

---

## Rosetta MCP

MCP is the **secondary** delivery mode — plugins are primary ([Rosettify](#rosettify) generates and installs them). MCP serves teams that want centrally managed, always-fresh instructions with nothing copied into the repository. Published on PyPI as `ims-mcp`.

Server internals live in **[MCP Architecture](/rosetta/docs/mcp-architecture/)** — read it when you touch any of: the `ims-mcp` server (FastMCP v3), transports (Streamable HTTP + OAuth 2.1, STDIO), authentication and policy-based authorization, VFS resource paths and auto-tagging (tag-based retrieval), the MCP tools (`get_context_instructions`, `query_instructions`, `list_instructions`) and the `rosetta://{path}` resource, document bundling (core + organization overlays, `sort_order`, `INSTRUCTION_ROOT_FILTER`), XML/flat listings, context overflow prevention (query list threshold, context headers), `mcp-files-mode.md` alias bindings, or `ACQUIRE … FROM KB` generated shells.

## Command Aliases

Command aliases are used exclusively for Rosetta resources (instructions, knowledge base). Workspace files in the target repository (`docs/CONTEXT.md`, `agents/IMPLEMENTATION.md`, etc.) are read directly from the filesystem. This boundary is intentional: when an agent sees a typed alias (`USE SKILL ...`, `READ RULE ...`), it knows it is loading Rosetta instructions through the active mode; when it reads a file, it knows it is working with target repository files.

Instructions never call MCP tools directly. Rosetta defines command aliases that work across all IDEs and coding agents. This serves three purposes:

- **Portability.** Same instructions work in Cursor, Claude Code, VS Code, JetBrains, Codex, and any MCP-compatible tool.
- **Decoupling.** Instruction content is independent of MCP API changes.
- **Authoring.** Workflows, skills, and rules reference each other through aliases, not tool calls.

Rosetta runs in three delivery modes, and the aliases resolve differently in each: **MCP** (server), **plugin** (files copied into the IDE profile/repo), and **local** (files read from `instructions/r3`). The alias grammar is the same everywhere; only the resolution mechanism changes.

| Alias | Semantics |
|---|---|
| `USE SKILL <name>` / `READ SKILL <name>` | Activate skill (loads `SKILL.md`, acts on it) / load content only |
| `READ SKILL FILE <subpath>` / `APPLY SKILL FILE <subpath>` | Load / load+execute a file of the CURRENT skill; never names a skill (isolation is grammar-enforced) |
| `USE FLOW <name>.md` / `READ FLOW <name>.md` | Invoke a whole workflow / load without executing |
| `APPLY PHASE <file>.md` | Load + fully execute the next phase body of a running workflow |
| `INVOKE SUBAGENT <name>` / `READ SUBAGENT <name>` | Spawn subagent / load its definition only |
| `READ RULE <file>.md` / `APPLY RULE <file>.md` | Load / load+execute a rule |
| `READ TEMPLATE <file>.md` | Load a template |
| `READ CONFIGURE <tool>.md` | Load an IDE/agent configure spec |
| `LIST <path>` | Enumerate immediate children of a KB folder |
| `ACQUIRE <path> FROM KB` | MCP-only, generated shells: `query_instructions(tags="<path>")` |
| `/rosetta` | Engage only the Rosetta flow |

Verbs: `READ` = load into context; `APPLY` = load + fully execute; `USE`/`INVOKE` = activate. In plugin mode the typed aliases need NO mapping — they operate natively on the plugin files; the MCP mode file (`mcp-files-mode.md`: `query_instructions`/`list_instructions` by path-based tags) and local mode file (`local-files-mode.md`: reads from `instructions/r3`) map each alias to their mechanisms. In MCP, typed loads resolve via VFS resource paths (filename, parent/filename, or grandparent/parent/filename); LIST preferred when the folder is known.

## Bootstrap Flow

The runtime footprint is minimal: `bootstrap-alwayson.md` (core policies, `reasonable`, tasks, skill engagement, core files) plus exactly one mode file. MCP and local mode files bind command aliases to their mechanisms; plugin mode needs no mapping because aliases operate natively on plugin files. Everything heavy loads on demand behind skills and workflows:

```
1. Agent starts: MCP connects / plugin or local `bootstrap-alwayson.md` loads

2. Rosetta Prep Steps (bound per mode file, once per session)
   ├── MCP:    get_context_instructions → USE SKILL load-project-context → USE SKILL hitl
   ├── Plugin: USE SKILL load-project-context → USE SKILL hitl (`bootstrap-alwayson.md` auto-loaded)
   └── Local:  read bootstrap-alwayson.md → USE SKILL load-project-context → USE SKILL hitl

3. Routing — the user chooses the entry
   ├── plain request → lean path: `bootstrap-alwayson.md`; skills auto-engage per descriptions
   ├── /rosetta <request> → rosetta skill selects and hands off to the best workflow
   └── /<workflow> <request> → that workflow directly (bypasses rosetta)

4. Agent executes the workflow
   ├── Follows phases (Prepare → Research → Plan → Act → Validate); chains phase files via APPLY PHASE
   ├── Uses USE SKILL / INVOKE SUBAGENT / READ|APPLY RULE|TEMPLATE|SKILL FILE to load progressively
   ├── Delegates to subagents, tracks progress via built-in todo tasks
   │   (LARGE work adds the EXECUTION_CONTROLLER plan, backed by `rosettify`)
   └── Applies guardrails and HITL gates throughout
```

Requests are classified only when the user invokes `/rosetta`; a plain request legitimately runs lean. In MCP mode the agent calls `get_context_instructions` exactly once per session.

---

## RAGFlow (Rosetta Server)

RAGFlow is the document storage and retrieval engine. Rosetta uses it for ingestion, parsing, embedding, and search. Not exposed to end users directly.

**Deployment:** Local via Docker Compose at `http://localhost:80` (development) or hosted instance (production).

**Processing pipeline:** Upload (upsert by deterministic UUID) → Parse (server-side) → Chunk → Embed → Index. Repeated publishes are idempotent.

**Datasets:**

| Dataset | Purpose |
|---|---|
| `aia` | Base fallback (files without a release) |
| `aia-r1` | R1 release (out of support) |
| `aia-r2` | R2 release (previous; backports only) |
| `aia-r3` | R3 release (current) |
| `project-*` | Per-repository collections in target repos (per OAuth policy) |

Instruction dataset names auto-generated from template `aia-{release}`.

All prefixes are internal only, it must not be exposed or received. This prevents cross-dataset security issues. Any user of MCP must not be aware of those existence.

**Metadata per document:** tags, domain, release, content_hash (MD5), resource_path, sort_order, frontmatter, original_path, line_count.

For RAGFlow internals, see [Rosetta Server](/rosetta/docs/rosetta-server/).

---

## Rosetta CLI

The CLI (`rosetta-cli`, published on PyPI) publishes instructions from the instructions repository into RAGFlow. It handles change detection, metadata extraction, frontmatter parsing, and auto-tagging.

**Core commands:**

| Command | What it does |
|---|---|
| `uvx rosetta-cli@latest publish instructions` | Publish changed files (incremental, MD5-based) |
| `uvx rosetta-cli@latest publish instructions --force` | Republish all files regardless of changes |
| `uvx rosetta-cli@latest publish instructions --dry-run` | Preview what would be published |
| `parse` | Trigger server-side document parsing |
| `verify` | Test connection and health |
| `list-dataset --dataset aia-r3` | List documents in a dataset |
| `cleanup-dataset --dataset aia-r3` | Delete documents from a dataset |

**Critical rule:** Always publish the entire `/instructions` folder. Never subfolders or single files (breaks tag extraction).

**Change detection:** MD5 hash of content. Only modified files publish (~77% time savings). Use `--force` to bypass.

**Auto-tagging and metadata extraction.** The CLI reads each file during publishing and extracts everything MCP needs to serve it efficiently:
- **Tags:** all folder names + filename + composite pairs/triples (`core/skills`, `r3/core/skills`, etc.). These are what the typed load aliases query against.
- **Frontmatter:** parsed from file content, saved as metadata. Exposed later in `<rosetta:file>` attributes so agents see document structure without loading full content.
- **Resource path:** `skills/planning/SKILL.md` (org prefix stripped). This is the VFS path used everywhere in MCP.
- **Domain** (`core`), **release** (`r3`), **collection** (`aia-r3`): derived from folder structure.
- **Title:** `[r3][core][skills][planning] SKILL.md` (tag-in-title format).

**Environment:** `.env.dev` (dev RAGFlow) or `.env.prod` (production). Switch with `cp .env.dev .env`.

For deployment details, see [Deployment](/rosetta/docs/deployment/).

---

## Rosettify

Local CLI/MCP utility for AI coding agents and users. Purpose: deterministic local AI coding workflow execution and single entry point for Rosetta tooling in any project. All data and IP stays local — zero network calls during operation.

Published on npm as `rosettify`. Invoked via `npx -y rosettify@latest <command> [subcommand] [args]` or as a local MCP server (`rosettify --mcp`) over stdio.

**Key points:**
- **Dual frontend.** One CLI and one MCP server backed by the same run delegates. Identical behavior in both modes.
- **Plan management** (current feature). `npx -y rosettify@latest plan <subcommand> <plan_file>` — create, track, and advance execution plans as local JSON files. Subcommands: `create`, `next`, `update_status`, `show_status`, `query`, `upsert`, `create-with-template`, `upsert-with-template`, `list-templates`.
- **Atomic write cycle with backup chain.** Every plan mutation uses a rename-as-guard cycle: rename the plan file to `<file>.bakNNN` as the atomic lock, then write the new content. The plan's `previous_version` field tracks the prior backup path. Up to 5 backups retained; bounded to 50 retries.
- **Template registry.** Two compiled-in template kinds (`create`, `upsert`) with strict bidirectional placeholder matching. Seed templates ship with the package.
- **Sequential phase enforcement.** `next` returns work from the earliest incomplete phase only; later phases are blocked until all earlier phases are done.
- **Static tool registry.** Each command is a `ToolDef` with name, description, input/output schema, CLI and MCP flags, and a typed run delegate.
- **No network calls.** All data stays local — safe for IP-sensitive projects.

---

## Rosettify Prompts

`rosettify-prompts` (npm; `src/rosettify-prompts/`) — prompt A/B/N bench against the Anthropic API. Runs N conversation variants ×`repetitions` concurrently; compares input/output/thinking tokens, cost, latency, stability. The `optimize` subcommand rewrites prompt/skill files through a 3-phase optimization pipeline (architecture + intent → execution + review mechanics → compression + pattern integration). Dev/eval tool only — not shipped to end users, not in the runtime path. Config-driven (`evals.json`); needs `ANTHROPIC_API_KEY`.

---

## Curiocity

`curiocity` (npm; `src/curiocity/`) — evals/testing harness that drives interactive coding-agent CLIs (Claude Code, Codex) through a prompt over a real PTY, reads each CLI's native on-disk transcript as the source of truth, auto-answers the agent's genuine questions via LLM, then scores every run with deterministic checks + an LLM judge and gates CI on the aggregate. Used for CI/CD regression of the Rosetta plugin and for benchmarking agents. Case-driven (`--source <dir>` of `prompt.md`/`config.json`/`qna.md`/`evaluation.md`/`src.zip` folders).

---

## Instruction Structure

Instructions live in `/instructions/r3/` in the instructions repository, using a layered folder structure.

```
/instructions/r3/
├── core/                  ← Rosetta instruction source
│   ├── skills/
│   │   └── <name>/
│   │       ├── SKILL.md
│   │       ├── README.md    ← maintainer doc (r3; never loaded at runtime)
│   │       ├── references/
│   │       └── assets/
│   ├── agents/
│   │   └── <name>.md
│   ├── workflows/
│   │   ├── <name>.md
│   │   └── <name>-<phase>.md
│   ├── rules/
│   │   └── <name>.md
│   └── commands/
│
└── <org>/                 ← Optional organization extensions (e.g., acme/)
    ├── skills/
    ├── agents/
    ├── workflows/
    ├── rules/
    └── commands/
```

**Layered customization.** Core provides the universal foundation. Organization folders extend or override it. Files at the same VFS resource path get **bundled together** by the Bundler. `INSTRUCTION_ROOT_FILTER` controls which layers are included (e.g., `CORE,GRID`).

**Component relationships.** Workflows invoke subagents. Subagents use skills. Templates live inside skills. Guardrails are primarily on-demand skills engaged through always-on actor lists and skill descriptions. See [Overview — Key Concepts](/rosetta/docs/overview/#key-concepts) for definitions.

**Naming.** Lowercase, dash-separated, globally unique filenames. Entry points: `SKILL.md` for skills, `<name>.md` for agents, workflows, and rules.

---

## Workspace Files

Rosetta initializes and maintains a standard file structure in **target repositories**. These files are how the agent tracks project context, implementation state, and execution plans. All are SRP, DRY, MECE, concise, with grep-friendly topical headers.

**Project documentation (`docs/`):**
- `CONTEXT.md` — business context, target state (no technical details, no changelog)
- `ARCHITECTURE.md` — architecture, technical requirements, modules, workspace structure
- `TODO.md` — improvements, feature requests, large TODOs
- `ASSUMPTIONS.md` — assumptions and unknowns
- `TECHSTACK.md` — tech stack of all modules
- `DEPENDENCIES.md` — dependencies of all modules
- `CODEMAP.md` — code map of the workspace
- `REQUIREMENTS/*` — original requirements with `INDEX.md` and `CHANGES.md`
- `PATTERNS/*` — coding and architectural patterns with `INDEX.md`

**Agent state (`agents/`):**
- `IMPLEMENTATION.md` — current implementation state (the only changelog)
- `MEMORY.md` — root causes of errors, actions tried, lessons learned

**Execution (`plans/`):**
- `<FEATURE>/<FEATURE>-PLAN.md` — execution plan
- `<FEATURE>/<FEATURE>-SPECS.md` — tech specs
- `<FEATURE>/*` — supporting implementation files

**Other:**
- `gain.json` — general SDLC setup and Rosetta file locations (wins in conflicts)
- `refsrc/*` — reference source code for knowledge only (excluded from SCM except `refsrc/INDEX.md`)
- `agents/TEMP/<FEATURE>` — temporary files during implementation (excluded from SCM)

The `load-project-context` prep action reads `CONTEXT.md` and `ARCHITECTURE.md` from the target repository. The agent updates `IMPLEMENTATION.md` and `MEMORY.md` as it works. See [Installation — Workspace Files Created](/rosetta/docs/installation/#workspace-files-created) for the full list of committed and excluded files.

**State management and recovery.** For medium and large tasks, workflows create plan, spec, and state files in `plans/` and `agents/`. These files persist execution state to disk, so if a failure occurs (context loss, crash, timeout), the agent or a new session can resume from the last recorded state rather than starting over.

---

## Data Flow

```
Instructions Repo ──► CLI (publish) ──► RAGFlow ──► Rosetta MCP ──► Target Repo + IDE
```

1. **Publish.** CLI reads `.md` files from instructions repo, extracts tags + frontmatter + metadata, generates deterministic UUID, upserts into dataset
2. **Index.** RAGFlow parses, chunks, embeds, indexes for full-text and semantic search
3. **Prepare.** In MCP mode, the agent calls `get_context_instructions` once, then uses `load-project-context` and `hitl`; plugin and local modes bind the same canonical `Rosetta Prep Steps` to their native mechanisms
4. **Route and load.** A plain request stays lean; `/rosetta` classifies and selects a workflow; `/<workflow>` invokes that workflow directly. Typed aliases (USE/READ/APPLY/LIST) progressively load only the selected instruction artifacts
5. **Execute.** Workflow phases, subagent delegation, and built-in todo tracking drive work. LARGE work adds the orchestrator-only EXECUTION_CONTROLLER backed by `rosettify`; guardrail skills and HITL gates apply throughout.

---

## Development

### Prerequisites

- Python 3.12 — ONE virtual environment at repo root: `venv/`. MUST be used for ALL Python code in this repo: every `src/*` package, tests, validation scripts, tools, ad-hoc runs. MUST NOT create any other venv (no `.venv`, no per-package venvs).

### Plugins (pre-release)

Instructions to `plugins` folder content must be regenerated with `venv/bin/python scripts/pre_commit.py` (which calls `npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false` internally).
Pre-commit hook is also created, but we must not rely on it.
Do not directly modify instructions in `plugins` folder instead edit original files in `instructions` and use script to copy/adapt.

Claude Code Plugin: only Anthropic `sonnet`/`opus`/`haiku` models are supported.
Codex Plugin: only OpenAI `gpt-*` models are supported.

Plugins are an alternative delivery mechanism to MCP. They deliver instructions directly to the user's profile or repository — no MCP connection or server needed. Instructions are copied at install time, so the agent works entirely from local files.

Each plugin contains core instructions: 37 skills, 10 agents, 12 workflows, and bootstrap rules. The content is identical across plugins — only the format differs per IDE.

| Plugin | IDE | Mode |
|---|---|---|
| `core-claude` | Claude Code | Plugin marketplace |
| `core-cursor` | Cursor | Plugin marketplace |
| `core-copilot` | VS Code Copilot, JetBrains Copilot | Plugin marketplace |
| `core-codex` | Codex | Plugin marketplace |
| `core-cursor-standalone` | Cursor | Direct extraction into repo (`.cursor/`) |
| `core-copilot-standalone` | VS Code Copilot, JetBrains Copilot | Direct extraction into repo (`.github/`) |

All plugins are generated from a single source tree (`instructions/r3/core/`) by the plugin generator (`npx -y rosettify-plugins@latest`). The generator's `--release` defaults to `r3`, matching the ims-mcp `DEFAULT_VERSION`. Each release descriptor also carries a hook posture: r2 ships SessionStart bootstrap only, while r3 enables the deterministic advisory hooks by default — overridable via `--deterministic-hooks`. The generator builds main plugins then derives the standalone variants from them. The generator copies core instructions and adapts them for the target coding agent:

- **Model rewriting** — selects the first model from the frontmatter `model:` comma-separated list and normalizes it to the platform's format. Cursor normalizes to short IDs (e.g. `claude-sonnet-5`, `gpt-5.4`); Copilot to display names (e.g. `Claude Sonnet 5`, `GPT-5.4`); Claude Code to full model IDs (`claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5`).
- **Agent file format** — converts agent markdown to the IDE's expected format (`.agent.md` for Copilot, `.toml` for Codex)
- **Directory layout** — restructures output to match IDE conventions (`.agents/` and `.codex/` for Codex, runtime configs at root for Copilot). Cursor uses `commands/` instead of `workflows/` for workflow files; Copilot uses `prompts/` with files renamed from `*.md` to `*.prompt.md`. Content references are rewritten using precise full-path replacement (`workflows/coding-flow.md` → `commands/coding-flow.md` / `prompts/coding-flow.prompt.md`) to avoid accidental partial-word matches.
- **Index generation** — produces `rules/INDEX.md` and `workflows/INDEX.md` (or `commands/INDEX.md` for Cursor, `prompts/INDEX.md` for Copilot) listings. Only files with `tags: ["workflow"]` appear in the workflow index; phase files are excluded. All three folder names use the heading `# Rosetta Workflows Index`.
- **Template processing** — `.tmpl` files render to a sibling file (same path, `.tmpl` suffix removed) with platform placeholders substituted. Cursor and Copilot each ship **two** templates: a plugin-marketplace form (paths resolve under plugin install dir) and a standalone form (paths resolve from a user's project root). Both forms render into the main plugin tree; the standalone generator picks the right one for extraction.
- **Copilot session locking** — Copilot has no native hook deduplication, so the generated hooks include a file-based lock ensuring each bootstrap entry fires exactly once per session. Other platforms use IDE-native mechanisms (Claude Code: `"once": true`; Codex and Cursor: built-in deduplication).

Each standard plugin has a preserved config folder (`.claude-plugin/`, `.cursor-plugin/`, `.github/`, `.codex-plugin/`) holding the IDE manifest (`plugin.json`) and static configs. `hooks/` is also preserved for Claude, Cursor, and Copilot (carries the plugin-form `hooks.json.tmpl`); Cursor additionally preserves a root-level `hooks.json.tmpl` (standalone-form). Everything outside preserved paths is wiped and regenerated per sync. Bootstrap payloads are embedded in Claude/Codex hook templates; Cursor and Copilot rely on rules and instructions instead.

**Standalone plugins** (`core-cursor-standalone`, `core-copilot-standalone`) are a second-pass derivative built from the already-synced main plugins (including their hook bundles) and placed entirely under the IDE's expected subfolder (`.cursor/` or `.github/`). Wiped and recreated per sync. Each IDE expects hooks at a different relative path, so the templates and cleanup differ:

| | Cursor standalone | Copilot standalone |
|---|---|---|
| Standalone hooks.json path | `.cursor/hooks.json` (top) | `.github/hooks/hooks.json` (nested) |
| Standalone-form template lives at | `<plugin>/hooks.json.tmpl` (root) | `<plugin>/hooks/hooks.json.tmpl` |
| Bundles after extraction | `.cursor/hooks/*.js` | `.github/hooks/*.js` |
| Path style in hooks.json | `node .cursor/hooks/<file>.js` | `node ".github/hooks/<file>.js"` |
| Bootstrap delivery | Native Cursor rules (`rules/*.mdc`) | Auto-loaded `instructions/*.instructions.md` |

When the source plugin contains a directory whose name matches the standalone's `subfolder` (e.g. cursor's bulk-copy would otherwise produce `.cursor/.cursor/`), the generator merges its contents directly into the subfolder to avoid nesting. Each standalone also runs IDE-specific transforms: Cursor injects `commands/INDEX.md` into `rules/plugin-files-mode.mdc`; Copilot moves `rules/bootstrap-*.md` and `rules/plugin-files-mode.md` to `instructions/*.instructions.md` (auto-loaded via `applyTo: "**"`), renames `commands/` → `prompts/` and `*.md` → `*.prompt.md`, rewrites cross-references by exact-string pass, and strips the plugin-marketplace `hooks.json`/`.mcp.json`/`templates/`. `plugin.json` for each standalone is regenerated with the source plugin's version.

### Hooks Runtime

Hooks are lightweight scripts that run in response to IDE tool calls (PostToolUse, PreToolUse). They inject advisory context into the AI's context window — nothing is displayed directly to the user.

**Hook contracts — source of truth:** `docs/hooks/<ide>.md` (`claude-code`/`codex`/`cursor`/`copilot`/`windsurf`) — empirically verified per-IDE I/O, exit codes, matchers. Adapters reconcile TO these specs, never the reverse.

Source lives in `src/hooks/` and is compiled per-IDE before sync:

| Folder | Contents |
|---|---|
| `src/hooks/src/` | TypeScript source — adapter, lock, debug-log, hook implementations |
| `src/hooks/tests/` | Vitest unit tests + fixtures, and a log-driven E2E suite (`tests/e2e/`) that replays REAL captured wire payloads (`docs/hooks/<ide>-logs.txt`) through the full pipeline (no adapter mocks) to catch canonical-mapping regressions |
| `src/hooks/scripts/` | esbuild bundler (`build-bundles.mjs`) |
| `src/hooks/dist/bundles/` | Compiled per-IDE bundles (generated, not committed) |

Each hook is bundled separately per IDE via esbuild so each bundle contains only its adapter code. To add a new hook: create the `.ts` source in `src/hooks/src/hooks/`, then add its filename to the `HOOK_SOURCES` array in `src/hooks/scripts/build-bundles.mjs`.

**Active hooks (the five bundles available to every plugin and standalone when deterministic hooks are enabled; the shipped plugins are generated with `--deterministic-hooks false`, so they carry the r3 content with SessionStart bootstrap only):**

| Hook | Event | Purpose |
|---|---|---|
| `dangerous-actions.js` | PreToolUse | Two-tier deny on dangerous shell/edit/MCP patterns; `# Rosetta-AI-reviewed` marker allows retry on `reconsider` policy; `hard-deny` patterns (e.g. `curl \| sh`) require human review |
| `loose-files.js` | PostToolUse (Write) | Nudges agent when `.py`/`.js` files are created without a module marker (`__init__.py` / `package.json`) |
| `md-file-advisory.js` | PostToolUse (Write\|Edit) | Advises on markdown formatting/placement after `.md` edits |
| `lint-format-advisory.js` | PostToolUse (Write\|Edit) | Suggests a syntax/type/lint/format check step after code edits |
| `codemap-refresh.js` | PostToolUse (Write\|Edit) | Refreshes the active code-map backend when source files change. Detects GitNexus (`.gitnexus/` marker, runs `npx -y gitnexus@latest analyze --force`) and Graphify (`graphify-out/graph.json` marker, runs `graphify update .`); no-op when neither is installed. When both are present, each backend gets an independent debounced refresh. |

**`hooks.json` locations and forms per plugin variant** (each form references the bundles using paths appropriate to its runtime):

| Plugin/standalone | hooks.json read by IDE at | Form | Path style |
|---|---|---|---|
| `core-claude` (marketplace) | `<plugin>/hooks/hooks.json` (referenced from `plugin.json`) | plugin-form | `node hooks/<file>.js` |
| `core-cursor` (marketplace) | `<plugin>/hooks/hooks.json` (referenced from `plugin.json`) | plugin-form | `node hooks/<file>.js` |
| `core-copilot` (marketplace) | `<plugin>/hooks.json` (root, copied from `.github/plugin/hooks.json` at sync time) | plugin-form | env-var lookup to plugin install root |
| `core-codex` (marketplace) | `<plugin>/.codex-plugin/hooks.json` (also mirrored to `<plugin>/.codex/hooks.json` at sync time) | plugin-form | `node <abs-path>/hooks/<file>.js` via shell lookup |
| `core-cursor-standalone` | `.cursor/hooks.json` (top of extracted subfolder) | standalone-form | `node .cursor/hooks/<file>.js` |
| `core-copilot-standalone` | `.github/hooks/hooks.json` (nested inside extracted subfolder) | standalone-form | `node ".github/hooks/<file>.js"` |

Cursor and Copilot are the only plugins that need two distinct templates because they have distinct standalone distributions. Templates: cursor — `hooks/hooks.json.tmpl` (plugin) + `hooks.json.tmpl` at root (standalone); copilot — `.github/plugin/hooks.json.tmpl` (plugin) + `hooks/hooks.json.tmpl` (standalone). Both are rendered during sync; the standalone generator's bulk-copy lands each at the right path inside the standalone subfolder.

- **IDE normalization** — `src/adapter.ts` detects the IDE (env signature first, then stdin shape: codex > cursor > claude-code > windsurf > copilot) and normalizes to a canonical `NormalizedInput`, which MUST be fully mapped: a field is empty only when the value is genuinely absent from the raw input AND not derivable from the event name, another field, or the IDE's documented tool/event vocabulary
- **Per-IDE output** — each adapter's `formatOutput` converts canonical output back to the IDE's expected JSON schema

`scripts/pre_commit.py` builds and tests hook bundles, then runs `npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false`, which syncs bundles into each main plugin's hooks directory (`plugins/core-{claude,cursor,copilot}/hooks/`, `plugins/core-codex/.codex/hooks/`) before deriving the standalones. Do not edit those bundle locations directly — edit `src/hooks/src/` and re-run the script.

### Publishing Instructions

Publish instructions to remote IMS server:

```bash
cp .env.dev .env
uvx rosetta-cli@latest publish instructions
```

---

## Pipelines

We use `.github/workflows` pipelines to build and release: MCP PyPi package, Docker Image, Publish Instructions, Publish website.
Triggers on push to `main` or manual dispatch.

Website: builds the Jekyll website from `docs/web/`, deploys to GitHub Pages.

**Plugin distribution (pre-release).** The publish-instructions pipeline zips each plugin folder and attaches the archives to a GitHub Release alongside `instructions.zip`. See [Plugins](#plugins-pre-release) for how plugin files are generated.

---

## Extension Points

Where contributors add or change things:

- **New skill:** Add `instructions/r3/core/skills/<name>/SKILL.md` (or under an org folder; backport to `r2` if stable)
- **New agent:** Add `instructions/r3/core/agents/<name>.md`
- **New workflow:** Add `instructions/r3/core/workflows/<name>.md` (and phase files)
- **New rule:** Add `instructions/r3/core/rules/<name>.md`
- **Organization layer:** Create `instructions/r3/<org>/` with the same type structure
- **MCP tools:** Modify `src/ims-mcp-server/ims_mcp/server.py`
- **Tool prompts:** Modify `src/ims-mcp-server/ims_mcp/tool_prompts.py`
- **CLI commands:** Add to `src/rosetta-cli/rosetta_cli/commands/`
- **Website:** Edit pages in `docs/web/`

After adding or changing instructions, publish with the CLI to make them available via MCP. See the [Developer Guide — Where to Change What](/rosetta/docs/developer-guide/#where-to-change-what) for the validation steps per change type.

---

## Tradeoffs

- **Release-based versioning over branch-based.** Releases (r2, r3) coexist in the same repo. Enables A/B testing and rollback, but folder structure carries the version.
- **RAGFlow as the knowledge layer.** Chunking, embedding, and search out of the box. Adds a deployment dependency (Docker or hosted). STDIO transport partially mitigates this.
- **Tags as primary access, not search.** Loading by tag is faster and more precise than keyword search. But requires the auto-tagging scheme to produce useful tags from folder structure.
- **XML bundling with threshold.** Structured `<rosetta:file>` output with metadata attributes. The threshold of 5 prevents context overflow by switching to listing mode. Requires agents to make follow-up requests for specific files. Plus `<rosetta:folder>`
- **Command aliases over direct tool calls.** Portable across IDEs, decoupled from MCP API changes. An indirection layer contributors must learn.
- **Full-folder publishing only.** Prevents broken metadata extraction. Change detection keeps incremental publishes fast.
- **Layered customization over multi-tenancy.** Org folders extend core, not replace it. Requires unique filenames across the tree.
- **Subagent/Skills/Commands Shells.** Create small proxies with proper frontmatters. Proxies use raw `ACQUIRE FROM KB` commands to load actual content (copy-paste shells, MCP mode only). Coding agents expect Subagents/Skills/Commands in specific format in specific locations in the repository. Copying to repo make them stale. Not copying - native features of coding agents don't work. Shells resolve that. Plugins resolve this issue as well, but it only works in claude code.
- **Single API key as dataset owner.** `ROSETTA_API_KEY` must belong to the owner of all datasets. Simplifies access control (one key sees everything), but that key is a high-value secret. Rotate it through your secrets manager.
- **Server-controlled VERSION.** `VERSION` is not set by clients. The server decides which release (r2, r3) to serve. Enables managed rollouts and prevents version drift across teams.
- **Streamable HTTP as default transport.** Stateful connections allow server-to-IDE callbacks and richer interaction. Requires sticky sessions when scaling horizontally. STDIO remains the escape hatch for air-gapped or single-user setups.
- **OAuthProxy over direct provider integration.** Bridges any OAuth provider to MCP's Dynamic Client Registration expectation. Adds a layer, but avoids coupling to a specific identity provider. `offline_access` scope enables authenticate-once behavior via refresh tokens.
- **FERNET_KEY for token encryption at rest.** OAuth tokens in Redis are encrypted, not stored plain. Adds a required secret for production, but prevents token theft if Redis is compromised.
- **Default model provisioning in RAGFlow.** Model API keys configured server-side via `local.service_conf.yaml`. Users get working models out of the box without individual setup. Centralizes API key management but means the server holds all provider credentials.

---

## Related Docs

- [MCP Architecture](/rosetta/docs/mcp-architecture/) — `ims-mcp` server internals: transports, authentication, VFS/tags, tools, bundler, listings, overflow prevention
- [Developer Guide](/rosetta/docs/developer-guide/) — repo navigation, where to change what
- [Contributing](/rosetta/docs/contributing/) — fastest path to a merged PR
- [Usage Guide](/rosetta/docs/usage-guide/) — how to use Rosetta flows
- [Deployment](/rosetta/docs/deployment/) — RAGFlow, MCP, Helm deployment
- [Troubleshooting](/rosetta/docs/troubleshooting/) — symptom-first diagnosis
