# Tech Specs: Inline Bootstrap Hooks in Plugin Generator

## Problem

Bootstrap hooks in all 4 plugins read markdown files at runtime via shell scripts. This causes:
- Fragile shell escaping (quotes, newlines, special chars)
- Stale file references when files are added/removed (e.g. bootstrap-hitl-questioning.md deletion)
- Runtime file I/O that can fail silently (`2>/dev/null`)
- Duplicated bootstrap scripts across plugins (.sh + .ps1)
- Frontmatter wasted tokens (YAML between `---` markers is for KB publishing, useless in plugin context)
- Single monolithic output risks truncation

## Solution

`plugin_generator.py` reads bootstrap files at build time, strips frontmatter, JSON-escapes content, validates size, and replaces `{{BOOTSTRAP_HOOKS_*}}` placeholders in **`hooks.json.tmpl`** files — producing fully inlined `hooks.json` files. Runtime shell scripts are eliminated.

## Scope

- ONLY bootstrap hooks inlining
- No version placeholders
- No other template features
- No changes to `bump_versions.sh`

## Architecture

### Template + Generated File Design

Each plugin has a **`hooks.json.tmpl`** (preserved source template) and a **`hooks.json`** (generated output). This completely separates concerns:

| File | Role | Who edits | Contains |
|---|---|---|---|
| `hooks.json.tmpl` | Source template | Template authors + generator (write, never reads back) | `{{BOOTSTRAP_HOOKS_*}}` placeholder + any manual hooks |
| `hooks.json` | Generated output | Generator only | Fully inlined hook content, valid JSON |

**Cycle correctness:** `.tmpl` is preserved and never modified by the generator (generator only reads it). Generator writes `hooks.json` fresh on every run. `bump_versions.sh` touches only `plugin.json`. Fully idempotent across arbitrary bump → generate cycles.

**Extensibility:** Template authors add custom hooks anywhere in `.tmpl` around or alongside the placeholder. The placeholder expands to a JSON array value.

### Placeholder System

Three placeholders, all expand to a **JSON array of hook objects** (`[{...}, {...}, ...]`):

| Placeholder | Used by | Output format |
|---|---|---|
| `{{BOOTSTRAP_HOOKS_CLAUDE}}` | Claude, Codex | `hookSpecificOutput` format |
| `{{BOOTSTRAP_HOOKS_COPILOT}}` | Copilot | `bash`/`powershell` fields |
| `{{BOOTSTRAP_HOOKS_CURSOR}}` | Cursor | `{"additional_context":"..."}` flat format |

Replacement is **string-based** (not JSON-aware). The `.tmpl` is valid JSON only after placeholder substitution.

### Template File Locations and Structure

**Claude — `.claude-plugin/hooks/hooks.json.tmpl`:**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": {{BOOTSTRAP_HOOKS_CLAUDE}}
      }
    ]
  }
}
```

**Cursor — `.cursor-plugin/hooks/hooks.json.tmpl`:**
```json
{
  "version": 1,
  "hooks": {
    "sessionStart": {{BOOTSTRAP_HOOKS_CURSOR}}
  }
}
```

**Codex — `.codex-plugin/hooks.json.tmpl`:**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": {{BOOTSTRAP_HOOKS_CLAUDE}}
      }
    ]
  }
}
```

**Copilot — `.github/plugin/hooks.json.tmpl`:**
```json
{
  "version": 1,
  "hooks": {
    "sessionStart": {{BOOTSTRAP_HOOKS_COPILOT}}
  }
}
```

Template authors can extend any of these by adding more matcher groups (Claude/Codex) or additional array entries (Cursor/Copilot) before or after the placeholder — all are preserved in the `.tmpl`.

### Generated File Locations

| Platform | Template (preserved) | Generated output |
|---|---|---|
| Claude | `.claude-plugin/hooks/hooks.json.tmpl` | `.claude-plugin/hooks/hooks.json` |
| Cursor | `.cursor-plugin/hooks/hooks.json.tmpl` | `.cursor-plugin/hooks/hooks.json` |
| Codex | `.codex-plugin/hooks.json.tmpl` | `.codex-plugin/hooks.json` |
| Copilot | `.github/plugin/hooks.json.tmpl` | `.github/plugin/hooks.json` |

All paths relative to the plugin's destination folder (e.g. `plugins/core-claude/`).

### plugin.json Changes

| Platform | Change |
|---|---|
| Claude | Remove inline `"hooks"` section → add `"hooks": "./hooks/hooks.json"` |
| Cursor | Add `"hooks": "./hooks/hooks.json"` |
| Codex | No change (hooks already separate, no manifest reference needed) |
| Copilot | No change (hooks already separate) |

Both Claude Code and Cursor support the `hooks` field in `plugin.json` as a path string (e.g. `"./hooks/hooks.json"`) pointing to the generated file. Both also auto-discover `hooks/hooks.json` without any manifest reference. Explicit reference is used for clarity.

### Hook Output Format

**Claude / Codex / Copilot (verified working in practice):**
```json
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<PREFIX><escaped content>"}}
```

**Cursor (different — flat top-level, snake_case):**
```json
{"additional_context":"<PREFIX><escaped content>"}
```

Note: GitHub Copilot docs claim `sessionStart` output is ignored, but in practice the `hookSpecificOutput` format IS processed. Confirmed working.

### Predefined Prefix (Required in Every Hook Output)

Every hook output (all platforms, all hook entries) MUST be prepended with:

```
ALWAYS MUST FULLY READ THIS ENTIRE CONTEXT BEFORE PROCEEDING FROM FILE PATH PROVIDED ESPECIALLY IF TRUNCATED/PREVIEWED. DO IT NOW! THEN PROCEED.\nRosetta get_context_instructions:\n
```

This instructs the agent to read full content even if previewed, compacted, or truncated. Present in every hook output, not just the first.

### Bootstrap Files to Inline

Read from destination plugin folder (after `copy_core_tree` + `generate_folder_index`):

| Hook index | File (relative to dest_dir) |
|---|---|
| 0 | `rules/bootstrap-core-policy.md` |
| 1 | `rules/bootstrap-execution-policy.md` |
| 2 | `rules/bootstrap-guardrails.md` |
| 3 | `rules/bootstrap-rosetta-files.md` |
| 4 | `rules/plugin-files-mode.md` |
| 5 | `rules/INDEX.md` |
| 6 | `workflows/INDEX.md` |

Plus one additional hook (index 7) for plugin path — no lock needed, just echo. Appended last.

### Locking Mechanism (Per-Hook Index Locks)

Some platforms (Copilot confirmed; others suspected) fire `SessionStart` twice for the same `session_id`. Per-hook index locks prevent duplicate output while allowing all 7 file hooks to run exactly once on the first firing.

A single shared lock would cause hooks 1–6 to bail after hook 0 creates it within the same firing. Per-hook locks (one lock file per hook index per session) solve this.

Lock filename: `/tmp/rosetta-bs-${SESSION_ID:-$$}-N.lock` (N = hook index 0–6)

**Bash lock snippet (hook N):**
```bash
INPUT=$(cat); SESSION_ID=$(printf '%s' "$INPUT" | sed -n 's/.*"session_id":"\([^"]*\)".*/\1/p'); LOCK="/tmp/rosetta-bs-${SESSION_ID:-$$}-N.lock"; if [ -f "$LOCK" ]; then exit 0; fi; touch "$LOCK"
```

Hook 0 additionally cleans up stale locks older than 1 minute:
```bash
find /tmp -maxdepth 1 -name "rosetta-bs-*.lock" -mmin +1 -delete 2>/dev/null; INPUT=$(cat); ...
```

**PowerShell lock snippet (Copilot only, hook N):**
```powershell
$Inp = [Console]::In.ReadToEnd(); $Sid = if ($Inp -match '"session_id":"([^"]*)"') { $Matches[1] } else { [System.Diagnostics.Process]::GetCurrentProcess().Id }; $Lk = "$env:TEMP\rosetta-bs-$Sid-N.lock"; if (Test-Path $Lk) { exit 0 }; New-Item -Path $Lk -ItemType File -Force | Out-Null
```

Hook 0 additionally cleans stale locks:
```powershell
Get-ChildItem "$env:TEMP\rosetta-bs-*-0.lock" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) } | Remove-Item -Force -ErrorAction SilentlyContinue; ...
```

### Hook Entry Formats (expanded into JSON arrays)

**`{{BOOTSTRAP_HOOKS_CLAUDE}}` — Claude hook entry (index N):**
```json
{
  "type": "command",
  "command": "<bash_lock_N>; printf '%s' '{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"<PREFIX+escaped>\"}}' ",
  "once": true
}
```
Plugin path hook (last, no lock): `{"type":"command","command":"echo \"Rosetta Core Plugin Path: ${CLAUDE_PLUGIN_ROOT}\"","once":true}`

Codex uses identical content format as Claude but wraps hook entries with `"statusMessage"` and `"timeout": 30`, and omits `"once"`.

**`{{BOOTSTRAP_HOOKS_COPILOT}}` — Copilot hook entry (index N):**
```json
{
  "type": "command",
  "bash": "<bash_lock_N>; printf '%s' '{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"<PREFIX+escaped>\"}}'",
  "powershell": "<ps_lock_N>; Write-Output '{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"<PREFIX+escaped>\"}}'"
}
```
Plugin path hook (last): `{"type":"command","bash":"echo \"Rosetta Core Plugin Path: $PLUGIN_ROOT\"","powershell":"Write-Output \"Rosetta Core Plugin Path: $env:PLUGIN_ROOT\""}`

**`{{BOOTSTRAP_HOOKS_CURSOR}}` — Cursor hook entry (index N):**
```json
{
  "type": "command",
  "command": "<bash_lock_N>; printf '%s' '{\"additional_context\":\"<PREFIX+escaped>\"}'"
}
```
Plugin path hook (last): `{"type":"command","command":"echo \"Rosetta Core Plugin Path: ${CURSOR_PROJECT_DIR}\""}`

### Processing Pipeline (per bootstrap file)

1. Read file from dest_dir; if missing → log warning, skip (no build failure)
2. `strip_frontmatter(content)` → body (reuse `_extract_frontmatter_and_body()`)
3. Prepend `BOOTSTRAP_PREFIX` constant
4. `json_escape_for_additional_context(prefixed)` → escaped
5. Validate `len(escaped) <= 10000`; if over → collect error, continue processing all files
6. Build platform hook entry with per-hook lock snippet (index N)
7. Append to hook entries list

After all files:
8. Append plugin path hook (no lock)
9. Build placeholder → rendered JSON array mapping for all three placeholders
10. Read `.tmpl` file; string-replace each found placeholder; write `hooks.json`
11. Print errors; return violation count

### Size Validation

- Per-file limit: 10,000 chars for the escaped `additionalContext` / `additional_context` value (after prefix, after escaping)
- All files processed regardless of violations
- Each violation: `ERROR: {relative_path} additionalContext is {len} chars (max 10000)` to stderr
- `render_bootstrap_hooks` returns number of violations; 0 = success
- `sync_generated_plugins` returns 1 if any violations

### Plugin Generator Flow Change

Current:
```
reset_generated_tree → copy_core_tree → generate_folder_index → platform-specific post-processing
```

New:
```
reset_generated_tree → copy_core_tree → generate_folder_index → render_bootstrap_hooks → platform-specific post-processing
```

`render_bootstrap_hooks(spec: PluginSyncSpec, dest_dir: Path) -> int`:
1. Build hook entry lists from dest bootstrap files (per platform format)
2. Serialize each list to JSON array string (three placeholders → three arrays)
3. Locate `.tmpl` file for the platform
4. String-replace placeholders → write `hooks.json` alongside `.tmpl`
5. Return violation count

### Platform Hook Schemas (Verified via Official Docs)

**Claude Code:**
- `hooks` field in `plugin.json`: string path `"./hooks/hooks.json"` or inline object
- Auto-discovers `hooks/hooks.json` at plugin root without manifest reference
- SessionStart matcher: `"startup"` (not resume/clear/compact)
- Hook entry: `type`, `command`, `once`, `timeout`, `statusMessage`
- stdout: `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}`
- Size limit: 10,000 chars (confirmed)

**OpenAI Codex:**
- Separate `hooks.json` file; no `hooks` field in `plugin.json`
- SessionStart matcher: `"startup|resume"`
- Hook entry: `type`, `command`, `statusMessage`, `timeout`/`timeoutSec`
- stdout: `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}` (JSON, not raw text)

**GitHub Copilot:**
- Separate `hooks.json`; no hooks field in `plugin.json`
- Flat `sessionStart` array (no matcher grouping)
- Hook entry: `type`, `bash`, `powershell`, `timeoutSec`
- stdout: `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}` (verified working)

**Cursor:**
- `hooks` field in `plugin.json`: string path `"./hooks/hooks.json"` or inline object
- Auto-discovers `hooks/hooks.json` at plugin root without manifest reference
- Flat `sessionStart` array (no matcher grouping)
- Hook entry: `type`, `command`, `timeout`, `failClosed`
- stdout: `{"additional_context":"..."}` — FLAT, snake_case — DIFFERENT from all other platforms

### Files Affected

**Modified:**
- `scripts/plugin_generator.py` — add `BOOTSTRAP_PREFIX`, `strip_frontmatter()`, `json_escape_for_additional_context()`, `render_bootstrap_hooks()`, size validation; update `sync_generated_plugins`; update `generate_copilot_runtime_layout`
- `plugins/core-claude/.claude-plugin/plugin.json` — remove inline `hooks` section, add `"hooks": "./hooks/hooks.json"`
- `plugins/core-cursor/.cursor-plugin/plugin.json` — add `"hooks": "./hooks/hooks.json"`

**New (preserved templates — checked into git):**
- `plugins/core-claude/.claude-plugin/hooks/hooks.json.tmpl`
- `plugins/core-cursor/.cursor-plugin/hooks/hooks.json.tmpl`
- `plugins/core-codex/.codex-plugin/hooks.json.tmpl`
- `plugins/core-copilot/.github/plugin/hooks.json.tmpl`

**Generated (written fresh each build):**
- `plugins/core-claude/.claude-plugin/hooks/hooks.json`
- `plugins/core-cursor/.cursor-plugin/hooks/hooks.json`
- `plugins/core-codex/.codex-plugin/hooks.json`
- `plugins/core-copilot/.github/plugin/hooks.json`

**Deleted:**
- `plugins/core-claude/.claude-plugin/rosetta-bootstrap.sh`
- `plugins/core-copilot/.github/plugin/rosetta-bootstrap.sh`
- `plugins/core-copilot/.github/plugin/rosetta-bootstrap.ps1`
- Runtime copies `plugins/core-copilot/rosetta-bootstrap.{sh,ps1}` (gone after next generation)

**Not changed:**
- `scripts/bump_versions.sh`
- `plugins/core-codex/.codex-plugin/plugin.json`
- `plugins/core-copilot/.github/plugin/plugin.json`

### Bump/Generate Cycle Correctness

```
bump_versions.sh  →  edits plugin.json version field only (no hooks content ever in plugin.json)
plugin_generator  →  reads hooks.json.tmpl, replaces placeholder, writes hooks.json (fresh)
bump_versions.sh  →  edits plugin.json version field only
plugin_generator  →  reads hooks.json.tmpl, replaces placeholder, writes hooks.json (fresh)
```

`.tmpl` always retains the placeholder — never modified by the generator. Fully idempotent.

### Ordering Constraint

`generate_folder_index` MUST run before `render_bootstrap_hooks` — `rules/INDEX.md` and `workflows/INDEX.md` are generated and then read by the hook inliner.

`generate_copilot_runtime_layout` runs AFTER `render_bootstrap_hooks` — it copies the freshly generated `.github/plugin/hooks.json` to the plugin root.

### Edge Cases

- Bootstrap file missing from dest → warning, skip, no build failure
- Placeholder not found in `.tmpl` → no replacement, no error (allows gradual template adoption)
- `.tmpl` file missing → warning, skip (no `hooks.json` generated for that platform)
- Parent dirs for `hooks.json` created if not present

## Acceptance Criteria

1. `pre_commit.py` runs clean (exit 0) with all tests passing
2. No `rosetta-bootstrap.sh` or `.ps1` scripts remain in plugins
3. Generated `hooks.json` files contain inlined bootstrap content (no runtime file reads)
4. Each inlined `additionalContext` / `additional_context` < 10,000 chars
5. Build fails (exit 1) if any exceeds 10,000 chars
6. `bump_versions.sh` unaffected — `plugin.json` files contain only metadata; hooks live in `.tmpl`/`.json`
7. Multiple bump → generate cycles produce correct, fresh hook content each time
8. `grep -r "bootstrap-hitl-questioning" . --exclude-dir=.git` returns nothing
9. Frontmatter stripped from all inlined content
10. Every hook output includes the predefined "ALWAYS MUST FULLY READ..." prefix
11. Per-hook index lock mechanism present in hooks 0–6; no duplicate output on double SessionStart firing
12. Cursor hooks use `{"additional_context":"..."}` (flat, snake_case)
13. Claude `plugin.json` references `"hooks": "./hooks/hooks.json"`
14. Cursor `plugin.json` references `"hooks": "./hooks/hooks.json"`
15. All four `hooks.json.tmpl` files exist and are valid JSON after placeholder substitution
