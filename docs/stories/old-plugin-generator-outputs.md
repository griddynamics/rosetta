# Old Plugin Generator — CLI Output Examples

Captured 2026-06-19 during the migration session that replaced `scripts/plugin_generator.py` with
`npx rosettify-plugins@latest`. These are verbatim stdout/stderr outputs from the last runs of the
old Python generator before it was removed. Saved for reference — parity baseline and behavior record.

Command invoked: `venv/bin/python scripts/plugin_generator.py [--release r2|r3]`
(no `--output-dir` or `--repo-root` → defaults: output=`<repo-root>/plugins`, repo-root=repo containing script)

---

## R2 — `--release r2` (default)

Exit code: 0

```
   release=r2 source=/Users/isolomatov/Sources/GAIN/rosetta-manual-branch/instructions/r2/core output=/Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins deterministic_hooks=False
   syncing core-claude
      deleted 6 item(s) from /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-claude preserving .claude-plugin, hooks
      copied 145 item(s) to /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-claude
      generated rules/INDEX.md with 11 entries
      generated workflows/INDEX.md with 12 entries
   syncing core-cursor
      deleted 7 item(s) from /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-cursor preserving .cursor-plugin, hooks, hooks.json.tmpl
      copied 145 item(s) to /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-cursor (renamed 11 file(s))
      generated rules/INDEX.md with 11 entries
      generated commands/INDEX.md with 12 entries
   syncing core-copilot
      deleted 7 item(s) from /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-copilot preserving .github, hooks
      copied 145 item(s) to /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-copilot (renamed 10 file(s))
      generated rules/INDEX.md with 11 entries
      generated commands/INDEX.md with 12 entries
   syncing core-codex
      deleted 2 item(s) from /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-codex preserving .codex-plugin
      copied 145 item(s) to /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-codex
      generated rules/INDEX.md with 11 entries
      generated workflows/INDEX.md with 12 entries
      built per-plugin hook payloads: core-claude=9, core-cursor=9, core-copilot=9, core-codex=9
      processed hooks/hooks.json.tmpl
      processed hooks/hooks.json.tmpl
      processed hooks.json.tmpl
      processed .github/plugin/hooks.json.tmpl
      processed hooks/hooks.json.tmpl
      copied 1 config(s) from .github/plugin/ to plugin root
      processed .codex-plugin/hooks.json.tmpl
      generated .codex/agents with 10 subagent(s)
      copied .codex/hooks.json for core-codex
      moved configure to .agents/configure for core-codex
      moved rules to .agents/rules for core-codex
      moved skills to .agents/skills for core-codex
      moved templates to .agents/templates for core-codex
      moved workflows to .agents/workflows for core-codex
      removed 0 stale hook bundle(s) for non-deterministic release
      skipped hook-bundle sync (deterministic_hooks=false)
   generating core-cursor-standalone
      injected plugin instructions into rules/plugin-files-mode.mdc
      injected commands/INDEX.md into rules/plugin-files-mode.mdc
      generated plugin.json (version: 2.0.51)
      copied 9 item(s) into .cursor/
   generating core-copilot-standalone
      moved 5 file(s) rules/bootstrap-*.md → instructions/
      moved 1 file(s) rules/plugin-files-mode.md → instructions/
      renamed folder commands/ → prompts/
      renamed 43 file(s) by suffix patterns
      rewrote path refs in 16 markdown file(s)
      generated rules/INDEX.md with 5 entries
      generated prompts/INDEX.md with 12 entries
      injected plugin instructions into instructions/plugin-files-mode.instructions.md
      injected prompts/INDEX.md into instructions/plugin-files-mode.instructions.md
      injected rules/INDEX.md into instructions/plugin-files-mode.instructions.md
      generated plugin.json (version: 2.0.51)
      copied 8 item(s) into .github/
```

**Notable R2 behavior:**
- `deterministic_hooks=False` → hook bundles not synced; stale `.js` files removed if present
- 145 files copied per main target
- `core-copilot` renames 10 files (`.md` → `.prompt.md` suffix change)
- `core-cursor` renames 11 files (`workflows/` → `commands/` folder rename drives 11 path changes)
- `core-copilot-standalone`: rewrites path refs in 16 markdown files; 5 bootstrap rules moved to instructions/
- `core-cursor-standalone`: 9 items copied into `.cursor/`
- Hook payloads: 9 per plugin (per-IDE bootstrap entries)
- Template var names used: `{{{bootstrap_hooks_claude}}}`, `{{{bootstrap_hooks_codex}}}`, `{{{bootstrap_hooks_copilot}}}` (IDE-specific, per-run context — **old generator bug**, unified as `{{{bootstrap_hooks}}}` in `npx rosettify-plugins@latest`)

---

## R2 restore run (second R2 run, after R3 had synced bundles)

Exit code: 0

Same output as above except one line differs — after R3 had synced hook bundles into the plugins
directories, the restore R2 run cleaned them up:

```
      removed 15 stale hook bundle(s) for non-deterministic release
      skipped hook-bundle sync (deterministic_hooks=false)
```

(vs `removed 0 stale hook bundle(s)` on a clean R2 tree — confirms `_clean_hook_bundles()` behavior)

---

## R3 — `--release r3`

Exit code: 1 (soft — all targets complete; exit 1 due to oversize bootstrap entries, NFR-0004)

```
   release=r3 source=/Users/isolomatov/Sources/GAIN/rosetta-manual-branch/instructions/r3/core output=/Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins deterministic_hooks=True
   syncing core-claude
      deleted 6 item(s) from /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-claude preserving .claude-plugin, hooks
      copied 183 item(s) to /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-claude
      generated rules/INDEX.md with 11 entries
      generated workflows/INDEX.md with 12 entries
   syncing core-cursor
      deleted 7 item(s) from /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-cursor preserving .cursor-plugin, hooks, hooks.json.tmpl
      copied 183 item(s) to /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-cursor (renamed 11 file(s))
      generated rules/INDEX.md with 11 entries
      generated commands/INDEX.md with 12 entries
   syncing core-copilot
      deleted 7 item(s) from /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-copilot preserving .github, hooks
      copied 183 item(s) to /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-copilot (renamed 10 file(s))
      generated rules/INDEX.md with 11 entries
      generated commands/INDEX.md with 12 entries
   syncing core-codex
      deleted 2 item(s) from /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-codex preserving .codex-plugin
      copied 183 item(s) to /Users/isolomatov/Sources/GAIN/rosetta-manual-branch/plugins/core-codex
      generated rules/INDEX.md with 11 entries
      generated workflows/INDEX.md with 12 entries
ERROR: core-claude rules/plugin-files-mode.md additionalContext is 11675 chars (max 10000)
ERROR: core-cursor rules/plugin-files-mode.mdc additionalContext is 11671 chars (max 10000)
ERROR: core-copilot rules/plugin-files-mode.md additionalContext is 11671 chars (max 10000)
ERROR: core-codex rules/plugin-files-mode.md additionalContext is 11675 chars (max 10000)
      built per-plugin hook payloads: core-claude=8, core-cursor=8, core-copilot=8, core-codex=8
      processed hooks/hooks.json.tmpl
      processed hooks/hooks.json.tmpl
      processed hooks.json.tmpl
      processed .github/plugin/hooks.json.tmpl
      processed hooks/hooks.json.tmpl
      copied 1 config(s) from .github/plugin/ to plugin root
      processed .codex-plugin/hooks.json.tmpl
      generated .codex/agents with 10 subagent(s)
      copied .codex/hooks.json for core-codex
      moved configure to .agents/configure for core-codex
      moved rules to .agents/rules for core-codex
      moved skills to .agents/skills for core-codex
      moved templates to .agents/templates for core-codex
      moved workflows to .agents/workflows for core-codex
      synced hooks into core-claude/hooks
      synced hooks into core-cursor/hooks
      synced hooks into core-copilot/hooks
      synced hooks into core-codex/.codex/hooks
   generating core-cursor-standalone
      injected plugin instructions into rules/plugin-files-mode.mdc
      injected commands/INDEX.md into rules/plugin-files-mode.mdc
      generated plugin.json (version: 2.0.51)
      copied 9 item(s) into .cursor/
   generating core-copilot-standalone
      moved 4 file(s) rules/bootstrap-*.md → instructions/
      moved 1 file(s) rules/plugin-files-mode.md → instructions/
      renamed folder commands/ → prompts/
      renamed 43 file(s) by suffix patterns
      rewrote path refs in 14 markdown file(s)
      generated rules/INDEX.md with 6 entries
      generated prompts/INDEX.md with 12 entries
      injected plugin instructions into instructions/plugin-files-mode.instructions.md
      injected prompts/INDEX.md into instructions/plugin-files-mode.instructions.md
      injected rules/INDEX.md into instructions/plugin-files-mode.instructions.md
      generated plugin.json (version: 2.0.51)
      copied 8 item(s) into .github/
```

**Notable R3 behavior vs R2:**
- `deterministic_hooks=True` → hook bundles synced into all four main plugins (`synced hooks into ...`)
- 183 files copied per main target (vs 145 for R2 — R3 has 38 more instruction files)
- Hook payloads: 8 per plugin (vs 9 for R2 — R3 drops one entry type)
- `ERROR: ... additionalContext is 11675 chars (max 10000)` — soft error, NFR-0004; all 4 main targets emit this; run completes and writes output regardless; exit code 1 signals the violation. Known issue as of 2026-06-19.
- `core-copilot-standalone`: rewrites path refs in 14 markdown files (vs 16 for R2); 4 bootstrap rules moved (vs 5 for R2) — R3 has one fewer bootstrap-*.md file
- `core-copilot-standalone` rules/INDEX.md: 6 entries (vs 5 for R2) — R3 adds one rule
