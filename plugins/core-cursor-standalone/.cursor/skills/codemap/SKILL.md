---
name: codemap
description: "To generate, populate, and use a project codemap for structural discovery."
license: Apache-2.0
disable-model-invocation: true
user-invocable: false
---

<codemap>

<role>

Workspace cartographer. Produces a lightweight, top-level structural map of a project — folder/module layout, key entry points, and ownership — for fast architectural orientation.

</role>

Precedence: **LSPs** > **graphify** > **gitnexus** > **shell scripts** — use the first that is **REQUESTED** and available.

Keep CODEMAP.md initialized and updated REGARDLESS.

Do not guess or try to figure out those above => if tools existed you would know that already => fallback to scripts and processes below.

<lsp>
IF LSP tools are already in current context:
- The Language Server Protocol (LSP)
- Use already available tools / capabilities in context
- Combine with semantic search / code index tools already available in context 
- Prefer LSP over Grep/Read for code navigation
</lsp>

<graphify>

IF graphify is already **REQUESTED** in current context:
- querying the codebase, tracing dependency paths between symbols, or explaining concepts (`graphify query/path/explain`): MUST USE SKILL `graphify`
- building or incrementally updating the knowledge graph (`/graphify <path>`, `--update`): MUST USE SKILL `graphify`
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost)

</graphify>

<gitnexus>

IF gitnexus is already **REQUESTED** in current context:
- code graph queries, exploring code, debugging errors, analyzing impact, or refactoring: MUST APPLY SKILL FILE `assets/gitnexus-use.md`
- running CLI commands, indexing, checking status, cleaning index, or generating wiki: MUST APPLY SKILL FILE `assets/gitnexus-cli.md`
- Worked examples: READ SKILL FILE `assets/gitnexus-examples.md`
- After modifying code, run `npx -y gitnexus@latest analyze --force` in the workspace root

</gitnexus>

<core_concepts>

- The codemap is a structural orientation tool — folder/module layout, entry points, recursive file counts, and short per-directory descriptions. It feeds structural awareness into planning and discovery; it does not capture symbol-level or call-graph detail.
- The output is written to `CODEMAP.md` at the workspace root: markdown headers = workspace-relative path + recursive children count + short (<10 words) description, listing only immediate children file names per directory, 3-4 levels deep.
- Noise, caches, build artifacts, binaries, and `.gitignore`-excluded files are excluded (the scripts use `git ls-files`).

</core_concepts>

<how_to_generate>

1. Get the generator for the current OS (Unix/macOS: make executable first):
   - Unix/macOS: READ SKILL FILE `assets/codemap.sh.txt`
   - Windows: READ SKILL FILE `assets/codemap.ps1.txt`
2. Execute the script:
   - Unix/macOS: `codemap.sh [WORKSPACE_ROOT] [MAX_DEPTH]`
   - Windows: `codemap.ps1 -WorkspaceRoot <path> -MaxDepth <n>`
   - Defaults: current directory, depth 4. Writes `CODEMAP.md` to workspace root.
3. Read the generated `CODEMAP.md` and incorporate it into the current task's discovery notes or working context.

</how_to_generate>

<how_to_use_output>

- Treat the codemap as the structural baseline for planning and discovery — use it to locate entry points, module boundaries, and ownership before diving into code.
- For large workspaces, the codemap is the partitioning input: USE SKILL `large-workspace-handling`, which scopes subagents against `CODEMAP.md` headers.
- Keep only current structural state in `CODEMAP.md` — no deltas, no changelogs.

</how_to_use_output>

</codemap>
