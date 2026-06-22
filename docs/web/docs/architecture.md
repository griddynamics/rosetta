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
              │  /instructions/r2/  │
              │                     │
              │  core/ · <org>/     │
              │  skills · agents    │
              │  workflows · rules  │
              └─────────────────────┘
```

Instructions flow up: files are published by the CLI into RAGFlow, served by Rosetta MCP to IDEs. Rosetta does not see or process your source code — by design, it only delivers knowledge and instructions.

---

## Environments

- **Rosetta Server (RAGFlow) prod:** `[RAGFlow production server URL]` — document engine backend, dataset management, API keys
- **Rosetta Server (RAGFlow) dev:** `[RAGFlow production server URL]` — dev instance for testing publishes
- **Rosetta HTTP MCP prod:** `[rosetta MCP production server URL]` — production MCP endpoint for end users
- **Rosetta HTTP MCP dev:** `[rosetta MCP development server URL]` — dev MCP endpoint for integration testing

---

## Rosetta MCP

The MCP server is the guiding layer between IDEs and the knowledge base. It exposes guardrails and common best practices, and provides a structured menu of available instructions; the coding agent selects what it needs, and Rosetta delivers only those — preventing context overload. Published on PyPI as `ims-mcp`. Built on [FastMCP v3](https://gofastmcp.com/) (latest stable) with [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy) for authentication and [RAGFlow](https://ragflow.io/) as the document engine backend. Speaks in VFS resource paths, adds context headers describing what information means and how to use it, and controls context size automatically.

**Transport options:**
- **Streamable HTTP with OAuth** (default). Stateful: the server holds session state and can issue callbacks to the IDE. Zero local dependencies. Cursor, Claude Code, and Codex connect directly. When scaling to multiple replicas, sticky sessions are required (see [Deployment](/rosetta/docs/deployment/)).
- **STDIO** for air-gapped environments. Runs `uvx ims-mcp` locally with API key auth.

**Authentication:** HTTP uses OAuth 2.1 via [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy) (supports any provider: Keycloak, GitHub, Google, Azure). Cached token introspection. STDIO uses `ROSETTA_API_KEY`. Policy-based authorization: `aia-*` read-only, `project-*` configurable.

### VFS and Tags

Everything MCP works with is VFS (virtual file system) resource paths. The CLI strips instruction root prefixes during publishing, so `core/skills/planning/SKILL.md` becomes `skills/planning/SKILL.md`. Files at the same resource path get bundled together.

**Tags are the primary access mechanism.** `ACQUIRE <path> FROM KB` queries by tags, which provides the most direct and fastest access. The CLI's auto-tagging was designed specifically for this: every folder name, filename, and composite pair/triple becomes a tag, so agents can request exactly what they need. Keyword search via `SEARCH` is the fallback for discovery.

### MCP Tools

Eight tools and one resource exposed to agents:

| Tool | Purpose |
|---|---|
| `get_context_instructions` | Bootstrap: load all rules and guardrails bundled (prep step 1 to 3) |
| `query_instructions` | Fetch instruction docs by tags (primary) or keyword search (fallback) |
| `list_instructions` | Browse the VFS hierarchy (flat listing of immediate children) |
| `query_project_context` *(opt-in)* | Search project-specific docs in a target repo dataset |
| `store_project_context` *(opt-in)* | Create or update a document in a project dataset |
| `discover_projects` *(opt-in)* | List readable project datasets |
| `plan_manager` *(opt-in)* | Manage execution plans with phases, steps, dependencies, status. Has a `help` command for plan creators (subagents don't need it). Stores plan in REDIS. |
| `submit_feedback` | Auto-submit structured feedback on agent sessions |

**Resource:** `rosetta://{path}` reads bundled instruction documents by VFS resource path.

### Bundler

The Bundler merges multiple documents at the same VFS resource path into a single XML response. When an agent ACQUIREs a skill, core and organization files at that path are concatenated into one payload:

```xml
<rosetta:file id="..." dataset="..." path="skills/planning/SKILL.md" name="..." tags="..." frontmatter="...">
  [document content from core]
</rosetta:file>
<rosetta:file id="..." dataset="..." path="skills/planning/SKILL.md" name="..." tags="..." frontmatter="...">
  [document content from organization overlay]
</rosetta:file>
```

Documents sorted by `sort_order` (default: 1000000), then by name. `INSTRUCTION_ROOT_FILTER` controls which layers are included (e.g., `CORE,GRID`).

### Listing

Listing shows what exists in the VFS without loading content. Implemented by `list_instructions` to browse the instruction hierarchy. Two formats:

**XML format** (default) includes metadata attributes:
```xml
<rosetta:folder dataset="..." path="skills/" />
<rosetta:folder dataset="..." path="rules/" />
<rosetta:file id="..." path="skills/planning/SKILL.md" name="..." tag="skills/planning/SKILL.md" frontmatter="..." />
```

**Flat format** returns resource paths only:
```
skills/planning/SKILL.md
skills/coding/SKILL.md
rules/guardrails.md
```

A full instruction suite listing is ~400 tokens. Frontmatter attributes (extracted by CLI during publishing) let agents understand document purpose from the listing alone, without follow-up reads.

### Context Overflow Prevention

MCP manages context size through two mechanisms:

- **Query list threshold (5).** When `query_instructions` matches 5 or fewer documents, MCP returns full bundled content. When more than 5 match, it returns a listing instead, with a header guiding the agent to ACQUIRE specific files by their unique tags. This keeps responses bounded regardless of knowledge base size.
- **Context headers.** Every MCP response includes a descriptive header explaining what the returned information is and how to act on it.

### Command Aliases

Command aliases are used exclusively for Rosetta MCP resources (instructions, knowledge base, project datasets). Workspace files in the target repository (`docs/CONTEXT.md`, `agents/IMPLEMENTATION.md`, etc.) are read directly from the filesystem. This boundary is intentional: when an agent sees `ACQUIRE ... FROM KB`, it knows it is calling Rosetta MCP; when it reads a file, it knows it is working with target repository files.

Instructions never call MCP tools directly. Rosetta defines command aliases that work across all IDEs and coding agents. This serves three purposes:

- **Portability.** Same instructions work in Cursor, Claude Code, VS Code, JetBrains, Codex, and any MCP-compatible tool.
- **Decoupling.** Instruction content is independent of MCP API changes.
- **Authoring.** Workflows, skills, and rules reference each other through aliases, not tool calls.

| Alias | Maps to |
|---|---|
| `GET PREP STEPS` | `get_context_instructions()` |
| `ACQUIRE <path> FROM KB` | `query_instructions(tags="<path>")` |
| `SEARCH <keywords> IN KB` | `query_instructions(query="<keywords>")` |
| `LIST <folder> IN KB` | `list_instructions(full_path_from_root="<folder>")` |
| `USE SKILL <name>` | Load skill (fetches `SKILL.md` internally) |
| `INVOKE SUBAGENT <name>` | Call subagent (fetches `agents/<name>.md`) |
| `USE FLOW <name>` | Use workflow or command |
| `ACQUIRE <file> ABOUT <project>` | `query_project_context(repository_name, tags)` |
| `QUERY <keywords> IN <project>` | `query_project_context(repository_name, query)` |
| `STORE <file> TO <project>` | `store_project_context(repository_name, ...)` |
| `/rosetta` | Engage only the Rosetta flow |

ACQUIRE expects a VFS resource path: filename, parent/filename, or grandparent/parent/filename. LIST preferred over SEARCH when the folder is known.

### Bootstrap Flow

One `get_context_instructions` call returns all bootstrap rules bundled (core policy, execution policy, guardrails, HITL, rosetta files description). Three prep steps guide the agent on what to do next:

```
1. Agent connects to Rosetta MCP

2. Server + tool instructions enforce: "call get_context_instructions first"

3. Prep Step 1 — get_context_instructions
   └── Returns bundled bootstrap-* rules: core policy, execution policy,
       guardrails, HITL questioning, workspace file definitions

4. Prep Step 2 — Load project context (direct file reads from target repository)
   └── Read CONTEXT.md, ARCHITECTURE.md; grep headers of other workspace files

5. Prep Step 3 — Classify and route
   └── LIST workflows IN KB; ACQUIRE matching workflows
       Agent now has: bootstrap rules + project context + workflow instructions

6. Agent executes the workflow
   ├── Follows phases (Prepare → Research → Plan → Act → Validate)
   ├── Uses ACQUIRE/USE SKILL/INVOKE SUBAGENT to load instructions progressively
   ├── Delegates to subagents, uses plan_manager for tracking
   └── Applies guardrails and HITL gates throughout
```

All three prep steps are mandatory regardless of task size. The agent calls `get_context_instructions` exactly once per session.

**Key environment variables:** `ROSETTA_SERVER_URL`, `ROSETTA_API_KEY`, `INSTRUCTION_ROOT_FILTER`, `REDIS_URL`

For MCP setup across all IDEs, see [Get Started](https://griddynamics.github.io/rosetta/#quick-start).

---

## RAGFlow (Rosetta Server)

RAGFlow is the document storage and retrieval engine. Rosetta uses it for ingestion, parsing, embedding, and search. Not exposed to end users directly.

**Deployment:** Local via Docker Compose at `http://localhost:80` (development) or hosted instance (production).

**Processing pipeline:** Upload (upsert by deterministic UUID) → Parse (server-side) → Chunk → Embed → Index. Repeated publishes are idempotent.

**Datasets:**

| Dataset | Purpose |
|---|---|
| `aia` | Base fallback (files without a release) |
| `aia-r1` | R1 release (stable) |
| `aia-r2` | R2 release (current) |
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
| `list-dataset --dataset aia-r2` | List documents in a dataset |
| `cleanup-dataset --dataset aia-r2` | Delete documents from a dataset |

**Critical rule:** Always publish the entire `/instructions` folder. Never subfolders or single files (breaks tag extraction).

**Change detection:** MD5 hash of content. Only modified files publish (~77% time savings). Use `--force` to bypass.

**Auto-tagging and metadata extraction.** The CLI reads each file during publishing and extracts everything MCP needs to serve it efficiently:
- **Tags:** all folder names + filename + composite pairs/triples (`core/skills`, `r2/core/skills`, etc.). These are what `ACQUIRE FROM KB` queries against.
- **Frontmatter:** parsed from file content, saved as metadata. Exposed later in `<rosetta:file>` attributes so agents see document structure without loading full content.
- **Resource path:** `skills/planning/SKILL.md` (org prefix stripped). This is the VFS path used everywhere in MCP.
- **Domain** (`core`), **release** (`r2`), **collection** (`aia-r2`): derived from folder structure.
- **Title:** `[r2][core][skills][planning] SKILL.md` (tag-in-title format).

**Environment:** `.env.dev` (dev RAGFlow) or `.env.prod` (production). Switch with `cp .env.dev .env`.

For deployment details, see [Deployment](/rosetta/docs/deployment/).

---

## Instruction Structure

Instructions live in `/instructions/r2/` in the instructions repository, using a layered folder structure.

```
/instructions/r2/
├── core/                  ← Rosetta instruction source
│   ├── skills/
│   │   └── <name>/
│   │       ├── SKILL.md
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

**Component relationships.** Workflows invoke subagents. Subagents use skills. All reference rules. Templates live inside skills. Guardrails are rules. See [Overview — Key Concepts](/rosetta/docs/overview/#key-concepts) for definitions.

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

Prep step 2 loads `CONTEXT.md` and `ARCHITECTURE.md` from the target repository. The agent updates `IMPLEMENTATION.md` and `MEMORY.md` as it works. See [Installation — Workspace Files Created](/rosetta/docs/installation/#workspace-files-created) for the full list of committed and excluded files.

**State management and recovery.** For medium and large tasks, workflows create plan, spec, and state files in `plans/` and `agents/`. These files persist execution state to disk, so if a failure occurs (context loss, crash, timeout), the agent or a new session can resume from the last recorded state rather than starting over.

---

## Data Flow

```
Instructions Repo ──► CLI (publish) ──► RAGFlow ──► Rosetta MCP ──► Target Repo + IDE
```

1. **Publish.** CLI reads `.md` files from instructions repo, extracts tags + frontmatter + metadata, generates deterministic UUID, upserts into dataset
2. **Index.** RAGFlow parses, chunks, embeds, indexes for full-text and semantic search
3. **Bootstrap.** Agent calls `get_context_instructions` via MCP (prep step 1), reads workspace files directly from the target repo (step 2), classifies request via MCP (step 3)
4. **Load.** Agent uses ACQUIRE/SEARCH/LIST aliases. MCP queries by tags, bundles matching VFS paths into XML with context headers. Progressive disclosure: only what the workflow needs
5. **Execute.** Workflow phases (Prepare → Research → Plan → Act → Validate), subagent delegation, plan_manager tracking, guardrails and HITL gates.

---

## Development

### Prerequisites

- Python 3.12 (virtual environment at repo root: `venv/`)

### Plugins (pre-release)

Instructions to `plugins` folder content must be regenerated with `venv/bin/python scripts/pre_commit.py` (which calls `npx rosettify-plugins@latest` internally).
Pre-commit hook is also created, but we must not rely on it.
Do not directly modify instructions in `plugins` folder instead edit original files in `instructions` and use script to copy/adapt.

Claude Code Plugin: only Anthropic `sonnet`/`opus`/`haiku` models are supported.
Codex Plugin: only OpenAI `gpt-*` models are supported.

Plugins are an alternative delivery mechanism to MCP. They deliver instructions directly to the user's profile or repository — no MCP connection or server needed. Instructions are copied at install time, so the agent works entirely from local files.

Each plugin contains core instructions: 35 skills, 7 agents, 12 workflows, and bootstrap rules. The content is identical across plugins — only the format differs per IDE.

| Plugin | IDE |
|---|---|
| `core-claude` | Claude Code |
| `core-cursor` | Cursor |
| `core-copilot` | VS Code Copilot, JetBrains Copilot |
| `core-codex` | Codex |

All four are generated from a single source tree (`instructions/r2/core/`) by the plugin generator (`npx rosettify-plugins@latest`). The generator copies core instructions and adapts them for the target coding agent:

- **Model rewriting** — normalizes frontmatter `model:` to the platform's format
- **Agent file format** — converts agent markdown to the IDE's expected format (`.agent.md` for Copilot, `.toml` for Codex)
- **Directory layout** — restructures output to match IDE conventions (`.agents/` and `.codex/` for Codex, runtime configs at root for Copilot)
- **Index generation** — produces `rules/INDEX.md` and `workflows/INDEX.md` listings
- **Template processing** — the generator supports `.tmpl` files inside preserved config folders: it substitutes platform-specific placeholders and writes the rendered output alongside the template (same path, `.tmpl` suffix removed). Currently used for `hooks.json`, which embeds the bootstrap payload at generation time and cannot be static. The mechanism is general-purpose and can be applied to any config that requires generated content.
- **Copilot session locking** — Copilot has no native hook deduplication, so the generated hooks include a file-based lock ensuring each bootstrap entry fires exactly once per session. Other platforms use IDE-native mechanisms (Claude Code: `"once": true`; Codex and Cursor: built-in deduplication).

Each plugin has a preserved config folder (`.claude-plugin/`, `.cursor-plugin/`, `.github/`, `.codex-plugin/`) containing the IDE-specific manifest (`plugin.json`), the `hooks.json.tmpl` template, and any static configs. Everything outside that folder is generated — wiped and regenerated on each sync. `hooks.json` is the rendered output of the template and is fully regenerated on every sync, not preserved as static content. Cursor does not need hooks to load bootstrap, because rules are supported (template placeholder still must be generated!)

### Hooks Runtime

Hooks are lightweight scripts that run in response to IDE tool calls (PostToolUse, PreToolUse). They inject advisory context into the AI's context window — nothing is displayed directly to the user.

Source lives in `hooks/` and is compiled per-IDE before sync:

| Folder | Contents |
|---|---|
| `src/hooks/src/` | TypeScript source — adapter, lock, debug-log, loose-files hook |
| `src/hooks/tests/` | `node:test` unit and integration tests + fixtures |
| `src/hooks/scripts/` | esbuild bundler (`build-bundles.mjs`) |
| `src/hooks/dist/bundles/` | Compiled per-IDE bundles (generated, not committed) |

Each hook is bundled separately per IDE via esbuild so each bundle contains only its adapter code.

- **IDE normalization** — `src/adapter.ts` detects the IDE from stdin shape and normalizes to a canonical `NormalizedInput`; detection order: codex > cursor > claude-code > windsurf > copilot
- **Per-IDE output** — each adapter's `formatOutput` converts canonical output back to the IDE's expected JSON schema
- **Dedup guard** — Copilot CLI has a known bug where PostToolUse fires twice per call; `src/lock.ts` suppresses the duplicate and is active only in the Copilot bundle

Hooks are distributed by `scripts/pre_commit.py`, which builds, tests, then runs `npx rosettify-plugins@latest` to sync bundles into `plugins/core-*/hooks/`. Do not edit `plugins/core-*/hooks/` directly — edit source in `src/hooks/src/` and re-run the script.

### Publishing Instructions

Publish instructions to remote IMS server:

```bash
cp src/rosetta-cli/.env.dev .env
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

- **Release-based versioning over branch-based.** Releases (r1, r2) coexist in the same repo. Enables A/B testing and rollback, but folder structure carries the version.
- **RAGFlow as the knowledge layer.** Chunking, embedding, and search out of the box. Adds a deployment dependency (Docker or hosted). STDIO transport partially mitigates this.
- **Tags as primary access, not search.** ACQUIRE by tag is faster and more precise than keyword search. But requires the auto-tagging scheme to produce useful tags from folder structure.
- **XML bundling with threshold.** Structured `<rosetta:file>` output with metadata attributes. The threshold of 5 prevents context overflow by switching to listing mode. Requires agents to make follow-up requests for specific files. Plus `<rosetta:folder>`
- **Command aliases over direct tool calls.** Portable across IDEs, decoupled from MCP API changes. An indirection layer contributors must learn.
- **Full-folder publishing only.** Prevents broken metadata extraction. Change detection keeps incremental publishes fast.
- **Layered customization over multi-tenancy.** Org folders extend core, not replace it. Requires unique filenames across the tree.
- **Subagent/Skills/Commands Shells.** Create small proxies with proper frontmatters. Proxies use `ACQUIRE FROM KB` commands to load actual content. Coding agents expect Subagents/Skills/Commands in specific format in specific locations in the repository. Copying to repo make them stale. Not copying - native features of coding agents don't work. Shells resolve that. Plugins resolve this issue as well, but it only works in claude code.
- **Single API key as dataset owner.** `ROSETTA_API_KEY` must belong to the owner of all datasets. Simplifies access control (one key sees everything), but that key is a high-value secret. Rotate it through your secrets manager.
- **Server-controlled VERSION.** `VERSION` is not set by clients. The server decides which release (r1, r2) to serve. Enables managed rollouts and prevents version drift across teams.
- **Streamable HTTP as default transport.** Stateful connections allow server-to-IDE callbacks and richer interaction. Requires sticky sessions when scaling horizontally. STDIO remains the escape hatch for air-gapped or single-user setups.
- **OAuthProxy over direct provider integration.** Bridges any OAuth provider to MCP's Dynamic Client Registration expectation. Adds a layer, but avoids coupling to a specific identity provider. `offline_access` scope enables authenticate-once behavior via refresh tokens.
- **FERNET_KEY for token encryption at rest.** OAuth tokens in Redis are encrypted, not stored plain. Adds a required secret for production, but prevents token theft if Redis is compromised.
- **Default model provisioning in RAGFlow.** Model API keys configured server-side via `local.service_conf.yaml`. Users get working models out of the box without individual setup. Centralizes API key management but means the server holds all provider credentials.

---

## Related Docs

- [Developer Guide](/rosetta/docs/developer-guide/) — repo navigation, where to change what
- [Contributing](/rosetta/docs/contributing/) — fastest path to a merged PR
- [Usage Guide](/rosetta/docs/usage-guide/) — how to use Rosetta flows
- [Deployment](/rosetta/docs/deployment/) — RAGFlow, MCP, Helm deployment
- [Troubleshooting](/rosetta/docs/troubleshooting/) — symptom-first diagnosis
