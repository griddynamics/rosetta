# Architecture

**Who is this for?** Contributors who need to understand how Rosetta works before changing it.

**When should I read this?** After [OVERVIEW.md](../OVERVIEW.md). Before touching MCP tools, CLI publishing, instruction content, or folder structure.

For terminology (workflow, skill, rule, subagent, bootstrap, etc.), see [OVERVIEW.md — Key Concepts](../OVERVIEW.md#key-concepts).

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
│                         │                               │
│                    MCP Protocol                         │
│                   (HTTP + OAuth)                        │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │    Rosetta MCP      │
              │   (ims-mcp on PyPI) │
              │                     │
              │  VFS resource paths │
              │  Bundler · Tags     │
              │  Context headers    │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   RAGFlow (Server)  │
              │  (document engine)  │
              │                     │
              │  parse · chunk      │
              │  embed · retrieve   │
              └──────────▲──────────┘
                         │
              ┌──────────┴──────────┐
              │    Rosetta CLI      │
              │   (tools/ims_cli)   │
              │                     │
              │  publish · parse    │
              │  verify · cleanup   │
              └──────────▲──────────┘
                         │
              ┌──────────┴──────────┐
              │  Instructions Repo  │
              │  /instructions/r2/  │
              │                     │
              │  core/ · <org>/     │
              │  skills · agents    │
              │  workflows · rules  │
              └─────────────────────┘
```

Instructions flow up: files are published by the CLI into RAGFlow, served by Rosetta MCP to IDEs. The coding agent never sees your source code. Rosetta only delivers knowledge and instructions.

---

## Rosetta MCP

The MCP server is the interface between IDEs and the knowledge base. Published on PyPI as `ims-mcp`. Designed to be close to AI agent logic: it speaks in VFS resource paths, adds context headers describing what information means and how to use it, and controls context size automatically.

**Endpoint:** `https://rosetta.evergreen.gcp.griddynamics.net/mcp`

**Transport options:**
- **HTTP with OAuth** (default). Zero local dependencies. Cursor, Claude Code, and Codex connect directly.
- **STDIO** for air-gapped environments. Runs `uvx ims-mcp` locally with API key auth.

**Authentication:** HTTP uses OAuth via Keycloak (cached token introspection). STDIO uses `ROSETTA_API_KEY`. Policy-based authorization: `aia-*` read-only, `project-*` configurable.

### VFS and Tags

Everything MCP works with is VFS (virtual file system) resource paths. The CLI strips `core/` and `grid/` prefixes during publishing, so `core/skills/planning/SKILL.md` and `grid/skills/planning/SKILL.md` both become `skills/planning/SKILL.md`. Files at the same resource path get bundled together.

**Tags are the primary access mechanism.** `ACQUIRE <path> FROM KB` queries by tags, which provides the most direct and fastest access. The CLI's auto-tagging was designed specifically for this: every folder name, filename, and composite pair/triple becomes a tag, so agents can request exactly what they need. Keyword search via `SEARCH` is the fallback for discovery.

### MCP Tools

Eight tools and one resource exposed to agents:

| Tool | Purpose |
|---|---|
| `get_context_instructions` | Bootstrap: load all rules and guardrails bundled (prep step 1) |
| `query_instructions` | Fetch instruction docs by tags (primary) or keyword search (fallback) |
| `list_instructions` | Browse the VFS hierarchy (flat listing of immediate children) |
| `query_project_context` | Search project-specific docs in a target repo dataset |
| `store_project_context` | Create or update a document in a project dataset |
| `discover_projects` | List readable project datasets |
| `plan_manager` | Manage execution plans with phases, steps, dependencies, status. Has a `help` command for plan creators (subagents don't need it) |
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
<rosetta:file id="..." path="skills/planning/SKILL.md" name="..." tags="..." frontmatter="..." />
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
   ├── Follows phases (Prepare → Research → Plan → Act)
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

Dataset names auto-generated from template `aia-{release}`.

**Metadata per document:** tags, domain, release, content_hash (MD5), resource_path, sort_order, frontmatter, original_path, line_count.

For RAGFlow internals, see [RAGFLOW.md](RAGFLOW.md).

---

## Rosetta CLI

The CLI (`tools/ims_cli.py`) publishes instructions from the instructions repository into RAGFlow. It handles change detection, metadata extraction, frontmatter parsing, and auto-tagging.

**Core commands:**

| Command | What it does |
|---|---|
| `publish ../instructions` | Publish changed files (incremental, MD5-based) |
| `publish ../instructions --force` | Republish all files regardless of changes |
| `publish ../instructions --dry-run` | Preview what would be published |
| `parse` | Trigger server-side document parsing |
| `verify` | Test connection and health |
| `list-collection --collection aia-r2` | List documents in a dataset |
| `cleanup-collection --collection aia-r2` | Delete documents from a dataset |

**Critical rule:** Always publish the entire `/instructions` folder. Never subfolders or single files (breaks tag extraction).

**Change detection:** MD5 hash of content. Only modified files publish (~77% time savings). Use `--force` to bypass.

**Auto-tagging and metadata extraction.** The CLI reads each file during publishing and extracts everything MCP needs to serve it efficiently:
- **Tags:** all folder names + filename + composite pairs/triples (`core/skills`, `r2/core/skills`, etc.). These are what `ACQUIRE FROM KB` queries against.
- **Frontmatter:** parsed from file content, saved as metadata. Exposed later in `<rosetta:file>` attributes so agents see document structure without loading full content.
- **Resource path:** `skills/planning/SKILL.md` (org prefix stripped). This is the VFS path used everywhere in MCP.
- **Domain** (`core`), **release** (`r2`), **collection** (`aia-r2`): derived from folder structure.
- **Title:** `[r2][core][skills][planning] SKILL.md` (tag-in-title format).

**Environment:** `local.env` (Docker) or `remote.env` (production). Switch with `cp <config>.env .env`.

For full CLI reference, see [TOOLS.md](TOOLS.md).

---

## Instruction Structure

Instructions live in `/instructions/r2/` in the instructions repository, using a layered folder structure.

```
/instructions/r2/
├── core/                  ← OSS foundation (ships with Rosetta)
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
└── <org>/                 ← Organization extensions (e.g., grid/)
    ├── skills/
    ├── agents/
    ├── workflows/
    ├── rules/
    └── commands/
```

**Layered customization.** Core provides the universal foundation. Organization folders extend or override it. Files at the same VFS resource path get **bundled together** by the Bundler. `INSTRUCTION_ROOT_FILTER` controls which layers are included (e.g., `CORE,GRID`).

**Component relationships.** Workflows invoke subagents. Subagents use skills. All reference rules. Templates live inside skills. Guardrails are rules.

**Naming.** Lowercase, dash-separated, globally unique filenames. Entry points: `SKILL.md` for skills, `<name>.md` for agents, workflows, and rules.

---

## Workspace Files

Rosetta initializes and maintains a standard file structure in **target repositories**. These files are how the agent tracks project context, implementation state, and execution plans. All are SRP, DRY, MECE, concise, with grep-friendly topical headers.

**Project documentation (`docs/`):**
- `CONTEXT.md` — business context, target state (no technical details, no changelog)
- `ARCHITECTURE.md` — architecture, technical requirements, modules, workspace structure
- `REVIEW.md` — improvements, suggestions, large TODOs
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

Prep step 2 loads `CONTEXT.md` and `ARCHITECTURE.md` from the target repository. The agent updates `IMPLEMENTATION.md` and `MEMORY.md` as it works.

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
5. **Execute.** Workflow phases (Prepare → Research → Plan → Act), subagent delegation, plan_manager tracking, guardrails and HITL gates

---

## Pipelines

**GitHub Actions (`.github/workflows/pages.yml`):**
- Triggers on push to `main` (changes in `docs/web/`) or manual dispatch
- Builds the Jekyll website from `docs/web/`
- Deploys to GitHub Pages

**Publishing pipeline (manual or CI).** `python ims_cli.py publish ../instructions` from `tools/`. `RAGFLOW_API_KEY` secret for production. Idempotent.

**Plugin distribution.** Three packages via marketplace:

| Plugin | Contents | Footprint |
|---|---|---|
| `core@rosetta` | 20 skills, 7 agents, 4 workflows, 9 rules | Full OSS foundation |
| `grid@rosetta` | 4 skills, 2 agents, 2 workflows, 2 rules | Enterprise extensions |
| `rosetta@rosetta` | Bootstrap rule + MCP definition only | Minimal (fetches via MCP) |

Plugins point to source folders in the instructions repository. No local file duplication.

---

## Extension Points

Where contributors add or change things:

- **New skill:** Add `instructions/r2/core/skills/<name>/SKILL.md` (or under an org folder)
- **New agent:** Add `instructions/r2/core/agents/<name>.md`
- **New workflow:** Add `instructions/r2/core/workflows/<name>.md` (and phase files)
- **New rule:** Add `instructions/r2/core/rules/<name>.md`
- **Organization layer:** Create `instructions/r2/<org>/` with the same type structure
- **MCP tools:** Modify `ims-mcp-server/ims_mcp/server.py`
- **Tool prompts:** Modify `ims-mcp-server/ims_mcp/tool_prompts.py`
- **CLI commands:** Add to `tools/commands/`
- **Website:** Edit pages in `docs/web/`

After adding or changing instructions, publish with the CLI to make them available via MCP.

---

## Tradeoffs

- **Release-based versioning over branch-based.** Releases (r1, r2) coexist in the same repo. Enables A/B testing and rollback, but folder structure carries the version.
- **RAGFlow as the knowledge layer.** Chunking, embedding, and search out of the box. Adds a deployment dependency (Docker or hosted). STDIO transport partially mitigates this.
- **Tags as primary access, not search.** ACQUIRE by tag is faster and more precise than keyword search. But requires the auto-tagging scheme to produce useful tags from folder structure.
- **XML bundling with threshold.** Structured `<rosetta:file>` output with metadata attributes. The threshold of 5 prevents context overflow by switching to listing mode. Requires agents to make follow-up requests for specific files.
- **Command aliases over direct tool calls.** Portable across IDEs, decoupled from MCP API changes. An indirection layer contributors must learn.
- **Full-folder publishing only.** Prevents broken metadata extraction. Change detection keeps incremental publishes fast.
- **Layered customization over multi-tenancy.** Org folders extend core, not replace it. Requires unique filenames across the tree.

---

## Related Docs

- [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) — repo navigation, where to change what
- [CONTRIBUTING.md](../CONTRIBUTING.md) — fastest path to a merged PR
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) — symptom-first diagnosis
