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

<when_to_use_skill>

Use when you need structural awareness of a project to make planning, discovery, or architectural decisions and a current codemap is not already in context. The codemap is a lightweight structural map that is fast to generate.

PREFER GitNexus if it is already present in the current context: if the `gitnexus` skill content is loaded, a `.gitnexus/` reference exists, or the `GitNexus` MCP is available, use GitNexus instead and SKIP codemap generation. Only generate the codemap when no such graph-based source is available.

</when_to_use_skill>

<core_concepts>

- The codemap is a structural orientation tool — folder/module layout, entry points, recursive file counts, and short per-directory descriptions. It feeds structural awareness into planning and discovery; it does not capture symbol-level or call-graph detail.
- The output is written to `CODEMAP.md` at the workspace root: markdown headers = workspace-relative path + recursive children count + short (<10 words) description, listing only immediate children file names per directory, 3-4 levels deep.
- Noise, caches, build artifacts, binaries, and `.gitignore`-excluded files are excluded (the scripts use `git ls-files`).

</core_concepts>

<how_to_generate>

1. Check context first: if GitNexus is available (see `<when_to_use_skill>`), use it and SKIP these steps.
2. The generators ship as `.txt` files to avoid IDE/shell misinterpretation. ACQUIRE and save locally, then rename:
   - Unix/macOS: ACQUIRE `codemap/assets/codemap.sh.txt` FROM KB → save as `codemap.sh`, make executable (`chmod +x codemap.sh`)
   - Windows: ACQUIRE `codemap/assets/codemap.ps1.txt` FROM KB → save as `codemap.ps1`
3. Run the renamed script for the current OS against the workspace root:
   - Unix/macOS: `./assets/codemap.sh [WORKSPACE_ROOT] [MAX_DEPTH]`
   - Windows: `.\assets\codemap.ps1 -WorkspaceRoot <path> -MaxDepth <n>`
   - Both default to the current directory and a depth of 4, enumerate git repositories, and write `CODEMAP.md` to the workspace root.
4. Read the generated `CODEMAP.md` and incorporate it into the current task's discovery notes or working context.

</how_to_generate>

<how_to_use_output>

- Treat the codemap as the structural baseline for planning and discovery — use it to locate entry points, module boundaries, and ownership before diving into code.
- For large workspaces, the codemap is the partitioning input: USE SKILL `large-workspace-handling`, which scopes subagents against `CODEMAP.md` headers.
- Keep only current structural state in `CODEMAP.md` — no deltas, no changelogs.

</how_to_use_output>

</codemap>
