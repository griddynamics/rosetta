# Tech Specs — Release-aware plugin generator with conditional templating

Status: **Draft** (awaiting user approval)
Request size: **MEDIUM** (one area: plugin generation; ~10 source files + large generated-output diff)

## 1. Problem / Intent

Make `scripts/plugin_generator.py` able to generate plugins from a chosen instructions
**release** (`r2`, `r3`), and let `*.tmpl` files **conditionally** include content per release —
so r3 ships full hooks (SessionStart bootstrap + advisory PreToolUse/PostToolUse) while
r2 ships only the SessionStart bootstrap hook. Replace the ad-hoc `{{PLACEHOLDER}}`
string substitution with a real, cross-language templating engine.

## 2. Decisions (user-approved in HITL)

| # | Decision | Source |
|---|----------|--------|
| D1 | Templating engine = **Handlebars**: `pybars3` (Python) + `handlebars.js` (npm). Cross-language by design. | user |
| D2 | **Default release = `r2`**. Bare run generates r2 and overwrites `plugins/core-*`. | user (confirmed 3×) |
| D3 | **Single active release at a time**, always overwrite `plugins/core-*` (no per-release folders). | user |
| D4 | Hook diff: **r2 = SessionStart bootstrap only** (no advisory hooks, **skip `.js` bundle sync**); **r3 = SessionStart + all 5 advisory hooks**. | user |
| D5 | `plugin_generator.py` becomes a **standalone CLI app** (`argparse`, `__main__`); `sync_generated_plugins`/`main` stay **importable** for tests. | user |
| D6 | `pre_commit.py` invokes it as an **app via subprocess** with **no `--release`** → uses default (r2). | user |

## 3. Scope

### In scope (MUST)
- `--release <name>` arg (default `r2`); source = `instructions/<release>/core`.
- Replace `process_templates` string-replace with pybars3 render.
- Migrate 6 `hooks.json.tmpl` files: `{{BOOTSTRAP_HOOKS_*}}` → **triple-stache** `{{{bootstrap_hooks_*}}}`
  (double-stache HTML-escapes and corrupts JSON), and wrap advisory hook blocks in
  `{{#if advisory_hooks}}…{{/if}}` with comma placement that keeps r2 output valid JSON.
- Per-release **capability flags** (data-driven, content-agnostic per MEMORY rule):
  `RELEASE_CAPABILITIES = {"r2": {"advisory_hooks": False}, "r3": {"advisory_hooks": True}}`.
  Templates gate on the capability flag (`advisory_hooks`), not the release name.
- Skip `sync_hooks_into_plugins` when `advisory_hooks` is false (r2 needs no `.js`).
- CLI `main()` + `__main__`; keep `sync_generated_plugins(repo_root, release="r2")` importable.
- `pre_commit.py`: drop the import, run `[sys.executable, scripts/plugin_generator.py]` via existing `run_command`.
- Add `pybars3` to `requirements.txt`.
- **Update `hooks/tests/regression/hooks-registered.test.ts`** (see §5) — required to keep tests green.

### Out of scope (WON'T, this change)
- Per-release output folders / simultaneous multi-release emission.
- A full `Release` dataclass with arbitrary `source_path` override (release name → conventional
  `instructions/<release>/core` path is sufficient now; dataclass deferred — COULD later).
- Changing instruction content in `instructions/r2|r3/core`.
- Migrating non-hook templates (only `hooks.json.tmpl` files use placeholders today).

## 4. Design

### 4.1 Template context (per plugin, in Pass 2)
```
context = {
  "bootstrap_hooks_claude":  <json fragment, path-renames applied>,
  "bootstrap_hooks_codex":   ...,
  "bootstrap_hooks_cursor":  ...,
  "bootstrap_hooks_copilot": ...,
  "advisory_hooks":          caps["advisory_hooks"],   # bool
  "release":                 release,                   # informational
}
rendered = str(Compiler().compile(tmpl_text)(context))
```
- `build_bootstrap_replacements` returns **lowercase, brace-free keys** (`bootstrap_hooks_claude`…).
- Existing per-plugin `path_renames` rewriting of the bootstrap values is preserved.

### 4.2 Template edits (comma-safe gating)
- **core-claude**, **core-codex** (have `SessionStart`):
  `"SessionStart": [ … ]{{#if advisory_hooks}},\n  "PreToolUse": […],\n  "PostToolUse": […]{{/if}}`
- **core-copilot plugin** (`sessionStart: [{{{bootstrap_hooks_copilot}}}]`) and
  **core-copilot standalone** (`sessionStart: []`): same trailing-comma-inside-`{{#if}}` pattern.
- **core-cursor** (no sessionStart): wrap the whole inner body —
  `"hooks": {\n  {{#if advisory_hooks}}"preToolUse": […],\n  "postToolUse": […]{{/if}}\n }`
  → r2 renders `"hooks": { }` (valid empty object).

### 4.3 CLI
```
main(argv=None) -> int   # argparse: --release (default r2), --repo-root (default = repo root)
__main__: raise SystemExit(main())
```

### 4.4 pre_commit.py
```
PLUGIN_GENERATOR = REPO_ROOT / "scripts" / "plugin_generator.py"
Check("plugin sync", lambda: run_command([sys.executable, str(PLUGIN_GENERATOR)]))  # no --release → r2
```

## 5. Test impact — release-aware self-gating (user directive)

User directive: *"tests should not be disabled; check first whether it is r3, then run the
advisory-hook assertions; r2 (ready) and r3 (too early) must both pass."*

**Capability detection (artifact-derived, no new fields):** a test helper determines whether
**advisory hooks are enabled** for a committed plugin by checking whether advisory `.js` bundles
exist in that plugin's hook dir (only r3 syncs them) — this *is* the "is it r3?" signal. Tests
then:
- **Always** assert each plugin `hooks.json` is **valid JSON** and (where applicable) carries its
  SessionStart/bootstrap block.
- **Only when advisory hooks are enabled (r3)** assert every bundled advisory `.js` is referenced.

Two tests change (NOT disabled, made self-gating):
- `hooks/tests/regression/hooks-registered.test.ts`: invariant becomes *"every hook **bundled**
  in the plugin's hook dir is referenced in its hooks.json"* (r2: no bundles → nothing required;
  r3: 5 bundles → all required). Stronger orphan-bundle guard, release-agnostic.
- `hooks/tests/claude-plugin-root.test.ts` (BF-2): the `loose-files.js` existence check and the
  `hooks.json` PostToolUse-reference check become conditional — *"if `loose-files.js` exists, then
  hooks.json must reference it"* (vacuous for r2, enforced for r3).
- `hooks/tests/regression/bundle-isolation.test.ts`: **unaffected** (reads `dist/bundles/`).

## 5a. Reviewer blocking fixes folded in
- **BF-1:** apply `path_renames` only to the **string** bootstrap values, then merge the
  `advisory_hooks`(bool)/`release`(str) flags — never run `str.replace` over the mixed context.
- **BF-2:** see §5 (`claude-plugin-root.test.ts` made conditional).
- **BF-3:** copilot `hooks/hooks.json.tmpl` gets **only** `{{#if advisory_hooks}}` gating —
  `sessionStart` stays `[]`, no triple-stache (it has no bootstrap placeholder).

## 6. Acceptance criteria
- AC1 (**R2 works**): `python scripts/plugin_generator.py` (no args) → generates from r2; every `hooks.json` is **valid JSON**; advisory hooks **absent**; no `.js` bundles synced.
- AC2 (**R3 works**): `python scripts/plugin_generator.py --release r3` → advisory hooks **present** (all 5 `.js` referenced) in every plugin; `.js` bundles synced; byte-identical to today's r3 output.
- AC3: `--release <unknown>` → clear non-zero error.
- AC4: `pre_commit.py` plugin-sync step runs the generator as a subprocess (no import) and propagates exit code.
- AC5 (**tests work**): Full `pre_commit.py` run passes (hooks build, plugin sync, type validation, tests); release-aware tests green for the committed release.
- AC6: `sync_generated_plugins` and `main` remain importable.
- AC7 (**deps work**): `pybars3` resolves in the repo venv; `pip install -r requirements.txt` succeeds; npm/vitest suites still pass (no JS dep added — `handlebars.js` is the documented npm counterpart, used only if a JS renderer is later added).

## 6a. Both-releases automated proof
New pytest (`scripts/tests/test_plugin_generator.py`, wired into `run-tests.sh`):
- compiles each committed `*.tmpl` via `pybars` with `advisory_hooks` True **and** False → `json.loads` succeeds both ways; advisory blocks present only when True.
- `_release_capabilities("r2")`/`("r3")` correct; unknown → error; `main([])` defaults to r2.
This proves **R2 and R3 template output validity** deterministically without churning committed files.

## 7. Risks
- R1: committed `plugins/**` diff is **large** (r3→r2). Mechanical, reviewable via regenerate.
- R2: pybars3 is a community port; mitigated — engine smoke-tested (v0.9.7: `{{#if}}` + triple-stache raw OK); `scripts/` not in mypy `files`, so no type-check breakage.
- R3: invalid JSON from bad comma placement → mitigated by AC1/AC2 JSON-parse checks + tests.
