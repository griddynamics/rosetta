# Execution Plan — Release-aware plugin generator

Status: **Draft** (awaiting user approval) · Size: **MEDIUM** · Specs: `./plugin-generator-releases-SPECS.md`

## MoSCoW

- **MUST:** D1–D6; pybars3 render; 6 tmpl migrated + advisory gating; capability flags; skip bundle-sync for r2; CLI app + importable; pre_commit subprocess; pybars3 in requirements; regression test re-based; valid JSON for r2 & r3.
- **SHOULD:** unit tests for r2/r3 hook gating + CLI default; update `agents/IMPLEMENTATION.md` + `agents/MEMORY.md`.
- **COULD:** brief note in `docs/ARCHITECTURE.md` (release param + Handlebars rationale, cross-language).
- **WON'T:** per-release folders; multi-release in one run; `Release` dataclass with source_path; instruction-content changes.

## Work breakdown (sequenced)

1. **Generator core** (`scripts/plugin_generator.py`)
   - Add `DEFAULT_RELEASE="r2"`, `RELEASE_CAPABILITIES`, `_release_capabilities(release)`.
   - `sync_generated_plugins(repo_root, release=DEFAULT_RELEASE)`: source `instructions/<release>/core`; compute caps; gate `sync_hooks_into_plugins` on `advisory_hooks`.
   - `build_bootstrap_replacements` → return brace-free lowercase keys.
   - `process_templates(dest, templates, context)` → pybars3 render (`str(Compiler().compile(text)(context))`).
   - Build per-plugin context (path-renamed bootstrap values + `advisory_hooks` + `release`).
   - `main(argv)` argparse (`--release`, `--repo-root`) + `__main__`.

2. **Templates** — migrate 6 `hooks.json.tmpl` (triple-stache + `{{#if advisory_hooks}}` per §4.2 of specs):
   core-claude/hooks, core-codex/.codex-plugin, core-copilot/.github/plugin, core-copilot/hooks, core-cursor (root + hooks).

3. **pre_commit.py** — remove import; plugin-sync check → `run_command([sys.executable, PLUGIN_GENERATOR])`.

4. **requirements.txt** — add `pybars3>=0.9.7,<1.0`.

5. **Release-aware tests** (NOT disabled, self-gating per §5):
   - `hooks-registered.test.ts` → "every **bundled** `.js` is referenced" (r2: none → ok; r3: all 5).
   - `claude-plugin-root.test.ts` (BF-2) → `.js`-existence + PostToolUse-reference checks made conditional ("if present, must be referenced").
   - `bundle-isolation.test.ts` → no change (unaffected).

6. **New pytest** — `scripts/tests/test_plugin_generator.py` wired into `run-tests.sh`: per-template JSON validity for advisory True/False; advisory present only when True; `_release_capabilities` r2/r3/unknown; `main([])` defaults r2. Proves **R2 + R3** without churning committed files.

7. **Validation** — `venv/bin/python scripts/pre_commit.py` (full, unfiltered): hooks build → plugin sync → type validation → tests (all green). Plus generate `--release r3` into a temp dir and `json.loads` every `hooks.json` to prove R3 output validity independent of committed state.

8. **Docs** — concise updates to `agents/IMPLEMENTATION.md` (Plugin Generator section) + `agents/MEMORY.md` (new preventive rules: triple-stache for raw JSON; release-aware generator).

## HITL gates
- **G1 — Plan/Specs approval (NOW):** approve final decisions + release-aware tests + reviewer fixes. Required explicit phrase to proceed.
- **G2 — Implementation review:** after code + reviewer subagent, before tests.
- **G3 — Final delivery:** after tests + validation.

## Subagent strategy
- Orchestrator authored specs/plan inline (full context already loaded).
- **reviewer** subagent: inspected specs+plan (Phase 3, done) and will inspect implementation (Phase 6).
- Implementation: inline by orchestrator (precise, well-scoped).

## Resolved (was open)
- Gating uses capability flag `{{#if advisory_hooks}}` (content-agnostic per MEMORY rule).
- PR sizing is the user's concern; correctness only on our side (deps + tests + R2 + R3).
- Tests release-aware (self-gating), not disabled.
