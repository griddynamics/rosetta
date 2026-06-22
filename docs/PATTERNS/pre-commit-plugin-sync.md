# Pre-Commit Plugin Sync Pattern

A pre-commit hook (`scripts/pre_commit.py`) regenerates all plugins under `plugins/` from `instructions/r{2,3}/core/` on every commit, keeping IDE plugin artifacts always in sync with source instructions without manual steps. Plugin generation is performed by `npx rosettify-plugins@latest`.

## Problem Solved

IDE plugin trees are derived artifacts, not source. Manual sync is error-prone and always forgotten. A pre-commit hook makes the sync automatic and atomic with every commit.

## When to Use

- After modifying any file in `instructions/r2/core/` or `instructions/r3/core/`.
- The hook runs automatically on `git commit` (requires `git config core.hooksPath .githooks`).
- Run manually: `venv/bin/python scripts/pre_commit.py`.
- Run the generator directly: `npx rosettify-plugins@latest [--release r2|r3] [--output DIR] [--source DIR]`.

## Sync Logic

`scripts/pre_commit.py` runs these checks in order:

1. **hooks build** — compiles TypeScript hooks via `npm --prefix src/hooks run build:quiet`
2. **plugin sync** — runs `npx rosettify-plugins@latest` (default: `--release r2`, output to `<repo-root>/plugins`)
3. **type validation** — runs `validate-types.sh` or mypy
4. **tests** — runs the full test suite via `run-tests.sh`

## What Gets Generated

`npx rosettify-plugins@latest` produces six plugin trees from `instructions/r2/core/`:

- `plugins/core-claude` — Claude Code marketplace plugin
- `plugins/core-cursor` — Cursor marketplace plugin
- `plugins/core-copilot` — VS Code / JetBrains Copilot marketplace plugin
- `plugins/core-codex` — Codex marketplace plugin
- `plugins/core-cursor-standalone` — Cursor direct extraction (`.cursor/`)
- `plugins/core-copilot-standalone` — Copilot direct extraction (`.github/`)

## Occurrences

- `scripts/pre_commit.py` — pre-commit orchestration (hooks build → plugin sync → type check → tests)
- `.githooks/pre-commit` — hook entry point
- `plugins/` — generated output (all six plugin trees)
- `docs/ARCHITECTURE.md` — "Plugins" section
