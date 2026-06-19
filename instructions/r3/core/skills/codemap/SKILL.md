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

Precedence: **graphify** > **gitnexus** > **shell scripts** — use the first that is **REQUESTED** and available.

Keep CODEMAP.md initialized and updated REGARDLESS.

<graphify>

IF graphify is already **REQUESTED** in current context:
- querying the codebase, tracing dependency paths between symbols, or explaining concepts (`graphify query/path/explain`): MUST USE SKILL `graphify`
- building or incrementally updating the knowledge graph (`/graphify <path>`, `--update`): MUST USE SKILL `graphify`
- setting up graphify:
  1. READ `https://raw.githubusercontent.com/safishamsi/graphify/HEAD/README.md`
  2. install as per README — NOTE: Cursor sees and uses Claude Code skills/hooks/plugins; install for ONE platform only, not both
  3. MUST USE SKILL `graphify` or follow the graphify rule to invoke `/graphify .` as user message from workspace root
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost)

</graphify>

<gitnexus>

IF gitnexus is already **REQUESTED** in current context:
- code graph queries, exploring code, debugging errors, analyzing impact, or refactoring: MUST ACQUIRE `codemap/assets/gitnexus-use.md` FROM KB and follow it
- running CLI commands, indexing, checking status, cleaning index, or generating wiki: MUST ACQUIRE `codemap/assets/gitnexus-cli.md` FROM KB and follow it
- installing GitNexus or registering the MCP server for the first time: MUST ACQUIRE `codemap/assets/gitnexus-setup.md` FROM KB and follow it
- Worked examples: ACQUIRE `codemap/assets/gitnexus-examples.md` FROM KB
- After modifying code, run `npx gitnexus@latest analyze --force` in the workspace root

</gitnexus>

<core_concepts>

- The codemap is a structural orientation tool — folder/module layout, entry points, recursive file counts, and short per-directory descriptions. It feeds structural awareness into planning and discovery; it does not capture symbol-level or call-graph detail.
- The output is written to `CODEMAP.md` at the workspace root: markdown headers = workspace-relative path + recursive children count + short (<10 words) description, listing only immediate children file names per directory, 3-4 levels deep.
- Noise, caches, build artifacts, binaries, and `.gitignore`-excluded files are excluded (the scripts use `git ls-files`).

</core_concepts>

<how_to_generate>

1. ACQUIRE the generator for the current OS FROM KB (Unix/macOS: make executable first):
   - Unix/macOS: ACQUIRE `codemap/assets/codemap.sh.txt` FROM KB
   - Windows: ACQUIRE `codemap/assets/codemap.ps1.txt` FROM KB
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
