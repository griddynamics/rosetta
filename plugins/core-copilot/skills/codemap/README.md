# codemap

Generates and maintains `CODEMAP.md`, a top-level structural map of a workspace (folders, entry points, file counts, short descriptions), and routes to a code-graph backend (LSP/graphify/gitnexus) when one is already requested.

## Why it exists

Without this skill an agent dropped into an unfamiliar workspace either greps around ad hoc (missing whole modules, wasting turns) or tries to build its own mental map from a partial file listing that goes stale as soon as the codebase changes. It also has no reason to prefer an already-installed graph tool over guessing at file structure, and no shared, greppable artifact that other skills (like large-workspace-handling) can scope work against. codemap fixes this by producing one canonical, regenerable `CODEMAP.md` and by gating tool choice on an explicit precedence order instead of trial-and-error.

## When to engage

Not model-auto-invoked and not user-slash-invocable (`disable-model-invocation: true`, `user-invocable: false`) — it only runs when another instruction explicitly does `USE SKILL \`codemap\``. Any agent tier can trigger it this way: workflows (`init-workspace-flow.md`, `init-workspace-flow-discovery.md`, `init-workspace-flow-documentation.md`, `coding-flow.md`), and skills `reverse-engineering` and `coding` before/during structural discovery. `<when_to_use_skill>` is absent from SKILL.md — entry is purely via these external references, there is no self-contained trigger text to read.

## How it works

SKILL.md is one flow with a tool-precedence gate up front (LSP > graphify > gitnexus > shell scripts, first one **REQUESTED** and available), then three tag groups:
- `<lsp>` — use whatever LSP/semantic-search tools are already in context.
- `<graphify>` — routes to `USE SKILL \`graphify\`` for querying/building the graph if graphify is already requested; otherwise gives setup steps.
- `<gitnexus>` — routes to the four `assets/gitnexus-*.md` files by task (use, CLI, setup, examples) if gitnexus is already requested.

Below that, `<core_concepts>` defines the CODEMAP.md contract, `<how_to_generate>` names the OS-specific script to read and run, and `<how_to_use_output>` tells the caller to treat CODEMAP.md as the discovery baseline and hands large workspaces to `large-workspace-handling`.

- `assets/codemap.sh.txt` / `codemap.ps1.txt` — the actual generators: enumerate tracked files via `git ls-files --cached --others --exclude-standard`, filter by a fixed extension/exact-name allowlist, infer a per-directory description by name/content heuristics, and emit `CODEMAP.md` headers with recursive file counts.
- `assets/gitnexus-setup.md` — first-time install/MCP registration, plus the commercial-use licensing warning.
- `assets/gitnexus-cli.md` — CLI command/flag reference (analyze/status/clean/wiki/list).
- `assets/gitnexus-use.md` — MCP tool/resource reference (query/context/impact/detect_changes/rename/cypher, `gitnexus://repo/...` resources).
- `assets/gitnexus-examples.md` — four worked debugging/exploration/impact/rename scenarios chaining those tools.

No `references/` subfolder exists.

## Mental hooks & unexpected rules

- "Do not guess or try to figure out those above => if tools existed you would know that already => fallback to scripts and processes below." — forbids probing for LSP/graphify/gitnexus; their presence in context is itself the signal, absence means skip straight to the shell scripts.
- "Keep CODEMAP.md initialized and updated REGARDLESS." — the map is generated unconditionally even when a graph backend is doing the "real" analysis; the two are not substitutes for each other.
- Precedence is gated on **REQUESTED**, not "available" — an installed-but-unrequested backend does not preempt the scripts; this skill never decides on its own to install or invoke graphify/gitnexus.
- "Keep only current structural state in `CODEMAP.md` — no deltas, no changelogs." — every regeneration is a clean overwrite; do not accumulate history in the file.
- gitnexus `rename`: "always run with `dry_run: true` first" and manually triage `text_search`/`ast_search` edits (dynamic references the graph can't verify) before setting `dry_run: false` — skipping the dry run risks silently rewriting non-code string references.
- gitnexus `impact` default `maxDepth` is 3 — callers assessing risk on a large codebase must explicitly raise it or they undercount transitive blast radius.

## Invariants — do not change

- Frontmatter `name: codemap` matches the folder name and is registered in `docs/definitions/skills.md` (line with `- codemap`) — renaming either breaks that registration and every `USE SKILL \`codemap\`` reference below.
- `disable-model-invocation: true` / `user-invocable: false` — deliberate: this is a routed-to helper, not a standalone entry point; flipping either changes who can trigger it and duplicates entry paths already owned by the callers listed above.
- `description: "To generate, populate, and use a project codemap for structural discovery."` — short, keyword-dense, matches the "To <verb>..." convention used elsewhere; since model-invocation is disabled it does not drive auto-activation here, but it still is what a human/agent reads when scanning the skill list, so keep it accurate.
- Precedence order "LSPs > graphify > gitnexus > shell scripts" and the **REQUESTED**-gating — callers and the setup instructions for graphify/gitnexus assume this exact ordering.
- Cross-skill references use intent form (`MUST USE SKILL \`graphify\``) never file paths; asset routing uses `MUST APPLY SKILL FILE \`assets/gitnexus-*.md\`` — per-file, never a bare skill name, since these are files inside this skill's own folder, not another skill.
- The six asset filenames (`codemap.sh.txt`, `codemap.ps1.txt`, `gitnexus-cli.md`, `gitnexus-examples.md`, `gitnexus-setup.md`, `gitnexus-use.md`) are referenced by exact path from SKILL.md — renaming any breaks its `READ`/`APPLY SKILL FILE` lines.
- `CODEMAP.md` output contract: markdown headers of the form `path (N files) — description`, immediate-children file list, 3-4 levels deep, written to the workspace root. `large-workspace-handling` literally greps `#` headers of this file to draw scope boundaries before dispatching subagents — changing the heading shape breaks that grep, independent of any `USE SKILL` link (the coupling is to the generated file, not to this skill).
- External CLI/MCP contracts belong to gitnexus and graphify, not to Rosetta: `npx -y gitnexus@latest analyze|status|clean|wiki|list|setup` (+ `--force`, `--embeddings`, `--skip-agents-md`, `--worker-timeout`), `gitnexus://repo/{name}/...` MCP resource URIs, gitnexus tool names (`query`, `context`, `impact`, `detect_changes`, `rename`, `cypher`); graphify commands (`graphify query/path/explain`, `/graphify <path>`, `graphify update .`). Do not rephrase these — they must match the tools' own CLI/API exactly.
- `docs/CODEMAP.md` in this repo is a generated *instance* of the output contract, not this skill — do not conflate edits to that file with edits to the skill.
- `<when_to_use_skill>` is structurally absent from SKILL.md; nothing to compress (verified by grep, not by omission).

## Editing guide

- Safe to change: the extension allowlists and `describe_dir`/`Get-DirDescription` heuristics inside the two generator scripts (stack-specific tuning), the gitnexus reference content when gitnexus's own CLI/MCP surface changes upstream.
- Handle with care: the precedence block and the three `<lsp>`/`<graphify>`/`<gitnexus>` tags in SKILL.md — every caller assumes this exact routing; the `CODEMAP.md` heading format — external consumer (`large-workspace-handling`) depends on it verbatim.
- New content: generic map-generation logic goes in the two script assets; gitnexus-specific reference material goes in the matching `assets/gitnexus-*.md` file by task (setup vs CLI vs MCP-usage vs examples), not into SKILL.md itself, which stays a thin router.
- Referenced by: workflows `init-workspace-flow.md`, `init-workspace-flow-discovery.md`, `init-workspace-flow-documentation.md`, `coding-flow.md`; skills `reverse-engineering`, `coding`; and (via the generated file only, not a skill reference) `large-workspace-handling`.
