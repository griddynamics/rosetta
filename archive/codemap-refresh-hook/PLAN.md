# Plan — `codemap-refresh` hook: rename + multi-backend (GitNexus | Graphify)

## Status Log (UPDATE AFTER EVERY STEP — short status + deviations; do not advance without updating)

| Step | State | Notes / deviations |
|---|---|---|
| 0 — Confirm Graphify marker+command | done | Marker `graphify-out/graph.json`; cmd `graphify update .` confirmed from plan. |
| 1 — Rename source + identity | done | codemap-refresh.ts written; gitnexus-refresh.ts removed; symbol codemapRefreshHook, name 'codemap-refresh'. |
| 2 — Generalize activation (in-hook detection) | done | Removed `fs.nearestMarker` gate; detection moved to run(). |
| 3 — Backend detection | done | detectBackends() uses walkUp for .gitnexus/ and graphify-out/graph.json. |
| 4 — Per-backend command mapping | done | Each backend gets independent stamp+token debounce; GitNexus/Graphify commands per table. |
| 5 — De-GitNexus shared bits (cache dir, tags) | done | Cache dir renamed ~/.cache/codemap/; log tags use [codemap-refresh][backend]. |
| 6 — Tests (both backends + neither + both) | done | codemap-refresh.test.ts written; gitnexus-refresh.test.ts removed; all new cases added. |
| 7 — Bundle name + templates + generators (both trees) | done | All .tmpl files updated (plugins/ + src/plugin-generator/plugins/); plugin-sync-bundles.ts + test + Python test updated. |
| 8 — Remove stale tracked dist artifacts | done | `git rm src/hooks/dist/src/gitnexus-refresh.js src/hooks/dist/src/hooks/gitnexus-refresh.js` done. |
| 9 — Build + regenerate (no pre_commit.py) | done | hooks build: 25 bundles OK; hook tests: 529/529 pass; generator r3: ran (pre-existing plugin-files-mode size error unrelated to this task); Python tests: 21/21 pass; TS gen tests: 439/439 pass; validate-types.sh: passed; deleted 6 stale gitnexus-refresh.js from plugin hook dirs. |
| 10 — Verify (acceptance) | done | grep clean (only agents/TEMP historical hits); all 5 plugins have codemap-refresh.js; ARCHITECTURE.md updated to reflect actual behavior. |
| 11 — Reconcile MEMORY + story | done | MEMORY.md line 142 updated to codemap-refresh.ts/test; skills-refactoring.md item flipped to done. |

States: pending / in-progress / done / blocked.

---

## Intent

Rename the PostToolUse hook `gitnexus-refresh` → `codemap-refresh` AND generalize it so it refreshes whichever
code-graph backend is present in the repo — **GitNexus** (`.gitnexus/`) or **Graphify** (`graphify-out/`) — and
**does nothing when neither is installed**. This makes code match the already-merged docs (ARCHITECTURE.md, web
docs, llms-full.txt all say `codemap-refresh.js`).

This is NOT a behavior rewrite of the refresh itself. The existing **deferred + debounced (trailing-edge)**
execution MUST be preserved — multi-file edit bursts must still coalesce into a single re-index per backend so we
never overload. Keep the stdout-silence, stamp/token debounce, detached-spawn, and error-resilience design intact.

## Decisions (confirmed by user — do not re-litigate)

- **Neither marker present → no-op:** return immediately, write no stamp, spawn nothing.
- **Both markers present → refresh BOTH:** run each backend's command with an INDEPENDENT debounce stamp keyed per `(backend, repoRoot)`.
- **Generator trees → update BOTH** `plugins/**` and `src/plugin-generator/plugins/**` (Python-active + TS-WIP).
- **Activation = in-hook detection (Option B):** drop the single-marker `on.fs` gate; walk up for either marker inside `run()`.

## Backend table (the hook implements exactly this)

| Backend | Detect (walk up from cwd) | Refresh command | Notes |
|---|---|---|---|
| GitNexus | `.gitnexus/` exists | `npx -y gitnexus@latest analyze --force` (+ `--embeddings` when `.gitnexus/meta.json` stats.embeddings > 0) | embeddings probe stays GitNexus-only |
| Graphify | `graphify-out/graph.json` exists | `graphify update .` | AST-only, no API cost, no embeddings probe |
| Neither | — | — | no-op: no stamp, no spawn |

## Actor / context (for the implementing agent)

- **`codemap` skill** = the workspace cartographer skill (`instructions/r3/core/skills/codemap/`). It generates `CODEMAP.md` and, when a graph backend is REQUESTED/installed, fronts GitNexus/Graphify usage. This hook is the automation that keeps an installed backend's index fresh after edits. The hook is **opt-in** — only active once a user has installed a backend (its marker exists).
- **Hook runtime** = `src/hooks/src/` (TypeScript), bundled per-IDE by esbuild (`src/hooks/scripts/build-bundles.mjs`, auto-discovers every `*.ts` in `src/hooks/src/hooks/`), shipped in every plugin. Framework: `defineHook({name, on, throttle, run})`; `run-hook.ts` resolves activation; `on.fs.nearestMarker` is a single string and does NOT report which marker matched (hence in-hook detection).
- **Docs already updated by `main`** to `codemap-refresh.js`; this task makes the code catch up.

---

## Steps

### 0 — Graphify params (pre-resolved; verify only if in doubt)
Marker = `graphify-out/graph.json`; update command = `graphify update .`. Source: project rule
`/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql/.cursor/rules/graphify.mdc`. Only re-research
(README `https://raw.githubusercontent.com/safishamsi/graphify/HEAD/README.md`) if these prove wrong at verify time.

### 1 — Rename source + identity
Rename `src/hooks/src/hooks/gitnexus-refresh.ts` → `codemap-refresh.ts`. Rename exported symbol
`gitnexusRefreshHook` → `codemapRefreshHook`; `name:` value → `'codemap-refresh'`; header comment; every
`[gitnexus-refresh]` log/debug tag → `[codemap-refresh]`.

### 2 — Generalize activation
Remove the `fs: { nearestMarker: '.gitnexus' }` predicate from this hook's `on` (keep event `PostToolUse` and
toolKinds `write/edit/multi-edit`). Detection moves into `run()` (Step 3). Do NOT change `run-hook.ts` /
`runtime/types.ts` — framework stays generic.

### 3 — Backend detection (in `run()`)
Walk up from the tool's cwd (reuse the existing upward-search approach; the runtime exposes `walkUp` in
`runtime/path-utils.ts` for reference) testing each marker: `.gitnexus/` and `graphify-out/graph.json`. Build the
list of detected backends, each with its repo root. If the list is empty → return the no-op side-effect immediately.

### 4 — Per-backend command mapping (preserve debounce/deferred)
Keep the stamp + token + deferred-`sh -c "sleep N && node -e …"` design. For EACH detected backend, schedule its
own deferred run with a stamp key derived from `(backend, repoRoot)` so debounce is independent. Commands per the
backend table. The `--embeddings` flag logic (read `.gitnexus/meta.json`) applies ONLY to the GitNexus branch.

### 5 — De-GitNexus shared bits
Rename the cache/log dir `~/.cache/gitnexus/` → `~/.cache/codemap/`; keep `refresh.log` filename; update log tags.
Leave the `.gitnexus/meta.json` read inside the GitNexus branch (correctly scoped).

### 6 — Tests
Rename `src/hooks/tests/gitnexus-refresh.test.ts` → `codemap-refresh.test.ts`; update import path + symbol + describe
labels. Add/adjust cases: only-`.gitnexus` (existing assertions), only-`graphify-out` (runs `graphify update .`),
**neither → no spawn / silent no-op**, both-present → both commands scheduled. Preserve stdout-silence, debounce,
repo-root detection, error-resilience suites.

### 7 — Bundle name + templates + generators (BOTH trees)
- `src/hooks/tests/regression/bundle-isolation.test.ts` `HOOK_FILES`: `gitnexus-refresh.js` → `codemap-refresh.js`.
- Replace `gitnexus-refresh.js` → `codemap-refresh.js` in every `.tmpl` under `plugins/**` and
  `src/plugin-generator/plugins/**` (Claude; Codex; Copilot `.github/plugin/hooks.json.tmpl` has bash+powershell
  occurrences; Copilot `hooks/hooks.json.tmpl`; Cursor root + `hooks/` templates).
- `src/plugin-generator/src/plugin-processors/plugin-sync-bundles.ts` + its unit test
  (`src/plugin-generator/tests/unit/plugin-processors/plugin-sync-bundles.test.ts`).
- `scripts/tests/test_plugin_generator.py` expected-bundle name.

### 8 — Remove stale tracked artifacts
`git rm src/hooks/dist/src/gitnexus-refresh.js src/hooks/dist/src/hooks/gitnexus-refresh.js` (regenerated under new name).

### 9 — Build + regenerate (WITHOUT pre_commit.py)
- Rebuild hook bundles from `src/hooks/` (its build script → `src/hooks/scripts/build-bundles.mjs`).
- Run hook tests (vitest) from `hooks/`.
- Run plugin generator DIRECTLY: `venv/bin/python scripts/plugin_generator.py --release r3` (and `--release r2`
  if r2 bundles are in scope). Run the TS generator's own unit tests (`src/plugin-generator/`, vitest) since both
  trees were edited.
- `validate-types.sh` from repo root if applicable.

### 10 — Verify (acceptance)
`grep -rIn 'gitnexus-refresh\|gitnexusRefresh'` returns only historical notes. Every plugin ships
`codemap-refresh.js` (five-hook set intact). Behavior: repo with only `.gitnexus/` → `gitnexus analyze --force`;
only `graphify-out/` → `graphify update .`; both → both; neither → nothing spawned. Debounce still coalesces bursts.

### 11 — Reconcile
Update `agents/MEMORY.md` baseline note (~line 142) to new file/symbol names. Flip the `gitnexus-refresh` →
`codemap-refresh` item in `docs/stories/skills-refactoring.md` from open to done.

## Acceptance
All steps `done` in the Status Log; hook tests + generator tests green; grep clean; docs↔code names match;
deferred+debounced behavior preserved per backend.
