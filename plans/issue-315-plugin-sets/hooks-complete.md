# Hooks, end to end — complete discovery, analysis, and design

Issue #315 · branch `feat/315-plugin-sets` · **analysis only, no code changed.**

Supersedes nothing. `plans/issue-315-plugin-sets/hooks-redesign.md` remains correct within its scope (the `hooks.json`
*generator*). This document covers the whole hook lifecycle — authoring, bundling, generation,
packaging, runtime discovery, registration, invocation, consumption, testing, requirements, and
contract docs — and reaches a different conclusion about what the primary defect is.

**Evidence convention.** Every claim is labelled **FACT** (read from a file at a cited line, or
measured from an empirical build recorded here) or **JUDGEMENT** (my inference, with confidence).
Where a thing cannot be determined the cell says **UNDETERMINED** and states what would determine it.

---

## 0. What this found, in one page

Ordered by user impact at the shipped default (`--deterministic-hooks false`), not by how
interesting it is.

| # | Finding | Severity | Introduced |
|---|---|---|---|
| **F1** | **No hook document Rosetta ships inside a marketplace plugin has ever been verified to load.** Every *recorded successful* live-hook run behind `docs/hooks/*.md` registered its config at a **workspace** path (`.claude/settings.local.json`, `.cursor/hooks.json`, `.github/hooks/*.json`, `.devin/hooks.json`). The one recorded attempt at an unspecified other path **did not fire** (`hooks-verify-run-logs.md:58`). 27 of the 33 shipped hook documents are plugin-bundled. | **Foundational** | inception |
| **F2** | **VS Code Copilot has never received Rosetta bootstrap in plugin mode.** The hook is the only bootstrap channel a Copilot plugin has — correctly, per `FR-VAR-0070` — and it is registered as camel `sessionStart`, which VS Code does not fire. | **Broken now** | inception |
| **F3** | **`core-copilot`'s plugin-path bootstrap entry is a permanent no-op.** Its shell guard tests for `commands/coding-flow.md`, a file the `core` set does not ship. This is the only bootstrap entry that carries information no rule file can carry. | **Broken now** | #315 |
| **F4** | **The copilot marketplace plugin ships hook documents at *both* of Copilot's documented auto-discovery defaults** (`hooks.json` and `hooks/hooks.json`), with byte-identical content, and declares neither in its manifest. If both load, every hook double-registers. | **Hazard** | pre-#315 |
| **F5** | **The same per-IDE hook contract is encoded by hand in at least seven places across three packages, with no test binding any pair.** Two of them have already diverged in ways that are measurable in the shipped output. | **Structural** | accreted |
| **F6** | **The bootstrap text is maintained in two artifacts that can drift.** 93.0% of every byte of `hooks.json` in the shipped tree is a shell-escaped, JSON-escaped duplicate of two Markdown rule files that ship beside it; 4.1% is the plugin-path entry; 2.9% is actual hook wiring. On today's targets the duplication is *unavoidable* — the hook is the only channel they have — so the defect is the un-checked second copy, not the bytes. | **Structural** | inception |
| **F7** | The layout-keyed-by-target routing bug (`FR-VAR-0030`): copilot's three documents and cursor's two are byte-identical when two of them must differ. Real, small, independent, and **invisible at the shipped default**. | Latent | #315 |
| **F8** | `docs/ARCHITECTURE.md` — the file `AGENTS.md` requires orchestrators to read — is materially wrong about hooks in **six** places. | Doc defect | accreted |

**The one-sentence conclusion.** The `hooks.json` generator is not the problem; #315's redesign
debate (`hooks-redesign.md` §7.1 alternatives A and B) is a debate about the *least* broken layer.
The problem is that Rosetta has no single, tested statement of *which document each agent actually
reads, which channel delivers bootstrap, and what each IDE's tool vocabulary is* — and it currently
answers each of those questions in several places at once, differently, with no verification behind
any of them. My design (§12) targets that, and reduces the generator question to a two-line change
that falls out for free.

---

## 1. Method

### 1.1 Builds

Two full builds, written outside the repo. Both completed exit 0.

```
SP=/private/tmp/claude-502/-Users-isolomatov-Sources-GAIN-rosetta-manual-branch/\
17050692-6b5f-4cd5-98c9-1766d6dfb6e8/scratchpad

npm --prefix src/rosettify-plugins start -- \
  --source /Users/isolomatov/Sources/GAIN/rosetta-manual-branch \
  --release r3 --deterministic-hooks true  --output "$SP/gen-true"

npm --prefix src/rosettify-plugins start -- \
  --source /Users/isolomatov/Sources/GAIN/rosetta-manual-branch \
  --release r3 --deterministic-hooks false --output "$SP/gen-false"
```

Each build produced **49 output folders**. **FACT** (`ls "$SP/gen-true" | wc -l` → 49).

**The committed `plugins/` tree is byte-identical to `gen-false`** for every non-reference
`hooks.json`. **FACT** — `diff` of the two md5+size listings returned no differences. So every
measurement below at `false` is a measurement of what users actually have.

### 1.2 Set arithmetic — a correction to the brief

The brief said "6 plugin sets × 7 IDE targets". That is 42; the generator emits 49. **FACT**
(`src/rosettify-plugins/plugins.json`): there are 6 **sets** but 7 **set-variants**, because
`rosetta` declares two variants (`""` and `-light`) while the other five declare one each.
7 set-variants × 7 targets = 49.

| Set | Variants | `hooks` list | `bootstrap` |
|---|---|---|---|
| `rosetta` | `rosetta`, `rosetta-light` | all 6 advisory modules | `true` |
| `core` | `core` | all 6 advisory modules | `true` |
| `workflows` | `workflows` | `[]` | `false` |
| `qe` | `qe` | `[]` | `false` |
| `search` | `search` | `[]` | `false` |
| `modernization` | `modernization` | `[]` | `false` |

**FACT.** Consequence: only **3 of the 7 set-variants** (`rosetta`, `rosetta-light`, `core`) emit any
`hooks.json` at all. The four domain sets emit **no `hooks.json` and no `hooks/` folder** —
verified: `find workflows-* qe-* search-* modernization-* -name hooks.json | grep -v references`
returns 0, and likewise for `-type d -name hooks`. **FACT.**

### 1.3 The reference-copy exclusion — a correction to the brief

The brief said to exclude "6 verbatim probe-config copies per plugin folder". Measured:

| Quantity | Value | Command |
|---|---|---|
| Files named `hooks.json` under `**/skills/harness/references/hooks/**` | **126** | `find . -path '*skills/harness/references/hooks/*' -name 'hooks.json' \| wc -l` |
| Plus `devin/hooks.v1.json` in the same folders | **21** | same, `-name 'hooks.v1.json'` |
| Reference JSON total | **147** | |
| Plugin folders carrying them | **21**, not 49 | `find . -type d -name harness \| wc -l` |
| Files per such folder | **7** (6 × `hooks.json` + 1 × `hooks.v1.json`) | |
| All `hooks.json` in the tree | **159** | |
| **Generated, non-reference `hooks.json`** | **33** | 159 − 126 |

**FACT** for every row. Two corrections that matter for any test that adopts this exclusion:

1. The copies exist only in the **21 harness-bearing folders** — the 3 hook-bearing set-variants ×
   7 targets — because the `harness` skill ships only in `core`/`rosetta`. A glob written as
   "6 per plugin folder × 49" will mis-tally.
2. A name-based exclusion must also catch **`devin/hooks.v1.json`**, or a `hooks*.json` glob picks up
   21 extra files.

### 1.4 Sources, and which wins

`docs/hooks-verify.md:22` states the trust order verbatim:

> *"Verified facts (the `Observed` columns) are the source of truth. Code, requirements, and
> configure guides are reconciled TO that truth — never the reverse, and never ahead of it."*

**FACT.** And `docs/hooks-verify.md:17`:

> *"doc-grounded spec (DRAFT / hypothesis) → empirical live-hook test → VERIFIED truth → only then:
> code / requirements / configure changes."*

**FACT.** This ordering is the standard §5 measures the shipped output against, and it is the reason
F1 is stated as the top finding: for plugin-bundled discovery, the first arrow was never traversed.

Five kinds of "hooks.json" exist in this repo. Conflating them caused earlier errors and is worth
restating:

| Kind | Path | Authoritative for |
|---|---|---|
| Contract doc | `docs/hooks/<ide>.md` | Event names, casings, payloads, exit codes, per-runtime behavior — **as verified** |
| Configure guide | `instructions/r3/core/skills/harness/references/configure/<ide>.md` | Hook output format in *generated plugins* (INT-IDE-0002); also the only place documenting plugin manifest fields |
| Probe config | `docs/hooks/<ide>/hooks.json` | **Nothing about shipping shape.** A harness wired to `docs/hooks/tester.js`, deliberately over-registering |
| Shipped output | `plugins/<set>-<ide>/**/hooks.json` | Current behavior only |
| Reference copy | `plugins/<set>-<ide>/**/skills/harness/references/hooks/<ide>/hooks.json` | Nothing. Verbatim copies of the probe configs (§1.3) |

---

## 2. Stage 1 — Authoring: the hook runtime

Source: `/Users/isolomatov/Sources/GAIN/rosetta-manual-branch/src/hooks`.

### 2.1 The 8 modules

| Module | Declared event(s) | Declared `toolKinds` | Output kind | Support deps |
|---|---|---|---|---|
| `dangerous-actions.ts` | `PreToolUse` | `bash`, `write`, `edit`, `multi-edit`, `mcp-call` | blocking (`deny`/`reconsider`) + advisory | `dangerous-actions/evaluate.ts`, `patterns.ts` |
| `read-once.ts` | `PreRead`, `PreToolUse` | `read`, `bash` | blocking + advisory + side-effect | `read-once-shared.ts` |
| `read-once-reset.ts` | `PreCompact`, `PostCompact` | — | side-effect (no stdout) | `read-once-shared.ts` |
| `read-once-shared.ts` | **none — no `defineHook`, no `runAsCli`** | — | n/a (library) | — |
| `loose-files.ts` | `PostToolUse` | `write` | advisory only | — |
| `md-file-advisory.ts` | `PostToolUse` | `write`, `edit`, `multi-edit`, `patch`, `create`, `replace` | advisory only | — |
| `codemap-refresh.ts` | `PostToolUse` | `write`, `edit`, `multi-edit` | side-effect (backend) / advisory (fallback) | — |
| `lint-format-advisory.ts` | `PostToolUse` | `write`, `edit`, `multi-edit`, `patch`, `create`, `replace` | advisory only | — |

**FACT.** Every gate failure (event mismatch, toolKind mismatch, filePath filter, throttle) returns
`{exitCode: 0, wroteOutput: false, status: 'skipped'}` — `src/runtime/run-hook.ts:302-393`. **FACT.**
A hook bound to an event or tool its IDE never emits therefore fails **silently**, with a zero exit
code and no log. That property is what makes every mismatch in §7 invisible in production.

### 2.2 The canonical vocabulary, and the per-IDE mapping

The runtime has a canonical internal event vocabulary of 9 names — `SemanticEvent`, the keys of
`EVENTS` in `src/runtime/ide-registry.ts:6-17,19`: `PostToolUse`, `PreToolUse`, `PreRead`,
`SessionStart`, `SessionEnd`, `PreCompact`, `PostCompact`, `PrePromptSubmit`, `Stop`. And 9 canonical
tool kinds — `SemanticKind`, keys of `TOOL_KINDS` at `:44-117`. **FACT.**

Per-IDE mapping to that vocabulary exists **twice**:

| Table | Path | Live at runtime? |
|---|---|---|
| `EVENTS` / `TOOL_KINDS` / `PROPERTIES` cells | `src/runtime/ide-registry.ts:6-17, 44-117, 210-272` | **NO** |
| `EVENTS` / `TOOL_KINDS` per row | `src/runtime/ide-rows/{claude-code,codex,cursor,copilot,windsurf,antigravity}.ts` | **YES** |

**FACT, verified independently:** every import of `ide-registry` in `src/` is `import type` —
`src/types.ts:5`, `src/runtime/types.ts:1`, all six `ide-rows/*.ts:1`, `src/adapters/copilot.ts:16`.
The *keys* are load-bearing (they define the two union types); the per-IDE **cells are dead code**,
imported only by `tests/runtime/ide-registry.test.ts`. `ide-registry.ts:203-206` says so itself:
*"Mirrored (not reused) in runtime/ide-rows/antigravity.ts … which the adapter actually calls."*

**The two tables have already diverged.** Selected measured examples (**FACT**):

| IDE | `ide-registry.ts` cell | `ide-rows/*.ts` cell |
|---|---|---|
| copilot | `write: ['create_file']` :50 | `write: ['create_file','create','Write']` `copilot.ts:15` |
| copilot | `'mcp-call': null` :114 | key absent, yet `lookupToolKind` returns `'mcp-call'` on an `mcp__` prefix `copilot.ts:39-42` |
| copilot | `PreToolUse: null` :8, `PostToolUse: null` :7 | keys absent — the events exist only via payload-shape inference in `adapters/copilot.ts:30-50` |
| cursor | `read: ['Read']` :104 | `read: ['Read','TabRead']` `cursor.ts:23` |
| cursor | `PreRead: 'beforeReadFile'` :9 | plus a hardcoded `'beforeTabFileRead'` branch `cursor.ts:28-31`, absent from its own `EVENTS` |
| windsurf | `'multi-edit': null` :65 | `['MultiEdit']` `windsurf.ts:18` |

**JUDGEMENT (high):** `ide-registry.ts`'s per-IDE cells should be deleted and the two union types
extracted, or the rows should be generated from it. Keeping a dead mirror of a contract table
guarantees drift, and it has already happened.

**One suspicious cell.** `ide-rows/claude-code.ts:16` lists `write: ['Write', 'create_file']`.
`create_file` is a Copilot/VS Code tool name; Claude Code's write tool is `Write`. **JUDGEMENT
(high):** cross-contamination from the copilot row. Harmless — no generated matcher names
`create_file` for claude, so it is unreachable (§7.3) — but it is direct evidence of copy-drift
between hand-maintained per-IDE tables.

### 2.3 Windsurf: a complete runtime for a target that does not exist

`src/runtime/ide-rows/windsurf.ts`, `src/adapters/windsurf.ts` (including a 12-entry `EVENT_MAP`
translating Windsurf's snake_case `agent_action_name` vocabulary), and
`src/entrypoints/adapter-windsurf.ts` are all implemented. **FACT.**

`docs/hooks/windsurf.md` is a VERIFIED/COMPLETE contract (`docs/hooks-verify.md:6`). **FACT.**

`windsurf` is **not** in `build-bundles.mjs`'s `PLUGINS` list, **not** in `plugins.json` `targets`,
and has **no** `HOOK_LAYOUTS` entry. **FACT.** No windsurf bundle is built; no windsurf plugin is
generated. `follow.md` F7 records that an orphan `core-windsurf` bundle was removed.

---

## 3. Stage 2 — Bundling

`src/hooks/scripts/build-bundles.mjs`. **FACT** for the whole table.

| Bundle dir | Adapter aliased in | Modules bundled | Count |
|---|---|---|---|
| `dist/bundles/claude/` | `entrypoints/adapter-claude-code.ts` | all 8 | 8 |
| `dist/bundles/codex/` | `entrypoints/adapter-codex.ts` | all 8 | 8 |
| `dist/bundles/copilot/` | `entrypoints/adapter-copilot.ts` | all 8 | 8 |
| `dist/bundles/cursor/` | `entrypoints/adapter-cursor.ts` | all 8 | 8 |
| `dist/bundles/antigravity/` | `entrypoints/adapter-antigravity.ts` | 8 − `excludeHooks: ['lint-format-advisory.ts','md-file-advisory.ts','loose-files.ts']` | 5 |
| *(none)* | `entrypoints/adapter-windsurf.ts` exists | — | 0 |

Verified on disk: `ls dist/bundles/` → `antigravity claude codex copilot cursor`; the antigravity dir
holds exactly `codemap-refresh.js dangerous-actions.js read-once-reset.js read-once-shared.js
read-once.js`. **FACT.**

**Antigravity's exclusion is deliberate and cited**, not a defect —
`docs/hooks-verify.md:130`: *"**Do NOT generate for Antigravity:** `lint-format-advisory`,
`md-file-advisory`, `loose-files` — advise-only, and Antigravity has **no non-blocking delivery
channel** … Registering them would be dead weight."* **FACT.**

**Selection mechanism.** The esbuild `adapter-alias` plugin rewrites `run-hook.ts`'s
`import { adapter } from '../adapter'` to a pinned entrypoint, so `src/adapter.ts`'s 6-way runtime
`DETECTION_ORDER` is **never shipped** — each bundle knows its IDE at build time. **FACT.**

### 3.1 `read-once-shared.js` is shipped as an executable and is not one

`HOOK_SOURCES` is `readdirSync(src/hooks).filter(f => f.endsWith('.ts'))` — auto-discovery. **FACT.**
`read-once-shared.ts` has no `defineHook` and no `runAsCli`, so it is bundled as a library with no
entry point: `grep -c 'runAsCli\|defineHook' dist/bundles/claude/read-once-shared.js` → **0**. **FACT.**
It is also already inlined into its consumer:
`grep -o 'require("[^"]*")' dist/bundles/claude/read-once.js` returns only `crypto`, `fs`, `os`,
`path` — no require of `read-once-shared`. **FACT.**

It nonetheless ships to every hook-bearing plugin, because `plugins.json`
`hookSupportModules: {"read-once": ["read-once-reset","read-once-shared"]}` names it. Measured:
**21 copies, 646,674 bytes.** **FACT**
(`find . -name 'read-once-shared.js' | wc -l`; `-exec wc -c {} +`).

And a test locks it in: `src/hooks/tests/regression/read-once-template-registration.test.ts`
asserts `catalog.hookSupportModules['read-once']` **equals** `['read-once-reset','read-once-shared']`.
**FACT.**

---

## 4. Stage 3 — Generation

### 4.1 Seven templates, one line each

`src/rosettify-plugins/plugins/` holds 5 template folders and exactly 7 `hooks.json.tmpl` files.
Every one of them is the single line `{{{hooks_json}}}`. **FACT** (`cat` of all 7).

```
template-antigravity/hooks.json.tmpl
template-claude/hooks/hooks.json.tmpl
template-codex/.codex-plugin/hooks.json.tmpl
template-copilot/.github/plugin/hooks.json.tmpl
template-copilot/hooks/hooks.json.tmpl
template-cursor/hooks.json.tmpl
template-cursor/hooks/hooks.json.tmpl
```

### 4.2 Seven templates become eleven documents

Per hook-bearing set-variant. **FACT**, mechanism read from source:

| Output path | Produced by |
|---|---|
| `claude/hooks/hooks.json` | template |
| `codex/.codex-plugin/hooks.json` | template |
| `codex/.codex/hooks.json` | `pluginMirrorFiles`, `spec.mirrors = [{from:'.codex-plugin/hooks.json', to:'.codex/hooks.json'}]` (`targets.ts:409`) |
| `copilot/.github/plugin/hooks.json` | template |
| `copilot/hooks/hooks.json` | template (the *standalone-form* template, collected by the marketplace spec) |
| `copilot/hooks.json` | `pluginMirrorFiles`, `mirrors = [{from:'.github/plugin/hooks.json', to:'hooks.json'}]` (`targets.ts:372`) |
| `copilot-standalone/.github/hooks/hooks.json` | `spec.standaloneTemplates = [['hooks/hooks.json.tmpl', '.github/hooks/hooks.json.tmpl']]` (`targets.ts:519`) |
| `cursor/hooks/hooks.json` | template |
| `cursor/hooks.json` | template (root, the *standalone-form* template) |
| `cursor-standalone/.cursor/hooks.json` | `standaloneTemplates = [['hooks.json.tmpl', '.cursor/hooks.json.tmpl']]` (`targets.ts:462`) |
| `antigravity/hooks.json` | template |

11 × 3 hook-bearing set-variants = **33**, matching §1.3. **FACT.**

### 4.3 The assembler

`src/rosettify-plugins/src/plugin-processors/plugin-assemble-hooks-json.ts`. `buildHooksDocument`
takes one `HookLayout` and produces the whole document with `JSON.stringify`. `pluginAssembleHooksJson`
writes **one** value into `templateContext.hooks_json`, read by **all** of that spec's templates.
**FACT.**

`HOOK_LAYOUTS` (`src/spec/hook-layouts.ts`) is keyed by **`TargetName`** and selected once per spec
at `targets.ts:662`. **FACT.** That is the `FR-VAR-0030` routing bug (F7, §5.3) — one layout per
target, but copilot and cursor each emit two *forms*.

`emitsHooksJson` returns true when `hookModules.length > 0`, **without consulting
`deterministicHooks`**. **FACT** (`plugin-assemble-hooks-json.ts:25-33`). Consequence measured at the
shipped default: cursor emits `{"version":1,"hooks":{}}` (34 B) and antigravity emits
`{"rosetta":{"enabled":true,"PreInvocation":[]}}` (68 B) — content-free shells. `follow.md` D20
covers exactly this case (*"Empty `hooks.json` for bootstrap-less targets: not a problem, no
action"*) and cursor and antigravity are precisely the two bootstrap-less targets. **FACT.**
Not a defect; recorded so it is not re-discovered.

### 4.4 Output hygiene — all clean

| Check | Result | Command |
|---|---|---|
| `.tmpl` files leaked to output | **0** | `find . -name '*.tmpl' \| wc -l` |
| `hooks.json` containing an unrendered `{{` | **0** | `grep -rl '{{' --include='hooks.json' . \| grep -v references` |
| All 33 documents `JSON.parse` | **33/33** | per-file `node -e "JSON.parse(...)"` |

**FACT.** `JSON.stringify` assembly delivers what it promised: structural validity by construction.
Whatever design replaces it must keep that.

---

## 5. Stage 4 — Packaging: the complete document inventory

### 5.1 All 33 documents, both builds, measured

`md5 -q` + `wc -c`, non-reference only.

**`--deterministic-hooks true`** — 352,509 B total:

| md5 | bytes | path |
|---|---|---|
| `dd8ca7e0` | 542 | `core-antigravity/hooks.json` |
| `e4a6f03e` | 8023 | `core-claude/hooks/hooks.json` |
| `14383f5f` | 8467 | `core-codex/.codex-plugin/hooks.json` |
| `14383f5f` | 8467 | `core-codex/.codex/hooks.json` |
| `d7d81125` | 1524 | `core-copilot-standalone/.github/hooks/hooks.json` |
| `b13704be` | 29090 | `core-copilot/.github/plugin/hooks.json` |
| `b13704be` | 29090 | `core-copilot/hooks.json` |
| `b13704be` | 29090 | `core-copilot/hooks/hooks.json` ← **defective: must be the standalone form** |
| `900befd8` | 1054 | `core-cursor-standalone/.cursor/hooks.json` |
| `afbda2fd` | 982 | `core-cursor/hooks.json` ← **defective: must be `.cursor/hooks/`-prefixed** |
| `afbda2fd` | 982 | `core-cursor/hooks/hooks.json` |
| `dd8ca7e0` | 542 | `rosetta-antigravity-light/hooks.json` |
| `dd8ca7e0` | 542 | `rosetta-antigravity/hooks.json` |
| `e4a6f03e` | 8023 | `rosetta-claude-light/hooks/hooks.json` |
| `e4a6f03e` | 8023 | `rosetta-claude/hooks/hooks.json` |
| `14383f5f` | 8467 | `rosetta-codex-light/.codex-plugin/hooks.json` |
| `14383f5f` | 8467 | `rosetta-codex-light/.codex/hooks.json` |
| `14383f5f` | 8467 | `rosetta-codex/.codex-plugin/hooks.json` |
| `14383f5f` | 8467 | `rosetta-codex/.codex/hooks.json` |
| `bf4e264c` | 29234 | `rosetta-copilot-light/.github/plugin/hooks.json` |
| `bf4e264c` | 29234 | `rosetta-copilot-light/hooks.json` |
| `bf4e264c` | 29234 | `rosetta-copilot-light/hooks/hooks.json` ← **defective** |
| `d7d81125` | 1524 | `rosetta-copilot-standalone-light/.github/hooks/hooks.json` |
| `d7d81125` | 1524 | `rosetta-copilot-standalone/.github/hooks/hooks.json` |
| `6b49bbc4` | 29138 | `rosetta-copilot/.github/plugin/hooks.json` |
| `6b49bbc4` | 29138 | `rosetta-copilot/hooks.json` |
| `6b49bbc4` | 29138 | `rosetta-copilot/hooks/hooks.json` ← **defective** |
| `afbda2fd` | 982 | `rosetta-cursor-light/hooks.json` ← **defective** |
| `afbda2fd` | 982 | `rosetta-cursor-light/hooks/hooks.json` |
| `900befd8` | 1054 | `rosetta-cursor-standalone-light/.cursor/hooks.json` |
| `900befd8` | 1054 | `rosetta-cursor-standalone/.cursor/hooks.json` |
| `afbda2fd` | 982 | `rosetta-cursor/hooks.json` ← **defective** |
| `afbda2fd` | 982 | `rosetta-cursor/hooks/hooks.json` |

**`--deterministic-hooks false`** (= the committed tree) — 282,267 B total:

| md5 | bytes | path |
|---|---|---|
| `29724d69` | 68 | `core-antigravity/hooks.json` |
| `b8c843d9` | 6512 | `core-claude/hooks/hooks.json` |
| `2152f725` | 7006 | `core-codex/.codex-plugin/hooks.json` |
| `2152f725` | 7006 | `core-codex/.codex/hooks.json` |
| `5c484f41` | 60 | `core-copilot-standalone/.github/hooks/hooks.json` |
| `e0f3df0c` | 24437 | `core-copilot/.github/plugin/hooks.json` |
| `e0f3df0c` | 24437 | `core-copilot/hooks.json` |
| `e0f3df0c` | 24437 | `core-copilot/hooks/hooks.json` ← **defective** (must be `5c484f41`, 60 B) |
| `359d6779` | 34 | `core-cursor-standalone/.cursor/hooks.json` |
| `359d6779` | 34 | `core-cursor/hooks.json` |
| `359d6779` | 34 | `core-cursor/hooks/hooks.json` |
| `29724d69` | 68 | `rosetta-antigravity-light/hooks.json` |
| `29724d69` | 68 | `rosetta-antigravity/hooks.json` |
| `b8c843d9` | 6512 | `rosetta-claude-light/hooks/hooks.json` |
| `b8c843d9` | 6512 | `rosetta-claude/hooks/hooks.json` |
| `2152f725` | 7006 | `rosetta-codex-light/.codex-plugin/hooks.json` |
| `2152f725` | 7006 | `rosetta-codex-light/.codex/hooks.json` |
| `2152f725` | 7006 | `rosetta-codex/.codex-plugin/hooks.json` |
| `2152f725` | 7006 | `rosetta-codex/.codex/hooks.json` |
| `e11af5a7` | 24455 | `rosetta-copilot-light/.github/plugin/hooks.json` |
| `e11af5a7` | 24455 | `rosetta-copilot-light/hooks.json` |
| `e11af5a7` | 24455 | `rosetta-copilot-light/hooks/hooks.json` ← **defective** |
| `5c484f41` | 60 | `rosetta-copilot-standalone-light/.github/hooks/hooks.json` |
| `5c484f41` | 60 | `rosetta-copilot-standalone/.github/hooks/hooks.json` |
| `fc2982d6` | 24443 | `rosetta-copilot/.github/plugin/hooks.json` |
| `fc2982d6` | 24443 | `rosetta-copilot/hooks.json` |
| `fc2982d6` | 24443 | `rosetta-copilot/hooks/hooks.json` ← **defective** |
| `359d6779` | 34 | `rosetta-cursor-light/hooks.json` |
| `359d6779` | 34 | `rosetta-cursor-light/hooks/hooks.json` |
| `359d6779` | 34 | `rosetta-cursor-standalone-light/.cursor/hooks.json` |
| `359d6779` | 34 | `rosetta-cursor-standalone/.cursor/hooks.json` |
| `359d6779` | 34 | `rosetta-cursor/hooks.json` |
| `359d6779` | 34 | `rosetta-cursor/hooks/hooks.json` |

**FACT** for both tables.

### 5.2 What the two tables show that one does not

- **The cursor form defect is completely invisible at the shipped default.** At `false` all three
  cursor documents collapse to `{"version":1,"hooks":{}}` (`359d6779`, 34 B). Only at `true` do
  `core-cursor/hooks.json` (`afbda2fd`, plugin-relative) and `core-cursor-standalone/.cursor/hooks.json`
  (`900befd8`, `.cursor/hooks/`-prefixed) diverge, revealing that the root file carries the wrong
  prefix. **FACT.** Any test that only runs at `false` cannot see it.
- **Copilot's defect is visible at both settings** — `e0f3df0c` (24437 B) where `5c484f41` (60 B) is
  required — but the parity gate compares **paths only**, so it saw nothing.
- **Set-awareness works.** `core-copilot` / `rosetta-copilot` / `rosetta-copilot-light` produce three
  distinct hashes (29090 / 29138 / 29234 at `true`) because the probe path embeds
  `spec.destination`. That is a genuine post-#315 improvement over the pre-#315 hardcoded
  `core-copilot`. **FACT.**
- **The two standalone documents are stable across sets and variants**
  (`d7d81125`/`5c484f41` for copilot-standalone; `900befd8`/`359d6779` for cursor-standalone) —
  correct, since neither injects a set-dependent payload.

### 5.3 The routing defect, precisely

`FR-VAR-0030` requires `<set>-copilot/hooks/hooks.json` to be *the standalone form*. It is not: it is
byte-identical to the plugin form. The cause is one line — `targets.ts:662`,
`const layout = HOOK_LAYOUTS[name] ?? null` where `name` is a `TargetName` — combined with
`collectTmplFrames` handing every `.tmpl` in the shared `template-<family>` folder to that single
layout. **FACT.** The `copilot-standalone` and `cursor-standalone` layouts already exist and are
already correct; the marketplace specs simply cannot reach them.

**The hazard this creates, which is worse than the bug.** In a marketplace install,
`<set>-copilot/hooks/*.js` exist but `<set>-copilot/.github/hooks/*.js` do **not** — verified from
the generated tree. So restoring `FR-VAR-0030`'s letter puts a document referencing
`node ".github/hooks/dangerous-actions.js"` at one of Copilot's two auto-discovery defaults, next to
a document referencing a path that resolves. If Copilot loads that file, `node` on a missing script
exits non-zero, and `docs/hooks/copilot.md:250` records **`Fail-closed (R1): crash / non-zero exit /
timeout = deny`** for `preToolUse`. **JUDGEMENT (high): fixing FR-VAR-0030 without first resolving F4
could deny every tool call in Copilot.** This is OQ-1 in §13 and it must not be guessed at.

---

## 6. Stage 5 — Discovery: which document does each agent actually read?

This is the section that did not exist before, and it is where the analysis turns.

### 6.1 Documented hook locations, per IDE

Read fresh from the contract docs (authoritative) and the configure guides (authoritative for
generated-plugin format, INT-IDE-0002).

| IDE | Documented locations | Source |
|---|---|---|
| claude | `.claude/settings.json`; `.claude/settings.local.json`; `~/.claude/settings.json`; **plugin `hooks/hooks.json`**; `"disableAllHooks": true` | `docs/hooks/claude-code.md` "Hook Configuration & Locations" |
| codex | `.codex/hooks.json` (project); inline `[[hooks.<Event>]]` in `.codex/config.toml`; **`[features] hooks = true` required**; managed hooks via `requirements.toml`; **plugin-bundled via manifest `"hooks": "./hooks/hooks.json"`**; per-hook content-hash trust reviewed via `/hooks` | `docs/hooks/codex.md:77-84`; configure guide `codex.md:276,282` |
| cursor | `.cursor/hooks.json` (project); `~/.cursor/hooks.json` (user); three enterprise paths. **No plugin path listed.** | `docs/hooks/cursor.md:97-103`; configure guide `cursor.md:387-393` |
| copilot | `.github/hooks/*.json` (workspace); `.claude/settings.local.json`; `.claude/settings.json`; `~/.claude/settings.json` — the Claude-compat paths **confirmed real**, `hooks-verify.md:147`. Configure guide adds **"Plugin `hooks.json` at root (auto-discovered)"** and manifest default **`hooks.json` or `hooks/hooks.json`** | `docs/hooks/copilot.md` "Hook Locations (R4)"; configure guide `github-copilot.md:391,480` |
| antigravity | `.agents/hooks.json` (workspace); `~/.gemini/config/hooks.json` (user); **`~/.gemini/antigravity-cli/plugins/<name>/hooks.json` (CLI plugin)**; `settings.json` | `docs/hooks/antigravity.md` "Hook Configuration & Locations"; configure guide `antigravity.md:21,53` |
| windsurf | `.devin/hooks.json` current, `.windsurf/hooks.json` legacy | `docs/hooks/windsurf.md` |

**FACT** for every row.

### 6.2 The verification gap — F1, measured

`docs/hooks-verify-run-logs.md` records the setup of every live-hook run. Registration path per run:

| Run | Registered at | Line |
|---|---|---|
| Claude Code | `.claude/settings.local.json` | `:204` |
| Cursor Runs 1–4 | `.cursor/hooks.json` | `:232, :262, :278` |
| Windsurf Run 1 | `.windsurf/hooks.json` | `:293` |
| Windsurf/Devin Run 2 | `.devin/hooks.json` | `:304` |
| Copilot (JetBrains CLI attempt) | *unspecified path; **no hook ran*** | `:58` |

**FACT.** Every successful verification run registered at a **workspace or project** path.
**Not one run registered a hooks.json inside an installed marketplace plugin.** And
`docs/hooks-verify.md`'s 8-step protocol (`:42-52`) contains no step that verifies discovery from a
plugin install directory — it verifies *output format, event firing, payload shape and exit codes*.

`docs/hooks-verify-run-logs.md:58` is the one attempt that touched this and it failed:

> *"the JetBrains Copilot **CLI** did not load/execute `hooks.json` from where it was placed. This is
> NOT evidence that Copilot CLI lacks hook support — only that no hook ran in this setup."*

**FACT.**

**JUDGEMENT (high confidence, and the load-bearing one in this document):** the entire empirical
foundation of `docs/hooks/*.md` establishes what an IDE does *once it has loaded a hook config from a
workspace path*. It establishes nothing about whether a plugin-bundled config is loaded at all. Nine
of the eleven documents Rosetta generates per set-variant are plugin-bundled. That is **27 of the 33
shipped documents**, resting on an assumption the repo's own protocol says must never be assumed.

### 6.3 Per-document discovery classification — all 11, no gaps

Three states, per the evidence: **VERIFIED-DOCUMENTED** (a documented path, and a live run has
exercised that class of path), **DOCUMENTED-AMBIGUOUS** (documented, but two candidates ship
simultaneously and precedence is unstated), **UNDETERMINED** (no documented path in either
authoritative source, or a manifest field of unknown provenance).

| # | Document (per set-variant) | Manifest declaration | Matches a documented path? | State | What would determine it |
|---|---|---|---|---|---|
| 1 | `claude/hooks/hooks.json` | **none** — `.claude-plugin/plugin.json` declares only `commands` | **Yes** — `claude-code.md`: *"Plugin-bundled \| plugin `hooks/hooks.json`"* | **VERIFIED-DOCUMENTED** (path documented; never exercised from a plugin install — see F1) | Install `core-claude` via `/plugin` with `tester.js` wired at `hooks/hooks.json`; count invocations in `~/.rosetta/hooks.log` |
| 2 | `codex/.codex-plugin/hooks.json` | **none** — `.codex-plugin/plugin.json` declares only `skills` | **No — and the contract names a different one.** `codex.md:83` documents plugin-bundled hooks as *manifest `"hooks": "./hooks/hooks.json"`*. Rosetta ships neither that path nor that manifest field | **UNDETERMINED**, and the mismatch is concrete: the documented plugin path is `hooks/hooks.json` declared by a `hooks` manifest key; Rosetta emits `.codex-plugin/hooks.json` and declares nothing | Live probe. The cheap alternative: emit at `hooks/hooks.json` and add `"hooks": "./hooks/hooks.json"` to the codex manifest, matching `codex.md:83` exactly |
| 3 | `codex/.codex/hooks.json` | none (mirror) | **Only if the plugin folder is the project root** — which it is not in a marketplace install | **UNDETERMINED.** (Codex additionally requires `[features] hooks = true`, `codex.md:81` — this **is** documented to users at `INSTALLATION.md:132`, `codex features enable hooks`, so it is a precondition, not a gap) | Same probe |
| 4 | `copilot/.github/plugin/hooks.json` | none | **No.** `.github/plugin/` is documented as a *marketplace* discovery path (`github-copilot.md:432`), not a hooks path | **UNDETERMINED** — this is the template's home and the mirror's source; whether it is *also* read is unknown | Live probe |
| 5 | `copilot/hooks.json` (root, mirror) | none | **Yes** — guide `:480` *"Plugin `hooks.json` at root (auto-discovered)"*; manifest default `:391` | **DOCUMENTED-AMBIGUOUS** (see #6) | Live probe counting invocations with both files present, then with one removed |
| 6 | `copilot/hooks/hooks.json` | none | **Yes** — the *same* manifest default `:391` names `hooks.json` **or** `hooks/hooks.json` | **DOCUMENTED-AMBIGUOUS** — **both #5 and #6 ship, with identical content. If both load, every hook double-registers.** | As #5 |
| 7 | `copilot-standalone/.github/hooks/hooks.json` | n/a (extracted into the user's repo) | **Yes, exactly** — `.github/hooks/*.json` workspace scope | **VERIFIED-DOCUMENTED** — and this path class *was* exercised | — |
| 8 | `cursor/hooks/hooks.json` | **`"hooks": "./hooks/hooks.json"`** in `.cursor-plugin/plugin.json` | **No.** Neither `docs/hooks/cursor.md` nor the configure guide documents a plugin hooks path — the guide has **no Plugins section at all** | **UNDETERMINED** — a manifest field of unknown provenance | The vendor doc for Cursor's plugin manifest schema, or a live probe installing `core-cursor` as a Cursor plugin |
| 9 | `cursor/hooks.json` (root) | none | **No** | **UNDETERMINED**, and absent from `STRUCTURES.md` (§10) | As #8 |
| 10 | `cursor-standalone/.cursor/hooks.json` | n/a | **Yes, exactly** — project hooks file | **VERIFIED-DOCUMENTED** — exercised in Cursor Runs 1–4 | — |
| 11 | `antigravity/hooks.json` | none — `plugin.json` declares only `name`/`description`/`$schema`/`version` | **Yes** — `antigravity.md`: `~/.gemini/antigravity-cli/plugins/<name>/hooks.json`; configure guide `antigravity.md:16-21` shows `plugin.json` + `hooks.json` at the plugin root | **VERIFIED-DOCUMENTED** (path documented; plugin-install class never exercised) | Live probe |

**Tally per set-variant:** 4 VERIFIED-DOCUMENTED · 2 DOCUMENTED-AMBIGUOUS · 5 UNDETERMINED.
Across the shipped tree (×3): **12 · 6 · 15.**

**JUDGEMENT (medium-high):** the two standalone documents are the only ones whose discovery is both
documented *and* exercised by a real run. Everything Rosetta ships through a marketplace plugin is,
on the repo's own evidence standard, a hypothesis.

### 6.4 Generated manifests, verbatim

For `core-*` at `--deterministic-hooks true`. **FACT.**

| Target | Manifest path | Hook-relevant fields |
|---|---|---|
| claude | `.claude-plugin/plugin.json` | `"commands": "./workflows/"` — **no `hooks`, no `rules`** |
| codex | `.codex-plugin/plugin.json` | `"skills": "./.agents/skills/"` — **no `hooks`, no `rules`** |
| copilot | `.github/plugin/plugin.json` | `"skills": ["skills/"], "commands": ["commands/"]` — **no `hooks`, no `rules`** |
| cursor | `.cursor-plugin/plugin.json` | `"rules": [3 .mdc paths], "hooks": "./hooks/hooks.json"` |
| antigravity | `plugin.json` (root) | `name`, `description`, `$schema`, `version` — nothing else |
| copilot-standalone | `plugin.json` (root) | `{"name":"core-standalone","version":"3.1.13"}` |
| cursor-standalone | `plugin.json` (root) | `{"name":"core-standalone","version":"3.1.13"}` |

Only **one** of seven targets declares its hooks. `src/spec/targets.ts:333` is the single
`manifestConditionalFields` entry doing it, and it belongs to cursor —
`{ field: 'hooks', requires: HOOKS_PSEUDO_FOLDER, value: './hooks/hooks.json' }`. **FACT.**

---

## 7. Stage 6 — Registration: what each document actually says

### 7.1 Structural dump, one document per layout, at `--deterministic-hooks true`

**FACT**, parsed from `gen-true`.

**`core-claude/hooks/hooks.json`** — envelope `{hooks:{…}}`, every binding **grouped**, entries
`{type, command}`, commands `node "${CLAUDE_PLUGIN_ROOT}/hooks/<m>.js"`:

| Event | Matcher | Modules |
|---|---|---|
| `SessionStart` | `startup` | 3 bootstrap entries (`{type,command,once}`) |
| `PostCompact` | `""` | `read-once-reset` |
| `PreToolUse` | `Bash\|mcp__.*` | `dangerous-actions` |
| `PreToolUse` | `Read\|Bash` | `read-once` |
| `PostToolUse` | `Write` | `loose-files`, `md-file-advisory` |
| `PostToolUse` | `Edit\|Write\|MultiEdit` | `codemap-refresh` |
| `PostToolUse` | `Write\|Edit\|MultiEdit` | `lint-format-advisory` |

(The last two matchers are the same set in different order. **FACT**; semantically inert under
Claude's alternation rules; preserved deliberately for byte-equality against the pre-#315 golden.)

**`core-codex/.codex-plugin/hooks.json`** — envelope `{hooks:{…}}`, grouped, entries `{type,command}`
(bootstrap adds `statusMessage`, `timeout`), commands `node .codex/hooks/<m>.js`:

| Event | Matcher | Modules |
|---|---|---|
| `SessionStart` | `startup\|resume` | 3 bootstrap entries |
| `PostCompact` | `""` | `read-once-reset` |
| `PreToolUse` | `Bash\|mcp__.*` | `dangerous-actions` |
| `PreToolUse` | `Bash\|shell` | `read-once` |
| `PostToolUse` | `Write\|apply_patch\|functions.apply_patch` | `loose-files`, `md-file-advisory` |
| `PostToolUse` | `Write\|Edit\|apply_patch\|functions.apply_patch` | `codemap-refresh` |
| `PostToolUse` | `Write\|Edit\|apply_patch\|functions.apply_patch` | `lint-format-advisory` |

**`core-copilot/.github/plugin/hooks.json`** — envelope `{version:1,hooks:{…}}`, **mixed grouping**,
entries `{type, bash, powershell}` (**no `command` key anywhere**), commands = a two-base install-dir
probe loop:

| Event | Shape | Matcher | Modules |
|---|---|---|---|
| `sessionStart` | **flat** | — | 3 bootstrap entries |
| `preCompact` | **flat** | — | `read-once-reset` |
| `PreToolUse` | grouped | `Bash\|mcp__.*` | `dangerous-actions` |
| `PreToolUse` | grouped | `view\|Read\|bash\|powershell` | `read-once` |
| `PostToolUse` | grouped | `Write\|create_file` | `loose-files`, `md-file-advisory` |
| `PostToolUse` | grouped | `Write\|Edit\|create_file\|replace_string_in_file\|multi_replace_string_in_file` | `codemap-refresh` |
| `PostToolUse` | grouped | *(same)* | `lint-format-advisory` |

**`core-copilot-standalone/.github/hooks/hooks.json`** — same events, same matchers, same grouping;
entries are `{type, command}` with `node ".github/hooks/<m>.js"`; and `sessionStart` is a **literal
empty array**. **FACT.** Four axes differ from the plugin form, not one: entry keys, addressing,
bootstrap disposition, and which distribution reads it.

**`core-cursor/hooks/hooks.json`** — envelope `{version:1,hooks:{…}}`, **flat throughout**, entries
`{command}` or `{matcher, command}`, **no `type` key**, commands `node hooks/<m>.js`. **No
session-start key of any kind:**

| Event | Matcher | Module |
|---|---|---|
| `beforeReadFile` | — | `read-once` |
| `beforeTabFileRead` | — | `read-once` |
| `preCompact` | — | `read-once-reset` |
| `preToolUse` | `Bash\|Shell\|mcp__.*` | `dangerous-actions` |
| `preToolUse` | `Read\|Bash\|Shell` | `read-once` |
| `postToolUse` | `Write` | `loose-files` |
| `postToolUse` | `Write\|Edit` | `md-file-advisory` |
| `postToolUse` | `Write\|Edit` | `codemap-refresh` |
| `postToolUse` | `Write\|Edit` | `lint-format-advisory` |

`core-cursor-standalone/.cursor/hooks.json` is identical modulo the `.cursor/hooks/` command prefix.
**FACT** — the only difference between the two cursor forms, confirmed field by field.

**`core-antigravity/hooks.json`** — envelope `{rosetta:{enabled:true, PreInvocation:[], …}}`,
grouped, entries `{type, command, timeout: 30}`, commands `node hooks/<m>.js`:

| Event | Matcher | Module |
|---|---|---|
| `PreInvocation` | — | **empty array, always** |
| `PreToolUse` | `run_command\|mcp__.*` | `dangerous-actions` |
| `PreToolUse` | `view_file\|run_command` | `read-once` |

### 7.2 Module × target binding matrix — complete, with every deliberate omission

**FACT.** "—" means the module is not bound in that document. `[b]` = bundle also shipped.

| Module | claude | codex | copilot (plugin) | copilot-standalone | cursor (both forms) | antigravity |
|---|---|---|---|---|---|---|
| `dangerous-actions` | `PreToolUse` / `Bash\|mcp__.*` grouped `[b]` | `PreToolUse` / `Bash\|mcp__.*` grouped `[b]` | `PreToolUse` / `Bash\|mcp__.*` grouped `[b]` | same `[b]` | `preToolUse` / `Bash\|Shell\|mcp__.*` flat `[b]` | `PreToolUse` / `run_command\|mcp__.*` grouped `[b]` |
| `read-once` | `PreToolUse` / `Read\|Bash` grouped `[b]` | `PreToolUse` / `Bash\|shell` grouped `[b]` | `PreToolUse` / `view\|Read\|bash\|powershell` grouped `[b]` | same `[b]` | `preToolUse` / `Read\|Bash\|Shell` flat **+ `beforeReadFile` flat + `beforeTabFileRead` flat** `[b]` | `PreToolUse` / `view_file\|run_command` grouped `[b]` |
| `read-once-reset` | `PostCompact` / `""` grouped `[b]` | `PostCompact` / `""` grouped `[b]` | `preCompact` flat `[b]` | same `[b]` | `preCompact` flat `[b]` | **— not bound.** No compaction event exists in Antigravity (`docs/hooks/antigravity.md`, 5 events). **Bundle still ships** `[b]` via `hookSupportModules` closure |
| `read-once-shared` | **— never bound anywhere.** Library, no CLI entry (§3.1) `[b]` | `[b]` | `[b]` | `[b]` | `[b]` | `[b]` |
| `loose-files` | `PostToolUse` / `Write` grouped `[b]` | `PostToolUse` / `Write\|apply_patch\|functions.apply_patch` grouped `[b]` | `PostToolUse` / `Write\|create_file` grouped `[b]` | same `[b]` | `postToolUse` / `Write` flat — **own binding, split from md-file-advisory** `[b]` | **— not bound, and no bundle built.** `hooks-verify.md:130` |
| `md-file-advisory` | `PostToolUse` / `Write` grouped, same group as loose-files `[b]` | same group `[b]` | same group `[b]` | same group `[b]` | `postToolUse` / `Write\|Edit` flat — **separate binding, different matcher** `[b]` | **— not bound, no bundle.** `hooks-verify.md:130` |
| `codemap-refresh` | `PostToolUse` / `Edit\|Write\|MultiEdit` grouped `[b]` | `PostToolUse` / `Write\|Edit\|apply_patch\|functions.apply_patch` grouped `[b]` | `PostToolUse` / `Write\|Edit\|create_file\|replace_string_in_file\|multi_replace_string_in_file` grouped `[b]` | same `[b]` | `postToolUse` / `Write\|Edit` flat `[b]` | **— not bound.** Bundle **is** built for antigravity but `modulesForTarget` drops it, so it is never copied |
| `lint-format-advisory` | `PostToolUse` / `Write\|Edit\|MultiEdit` grouped `[b]` | as codemap-refresh `[b]` | as codemap-refresh `[b]` | same `[b]` | `postToolUse` / `Write\|Edit` flat `[b]` | **— not bound, no bundle.** `hooks-verify.md:130` |

Shipped bundles per target, verified on disk (**FACT**): claude/codex/copilot/copilot-standalone/
cursor/cursor-standalone = 8 each; **antigravity = 4** (`dangerous-actions`, `read-once`,
`read-once-reset`, `read-once-shared`).

**Two dead files, measured:**
- `read-once-shared.js` — 21 copies, 646,674 B, never bound anywhere, already inlined (§3.1).
- `read-once-reset.js` in the 3 antigravity folders — bound to no event that Antigravity has.

### 7.3 Matcher tokens vs. what the runtime can classify

Machine cross-check of every matcher in every generated document against the live
`ide-rows/*.ts` `TOOL_KINDS` vocabularies. **FACT** (script and output recorded in the scratchpad;
`startup`/`startup|resume` are SessionStart matchers, not tool names, and are excluded).

| Document | Matcher tokens the adapter cannot classify | Tool names the adapter knows that no matcher registers |
|---|---|---|
| claude | *(none)* | `create_file` — but see §2.2: that entry is itself suspect |
| codex | **`Edit` × 2 bindings** (`codemap-refresh`, `lint-format-advisory`) | *(none)* |
| cursor (both forms) | *(none)* | `TabWrite`, `TabRead` |
| copilot (both forms) | *(none)* | `create`, `edit`, `run_in_terminal`, `read_file` |
| antigravity | *(none)* | `write_to_file`, `replace_file_content`, `multi_replace_file_content` — **deliberate**, see below |

**`Edit` on codex is a dead token.** `src/hooks/src/runtime/ide-rows/codex.ts:17-25` contains the
string `'Edit'` **zero** times (verified: `grep -c "'Edit'"` → 0). Codex's edit vocabulary is
`apply_patch` / `functions.apply_patch`. So `lookupToolKind('Edit')` returns `null`, the toolKind gate
at `run-hook.ts:316` skips, and the hook exits 0 silently. **FACT.** Harmless today because
`apply_patch` is also in the same matcher — but it is a matcher token that can never match, sitting
in the shipped tree, that nothing detects.

**Antigravity's write/edit omission is deliberate and documented** —
`docs/ARCHITECTURE.md:414`: *"Registration is deliberately narrower as a release step: every IDE
`hooks.json` matcher names shell and MCP tools only … The write and edit evaluation is implemented
and held back, not missing."* **FACT.** Same clause covers the `dangerous-actions` write/edit/
multi-edit evaluators being unreachable on **every** target. Not a defect.

**`cursor`'s `TabWrite`/`TabRead`**: `TabRead` reads are partly covered by the separate
`beforeTabFileRead` binding; `TabWrite` writes reach no advisory hook. **JUDGEMENT (medium):** a real
gap, small, needs a Cursor-side decision rather than a code fix.

**Cursor's `beforeShellExecution` / `afterShellExecution`**: the runtime has an `EVENT_TOOL_NAME` map
for them (`ide-rows/cursor.ts:79-84`) but no layout binds them. **FACT.** `docs/hooks/cursor.md:16`
warns that wiring a Bash guard on both `beforeShellExecution` **and** `preToolUse` double-fires it —
so not binding them is defensible. **JUDGEMENT:** deliberate, but undocumented as such.

---

## 8. Stage 7 — Invocation and consumption

### 8.1 Output channels per adapter

**FACT**, from `src/hooks/src/adapters/*.ts`.

| IDE | Advisory channel | Deny channel | Exit code | Capability limit encoded in the adapter |
|---|---|---|---|---|
| claude-code | `hookSpecificOutput.additionalContext` (identity pass-through) | `hookSpecificOutput.permissionDecision` + `continue:false` | 0 | none |
| codex | `hookSpecificOutput.additionalContext` | `hookSpecificOutput.permissionDecision:'deny'` — **PreToolUse only** | 0 | **Strict closed-world validator** (`codex-output.ts:118-224`); any stray key invalidates the whole output. **`PostToolUse` carries no `permissionDecision` at all — a deny there silently degrades to context-only** (`adapters/codex.ts:64-68`) |
| cursor | `additional_context` (flat snake_case, **no wrapper**) | `permission:'deny'` + `user_message` | 0 deliberately | `adapters/cursor.ts:61-64`: exit-2 was tested and Cursor dumps the body raw — *"do not add a deny→2 override"* |
| copilot | `additionalContext` **and** `hookSpecificOutput.additionalContext` — both emitted | `permissionDecision`/`Reason` at **both** placements | 0 | CLI honors top-level, VS Code honors nested, each ignores the other. Documented caveat in the code: the merge is **not event-aware** and would emit an illegal `hookSpecificOutput` on `SubagentStop` |
| antigravity | `injectSteps[].userMessage` | `decision:'deny'` + `reason` | 0 | `adapters/antigravity.ts:140-145`: `injectSteps` **only reaches the model on Pre/PostInvocation** — advisory output is a no-op on Pre/PostToolUse. This is the reason for the bundle exclusion in §3 |
| windsurf | **none — stdout is always `{}`** | exit code **2** + stderr | deny → 2, else 0 | `adapters/windsurf.ts:78-81`: *"Windsurf never parses stdout as JSON … there is NO stdout output contract at all."* **`advise` has no channel whatsoever** |

### 8.2 Bootstrap: what the payload actually contains

Every bootstrap-bearing document carries exactly **3 entries**. **FACT**, measured:

| # | Entry | claude | codex | copilot |
|---|---|---|---|---|
| 0 | body of `plugin-files-mode` rule | `printf '%s' '{"hookSpecificOutput":…}'` | same | `printf`/`Write-Output` with `{"additionalContext":…,"hookSpecificOutput":…}` |
| 1 | body of `bootstrap-alwayson` rule | same | same | same |
| 2 | **the plugin's own absolute path** | `${CLAUDE_PLUGIN_ROOT}` env var | upward walk for `.agents/rules/plugin-files-mode.md` | two-base install-dir probe |

`src/bootstrap/payload.ts` `findDocBody` locates entries 0 and 1 **from the plugin's own frames** —
i.e. they are the verbatim bodies (frontmatter stripped, folder-rewritten) of the same
`rules/plugin-files-mode.md` and `rules/bootstrap-alwayson.md` files being written into the plugin.
**FACT.**

**Measured across the shipped tree** (33 documents, 282,267 B):

| Component | Bytes | Share |
|---|---|---|
| Entries 0+1 — duplicated rule bodies | **262,587** | **93.0 %** |
| Entry 2 — the plugin-path entry | 11,433 | 4.1 % |
| Everything else — envelope, events, matchers, module commands | 8,247 | 2.9 % |

**FACT.** At `--deterministic-hooks true` the third row grows but the ratio stays above 74 %.

**JUDGEMENT:** the bytes are a symptom, not the disease. Entry 2 is the only thing a hook can deliver
that a rule cannot — a path known only at runtime. Entries 0 and 1 exist because for some targets the
hook is the *only* channel that reaches the model. Which targets those are is decided implicitly in
four separate places (§8.3), and nowhere stated.

### 8.3 Bootstrap channel per target — the rule, and where the output breaks it

Every target ships `bootstrap-alwayson` and `plugin-files-mode` as rule files. **FACT** — verified in
`gen-true` for all seven. Whether those files can be *loaded* differs completely:

| Target | Rule files shipped at | Manifest declares rules? | Is there a rules channel? | Hook bootstrap? | **Net channel** |
|---|---|---|---|---|---|
| claude | `rules/*.md` | no | **UNDETERMINED** — the configure guide's Plugins section documents installation only, no component fields, and lists no plugin `rules` component | `SessionStart` / `startup`, `payload: inject` | **hook (rules unverified)** |
| codex | `.agents/rules/*.md` | no | **No, as shipped.** The guide (`codex.md:23`) says `.agents/rules/*.md` are "not standard - our decision" and must be referenced from `AGENTS.md` INDEX-style. **No `AGENTS.md` is generated anywhere in the output** (`find . -name AGENTS.md` → 0) | `SessionStart` / `startup\|resume`, `inject` | **hook only** |
| copilot (plugin) | `rules/*.md` | no | **No.** The manifest field table (`github-copilot.md:388-393`) lists `agents`, `skills`, `commands`, `hooks`, `mcpServers`, `lspServers` — **there is no `rules` field**, and the plugin ships no `.github/copilot-instructions.md` and no `.github/instructions/` | `sessionStart` (camel), `inject` | **hook only — and dead in VS Code (F2)** |
| copilot-standalone | `.github/instructions/*.instructions.md` with `applyTo: "**"` | n/a — VS Code custom instructions auto-apply | **Yes** | `sessionStart`, `payload: 'empty'` — key present, array always `[]` | **instructions only** |
| cursor (plugin) | `rules/*.mdc`, `alwaysApply: true` | **yes** — `"rules": [3 paths]` | **Yes** | none — `bootstrap: null`; payload assembled then **discarded** | **rules only** |
| cursor-standalone | `.cursor/rules/*.mdc` | n/a — project rules auto-load | **Yes** | none | **rules only** |
| antigravity | `rules/*.md`, `trigger: always_on` | n/a — configure guide `antigravity.md:16-17` shows `rules/` inside the plugin folder, activated by `trigger:` frontmatter | **Yes** | none — `FR-VAR-0082` | **rules only** |

**FACT** for every cell except the claude row's third column, marked UNDETERMINED.

**The rule is written down — and its "otherwise" branch is unverified.** `FR-VAR-0070` (Approved,
changed 2026-09-02) states it: *"A target shall deliver bootstrap via session-start hooks **if and
only if** BOTH the building set declares its bootstrap flag AND that target's hook layout declares a
bootstrap slot whose payload discriminant is `inject`"*, otherwise *"content delivered by auto-loaded
rules/instructions"*. And `INT-IDE-0002` (Approved) makes the per-IDE configure guide *"authoritative
for … bootstrap-delivery capability — including whether the IDE natively auto-loads rules or
instructions versus requiring session-start hooks."* **FACT.**

So the design is sound and the requirements are right. Two things are nonetheless wrong in the
output:

1. **Copilot plugin: the `inject` branch is taken (correct per FR-VAR-0070) but registered under a
   key VS Code does not fire** — F2. The channel exists on paper and not in that runtime.
2. **Copilot plugin ships `rules/*.md` that no channel can load** — the manifest schema has no
   `rules` field. Harmless, but it is three files of dead weight per plugin and it is what makes
   `ARCHITECTURE.md:373`'s *"Copilot relies on rules"* read as true when it is not.

Nothing enforces `FR-VAR-0070`'s "otherwise" branch: no test asserts that a target with
`bootstrap: null` actually has a working rules channel, and no test asserts that a target with
`payload: 'inject'` registers a key its runtime fires.

**F2 — the case where the rule breaks.** Copilot's marketplace plugin has **no** rules channel *and*
its hook is registered as camel `sessionStart`. Two independent sources say VS Code will not fire
that key:

- `instructions/r3/core/skills/harness/references/configure/github-copilot.md` (Hooks section):
  *"**Register PascalCase event names only** — VS Code fires PascalCase exclusively, and Copilot
  CLI's PascalCase fire works too (registering both casings makes Copilot CLI fire each event
  TWICE)."* **FACT.** This guide is authoritative for generated-plugin hook format (INT-IDE-0002).
- `docs/hooks/copilot.md` Hook Events table: `SessionStart` (R4) → `✓ VC + CLI-s`;
  `sessionStart` (R1) → `✓ CLI-c` only. **FACT.**

Yet `src/spec/hook-layouts.ts` ships `bootstrap: { event: 'sessionStart', flat: true, payload:
'inject' }` for both copilot layouts, and `{ event: 'preCompact', … }` for `read-once-reset`. **FACT**
— confirmed in the generated output: the top-level key is `sessionStart`.

**JUDGEMENT (high): in VS Code Copilot, the Rosetta bootstrap has never been delivered by any
channel in plugin mode.** What would determine it: install `core-copilot` in VS Code Copilot with
`tester.js` wired at each candidate hooks path and count invocations in `~/.rosetta/hooks.log`, per
`docs/hooks-verify.md` step 3.

**F3 — and for the `core` set, even the CLI gets nothing extra.** The plugin-path entry (entry 2, the
only non-duplicated one) is guarded on a file the set does not ship. From the **committed**
`plugins/core-copilot/hooks.json`:

```
for base in "$HOME/.vscode/agent-plugins" "$HOME/.local/share/Code/agentPlugins";
do root="$base/github.com/griddynamics/rosetta/plugins/core-copilot";
   if [ -f "$root/commands/coding-flow.md" ]; then printf '%s' "{…Rosetta Plugin Path: $root…}"; break; fi;
done
```

`core-copilot/commands/` contains 17 files; `coding-flow.md` is **not** among them (it moved to the
`workflows` set in #315). **FACT** — verified in both the generated tree and the committed tree.
`rosetta-copilot` and `rosetta-copilot-light` do ship it, so they are unaffected.

The guard literal lives in `src/spec/bootstrap-manifest.ts` `COPILOT_PLUGIN_ROOT_BASH` /
`COPILOT_PLUGIN_ROOT_POWERSHELL`, which #315 correctly parameterised on `destination` but left the
guard filename hardcoded. **FACT.** This is the exact failure mode #315 was supposed to eliminate: a
per-IDE literal that silently assumes one fixed set's content.

### 8.4 What the rules tell the model, and where that is false

`plugin-files-mode` states, in **every** target's copy: *"RUNNING AS PLUGIN — Plugin Mode Active,
context appended via hooks"* and *"not only the one the hook reports"*. **FACT** — verified verbatim in
`core-cursor/rules/plugin-files-mode.mdc` and `core-antigravity/rules/plugin-files-mode.md`.

For cursor and antigravity **no hook appends context and no hook reports anything** — their bootstrap
payload is assembled and discarded (`plugin-assemble-cursor-bootstrap.ts`,
`plugin-assemble-antigravity-bootstrap.ts`, both explicit in their headers). **FACT.** The model is
being told to expect a channel that does not exist for it, and is given no plugin path at all.

**JUDGEMENT (medium):** for cursor and antigravity this is at best noise and at worst a wrong-path
instruction, since the rule tells the model to resolve `skills/*/SKILL.md` relative to a plugin root
it was never told.

---

## 9. Cross-cutting: how many places encode the same per-IDE fact

Every location that independently encodes some part of one IDE's hook contract. **FACT** for
existence; the "binds to" column is what keeps it in agreement with its neighbours.

| # | Location | Encodes | Bound to any other by a test? |
|---|---|---|---|
| 1 | `docs/hooks/<ide>.md` × 7 | Verified event names, casings, payload keys, exit codes, limits | — (it is the reference) |
| 2 | `instructions/r3/core/skills/harness/references/configure/<ide>.md` × 8 | Same, restated for end users; **plus** plugin manifest fields and hook discovery paths | **No** |
| 3 | `src/hooks/src/runtime/ide-registry.ts` cells | Events + tool vocabularies + payload paths, all 6 IDEs | **No** — and **dead at runtime** |
| 4 | `src/hooks/src/runtime/ide-rows/*.ts` × 6 | Events + tool vocabularies + payload accessors | **No** |
| 5 | `src/hooks/src/adapters/*.ts` × 7 | Output shapes, exit codes; **plus copilot's and antigravity's event inference, which exists nowhere else** | **No** |
| 6 | `src/hooks/scripts/build-bundles.mjs` `excludeHooks` | Which modules an IDE can usefully run | **No** |
| 7 | `src/rosettify-plugins/src/spec/hook-layouts.ts` | Envelope, events, casings, matchers, grouping, entry keys, addressing, bootstrap disposition | Partially — by a **substring grep** (§11) |
| 8 | `src/rosettify-plugins/src/spec/bootstrap-manifest.ts` | Per-IDE bootstrap root-entry command literals | **No** |
| 9 | `src/rosettify-plugins/src/escaping/json-string.ts` | Per-IDE payload JSON shape (`buildCopilotHookPayloadJson`, `buildCursorHookPayloadJson`) | **No** |
| 10 | `src/rosettify-plugins/src/bootstrap/payload.ts` | Per-IDE bootstrap entry object shape × 5 | **No** |
| 11 | `src/rosettify-plugins/src/spec/targets.ts` | `hookFolder`, `mirrors`, `standaloneTemplates`, the cursor-only manifest `hooks` field | **No** |
| 12 | `src/rosettify-plugins/plugins/template-*/**/hooks.json.tmpl` × 7 | Output **location** per form (their content is one placeholder) | **No** |
| 13 | `src/hooks/tests/regression/hooks-registered.test.ts` `CANONICAL_HOOKS_JSONS` | Which document is "the" one per plugin | it *is* a test — but see §11 |
| 14 | `docs/requirements/plugin-generator/*` | Required paths, forms, entry shapes | *(see §10)* |
| 15 | `docs/ARCHITECTURE.md` §Hooks Runtime | Prose restatement of most of the above | **No** — and wrong in 6 places (§9.1) |

**Fifteen locations. Zero cross-checks between packages** except #13 and one substring grep.
Verified: `grep -rln 'ide-rows\|ide-registry\|TOOL_KINDS' src/rosettify-plugins/` → **no matches**;
`grep -rln 'hook-layouts\|HOOK_LAYOUTS' src/hooks/` → **one** file,
`tests/regression/read-once-template-registration.test.ts`, which reads `hook-layouts.ts` as **plain
text** and asserts substrings. **FACT.**

**JUDGEMENT (high): this, not the layout key, is the defect that produced every other finding in this
document.** The codex `Edit` dead token, the `ide-registry`↔`ide-rows` divergence, the claude row's
stray `create_file`, the `core-copilot` guard file, the three different answers about which copilot
document is canonical (§9.1) — each is one hand-maintained table drifting from another with nothing
to catch it.

### 9.1 `docs/ARCHITECTURE.md` — six wrong statements about hooks

`AGENTS.md` requires top-level and orchestrator agents to read this file. Each row is a measured
contradiction. **FACT.**

| Line | Claim | Measured reality |
|---|---|---|
| `:358` | *"Copilot session locking — the generated hooks include a file-based lock ensuring each bootstrap entry fires exactly once per session"* | **No lock exists.** `src/rosettify-plugins/src/bootstrap/copilot-lock.ts` is deleted (`ls src/bootstrap/` → `payload.ts` only); the shipped copilot bootstrap entries are plain `printf`/`Write-Output`. Removed with `FR-HOOK-0006` |
| `:373` | *"Bootstrap payloads are embedded in Claude/Codex hook templates; Cursor and Copilot rely on rules and instructions instead"* | **False for the copilot marketplace plugin**, which embeds a 3-entry, ~23 KB payload *and* has no rules channel (§8.3). True only for `copilot-standalone`. Antigravity is not mentioned at all |
| `:420` | claude marketplace hooks.json is *"referenced from `plugin.json`"*, path style `node hooks/<file>.js` | `.claude-plugin/plugin.json` has **no `hooks` field** (auto-discovered), and the commands are `node "${CLAUDE_PLUGIN_ROOT}/hooks/<m>.js"` |
| `:422` | copilot reads *"`<plugin>/hooks.json` (root, copied from `.github/plugin/hooks.json`)"* | Correct as far as it goes, but **omits `hooks/hooks.json`**, which also ships and is the *other* documented auto-discovery default (F4) |
| `:423` | codex path style *"`node <abs-path>/hooks/<file>.js` via shell lookup"* | Measured: `node .codex/hooks/<m>.js` — a fixed repo-relative path. The shell lookup exists only in the bootstrap plugin-path entry |
| `:434` | bundles sync to `plugins/{rosetta,rosetta-light,core}-{claude,cursor,copilot}/hooks/` | The light variant folders are `rosetta-<ide>-light`, not `rosetta-light-<ide>`; and **antigravity is omitted** although `plugins/*-antigravity/hooks/` does receive 4 bundles |

`:414` (the `dangerous-actions` narrow-registration paragraph) is **correct and load-bearing** — it is
the citation that turns §7.3's antigravity row from a defect into a documented decision.

---

## 10. Stage 8 — Requirements

The hook corpus is **63 requirement units** across `docs/requirements/plugin-generator/` plus 4 in
`docs/requirements/rosettify/` (different component; note the id collisions `FR-HOOK-0001`,
`FR-GEN-0001`, `FR-ARCH-0004` exist in both trees). **FACT.**

### 10.1 Coverage of the 11 documents — the table that was missing

For each generated document: which unit mandates it, and whether the unit is correct.

| # | Document | Existence mandated by | Path named in **normative** text? | Content mandated by | Verdict |
|---|---|---|---|---|---|
| 1 | `claude/hooks/hooks.json` | `FR-VAR-0010`, `FR-GEN-0010` AC1, `FR-STRUCT-0010` via `STRUCTURES.md:15` | **Yes** — three independent statements | `DATA-CFG-0008` AC5/AC6, `FR-HOOK-0005` AC3, `FR-HOOK-0007` AC5, `FR-SET-0070`, `NFR-0005` | **Fully covered.** Shipped file matches `FR-HOOK-0005` AC3 verbatim |
| 2 | `codex/.codex-plugin/hooks.json` | `FR-STRUCT-0010` via `STRUCTURES.md:55`, `DATA-CFG-0005` notes | **Yes** | `DATA-CFG-0008` AC5/AC6, `FR-HOOK-0005` AC4, `FR-HOOK-0007` AC6 | **Covered** — but the *path* contradicts `codex.md:83` (§6.3 row 2) |
| 3 | `codex/.codex/hooks.json` | `FR-VAR-0041` statement + AC1 (*"mirror hook configuration to the Codex runtime location"*) | **NO.** The exact path appears only in `implementationNotes`. `STRUCTURES.md:57` names the **wrong** path — `.codex/hooks/{hooks.json,*.js}` — and that line is normative through `FR-STRUCT-0010` | **Nothing** requires the mirror to be byte-identical, nor whether it should re-resolve paths | **PARTIALLY COVERED.** Exact path: **no correct requirement**; byte-identity: **no requirement** |
| 4 | `copilot/.github/plugin/hooks.json` | `FR-VAR-0030`, `FR-VAR-0031` AC1, `FR-STRUCT-0010` via `STRUCTURES.md:39`, `AC-14` | **Yes** — but only in units that are `Draft` with **empty `approved_by`** | `DATA-CFG-0008` AC5/AC6, `FR-HOOK-0005` AC5/AC6, `FR-HOOK-0007` AC6/AC7, `NFR-0009` | **Covered, weakly approved** |
| 5 | `copilot/hooks.json` (root) | `FR-VAR-0030` AC2/AC3, `FR-VAR-0031`, `FR-COPY-0033`, `AC-14`, `STRUCTURES.md:40,50` | **Yes** | `FR-VAR-0030` AC3 (byte-identical, same MD5) — **satisfied, measured** | **Fully covered**, by two unapproved Drafts |
| 6 | `copilot/hooks/hooks.json` | `FR-VAR-0030` statement (3), `STRUCTURES.md:42`, `AC-14`, `FR-VAR-0071` | **Yes** | `FR-VAR-0030` **AC4** requires `"sessionStart": []` — **not produced**; and `DATA-CFG-0008` AC1 structurally forbids a second document per target | **Existence covered; the content requirement is unachievable under the approved model.** Effectively **no valid requirement covers this file's content** |
| 7 | `copilot-standalone/.github/hooks/hooks.json` | `FR-VAR-0051` + AC1, `FR-STRUCT-0020` via `STRUCTURES.md:89`, `FR-SEED-0002` AC2 | Partial — `STRUCTURES.md:89` gives it relative to `.github/`, which resolves correctly | `DATA-CFG-0008` **AC4** (`payload:'empty'`, key present and empty) + AC6. Shipped: `{"version":1,"hooks":{"sessionStart":[]}}` — **exact match** | **Fully covered.** The best-specified document in the whole set |
| 8 | `cursor/hooks.json` (root) | **NOTHING.** `STRUCTURES.md:27` lists a **`[P]` `.tmpl`** at this path, not a `[G]` output — while `STRUCTURES.md:5` states *"No output tree contains a `.tmpl` file"* | **No** | **Nothing.** Nothing requires or forbids it being byte-identical to `hooks/hooks.json` (it is) | **NO REQUIREMENT COVERS THIS — existence, path, or content.** The largest single gap |
| 9 | `cursor/hooks/hooks.json` | `FR-VAR-0020`, `FR-STRUCT-0010` via `STRUCTURES.md:28`, `FR-GEN-0010` AC1 | **Yes** | `DATA-CFG-0008` AC3 (`bootstrap: null`) + AC6, `FR-VAR-0070`, `FR-SET-0070` AC7 | **Covered** — but `STRUCTURES.md:19`'s section heading *"cursor — marketplace (bootstrap: session-start hooks)"* directly contradicts it |
| 10 | `cursor-standalone/.cursor/hooks.json` | `FR-VAR-0050` + AC1, `FR-SEED-0002` AC1, `FR-STRUCT-0020` | **CONFLICTED.** The correct path appears only in a section header (`FR-VAR.md:256`, not inside a `<req>`); the one `<req>`-bound path (`STRUCTURES.md:74`, `.cursor/hooks/hooks.json`) is **wrong** | `DATA-CFG-0008` AC3 + AC6, `FR-VAR-0070` | **PARTIALLY COVERED.** Exact path: **no correct normative requirement** |
| 11 | `antigravity/hooks.json` | `FR-VAR-0080`, `FR-STRUCT-0030`, `FR-VAR-0083` AC1, `STRUCTURES.md:97`, `DATA-CFG-0005` notes | **Yes** — four independent statements, the strongest coverage of any document | `DATA-CFG-0008` AC3 + AC6, `FR-VAR-0082` AC2, `FR-VAR-0083` AC2/AC3. Shipped matches AC6 exactly | **Fully covered** |

**Tally (11 documents):** 3 fully covered with no caveat (1, 7, 11) · 4 covered but caveated — weak
approval or a contradicting statement elsewhere (2, 4, 5, 9) · 2 partially covered, the normative path
wrong or absent (3, 10) · 1 whose only content requirement is unachievable under the approved model
(6) · **1 with no requirement at all** (8).

### 10.2 `STRUCTURES.md` asserts paths the generator does not produce

`FR-STRUCT-0010` and `FR-STRUCT-0020` are both `Approved`/`Implemented` (isolomatov-gd, 2026-09-01)
and make the per-target trees normative. Two of those trees are wrong. **FACT**, measured against the
generated output:

| Target | `STRUCTURES.md` says | Actually ships | Delta |
|---|---|---|---|
| claude `:15-16` | `hooks/hooks.json`, `hooks/*.js` | same | ✔ |
| cursor `:26-28` | `hooks/hooks.json.tmpl [P]`, root `hooks.json.tmpl [P]`, `hooks/hooks.json [G]` | root `hooks.json` **[G]**, `hooks/hooks.json` [G] | ✘ **root `[G]` file not listed**; listed instead as a preserved `.tmpl`, contradicting the file's own legend |
| copilot `:38-43` | three paths, `hooks/hooks.json` claimed distinct with `"sessionStart": []` | three paths, **all byte-identical** | ⚠ paths right, content claim false |
| codex `:55,57` | `.codex/hooks/{hooks.json,*.js}` | **`.codex/hooks.json`** + `.codex/hooks/*.js` | ✘ wrong path for the config |
| cursor-standalone `:74` | `.cursor/hooks/hooks.json` | **`.cursor/hooks.json`** + `.cursor/hooks/*.js` | ✘ wrong path for the config |
| copilot-standalone `:89` | `.github/hooks/hooks.json` | same | ✔ |
| antigravity `:97,102` | root `hooks.json`, `hooks/*.js` | same | ✔ |

**The systematic cause (JUDGEMENT, high):** `STRUCTURES.md` assumes the rendered config lives inside
the target's `hookFolder`. It does not — `hookFolder` (`.codex/hooks`, `.cursor/hooks`) governs only
`*.js` bundle placement; the rendered config sits one level up. **Two Approved requirements currently
assert output paths that do not exist.**

### 10.3 The requirement that mandates the defect

`DATA-CFG-0008` (`MODEL.md:246`, `Approved`, isolomatov-gd, **2026-09-02** — the most recently
changed hook unit) **AC1**:

> *"hold exactly one layout per IDE target identity — **seven in total**, keyed `claude`, `codex`,
> `copilot`, `copilot-standalone`, `cursor`, `cursor-standalone` and `antigravity`"*

**FACT.** That fixes the granularity at *target identity* — exactly the granularity that cannot
express "one target, two document forms". `FR-VAR-0030` AC4 requires the thing AC1 forbids. **Any fix
must amend one of them.** This is the single clearest instance in the corpus of two approved
statements that cannot both hold.

### 10.4 Other requirement defects worth acting on

**FACT** for each quotation; **JUDGEMENT** for the verdict.

| # | Conflict | Assessment |
|---|---|---|
| R1 | `STRUCTURES.md:19` heading *"cursor — marketplace (bootstrap: session-start hooks)"* vs `DATA-CFG-0008` AC3 (`cursor` → `bootstrap: null`) | AC3 is right and newer; the heading is stale. Shipped cursor `hooks.json` is `{"version":1,"hooks":{}}` |
| R2 | `FR-VAR-0083` statement — the advisory exclusion must follow from *"a set's declared hook list … not by a rule that names this target"* — vs the shipped mechanism, which **is** target-keyed layout data (`HOOK_LAYOUTS.antigravity` binds 2 modules) | The requirement forbids the mechanism that ships. A set is declared once for all seven targets (`FR-SET-0070` AC6), so a set *cannot* omit a hook "for this target". `DATA-CFG-0008` sanctions layout-level narrowing; `FR-VAR-0083`'s statement does not. **Amend `FR-VAR-0083`** |
| R3 | `FR-ARCH-0055` requires `pluginAssembleBootstrap()` to apply *"assembly, **prefix**, escaping…"* and to *"reproduce the current generator's exact byte layout (NFR-0001)"* | Three stale claims in one unit: the symbol does not exist (work is split across `payload.ts` + four per-IDE assemblers); the prefix was retired 2026-07-28 (`FR-HOOK-0003` `Deprecated`); and `NFR-0001` was redefined to **paths only**. Same nonexistent symbol also named by `FR-HOOK-0001` and `FR-ARCH-0039` |
| R4 | `FR-VAR.md:7` preamble: *"A hook template that references `{{{bootstrap_hooks}}}` delivers bootstrap via session-start hooks; a template that omits the placeholder delivers nothing"* | No template carries that placeholder any more, so the preamble asserts that **no** target delivers bootstrap by hook — false (claude/codex/copilot all do). The unit below it was fixed in #315; the preamble was not |
| R5 | `FR-SET-0070` AC1 phrases a declaration as *"hooks `dangerous-actions` on `PreToolUse`"* | `DATA-CFG-0007` AC4 says a `hooks` entry is *"a bare module name … event and matcher … are not declared here"*. AC1's form is rejected by the catalog validator |
| R6 | `FR-COPY-0011` says two rules are excluded; the code excludes **three** (`RULES_EXCLUDES` adds `rules/mcp-files-mode.md`) | Already `ToBeModified`; text fix |
| R7 | `plugin-generator/CHANGES.md` item 20 says `FR-HOOK-0005` *"is now `Approved`"*; item 29 in the same entry says it *"stays Draft"* | The file is the authority: `FR-HOOK.md:102` reads `<status>Draft</status>`. The changelog contradicts itself inside one entry |
| R8 | `DATA-CFG-0008` rationale says *"**Six** near-duplicate `hooks.json.tmpl` files"* | There are **seven** (claude 1, codex 1, antigravity 1, cursor 2, copilot 2). Rationale only |
| R9 | `FR-CLI-0060` AC requires help to enumerate the set-descriptor fields incl. `hooks` | Recorded as failing in its own `implementationNotes` |
| R10 | `FR-HOOK-0022` AC2 (sweep bundles a set no longer names) | `implementationNotes` say AC2 fails; but §3's reading of `plugin-sync-bundles.ts` shows `sweepUndeclaredBundles` **does** exist and is called. **JUDGEMENT: the note is stale — re-verify and close** |

### 10.5 Retired units, confirmed

| Unit / concept | Where retired | Reason |
|---|---|---|
| **`FR-HOOK-0006`** (Copilot per-entry dedup lock) — **deleted from the tree** | `plugin-generator/CHANGES.md:502-508`, RECONCILIATION-12 (2026-07-01) | *"Copilot's duplicate-invocation bug … is fixed upstream; the per-entry lock workaround is removed from code."* Zero references remain. **This is what makes `ARCHITECTURE.md:358` stale** (§9.1) |
| `FR-HOOK-0003` (bootstrap prefix) | `Deprecated`/`Removed`, 2026-07-28 | Prefix and `isLead` designation both removed |
| `includeBootstrapRules` descriptor flag | RECONCILIATION-11 | Set in 6 specs, never read |
| `PluginSpec.hookEntryShape` | RECONCILIATION-10 | Identity-discriminant field; now the corpus's canonical *forbidden* example (`FR-ARCH-0004/0005`, `GLOSSARY.md:50`) |
| Byte-for-byte hook-JSON parity (AC-2, OQ-4) | `NFR-0001` redefinition | *"Hook JSON is covered by this general structural rule like any other output"* — i.e. paths only |

### 10.6 How tightly the requirements are bound to today's code

**45 hook-touching units name a code symbol or file path in normative text** (statement, acceptance
criteria, rationale or title). **FACT.** The heaviest bindings:

| Symbol named normatively | Units |
|---|---|
| `HOOK_LAYOUTS` | `DATA-CFG-0007`, `DATA-CFG-0008`, `FR-GEN-0011`, `FR-VAR-0083` |
| `hookEntryShape` (as a forbidden pattern) | `FR-ARCH-0002`, `FR-ARCH-0004`, `FR-ARCH-0005`, `FR-HOOK-0005` |
| `pluginAssembleBootstrap()` (**does not exist**) | `FR-HOOK-0001`, `FR-ARCH-0039`, `FR-ARCH-0055` |
| `pluginAssembleHooksJson()` / `hooks_json` | `FR-GEN-0011`, `NFR-0007`, `FR-ARCH-0039` |
| Literal hook-entry JSON strings | `FR-HOOK-0005`, `FR-HOOK-0007`, `FR-VAR-0020` |
| Hard output paths | `FR-STRUCT-0010`, `FR-STRUCT-0020`, `FR-STRUCT-0030` |

**JUDGEMENT:** this is the real cost of the `follow.md` "revert to literal templates" plan — it does
not retire four units, it touches this whole list. It is also why §12 does not propose a large
generator rewrite.

---

## 11. Stage 9 — Testing, and Stage 10 — Authoring

### 11.1 The suites

**2,380 assertions, 2,380 passing** — 1,441 in `src/hooks`, 939 in `src/rosettify-plugins`. **FACT**
(both suites executed). **Every defect in this document ships green.**

| Layer | Where | What it proves |
|---|---|---|
| Runtime unit | `src/hooks/tests/*.test.ts` (16 files) | adapter detection, normalization, per-hook logic |
| Runtime e2e-simulated | `src/hooks/tests/e2e/*.e2e.test.ts` (6 files, ~60 fixtures) | **verbatim captured wire payloads** replayed through the real pipeline, no adapter mocks. The strongest tests in the repo |
| Runtime regression | `src/hooks/tests/regression/*.test.ts` (3 files) | bundle isolation; hook registration; read-once binding |
| Generator unit | `src/rosettify-plugins/tests/unit/**` | `buildHooksDocument` per layout, catalog validation, bundle sync |
| Generator e2e | `src/rosettify-plugins/tests/e2e/*.e2e.test.ts` | full generation; **path parity** |
| Live manual | `docs/hooks-verify.md` protocol + `docs/hooks/tester.js` | the only thing that establishes a contract as true |

### 11.2 What is asserted about generated `hooks.json` — and what is not

| Assertion | Where | Paths or content? | Which `--deterministic-hooks` |
|---|---|---|---|
| generated path set == derived path set | `parity.e2e.test.ts:142-155` | **paths only** — *"this test never reads or compares file CONTENT"* (`:15`) | **false only** (`:115`) |
| no `*.tmpl` survives | `parity.e2e.test.ts:159-164` | paths | false |
| no `*.js` bundle at det:false | `parity.e2e.test.ts:166-175` | paths | false |
| codex `.codex/hooks.json` mirror exists | `sample.e2e.test.ts:370-373` | paths | false |
| claude `hooks.PreToolUse` undefined / defined | `generate.test.ts:205,227` | key presence only | both |
| sparse set ships no `hooks/` | `generate.test.ts:431-438` | paths | false |
| antigravity `PreInvocation: []`, no `PreToolUse` | `antigravity.e2e.test.ts:258-271` | content | false |
| antigravity matcher `run_command\|mcp__.*` | `antigravity.e2e.test.ts:273-283` | content | **true** |
| `hooks.json` exists + parses (4 plugins) | `hooks-registered.test.ts:52-57` | parse | committed tree |
| each `<hook>.js` referenced | `hooks-registered.test.ts:63-73` | substring | **self-skips — see below** |
| `buildHooksDocument` is valid JSON, 7 layouts | `plugin-assemble-hooks-json.test.ts:45-53` | **in-memory object, never a file** | both |

**No test anywhere compares two generated `hooks.json` files to each other, and no test asserts a
command-path prefix in a generated file.** **FACT** (exhaustive grep + full suite run).

### 11.3 Why the routing defect shipped green — three independent reasons

The premise, verified from git rather than assumed: pre-#315 the two cursor templates carried
**different literal bodies** — `git show main:…/core-cursor/hooks.json.tmpl` contains
`"command": "node .cursor/hooks/dangerous-actions.js…` while
`git show main:…/core-cursor/hooks/hooks.json.tmpl` contains `"command": "node hooks/…`. **FACT.** So
this is a *content collapse of files that always existed*, not a stray new file.

`parity.e2e.test.ts` is the only test that runs the real pipeline over the real templates and
enumerates every generated `hooks.json`. It cannot see the defect, for three reasons that are each
sufficient on their own:

1. **Paths-only by charter** (`:15`). The paths never changed; only the bytes did.
2. **Its oracle is self-fulfilling for preserved templates.** The "independent" derivation walks the
   *same* template folder that produces the output (`parity-derive-structure.ts:211-219`, mapping
   `*.tmpl` → its rendered sibling), and the target arms bless both files by name in comments
   (`:313`, `:323`). A duplicate template can never register as "only-in-actual". **FACT.**
3. **It runs at the posture where the forms differ least** (`:115`, `deterministicHooks: false`). At
   that setting all three cursor documents are `359d6779` — even a byte-comparison added at parity's
   own posture would not discriminate. **FACT** (§5.1).

Secondary: `plugin-assemble-hooks-json.test.ts` proves the layouts differ (`:86-101`) but only by
passing a layout **by id** — it never gives a spec two hooks frames, so the one-document-per-spec
collapse is structurally invisible to it.

Tertiary: `hooks-registered.test.ts` designates the *defective* file as canonical for copilot
(`:23`, `rosetta-copilot/hooks/hooks.json`) — and **32 of its 37 cases are no-ops** on the committed
tree, because the guard `if (!existsSync(bundlePath)) return;` (`:70-71`) skips whenever no `.js`
bundle sits beside the JSON, and the committed tree ships none. Only "exists and parses" runs.
**FACT.** The `SKILL.md:57` claim that *"a new hook without registration immediately fails the
regression guard"* is therefore false in practice.

### 11.4 A third opinion on which copilot document is canonical

Three artifacts in this repo give three different answers. **FACT:**

| Artifact | Says the copilot plugin's hooks are read from |
|---|---|
| `docs/ARCHITECTURE.md:422` | `<plugin>/hooks.json` (root) |
| `src/hooks/tests/regression/hooks-registered.test.ts:23` | `<plugin>/hooks/hooks.json` |
| `instructions/…/configure/github-copilot.md:391` | either — the manifest default is *"`hooks.json` **or** `hooks/hooks.json`"* |

And the generated manifest declares neither. This is F4 restated as a documentation fact rather than
a runtime hypothesis.

### 11.5 Test coverage gaps

| # | Behavior with no test | Note |
|---|---|---|
| G1 | Multi-document emission per spec — how many `hooks.json` one target emits, and that two of them differ | the #315 defect |
| G2 | Command-path addressing in any generated file (`node hooks/` vs `node .cursor/hooks/` vs the probe) | |
| G3 | Generated content at `--deterministic-hooks true` for claude, codex, copilot, cursor | only antigravity has one |
| G4 | Copilot probe path in a real emitted file | unit-tested in memory with a hardcoded destination |
| G5 | Bootstrap payload placement in the emitted document | |
| G6 | `hooks-registered.test.ts` is vacuous on the committed tree | §11.3 |
| G7 | `read-once-template-registration.test.ts` is a **source-text grep** of another package's TypeScript — renaming `CLAUDE_BINDINGS` fails it; emitting a wrong document does not | |
| G8 | `beforeTabFileRead` end to end — bound, mapped, shipped, **zero fixtures** | |
| G9 | All four advisory hooks on claude at e2e; codex `apply_patch` write path | headers say fixtures were not fabricated — correct discipline, real gap |
| G10 | Windsurf generation — runtime fully tested, generator emits nothing | |
| G11 | Copilot double auto-discovery (F4) | |
| G12 | No unrendered-placeholder sweep (`{{` in output) | I measured it clean; nothing keeps it clean |
| G13 | Cursor root `hooks.json` — untestable until specified (§10.1 row 8) | |
| G14 | **No test cross-checks a `hook-layouts.ts` matcher token against a runtime `ide-rows` vocabulary** | this is what let codex's dead `Edit` token ship (§7.3) |

### 11.6 The authoring skill describes the pre-#315 world

`instructions/r3/core/skills/coding-agents-hooks-authoring/SKILL.md` is the instruction an agent loads
when asked to add or debug a hook. **It tells the agent to edit `hooks.json.tmpl` files, and never
mentions `HOOK_LAYOUTS` or `plugins.json`.** **FACT.**

| Line | Instruction | Status |
|---|---|---|
| `:41` | *"The canonical sources are the `hooks.json.tmpl` templates"* | **STALE, load-bearing.** All 7 are the single line `{{{hooks_json}}}` |
| `:35` | *"Matcher in `hooks.json.tmpl` — widen to include new tool names"* | **STALE.** Matchers live in `hook-layouts.ts` |
| `:43-48` | the five template paths, e.g. `core-claude/hooks/hooks.json.tmpl` | **STALE ×2** — folders renamed `core-*` → `template-*` in #315, **and** editing them accomplishes nothing |
| `:86` | reference file `plugins/core-claude/hooks/hooks.json.tmpl` | **STALE** — wrong root and wrong folder |
| `:13` | *"distributed to all **6 IDE targets** (… **windsurf** …)"* | **STALE.** `build-bundles.mjs` `PLUGINS` has 5; windsurf is absent. (The skill's own README says "all 5" — internal contradiction) |
| `:49` | *"`core-windsurf` **is** a `build-bundles.mjs` `PLUGINS` bundle target"* | **Factually wrong** |
| `:57` | *"A new hook without registration immediately fails the regression guard"* | **STALE in effect** — §11.3 |
| `:32` | SemanticKind step 1: add a row to `ide-registry.ts` `TOOL_KINDS` | **MISLEADING.** That table's cells have no production consumer (§2.2); the *required* edit is the per-IDE `TOOL_KINDS` in `ide-rows/<ide>.ts`, which the skill mentions only as an exception (`:33`) |
| — | **MISSING: add the module to each set's `hooks` array in `plugins.json`** | without it the module is never emitted |
| — | **MISSING: add a `HookBinding` row to the relevant `*_BINDINGS` in `hook-layouts.ts`** | the actual registration site |
| — | **MISSING: `hookSupportModules`** for a module with helpers | |

`:12`, `:14`, `:18-19`, `:24-25`, `:34`, `:37` (`run-hook.ts:316` gate), `:53` are **current and
correct**. The README repeats every staleness and adds stale line numbers of its own
(`build-bundles.mjs:24`, `run-hook.ts:98`), while noting *"if the referenced code moves, these become
silently stale documentation."*

**One more authoring-surface defect.** `instructions/r3/core/skills/harness/assets/hooks.md:36`
advertises the six shipped `skills/harness/references/hooks/<ide>/hooks.json` files as *"Working
configuration per agent, every event wired"*. Those are the **verification probes** — every entry
invokes `tester.js`, they deliberately register both key casings, and they carry `cwd`/`timeoutSec`
which have never shipped. **FACT** (all six read). **JUDGEMENT:** a user following that line would
install a diagnostic harness believing it is the product's configuration.

### 11.7 The cost model — every place a human must edit

**To add ONE hook module** (**FACT**, enumerated from code):

| # | File | Edit |
|---|---|---|
| 1 | `src/hooks/src/hooks/<name>.ts` | new file — `defineHook` + `runAsCli` |
| 2 | `src/rosettify-plugins/src/spec/hook-layouts.ts` | a `HookBinding` row in **up to 5** binding lists |
| 3 | `src/rosettify-plugins/plugins.json` | the module name in every set's `hooks` array (+ `hookSupportModules` if it has helpers) |
| 4 | `src/hooks/tests/<name>.test.ts` | new unit test |
| 5 | `src/hooks/tests/regression/bundle-isolation.test.ts:6-15,61-62` | add to the hardcoded `HOOK_FILES` and the antigravity supported/unsupported lists |
| 6 | `plugins/**` | regenerate and commit |
| — | conditional | `ide-registry.ts` + all 6 `ide-rows/*.ts` if a new `SemanticKind` is needed |

**Minimum: 6 files. The authoring skill documents 2 of them correctly and points at the wrong file
for the two that matter most (2 and 3).**

**To add ONE IDE target: ~26 edit sites, ~12 of them new files**, plus a mandatory human-in-the-loop
live capture session (`docs/hooks-verify.md` step 3) that cannot be done offline. Notable among them:
`parity-derive-structure.ts` needs a **hand-written `case '<ide>':` arm** — the parity oracle does not
self-extend; and `bundle-isolation.test.ts` needs the new IDE name added to all 5 existing rows.

---

## 12. The design

### 12.1 What the evidence actually constrains

Four constraints fall out of §2–§11, and any design must satisfy all four.

**C1 — One statement of each per-IDE contract fact, with one consumer path.** Fifteen locations
encode fragments of it; two have already diverged in measurable ways. The generator already depends
on `src/hooks` (`hooksSource`, for bundles), so a shared contract module is not a new coupling —
**FACT** (`FR-CLI-0020`).

**C2 — Discovery must be verified, not assumed.** 27 of 33 shipped documents sit at paths no live run
has ever exercised, and only one of the seven contract docs (`windsurf.md:75`, *"merged across all
levels"*) says what happens when several candidate files exist. `docs/hooks-verify.md:19` forbids
calling any of this confirmed.

**C3 — Set-dependent facts must be derived from the set, never written as literals.** `core-copilot`'s
guard on `commands/coding-flow.md` (F3) is the proof: #315 parameterised the *destination* in that
same string and left the *guard filename* hardcoded, and the `core` set no longer contains it.

**C4 — Correctness must be observable at the posture where forms differ.** Every gate runs at
`--deterministic-hooks false`, the one posture where cursor's two forms are identical and copilot's
differ least.

Two things must **not** change: `JSON.stringify` assembly (33/33 documents parse; validity by
construction is the one thing #315 unambiguously improved), and the per-IDE binding values themselves
(byte-faithful to all seven pre-#315 templates).

### 12.2 The design

**Five changes, in dependency order. The first two are the ones that matter.**

---

**D1 — A single, executable statement of per-IDE hook truth: `docs/hooks/<ide>.contract.json`.**

One machine-readable file per IDE, generated *nowhere* and hand-edited only when a live run promotes
a fact from hypothesis to verified. It carries exactly what the contract doc has already verified,
plus one field nothing currently records:

```jsonc
{
  "ide": "copilot",
  "events":   { "SessionStart": {"fires": ["vscode","cli"], "verified": true},
                "sessionStart": {"fires": ["cli"],          "verified": true} },
  "toolNames": { "bash": ["bash","powershell","Bash","run_in_terminal"], … },
  "discovery": [
    { "path": "hooks.json",       "scope": "plugin", "declaredBy": "manifest:hooks",
      "verified": false, "verifiedBy": null },
    { "path": ".github/hooks/*.json", "scope": "workspace",
      "verified": true,  "verifiedBy": "hooks-verify-run-logs.md:Copilot Runs 1-8" }
  ],
  "precedence": "undetermined",
  "bootstrapChannel": { "hook": "SessionStart", "rules": null }
}
```

Then:
- `src/hooks/src/runtime/ide-rows/<ide>.ts` reads its `events`/`toolNames` from it (or is generated
  from it — either is fine; the point is one source).
- `src/rosettify-plugins/src/spec/hook-layouts.ts` keeps its bindings, but a **test** asserts every
  matcher token is in that IDE's `toolNames`, and every bound event key is in its `events` with
  `fires` non-empty.
- `src/hooks/src/runtime/ide-registry.ts`'s per-IDE **cells are deleted**; only the two union types
  survive.

That one test retires four findings at once: the codex `Edit` dead token (§7.3), the
`ide-registry`↔`ide-rows` divergence (§2.2), the claude row's stray `create_file`, and F2 — because
copilot's `sessionStart` would fail an assertion that says *the bound key must fire in every runtime
this plugin targets*.

*Why this and not "just delete the duplicate table":* deleting `ide-registry`'s cells fixes one pair.
The contract file fixes the pair **and** the generator↔runtime pair **and** gives `discovery` a home,
which nothing has today.

---

**D2 — Make discovery an explicit, per-document, verified-or-not declaration.**

Add to each target spec a list of the documents it emits and, for each, the discovery claim it rests
on. Concretely this is the same field the prior analysis proposed for a different reason —

```ts
hookDocuments: Readonly<Record<string /* output-relative .tmpl path */, {
  layout: HookLayoutId;
  discovery: 'verified' | 'documented' | 'undetermined' | 'staging';
}>>;
```

— and it does three jobs at once:

1. **It fixes `FR-VAR-0030`.** `copilot` maps `.github/plugin/hooks.json.tmpl → copilot-plugin` and
   `hooks/hooks.json.tmpl → copilot-standalone`; `cursor` maps `hooks/hooks.json.tmpl →
   cursor-plugin` and `hooks.json.tmpl → cursor-standalone`. The assembler builds one document per
   frame and **hard-errors on a hooks frame with no declaration** — which makes the entire class of
   defect unrepresentable: a new template cannot be added without saying which form it is.
2. **It makes §6.3 a compile-time artifact instead of a paragraph in this document.** The
   `discovery` value must equal what the IDE's `<ide>.contract.json` says about that path. Today the
   answer lives in nobody's head.
3. **It gives `'staging'` a name.** `copilot/hooks/hooks.json` is not a document Copilot is meant to
   read; it is source material for `copilot-standalone`. Saying so in the type is the difference
   between F4 being a hazard and F4 being a decision.

---

**D3 — Derive the copilot probe guard from the set, and drop the redundant payload.**

Two edits to `src/rosettify-plugins/src/spec/bootstrap-manifest.ts`:

- `COPILOT_PLUGIN_ROOT_BASH`/`_POWERSHELL` take the guard filename as a **parameter derived from the
  spec's own frames** — the plugin's manifest (`.github/plugin/plugin.json`) is the obvious choice
  since every set ships one. This kills F3 and the whole class it belongs to (C3).
- For targets whose `bootstrapChannel.rules` is non-null in D1's contract file, **stop injecting
  entries 0 and 1**. The rule file is already there and already loaded; the hook then carries only
  the plugin-path entry — the one thing rules cannot express. On the measured tree that is a **93%
  reduction** in `hooks.json` bytes for those targets, and, more importantly, it removes a second copy
  of the bootstrap text that can silently drift from the first.

  **Today no target qualifies, and F6's 93% is therefore not reducible by this design.** Cursor and
  antigravity already take `bootstrap: null` and inject nothing; claude, codex and copilot-plugin have
  no rules channel, so for them the duplicated text is the *price of having a channel at all*, not
  waste. What D3 buys now is that the duplication becomes **checkable** — the contract file states
  which targets have a rules channel, so "is this second copy necessary?" stops being a question
  nobody can answer. It becomes a live byte saving only if OQ-4 resolves to "a Copilot plugin can
  deliver rules", or when a future target has both channels.

---

**D4 — Fix the copilot casing, separately and under HITL.**

Change `sessionStart` → `SessionStart` in both copilot layouts. `preCompact` may stay camel: VS Code
fires no compaction hook at all (`copilot.md:22`), so camel-only is single-fire and correct for the
only runtime that has the event.

This is one line and its blast radius is *"bootstrap starts arriving in a runtime where it never
has"*. It must not ride inside a structural refactor whose oracle is byte-equality, and it warrants
its own live run per `docs/hooks-verify.md` step 3. `FR-HOOK-0005`'s ACs and `github-copilot.md:473`
already say what the right answer is; only the code disagrees.

---

**D5 — Tests that can see what shipped.**

| Test | Asserts | Kills |
|---|---|---|
| **T-contract** | every matcher token ∈ `<ide>.contract.json` `toolNames`; every bound event ∈ `events` with non-empty `fires` | codex `Edit`; F2; the `ide-registry` mirror |
| **T-routing** | each target's `hookDocuments` equals its expected map; a hooks frame with no declaration **throws**, naming the file. **Mutation check:** swap copilot's two values — T-routing *and* T-forms must both fail | F7 permanently |
| **T-forms** (e2e, **`--deterministic-hooks true`**) | `md5(copilot/hooks.json) == md5(copilot/.github/plugin/hooks.json)`; `md5(copilot/hooks/hooks.json) != ` that; `== md5(copilot-standalone/.github/hooks/hooks.json)`; `md5(cursor/hooks.json) == md5(cursor-standalone/.cursor/hooks.json)`; every command prefix matches a table **restated independently of `hook-layouts.ts`** | C4; G2; G3 |
| **T-guard** | every shell guard literal in a generated document names a file that exists in that plugin | F3 and its whole class |
| **T-bootstrap-channel** | for every target: `payload:'inject'` ⇒ the bound key fires in every runtime the plugin targets; `bootstrap: null` ⇒ the plugin ships a rule file **at a path the IDE's manifest schema can load** | `FR-VAR-0070`'s unenforced "otherwise" branch |
| **T-parity, extended** | parameterise `parity.e2e.test.ts` over `deterministicHooks ∈ {false, true}`, and add a committed content hash per (set × target) over the hooks family | C4; the self-fulfilling oracle stays, but content is no longer invisible |
| **T-placeholders** | no generated file contains `{{` | G12 |

And two deletions: `read-once-template-registration.test.ts`'s source-text grep becomes an assertion
over `HOOK_LAYOUTS` **values** (it already imports nothing; importing the module is strictly better
than `indexOf` on its text), and `hooks-registered.test.ts`'s `existsSync` skip is replaced by
running it against a **generated** tree at `true`, not the committed tree at `false`.

### 12.3 What I deliberately did not propose, and why

- **Reverting to literal per-IDE templates** (`follow.md`'s original plan). Beyond the combinatorial
  comma problem the prior analysis identified, §10.6 measures the real cost: it touches ~45 units that
  name `HOOK_LAYOUTS`, `pluginAssembleHooksJson`, `hooks_json` or the entry literals in normative
  text. And it addresses none of F1–F6.
- **A large generator rewrite.** §4 and §5 show the assembler produces exactly the right bytes given
  the right layout. The generator is the healthiest layer in this system.
- **Changing antigravity's advisory exclusion or `dangerous-actions`' narrow registration.** Both are
  deliberate and cited (`hooks-verify.md:130`; `ARCHITECTURE.md:414`).
- **Adding windsurf as a target.** The runtime and contract are ready; that is a product decision
  (OQ-7), not a fix.

### 12.4 Sequencing, by user impact

| Order | Item | Why here |
|---|---|---|
| **1** | **OQ-1** — probe copilot's two auto-discovery paths | Blocks D2 *and* blocks the `FR-VAR-0030` fix, which could otherwise trigger fail-closed denies (§5.3) |
| **2** | **D4** — copilot casing, HITL + live run | Cheapest fix for the worst live defect (F2) |
| **3** | **D3a** — derive the copilot guard filename | One-line class fix for F3; no HITL needed, output change is measurable |
| **4** | **D1** — contract files + delete `ide-registry` cells + T-contract | Everything else gets safer once one table is authoritative |
| **5** | **D2 + T-routing + T-forms** | Fixes F7; makes the class unrepresentable |
| **6** | **D5** remainder, `STRUCTURES.md` path corrections, `ARCHITECTURE.md` six fixes, `SKILL.md` rewrite | Documentation and gates catch up |

**The strongest argument against this design**, stated fairly: D1 adds a seventh artifact to a system
that already has fifteen, and a JSON contract file that nothing forces anyone to update is just
another thing to drift. That is a real risk. My answer is that D1's file is the *only* one with a
test binding it to two consumers, and that the alternative — leaving three tables in two packages
with zero cross-checks — has already produced four measured divergences. **What would change my
mind:** if a live probe (OQ-1, OQ-3) shows that plugin-bundled hooks do not load at all for cursor
and codex, then those two targets' hook documents should be *deleted*, not reconciled, and D1's
`discovery` field would be doing much less work than D2's `'staging'` state. Measure first.

---

## 13. Defect register and open questions

### 13.1 Register

Severity is user impact at the shipped default. **New** = not identified in `plans/issue-315-plugin-sets/hooks-redesign.md`
or `follow.md`.

| id | Defect | Severity | New? | Evidence |
|---|---|---|---|---|
| **F1** | No plugin-bundled hook document has a verified discovery path; every verification run used a workspace path | **Foundational** | **Yes** | §6.2 |
| **F2** | VS Code Copilot receives no bootstrap in plugin mode: camel `sessionStart` + no `rules` manifest field | **Broken now** | partly — the casing half is `hooks-redesign.md` INC-4; the *no rules channel* half is new | §8.3 |
| **F3** | `core-copilot`'s plugin-path bootstrap entry is guarded on `commands/coding-flow.md`, which `core` does not ship | **Broken now** | **Yes** | §8.3 |
| **F4** | Copilot ships identical documents at both documented auto-discovery defaults, declaring neither | **Hazard** | no (OQ-1) | §6.3, §11.4 |
| **F5** | 15 locations encode per-IDE hook contract; 0 cross-checks; ≥4 measured divergences | **Structural** | **Yes** (the count and the divergences) | §9, §2.2 |
| **F6** | 93.0% of shipped `hooks.json` bytes duplicate two rule files in the same plugin | **Structural** | **Yes** (measured) | §8.2 |
| **F7** | Layout keyed by target, not document form — copilot ×3 and cursor ×2 collapse | Latent (invisible at default) | no | §5.3 |
| **F8** | `ARCHITECTURE.md` wrong about hooks in 6 places | Doc | **Yes** | §9.1 |
| **F9** | Two **Approved** requirements (`FR-STRUCT-0010/0020` via `STRUCTURES.md:57,74`) assert output paths that do not exist | Requirement | **Yes** | §10.2 |
| **F10** | `cursor/hooks.json` (root) — **no requirement covers its existence, path or content** | Requirement | partly (INC-3) | §10.1 row 8 |
| **F11** | `DATA-CFG-0008` AC1 and `FR-VAR-0030` AC4 cannot both hold | Requirement | no (INC-2) | §10.3 |
| **F12** | `FR-VAR-0083`'s statement forbids the mechanism that actually implements antigravity's exclusion | Requirement | **Yes** | §10.4 R2 |
| **F13** | Authoring `SKILL.md` describes the pre-#315 flow; omits the two edits that matter | Instruction | **Yes** | §11.6 |
| **F14** | `harness/assets/hooks.md:36` advertises the verification probes as *"working configuration per agent"* | Instruction | **Yes** | §11.6 |
| **F15** | codex matcher token `Edit` matches no tool the codex adapter knows — a permanently dead token | Hygiene | **Yes** | §7.3 |
| **F16** | `read-once-shared.js` — 21 copies, 646,674 B, no CLI entry, already inlined into `read-once.js` | Hygiene | **Yes** | §3.1 |
| **F17** | `read-once-reset.js` ships to antigravity, bound to an event antigravity does not have | Hygiene | no (INC-8) | §7.2 |
| **F18** | `hooks-registered.test.ts` — 32/37 cases no-op on the committed tree | Test | **Yes** | §11.3 |
| **F19** | `parity.e2e.test.ts`'s oracle derives from the same template folder it validates | Test | **Yes** | §11.3 |
| **F20** | Windsurf: complete verified contract, complete tested runtime, zero generated output | Scope | no (DISC-6) | §2.3 |
| ~~F21~~ | *Withdrawn.* I suspected the required Codex `[features] hooks = true` flag was undocumented. It is documented in three places: `docs/hooks/codex.md:81`, the configure guide `codex.md:279-283`, and — as a user-facing command — `INSTALLATION.md:132` (`codex features enable hooks`). **Not a defect.** | — | — | verified by grep |
| **F22** | `cursor`/`antigravity` `plugin-files-mode` tells the model *"context appended via hooks"* and *"the one the hook reports"* — neither is true for them | Instruction | **Yes** | §8.4 |
| **F23** | `ARCHITECTURE.md:358` describes a copilot session lock removed with `FR-HOOK-0006` | Doc | partly (INC-10) | §9.1, §10.5 |

### 13.2 Open questions

| # | Question | Why it matters | What resolves it |
|---|---|---|---|
| **OQ-1** | Does Copilot load `<plugin>/hooks.json`, `<plugin>/hooks/hooks.json`, or both, when the manifest declares no `hooks` field? | Today ⇒ possible double-registration of every hook. After an `FR-VAR-0030` fix ⇒ a document referencing `.github/hooks/*.js` that do not exist in a marketplace install ⇒ non-zero exit ⇒ `preToolUse` **fail-closed** ⇒ potentially every tool denied. `copilot.md:374` confirms Copilot CLI does **not** dedupe duplicate registrations within one file. **Highest severity.** Blocks D2 | Install a generated `<set>-copilot` in Copilot CLI **and** VS Code with `tester.js` at each candidate path, distinct `--tag` each; count in `~/.rosetta/hooks.log` |
| **OQ-2** | Approve the copilot casing fix (`sessionStart` → `SessionStart`)? Leave `preCompact` camel? | Fixes F2's first leg | Owner decision, then a VS Code run confirming the bootstrap marker reaches the model |
| **OQ-3** | Does Cursor load a plugin-bundled `hooks/hooks.json` at all? What is the provenance of the `hooks` field in `.cursor-plugin/plugin.json`? | Neither `docs/hooks/cursor.md` nor the configure guide documents a plugin hooks path, and the guide has no Plugins section at all. If the answer is no, `cursor`'s two documents should be deleted, not fixed | The vendor doc the manifest field came from, or a live probe installing `core-cursor` as a Cursor plugin |
| **OQ-4** | Can a Copilot plugin deliver rules at all? | Decides whether `core-copilot/rules/*.md` is dead weight to delete or a channel to declare. Determines whether D3's second half is live | `github-copilot.md:388-393` lists no `rules` field — confirm against R1/R2 or by probing |
| **OQ-5** | Does Codex read a plugin's `.codex-plugin/hooks.json` (and the `.codex/hooks.json` mirror), or only the manifest-declared `hooks/hooks.json` that `codex.md:83` documents? | Rosetta emits neither the documented path nor the `hooks` manifest key. If only the documented form loads, no Codex plugin hook has ever run | Live probe. Cheap alternative: emit at `hooks/hooks.json` and add `"hooks": "./hooks/hooks.json"` to the codex manifest, matching `codex.md:83` exactly |
| **OQ-6** | Amend `DATA-CFG-0008` AC1 (granularity → document form), or supersede the unit? | Any fix to F7 contradicts an AC approved 2026-09-02 | Owner / requirements engineer |
| **OQ-7** | Should `<set>-cursor/hooks.json` (root) be emitted at all? | Undeclared, undocumented, and absent from `STRUCTURES.md` (F10) | Owner; then `STRUCTURES.md` + the parity oracle |
| **OQ-8** | Add a registration-format section to `docs/hooks/copilot.md`? | It is the **only** one of seven contract docs without one. Copilot's envelope and `bash`/`powershell` entry keys are attested only by the probe harness, one FR, and the configure guide | Extract from R1/R4 per the `hooks-verify.md` protocol; ideally confirm during the OQ-1 run |
| **OQ-9** | Should windsurf become a generator target? | Verified contract + tested runtime + zero output (F20) | Owner; out of #315 scope |
| **OQ-10** | Is `FR-HOOK-0022` AC2 really failing? | Its `implementationNotes` say the sweep does not exist; `plugin-sync-bundles.ts` contains `sweepUndeclaredBundles` and calls it | Re-run the AC2 scenario; if it passes, close the unit |

### 13.3 Checklist

| Item | Status |
|---|---|
| Both builds generated and measured, never into `plugins/` | ✔ 49 folders each; committed tree verified byte-identical to `gen-false` |
| `**/skills/harness/references/hooks/**` excluded from every tally | ✔ and the brief's arithmetic corrected (§1.3) |
| Every generated `hooks.json` enumerated with md5 + size, both postures | ✔ 33 × 2 (§5.1) |
| Every hook module × every target, with each omission's authority | ✔ (§7.2) |
| Bootstrap channel per target, hook vs rules | ✔ (§8.3) |
| Runtime, generator, requirements, contract docs, tests, authoring all covered | ✔ (§2, §4, §10, §6, §11) |
| FACT / JUDGEMENT labelled throughout | ✔ |
| Every number measured, with its command | ✔ |
| One file written | ✔ this file only |
