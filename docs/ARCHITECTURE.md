# Architecture

**Who is this for?** Contributors who need to understand how Rosetta works before changing it.

**When should I read this?** After [OVERVIEW.md](../OVERVIEW.md). Before touching MCP tools, CLI publishing, instruction content, or folder structure.

For terminology (workflow, skill, rule, subagent, bootstrap, etc.), see [OVERVIEW.md — Key Concepts](../OVERVIEW.md#key-concepts).

For this repository's own GitHub automation (the board-driven analysis/plan/implement/triage pipelines), see [AUTOMATION-ARCHITECTURE.md](AUTOMATION-ARCHITECTURE.md).

---

## Two Repositories

Rosetta operates across two distinct repository types:

**Instructions repository** (this repo). Where common instructions are defined: skills, agents, workflows, rules, templates. Published for delivery via plugins or MCP. Maintained by instruction authors.

**Target repository** (any project). Where Rosetta is applied. The coding agent runs here, receives instructions via a plugin or Rosetta MCP, and maintains workspace files (`docs/CONTEXT.md`, `agents/IMPLEMENTATION.md`, etc.). Maintained by developers using AI coding agents.

The instructions repo defines **how agents should behave**. The target repo is **where agents do the work**.

---

## System Overview

Plugins are the primary delivery mode: instructions are generated once and shipped as files inside the IDE. No server, no live connection at request time.

```
┌─────────────────────────────────────────────────────────┐
│              Target Repository + IDE                    │
│  Claude Code · Cursor · Copilot · Codex · Antigravity   │
│  (plugin installed locally — no server, no live         │
│   connection needed at request time)                    │
└────────────────────────▲────────────────────────────────┘
                         │ install (marketplace or standalone zip)
              ┌──────────┴──────────┐
              │   Rosetta Plugin    │
              │ (core-<ide> package)│
              │                     │
              │  Bootstrap rule     │
              │  Skills · Agents    │
              │  Workflows · Rules  │
              └──────────▲──────────┘
                         │ generate (build time only)
              ┌──────────┴──────────┐
              │     Rosettify       │
              │ (plugin generator)  │
              │ rosettify-plugins   │
              └──────────▲──────────┘
                         │ reads
              ┌──────────┴──────────┐
              │  Instructions Repo  │
              │  /instructions/r3/  │
              │                     │
              │  core/ · <org>/     │
              │  skills · agents    │
              │  workflows · rules  │
              └─────────────────────┘
```

Instructions flow up at build time: the plugin generator reads the instructions repo and produces IDE-native plugin packages. Once installed, the agent works entirely from local files — Rosetta does not see or process your source code, by design.

Generator internals (model rewriting, per-IDE format, hooks bundling, standalone variants) are in [Development — Plugins](#plugins) below.

> **MCP is a separate, optional delivery pipeline.** Its system diagram, RAGFlow, CLI publishing, environments, and protocol details live entirely in **[MCP-ARCHITECTURE.md](MCP-ARCHITECTURE.md)** — read it when you touch any of: the `rosetta-mcp` server (FastMCP v3), transports (Streamable HTTP + OAuth 2.1, STDIO), authentication and OAuth modes, Redis schema migrations, VFS resource paths and auto-tagging, the MCP tools and `rosetta://{path}` resource, document bundling, RAGFlow (datasets, processing pipeline), Rosetta CLI (publish/parse/verify commands, auto-tagging), or MCP-specific environments and validation.

---

## Key Principles

**Inversion of control.** Rosetta is designed to not see or process source code or project data. It exposes guardrails, common best practices, and a menu of available instructions. The coding agent selects only what it needs; Rosetta delivers just those — keeping context lean and IP protected.

---

## Command Aliases

Command aliases are used exclusively for Rosetta resources (instructions, knowledge base). Workspace files in the target repository (`docs/CONTEXT.md`, `agents/IMPLEMENTATION.md`, etc.) are read directly from the filesystem. This boundary is intentional: when an agent sees a typed alias (`USE SKILL ...`, `READ RULE ...`), it knows it is loading Rosetta instructions through the active mode; when it reads a file, it knows it is working with target repository files.

Instructions never call MCP tools directly. Rosetta defines command aliases that work across all IDEs and coding agents. This serves three purposes:

- **Portability.** Same instructions work in Cursor, Claude Code, VS Code, JetBrains, Codex, and any MCP-compatible tool. Native hook support is IDE-specific and must be validated separately.
- **Decoupling.** Instruction content is independent of MCP API changes.
- **Authoring.** Workflows, skills, and rules reference each other through aliases, not tool calls.

| Alias                                                              | Semantics                                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `USE SKILL <name>` / `READ SKILL <name>`                           | Activate skill (loads `SKILL.md`, acts on it) / load content only                                    |
| `READ SKILL FILE <subpath>` / `APPLY SKILL FILE <subpath>`         | Load / load+execute a file of the CURRENT skill; never names a skill (isolation is grammar-enforced) |
| `USE FLOW <name>.md` / `READ FLOW <name>.md`                       | Invoke a whole workflow / load without executing                                                     |
| `APPLY PHASE <file>.md` / `APPLY PHASE <file>.md STEP <names/ids>` | Load + fully execute the next phase body of a running workflow / execute only the named step blocks  |
| `USE FLOW <flow>.md TO APPLY PHASE <phase>.md`                     | Activate the flow's prerequisites and policy, then execute only that phase                           |
| `INVOKE SUBAGENT <name> to APPLY PHASE <file>.md`                  | Spawn the subagent and have it execute the phase under its assigned identity                         |
| `INVOKE SUBAGENT <name>` / `READ SUBAGENT <name>`                  | Spawn subagent / load its definition only                                                            |
| `READ RULE <file>.md` / `APPLY RULE <file>.md`                     | Load / load+execute a rule                                                                           |
| `READ TEMPLATE <file>.md`                                          | Load a template                                                                                      |
| `READ CONFIGURE <tool>.md`                                         | Load an IDE/agent configure spec                                                                     |
| `LIST <path>`                                                      | Enumerate immediate children of a KB folder                                                          |
| `ACQUIRE <path> FROM KB`                                           | MCP-only, generated shells: `query_instructions(tags="<path>")`                                      |
| `/rosetta`                                                         | Engage only the Rosetta flow                                                                         |

Verbs: `READ` = load into context; `APPLY` = load + fully execute; `USE`/`INVOKE` = activate. In plugin mode the typed aliases need NO mapping — they operate natively on the plugin files; the MCP mode file (`mcp-files-mode.md`: `query_instructions`/`list_instructions` by path-based tags) and local mode file (`local-files-mode.md`: reads from `instructions/r3`) map each alias to their mechanisms. In MCP, typed loads resolve via VFS resource paths (filename, parent/filename, or grandparent/parent/filename); LIST preferred when the folder is known.

## Bootstrap Flow

The runtime footprint is minimal: `bootstrap-alwayson.md` (core policies, `reasonable`, tasks, skill engagement, core files) plus exactly one mode file. MCP and local mode files bind command aliases to their mechanisms; plugin mode needs no mapping because aliases operate natively on plugin files. Everything heavy loads on demand behind skills and workflows:

```
1. Agent starts: plugin or local `bootstrap-alwayson.md` loads / MCP connects

2. Rosetta Prep Steps (bound per mode file, once per session)
   ├── Plugin: USE SKILL load-project-context → USE SKILL hitl (`bootstrap-alwayson.md` auto-loaded)
   ├── MCP:    get_context_instructions → USE SKILL load-project-context → USE SKILL hitl
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

## Versioning

Each individual solution component follows its own version (except major).

All plugins follow the same version.

---

## Rosettify

Local CLI/MCP utility for AI coding agents and users. Purpose: deterministic local AI coding workflow execution and single entry point for Rosetta tooling in any project. All data and IP stays local — zero network calls during operation.

Published on npm as `rosettify`. Invoked via `npx -y rosettify@latest <command> [subcommand] [args]` or as a local MCP server (`rosettify --mcp`) over stdio.

**Requirements-first:** spec-before-code from `docs/requirements/rosettify/` (authoritative; code follows).

**Key points:**

- **Dual frontend.** One CLI and one MCP server backed by the same run delegates. Identical behavior in both modes.
- **Plan management** (current feature). `npx -y rosettify@latest plan <subcommand> <plan_file>` — create, track, and advance execution plans as local JSON files. Subcommands: `create`, `next`, `update_status`, `show_status`, `query`, `upsert`, `create-with-template`, `upsert-with-template`, `list-templates`.
- **Specs management** (current feature). `npx -y rosettify@latest specs <subcommand> <specs_file>` — author, query, validate, and approve a component's requirements as spec units stored in one JSON document per component. Subcommands: `add`, `get`, `query`, `update`, `delete`, `purge`, `implemented`, `approve`, `deprecate`, `restore`, `reopen`, `validate`, `graph`, `render`, `info`, `migrate`.
- **Atomic write cycle with backup chain.** Every plan mutation uses a rename-as-guard cycle: rename the plan file to `<file>.bakNNN` as the atomic lock, then write the new content. The plan's `previous_version` field tracks the prior backup path. Up to 5 backups retained; bounded to 50 retries.
- **Template registry.** Two compiled-in template kinds (`create`, `upsert`) with strict bidirectional placeholder matching. Seed templates ship with the package.
- **Sequential phase enforcement.** `next` returns work from the earliest incomplete phase only; later phases are blocked until all earlier phases are done.
- **Static tool registry.** Each command is a `ToolDef` with name, description, input/output schema, CLI and MCP flags, and a typed run delegate.
- **No network calls.** All data stays local — safe for IP-sensitive projects.

Validated with `npm run typecheck`, `npm run test` (vitest, 90% line + branch coverage). Published via `.github/workflows/publish-rosettify.yml`. Version managed via `scripts/bump_versions.sh`.

---

## Rosettify Prompts

`rosettify-prompts` (npm; `src/rosettify-prompts/`) — prompt A/B/N bench against the Anthropic API. Runs N conversation variants ×`repetitions` concurrently; compares input/output/thinking tokens, cost, latency, stability. Dev/eval tool only — not shipped to end users, not in the runtime path. Config-driven (`evals.json`); needs `ANTHROPIC_API_KEY`.

---

## Curiocity

`curiocity` (npm; `src/curiocity/`) — evals/testing harness that drives interactive coding-agent CLIs (Claude Code, Codex) through a prompt over a real PTY, reads each CLI's native on-disk transcript as the source of truth, auto-answers the agent's genuine questions via LLM, then scores every run with deterministic checks + an LLM judge and gates CI on the aggregate. Used for CI/CD regression of the Rosetta plugin and for benchmarking agents. Case-driven (`--source <dir>` of `prompt.md`/`config.json`/`qna.md`/`evaluation.md`/`src.zip` folders); full design in [`src/curiocity/docs/architecture.md`](../src/curiocity/docs/architecture.md).

---

## Instruction Structure

Instructions live in `/instructions/r3/` in the instructions repository, using a layered folder structure.

```
/instructions/r3/
├── core/                  ← Rosetta instruction source
│   ├── skills/
│   │   └── <name>/
│   │       ├── SKILL.md
│   │       ├── README.md    ← maintainer doc (never loaded at runtime)
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

**Layered customization.** Core provides the universal foundation. Organization folders extend or override it. Files at the same resource path get merged: in Plugin mode, the generator merges core + organization layers at build time. In MCP mode, files at the same VFS resource path are bundled together at request time by the Bundler (see [MCP-ARCHITECTURE.md — Bundler](MCP-ARCHITECTURE.md#bundler)). `INSTRUCTION_ROOT_FILTER` controls which layers are included in MCP mode (e.g., `CORE,GRID`).

**Component relationships.** Workflows invoke subagents. Subagents use skills. Templates live inside skills. Guardrails are primarily on-demand skills engaged through always-on actor lists and skill descriptions. See [Overview — Key Concepts](../OVERVIEW.md#key-concepts) for definitions.

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

The `load-project-context` prep action reads `CONTEXT.md` and `ARCHITECTURE.md` from the target repository. The agent updates `IMPLEMENTATION.md` and `MEMORY.md` as it works. See [Installation — Workspace Files Created](../INSTALLATION.md#workspace-files-created) for the full list of committed and excluded files.

**State management and recovery.** For medium and large tasks, workflows create plan, spec, and state files in `plans/` and `agents/`. These files persist execution state to disk, so if a failure occurs (context loss, crash, timeout), the agent or a new session can resume from the last recorded state rather than starting over.

---

## Plugin Delivery Flow

```
Instructions Repo ──► Rosettify-Plugins (generate) ──► Plugin Package ──► Target Repo + IDE
```

1. **Generate.** The generator reads `instructions/<release>/core/` (plus org overlays), rewrites models per IDE, converts agent/workflow formats, builds indexes, renders templates, and bundles hooks — once, at build time.
2. **Install.** The user installs the generated package from an IDE marketplace or extracts a standalone zip. No server, no credentials, no live connection.
3. **Prepare, route, load, execute.** Identical to every other mode from this point — see [Bootstrap Flow](#bootstrap-flow) above. The agent reads `bootstrap-alwayson.md` locally, then follows the same classification, loading, and execution model as MCP or local mode.

MCP has its own, separate delivery flow (publish → index → serve) — see [MCP-ARCHITECTURE.md — MCP Delivery Flow](MCP-ARCHITECTURE.md#mcp-delivery-flow).

---

## Development

### Prerequisites

- Python 3.12 — ONE virtual environment at repo root: `venv/`. MUST be used for ALL Python code in this repo: every `src/*` package, tests, validation scripts, tools, ad-hoc runs. MUST NOT create any other venv (no `.venv`, no per-package venvs).
- Pre-commit hook exists

MCP server development, publishing instructions, and RAGFlow/MCP validation are covered in [MCP-ARCHITECTURE.md — Development](MCP-ARCHITECTURE.md#development).

Once everything fully completed and before complete:

- Must regenerate plugins using `npx -y rosettify-plugins@latest` in workspace root if any `instructions/r3/*` was modified.
- Must run full pre-commit check using `venv/bin/python scripts/pre_commit.py` in workspace root if any `src/*` was modified.

### Plugins

Instructions to `plugins` folder content must be regenerated with `venv/bin/python scripts/pre_commit.py` (which calls `npx -y rosettify-plugins@latest` internally).
Pre-commit hook is also created, but we must not rely on it.
Do not directly modify instructions in `plugins` folder instead edit original files in `instructions` and use script to copy/adapt.

Claude Code Plugin: only Anthropic `sonnet`/`opus`/`haiku` models are supported.
Codex Plugin: only OpenAI `gpt-*` models are supported.

Plugins are the primary delivery mechanism for Rosetta. They deliver instructions directly to the user's profile or repository — no MCP connection or server needed. Instructions are copied at install time, so the agent works entirely from local files.

Each plugin contains core instructions: 38 skills, 10 agents, 13 workflow types, and bootstrap rules. The content is identical across plugins — only the format differs per IDE.

| Plugin                    | IDE                                               | Mode                                                              |
| ------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| `core-claude`             | Claude Code                                       | Plugin marketplace                                                |
| `core-cursor`             | Cursor                                            | Plugin marketplace                                                |
| `core-copilot`            | VS Code Copilot, JetBrains Copilot                | Plugin marketplace                                                |
| `core-codex`              | Codex                                             | Plugin marketplace                                                |
| `core-antigravity`        | Antigravity 2.0, Antigravity CLI, Antigravity IDE | Direct extraction into plugin folder (`.agents/plugins/rosetta/`) |
| `core-cursor-standalone`  | Cursor                                            | Direct extraction into repo (`.cursor/`)                          |
| `core-copilot-standalone` | VS Code Copilot, JetBrains Copilot                | Direct extraction into repo (`.github/`)                          |

All plugins are generated from the **release-selected** source tree (`instructions/<release>/core/`) by the plugin generator (`rosettify-plugins`, `npx -y rosettify-plugins@latest`). **Requirements-first:** spec-before-code from `docs/requirements/plugin-generator/` (authoritative FRs/NFRs; code follows). The release is chosen by `--release` (default **r3**, matching rosetta-mcp's `DEFAULT_VERSION`); each release descriptor carries its hook posture (r2: SessionStart bootstrap only; r3: deterministic advisory hooks by default), overridable per run with `--deterministic-hooks true|false` (e.g. `--release r3 --deterministic-hooks false` builds r3 without advisory hooks); when omitted, the release's default applies. The generator builds main plugins then derives standalone variants. `.tmpl` files are Handlebars templates rendered by the generator.

**Run it standalone:** `npx -y rosettify-plugins@latest [--release r2|r3] [--output DIR] [--source DIR] [--profile NAME] [--profileSource DIR]` — `--release` selects the instructions source (default `r3`), `--output` redirects generated plugins (default `<source>/plugins`), `--source` sets the repo root (default: current directory). `--profile` names a build profile by **name only** (never a path; a value carrying a path separator or a `.json` extension is rejected at parse), and `--profileSource` sets the directory profiles resolve from (default `<source>/src/rosettify-plugins/profiles`), derived from `--source` exactly as `--pluginsSource` and the other per-source inputs are. `pre_commit.py` invokes it with `--release r3 --deterministic-hooks false`, so the shipped plugins are r3 content with SessionStart bootstrap only. The generator copies core instructions and adapts them for the target coding agent:

- **Model rewriting** — selects the first model from the frontmatter `model:` comma-separated list and normalizes it to the platform's format. Cursor normalizes to short IDs (e.g. `claude-sonnet-5`, `gpt-5.4`); Copilot to display names (e.g. `Claude Sonnet 5`, `GPT-5.4`); Claude Code to full model IDs (`claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5`). Every vocabulary maps old-to-new plus new-to-itself, so a superseded token resolves FORWARD rather than pinning the model it named: the Cursor and Copilot maps upgrade `gpt-5.3*`/`gpt-5.4*` to `gpt-5.6-terra`, `gpt-5.5*` to `gpt-5.6-sol`, mini forms to `gpt-5.6-luna`, every gemini to `gemini-3.7-flash` and `grok-4.5` to `grok-4.6`, and the Codex map carries the same upgrades with each token's reasoning effort preserved (an UNMAPPED `gpt-` token still passes through as written). Claude's vocabulary resolves each candidate in **two tiers, exact before general**: the source token itself as a key, then the `opus`/`sonnet`/`haiku` family substring it carries. A map keyed by family alone can name exactly one model per family and so cannot express a model version; the exact tier is what lets a specific token be pinned, and it guarantees an author who names a version explicitly keeps getting that version even if the family default later moves. Cursor and Copilot are keyed by exact token throughout, and a token their map lacks is simply unmapped — dropped from `subagent_required_model`, passed through raw if it lands first in a `model:` list. A missing key records that this generator has no established identifier for that model on that IDE; it is not evidence the IDE lacks the model. The Copilot map currently has no Grok or Composer entry on those grounds. The `subagent_required_model` attribute is a **second** model-emission surface: on **every** build (profile or not) its comma-separated list is now normalized per IDE — each token filtered and mapped through that target's effective vocabulary, de-duplicated keeping the first occurrence, re-emitted in source order, or set to `inherit` when none survive (Antigravity keeps its existing unconditional `inherit`). This closed a pre-existing leak of unnormalized multi-vendor tokens and **changed the content of committed plugin files**; maintainers should expect that diff on the next regeneration.
- **Agent file format** — converts agent markdown to the IDE's expected format (`.agent.md` for Copilot, `.toml` for Codex)
- **Directory layout** — restructures output to match IDE conventions (`.agents/` and `.codex/` for Codex, runtime configs at root for Copilot). Each target exposes workflows by one of three distinct mechanisms, and reference rewriting differs accordingly:
  - **Manifest pointer (Claude)** — the folder stays `workflows/` on disk; `.claude-plugin/plugin.json` declares `"commands": "./workflows/"`, so Claude Code reads slash commands straight out of it. Nothing is renamed, so no rewrite pair is produced or needed.
  - **Pure folder relocation (Cursor, Copilot)** — Cursor renames `workflows/` → `commands/`; Copilot renames it to `prompts/` with files `*.md` → `*.prompt.md`. Documents keep their identity as one path segment inside the new folder, so both exact references (`workflows/coding-flow.md` → `commands/coding-flow.md`) and bare folder tokens (`workflows/` → `commands/`) are rewritten.
  - **Restructuring into skills (Codex, Antigravity)** — main doc → `<base>/skills/<name>/SKILL.md` (`.agents/skills` for Codex, `skills` for Antigravity), phase files → `<base>/skills/<name>/phases/<phase>.md` with frontmatter stripped; no `workflows/` folder or index exists for either. Because a document lands deeper than one segment, a bare folder token carries no document identity: **only exact document references are rewritten** (`workflows/coding-flow.md` → `skills/coding-flow/SKILL.md`) and bare `workflows/` is left alone (FR-ARCH-0049). Rewriting it would yield a nonexistent path and corrupt prose and glob mentions such as `` WORKFLOW/COMMAND `workflows/*.md` ``.

  All rewriting uses complete boundary-delimited path tokens to avoid accidental partial-word matches.

- **Index generation** — produces `rules/INDEX.md` and `workflows/INDEX.md` (or `commands/INDEX.md` for Cursor, `prompts/INDEX.md` for Copilot) listings for Claude, Cursor, and Copilot. Only files with `tags: ["workflow"]` appear in the workflow index; phase files are excluded; the heading is `# Rosetta Workflows Index`. Codex has no workflow index; Antigravity's analog is `skills/INDEX.md`, populated from workflow-derived skills.
- **Template processing** — `.tmpl` files render to a sibling file (same path, `.tmpl` suffix removed) with platform placeholders substituted. Cursor and Copilot each ship **two** templates: a plugin-marketplace form (paths resolve under plugin install dir) and a standalone form (paths resolve from a user's project root). Both forms render into the main plugin tree; the standalone generator picks the right one for extraction.
- **Copilot session locking** — Copilot has no native hook deduplication, so the generated hooks include a file-based lock ensuring each bootstrap entry fires exactly once per session. Other platforms use IDE-native mechanisms (Claude Code: `"once": true`; Codex and Cursor: built-in deduplication).

**Build profiles.** A profile is a named build variant **orthogonal to release and domain** — it alters neither release selection nor domain layering. Its descriptor (`<profileSource>/<name>.json`) supplies per-target `modelOverrides` plus three global suffixes: `destinationSuffix`, `pluginNameSuffix`, `pluginDescriptionSuffix`. Under a profile all seven targets still build, into the same output directory, as `core-*<destinationSuffix>` folders beside the standard ones — only `spec.destination` is suffixed; `spec.name` (the directive-match identity) is never suffixed. The name/description suffixes append to each preserved manifest's existing values, globally across targets. A per-target `modelOverrides` block replaces that target's built-in model vocabulary **in full and exhaustively** (a token the block does not name is treated as unmapped and skipped; a frontmatter `model:` line with no surviving candidate is dropped); a target with no block keeps its built-in maps unchanged. `core-antigravity` has no model vocabulary, so a block for it is invalid. A missing, unparseable, or structurally invalid descriptor aborts the run before any output is written. A no-profile run is otherwise unchanged from a standard build, save the always-on `subagent_required_model` normalization above.

**The shipped `lightweight` profile.** `profiles/lightweight.json` declares the three suffixes and **no `modelOverrides` at all**. A `modelOverrides` block is exhaustive per target, so it applies uniformly to every agent, skill and workflow in that target — right for a client restricted to one vendor, wrong for a lighter build, where each subagent needs its own tier. The light build therefore selects models the way the standard build does: through profile-scoped instruction documents (`<agent>~profile-lightweight-only~overwrite~.md` for all ten subagents, plus a merged `coding-flow`) whose `model:` candidate lists resolve through each target's built-in vocabulary. **Position in a candidate list is load-bearing and differs per vocabulary**: Cursor and Copilot consume the FIRST token, so slot 1 decides those two; Claude scans for the first claude-compatible token; Codex for the first `gpt-*`. A token no vocabulary can name is dropped from that IDE's guidance lists, so a model missing from a map goes silently missing from the plugin — the maps are meant to name every model the instruction set uses. The ten light agent documents are full copies of their base counterparts differing in exactly one line, and must be kept in sync when a base agent changes.

**Filename directives.** Per-file build behavior is declared in the source filename as a tilde-fenced directive of the form `name~token[~token...]~.ext` — an opening tilde after the base stem and a closing tilde before the extension (the closing fence yields an inert empty token); the file maps to the clean VFS path `name.ext`. Tokens are an optional leading order token followed by directive tokens in any order (`overwrite`, a target-only token, a profile-only token). A **target-only** token matches against a target's `name`, so the correct form is `core-claude-only` — not `claude-only`, which matches no target. A **profile-only** token is `profile-<name>-only` and includes the file only while that profile is active; with no active profile every profile-scoped file is excluded.

Each standard plugin has a preserved config folder (`.claude-plugin/`, `.cursor-plugin/`, `.github/`, `.codex-plugin/`) holding the IDE manifest (`plugin.json`) and static configs. `hooks/` is also preserved for Claude, Cursor, and Copilot (carries the plugin-form `hooks.json.tmpl`); Cursor additionally preserves a root-level `hooks.json.tmpl` (standalone-form). Everything outside preserved paths is wiped and regenerated per sync. Bootstrap payloads are embedded in Claude/Codex hook templates; Cursor and Copilot rely on rules and instructions instead.

**Standalone plugins** (`core-cursor-standalone`, `core-copilot-standalone`) are a second-pass derivative built from the already-synced main plugins (including their hook bundles) and placed entirely under the IDE's expected subfolder (`.cursor/` or `.github/`). Wiped and recreated per sync. Each IDE expects hooks at a different relative path, so the templates and cleanup differ:

|                                   | Cursor standalone                   | Copilot standalone                           |
| --------------------------------- | ----------------------------------- | -------------------------------------------- |
| Standalone hooks.json path        | `.cursor/hooks.json` (top)          | `.github/hooks/hooks.json` (nested)          |
| Standalone-form template lives at | `<plugin>/hooks.json.tmpl` (root)   | `<plugin>/hooks/hooks.json.tmpl`             |
| Bundles after extraction          | `.cursor/hooks/*.js`                | `.github/hooks/*.js`                         |
| Path style in hooks.json          | `node .cursor/hooks/<file>.js`      | `node ".github/hooks/<file>.js"`             |
| Bootstrap delivery                | Native Cursor rules (`rules/*.mdc`) | Auto-loaded `instructions/*.instructions.md` |

When the source plugin contains a directory whose name matches the standalone's `subfolder` (e.g. cursor's bulk-copy would otherwise produce `.cursor/.cursor/`), the generator merges its contents directly into the subfolder to avoid nesting. Each standalone also runs IDE-specific transforms: Cursor injects `commands/INDEX.md` into `rules/plugin-files-mode.mdc`; Copilot moves `rules/bootstrap-*.md` and `rules/plugin-files-mode.md` to `instructions/*.instructions.md` (auto-loaded via `applyTo: "**"`), renames `commands/` → `prompts/` and `*.md` → `*.prompt.md`, rewrites cross-references by exact-string pass, and strips the plugin-marketplace `hooks.json`/`.mcp.json`/`templates/`. `plugin.json` for each standalone is regenerated with the source plugin's version.

### Hooks Runtime

Hooks are lightweight scripts that run in response to IDE tool calls (PostToolUse, PreToolUse). They inject advisory context into the AI's context window — nothing is displayed directly to the user.

**Hook contracts — source of truth:** `docs/hooks/<ide>.md` (`claude-code`/`codex`/`cursor`/`copilot`/`windsurf`/`antigravity`) — empirically verified per-IDE I/O, exit codes, matchers. (`antigravity` is one combined adapter for all three Google Antigravity surfaces — 2.0/CLI/IDE — verified identical.) Adapters + `instructions/*/configure/*.md` reconcile TO these specs, never the reverse; protocol in `docs/hooks-verify.md`.

Source lives in `src/hooks/` and is compiled per-IDE before sync:

| Folder                    | Contents                                                                                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/src/`          | TypeScript source — adapter, lock, debug-log, hook implementations                                                                                                                                                                 |
| `src/hooks/tests/`        | Vitest unit tests + fixtures, and a log-driven E2E suite (`tests/e2e/`) that replays REAL captured wire payloads (`docs/hooks/<ide>-logs.txt`) through the full pipeline (no adapter mocks) to catch canonical-mapping regressions |
| `src/hooks/scripts/`      | esbuild bundler (`build-bundles.mjs`)                                                                                                                                                                                              |
| `src/hooks/dist/bundles/` | Compiled per-IDE bundles (generated, not committed)                                                                                                                                                                                |

Each hook is bundled separately per IDE via esbuild so each bundle contains only its adapter code. To add a new hook: create the `.ts` source in `src/hooks/src/hooks/`, then add its filename to the `HOOK_SOURCES` array in `src/hooks/scripts/build-bundles.mjs`.

**Available hooks (synced into every plugin and standalone when deterministic hooks are enabled; the shipped plugins are currently generated with `--deterministic-hooks false`, so they carry SessionStart bootstrap only):**

| Hook                      | Event                     | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dangerous-actions.js`    | PreToolUse                | Two-tier deny on dangerous shell/edit/MCP patterns; `# Rosetta-AI-reviewed` marker allows retry on `reconsider` policy; `hard-deny` patterns (e.g. `curl \| sh`) require human review                                                                                                                                                                                                                                                       |
| `loose-files.js`          | PostToolUse (Write)       | Nudges agent when `.py`/`.js` files are created without a module marker (`__init__.py` / `package.json`)                                                                                                                                                                                                                                                                                                                                    |
| `md-file-advisory.js`     | PostToolUse (Write\|Edit) | Advises on markdown formatting/placement after `.md` edits                                                                                                                                                                                                                                                                                                                                                                                  |
| `lint-format-advisory.js` | PostToolUse (Write\|Edit) | Suggests a syntax/type/lint/format check step after code edits                                                                                                                                                                                                                                                                                                                                                                              |
| `codemap-refresh.js`      | PostToolUse (Write\|Edit) | Refreshes the active code-map backend when source files change. Detects GitNexus (`.gitnexus/` marker, runs `npx -y gitnexus@latest analyze --force`) and Graphify (`graphify-out/graph.json` marker, runs `graphify update .`); no-op when neither is installed. When both are present, each backend gets an independent debounced refresh. Manager must review the GitNexus license before use; Graphify is the MIT-licensed alternative. |

**`hooks.json` locations and forms per plugin variant** (each form references the bundles using paths appropriate to its runtime):

| Plugin/standalone            | hooks.json read by IDE at                                                                        | Form            | Path style                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | --------------- | -------------------------------------------------- |
| `core-claude` (marketplace)  | `<plugin>/hooks/hooks.json` (referenced from `plugin.json`)                                      | plugin-form     | `node hooks/<file>.js`                             |
| `core-cursor` (marketplace)  | `<plugin>/hooks/hooks.json` (referenced from `plugin.json`)                                      | plugin-form     | `node hooks/<file>.js`                             |
| `core-copilot` (marketplace) | `<plugin>/hooks.json` (root, copied from `.github/plugin/hooks.json` at sync time)               | plugin-form     | env-var lookup to plugin install root              |
| `core-codex` (marketplace)   | `<plugin>/.codex-plugin/hooks.json` (also mirrored to `<plugin>/.codex/hooks.json` at sync time) | plugin-form     | `node <abs-path>/hooks/<file>.js` via shell lookup |
| `core-cursor-standalone`     | `.cursor/hooks.json` (top of extracted subfolder)                                                | standalone-form | `node .cursor/hooks/<file>.js`                     |
| `core-copilot-standalone`    | `.github/hooks/hooks.json` (nested inside extracted subfolder)                                   | standalone-form | `node ".github/hooks/<file>.js"`                   |

Cursor and Copilot are the only plugins that need two distinct templates because they have distinct standalone distributions. Templates: cursor — `hooks/hooks.json.tmpl` (plugin) + `hooks.json.tmpl` at root (standalone); copilot — `.github/plugin/hooks.json.tmpl` (plugin) + `hooks/hooks.json.tmpl` (standalone). Both are rendered during sync; the standalone generator's bulk-copy lands each at the right path inside the standalone subfolder.

- **IDE normalization** — `src/adapter.ts` detects the IDE (env signature first, then stdin shape: codex > cursor > claude-code > windsurf > antigravity > copilot; Antigravity IDE is a VS Code fork, so its `ANTIGRAVITY_CONVERSATION_ID` env signal is checked before the generic `VSCODE_*` copilot catch-all) and normalizes to a canonical `NormalizedInput`, which MUST be fully mapped: a field is empty only when the value is genuinely absent from the raw input AND not derivable from the event name, another field, or the IDE's documented tool/event vocabulary
- **Per-IDE output** — each adapter's `formatOutput` converts canonical output back to the IDE's expected JSON schema

`scripts/pre_commit.py` builds and tests hook bundles, then runs `npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false`; when deterministic hooks are enabled the generator syncs the bundles into each main plugin's hooks directory (`plugins/core-{claude,cursor,copilot}/hooks/`, `plugins/core-codex/.codex/hooks/`) before deriving the standalones. Do not edit those bundle locations directly — edit `src/hooks/src/` and re-run the script.

---

## Pipelines

We use `.github/workflows` pipelines to build and release: MCP PyPi package, Docker Image, Publish Instructions, Publish website.
Triggers on push to `main` or manual dispatch. Use actionlint.

Website: builds the Jekyll website from `docs/web/`, deploys to GitHub Pages. Original web content is not generated, but adapted and synchronized. Jekyll uses that content to build the website. The one exception is `docs/web/user-guide/`, which is synchronized from `user-guide/` by `scripts/sync_user_guide_web.py` (rewrites relative links to permalinks, `instructions/**` refs to GitHub blob URLs, and wraps mermaid blocks in `{% raw %}` so Liquid does not consume `{{"..."}}` hexagon nodes).

**Plugin distribution.** The publish-instructions pipeline zips each plugin folder and attaches the archives to a GitHub Release alongside `instructions.zip`. See [Plugins](#plugins) for how plugin files are generated.

---

## Extension Points

Where contributors add or change things:

- **New skill:** Add `instructions/r3/core/skills/<name>/SKILL.md` (or under an org folder; backport to `r2` only for fixes)
- **New agent:** Add `instructions/r3/core/agents/<name>.md`
- **New workflow:** Add `instructions/r3/core/workflows/<name>.md` (and phase files)
- **New rule:** Add `instructions/r3/core/rules/<name>.md`
- **Organization layer:** Create `instructions/r3/<org>/` with the same type structure
- **MCP tools:** Modify `src/rosetta-mcp-server/rosetta_mcp/server.py`
- **Tool prompts:** Modify `src/rosetta-mcp-server/rosetta_mcp/tool_prompts.py`
- **CLI commands:** Add to `src/rosetta-cli/rosetta_cli/commands/`
- **Website:** Edit pages in `docs/web/`

After adding or changing instructions, publish with the CLI to make them available via MCP, or regenerate plugins with `scripts/pre_commit.py`. See the [Developer Guide — Where to Change What](../DEVELOPER_GUIDE.md#where-to-change-what) for the validation steps per change type.

---

## Tradeoffs

- **Release-based versioning over branch-based.** Release folders (r2, r3) coexist in the same repo; folder structure carries the version. R3 is the final numbered release — changes ship as incremental updates within `r3`, and `r2` receives backported fixes only.
- **Layered customization over multi-tenancy.** Org folders extend core, not replace it. Requires unique filenames across the tree.
- **Command aliases over direct tool calls.** Portable across IDEs, decoupled from MCP API changes. An indirection layer contributors must learn.
- **Native plugin format.** Coding agents expect subagents, skills, and commands in specific formats and locations. Plugins ship those directly in the IDE's own format — no proxy indirection, no staleness risk. (MCP mode instead needs copy-paste shell files to satisfy the same IDE expectations — see [MCP-ARCHITECTURE.md — Tradeoffs](MCP-ARCHITECTURE.md#tradeoffs).)

MCP-specific tradeoffs (RAGFlow as knowledge layer, tags vs. search, XML bundling threshold, full-folder publishing, single API key, server-controlled `VERSION`, transport choice, OAuth proxy, token encryption, model provisioning) are documented in [MCP-ARCHITECTURE.md — Tradeoffs](MCP-ARCHITECTURE.md#tradeoffs).

---

## Related Docs

- [Plugins](../PLUGINS.md) — install and verify a Rosetta plugin
- [MCPs](../MCPs.md) — install and verify Rosetta MCP (optional, secondary)
- [MCP Architecture](MCP-ARCHITECTURE.md) — `rosetta-mcp` server internals, RAGFlow, CLI, environments, OAuth modes, Redis migrations, VFS/tags, tools, bundler, listings, overflow prevention
- [Developer Guide](../DEVELOPER_GUIDE.md) — repo navigation, where to change what
- [Contributing](../CONTRIBUTING.md) — fastest path to a merged PR
- [Usage Guide](../USAGE_GUIDE.md) — how to use Rosetta flows
- [Troubleshooting](../TROUBLESHOOTING.md) — symptom-first diagnosis
