# Pre-Commit Plugin Sync Pattern

A pre-commit hook (`scripts/pre_commit.py`) regenerates `plugins/core-claude/` and `plugins/core-cursor/` from `instructions/r2/core/` on every commit, keeping IDE plugin artifacts always in sync with source instructions without manual steps.

## Problem Solved

IDE plugin trees are derived artifacts, not source. Manual sync is error-prone and always forgotten. A pre-commit hook makes the sync automatic and atomic with every commit.

## When to Use

- After modifying any file in `instructions/r2/core/`.
- The hook runs automatically on `git commit` (requires `git config core.hooksPath .githooks`).
- Run manually: `venv/bin/python scripts/pre_commit.py`.

## Sync Logic

```python
CORE_SOURCE = REPO_ROOT / "instructions" / "r2" / "core"
CORE_CLAUDE_DEST = REPO_ROOT / "plugins" / "core-claude"
CORE_CURSOR_DEST = REPO_ROOT / "plugins" / "core-cursor"

# For each plugin spec:
# 1. Copy source tree to destination (preserving preserved_folder)
# 2. Normalize model names in frontmatter (opus/sonnet/haiku/inherit only)
# 3. Run validate-types.sh
```

## Model Normalization

Frontmatter `model:` values are normalized to allowed values:
```
claude-sonnet-4-6 → sonnet
claude-opus-4-6   → opus
gpt-*             → inherit  (non-Anthropic models stripped)
```

## What Is NOT Synced

Plugins/rosetta/ (bootstrap-only plugin) is maintained manually — it contains only the bootstrap rule + MCP definition, not the full core tree.

## Occurrences

- `scripts/pre_commit.py` — full sync and validation logic
- `.githooks/pre-commit` — hook entry point
- `plugins/core-claude/` — generated output (Claude Code plugin)
- `plugins/core-cursor/` — generated output (Cursor plugin)
- `docs/ARCHITECTURE.md` — "Plugin distribution" section
