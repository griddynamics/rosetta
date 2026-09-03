# Pre-Commit Plugin Sync Pattern

A pre-commit hook (`scripts/pre_commit.py`) regenerates every plugin under `plugins/` from the domain sets in `instructions/r3/` on every commit, keeping IDE plugin artifacts in sync with source instructions without manual steps. Generation is a single call to `npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false`.

## Problem Solved

IDE plugin trees are derived artifacts, not source. Manual sync is error-prone and always forgotten. A pre-commit hook makes the sync automatic and atomic with every commit.

## When to Use

- After modifying any file under `instructions/r3/` (the current release; `instructions/r2/core/` receives backported fixes only).
- The hook runs automatically on `git commit` (requires `git config core.hooksPath .githooks`).
- Run manually: `venv/bin/python scripts/pre_commit.py`.
- Run the generator directly: `npx -y rosettify-plugins@latest [--release r3|r2] [--deterministic-hooks true|false] [--output DIR] [--source DIR]` (default `--release r3`).

## Sync Logic

`scripts/pre_commit.py` runs these checks in order:

1. **hooks build** — compiles TypeScript hooks via `npm --prefix src/hooks run build:quiet`
2. **plugin sync** — runs `npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false` (output to `<repo-root>/plugins`)
3. **type validation** — runs `src/validate-types.sh` or mypy
4. **tests** — runs the full test suite via `src/run-tests.sh`

## What Gets Generated

One invocation reads `src/rosettify-plugins/plugins.json` and expands sets, variants, and IDE targets into 49 plugin trees under `plugins/`, named `<set>-<ide>`:

- `plugins/rosetta-<ide>` and `plugins/rosetta-<ide>-light` — the combo set, all five subject folders
- `plugins/core-<ide>`, `workflows-<ide>`, `qe-<ide>`, `search-<ide>`, `modernization-<ide>` — one domain set each

The seven IDE targets are `claude`, `cursor`, `copilot`, `codex`, `cursor-standalone`, `copilot-standalone`, `antigravity`. `plugins.json` is validated before anything is written, so a malformed catalog aborts the run rather than emitting a partial tree.

## Occurrences

- `scripts/pre_commit.py` — pre-commit orchestration (hooks build → plugin sync → type check → tests)
- `.githooks/pre-commit` — hook entry point
- `src/rosettify-plugins/plugins.json` — the set catalog the single invocation expands
- `plugins/` — generated output (49 plugin trees)
- `docs/ARCHITECTURE.md` — "Plugins" section
