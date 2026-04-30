# Execution Plan: Inline Bootstrap Hooks in Plugin Generator

## Request Size: MEDIUM

~12 files affected, one area (plugin generation).

## Phase 1: Core Implementation

### Task 1.1: Add helper functions and constant to plugin_generator.py

**`BOOTSTRAP_PREFIX` constant:**
```python
BOOTSTRAP_PREFIX = (
    "ALWAYS MUST FULLY READ THIS ENTIRE CONTEXT BEFORE PROCEEDING FROM FILE PATH PROVIDED"
    " ESPECIALLY IF TRUNCATED/PREVIEWED. DO IT NOW! THEN PROCEED.\n"
    "Rosetta get_context_instructions:\n"
)
```

**`strip_frontmatter(content: str) -> str`:**
Delegates to existing `_extract_frontmatter_and_body()` — returns body portion only.

**`json_escape_for_additional_context(content: str) -> str`:**
Escapes for embedding in JSON string: `\` → `\\`, `"` → `\"`, newline → `\n`, CR → `\r`, tab → `\t`.

### Task 1.2: Add render_bootstrap_hooks function

Signature: `render_bootstrap_hooks(spec: PluginSyncSpec, dest_dir: Path) -> int`
Returns: number of size violations (0 = success).

**Bootstrap files (read from dest_dir, in hook index order):**

| Hook idx | File (relative to dest_dir) |
|---|---|
| 0 | `rules/bootstrap-core-policy.md` |
| 1 | `rules/bootstrap-execution-policy.md` |
| 2 | `rules/bootstrap-guardrails.md` |
| 3 | `rules/bootstrap-rosetta-files.md` |
| 4 | `rules/plugin-files-mode.md` |
| 5 | `rules/INDEX.md` |
| 6 | `workflows/INDEX.md` |

**Per-file processing:**
1. Read `dest_dir / relative_path`; if missing → `print(f"WARNING: {path} not found, skipping", file=sys.stderr)`; skip
2. `body = strip_frontmatter(content)`
3. `prefixed = BOOTSTRAP_PREFIX + body`
4. `escaped = json_escape_for_additional_context(prefixed)`
5. If `len(escaped) > 10000` → collect `f"ERROR: {path} additionalContext is {len(escaped)} chars (max 10000)"`, increment violations
6. Build hook entry dict for this platform and index (see below)

**Lock snippet helpers (inline Python string builders):**

Bash lock for hook index N:
```python
def _bash_lock(n: int) -> str:
    cleanup = (
        'find /tmp -maxdepth 1 -name "rosetta-bs-*.lock" -mmin +1 -delete 2>/dev/null; '
        if n == 0 else ""
    )
    return (
        f"{cleanup}"
        f"INPUT=$(cat); "
        f"SESSION_ID=$(printf '%s' \"$INPUT\" | sed -n 's/.*\"session_id\":\"\\([^\"]*\\)\".*/\\1/p'); "
        f'LOCK="/tmp/rosetta-bs-${{SESSION_ID:-$$}}-{n}.lock"; '
        f'if [ -f "$LOCK" ]; then exit 0; fi; touch "$LOCK"'
    )
```

PowerShell lock for hook index N (Copilot only):
```python
def _ps_lock(n: int) -> str:
    cleanup = (
        'Get-ChildItem "$env:TEMP\\rosetta-bs-*-0.lock" -ErrorAction SilentlyContinue | '
        'Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) } | '
        'Remove-Item -Force -ErrorAction SilentlyContinue; '
        if n == 0 else ""
    )
    return (
        f"{cleanup}"
        f"$Inp = [Console]::In.ReadToEnd(); "
        f'$Sid = if ($Inp -match \'"session_id":"([^"]*)"\') {{ $Matches[1] }} '
        f"else {{ [System.Diagnostics.Process]::GetCurrentProcess().Id }}; "
        f'$Lk = "$env:TEMP\\rosetta-bs-$Sid-{n}.lock"; '
        f"if (Test-Path $Lk) {{ exit 0 }}; "
        f"New-Item -Path $Lk -ItemType File -Force | Out-Null"
    )
```

**Hook entry builders per platform (index N, escaped content):**

Claude (`core-claude`):
```python
{
    "type": "command",
    "command": f'{_bash_lock(n)}; printf \'%s\' \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{escaped}"}}}}\' ',
    "once": True,
}
```

Codex (`core-codex`) — same content format as Claude, different wrapper:
```python
{
    "type": "command",
    "command": f'{_bash_lock(n)}; printf \'%s\' \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{escaped}"}}}}\' ',
    "statusMessage": "Loading Rosetta bootstrap",
    "timeout": 30,
}
```

Copilot (`core-copilot`):
```python
{
    "type": "command",
    "bash": f'{_bash_lock(n)}; printf \'%s\' \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{escaped}"}}}}\' ',
    "powershell": f'{_ps_lock(n)}; Write-Output \'{{"hookSpecificOutput":{{"hookEventName":"SessionStart","additionalContext":"{escaped}"}}}}\' ',
}
```

Cursor (`core-cursor`):
```python
{
    "type": "command",
    "command": f'{_bash_lock(n)}; printf \'%s\' \'{{"additional_context":"{escaped"}}\' ',
}
```

**Plugin path hook (appended last, no lock):**

Claude: `{"type": "command", "command": 'echo "Rosetta Core Plugin Path: ${CLAUDE_PLUGIN_ROOT}"', "once": True}`

Codex:
```python
{
    "type": "command",
    "command": (
        'workspace_root="$PWD"; '
        'while [ "$workspace_root" != "/" ] && '
        '[ ! -f "$workspace_root/.agents/rules/bootstrap-rosetta-files.md" ]; do '
        'workspace_root="$(dirname "$workspace_root")"; done; '
        'if [ -f "$workspace_root/.agents/rules/bootstrap-rosetta-files.md" ]; then '
        'echo "Rosetta Core Plugin Path: $workspace_root/.agents"; fi'
    ),
    "statusMessage": "Loading Rosetta Codex bootstrap",
    "timeout": 30,
}
```

Copilot: `{"type": "command", "bash": 'echo "Rosetta Core Plugin Path: $PLUGIN_ROOT"', "powershell": 'Write-Output "Rosetta Core Plugin Path: $env:PLUGIN_ROOT"'}`

Cursor: `{"type": "command", "command": 'echo "Rosetta Core Plugin Path: ${CURSOR_PROJECT_DIR}"'}`

**Template file paths and placeholder mapping per platform:**

| Platform | `.tmpl` path (relative to dest_dir) | `hooks.json` path | Placeholder used |
|---|---|---|---|
| `core-claude` | `.claude-plugin/hooks/hooks.json.tmpl` | `.claude-plugin/hooks/hooks.json` | `{{BOOTSTRAP_HOOKS_CLAUDE}}` |
| `core-cursor` | `.cursor-plugin/hooks/hooks.json.tmpl` | `.cursor-plugin/hooks/hooks.json` | `{{BOOTSTRAP_HOOKS_CURSOR}}` |
| `core-codex` | `.codex-plugin/hooks.json.tmpl` | `.codex-plugin/hooks.json` | `{{BOOTSTRAP_HOOKS_CLAUDE}}` |
| `core-copilot` | `.github/plugin/hooks.json.tmpl` | `.github/plugin/hooks.json` | `{{BOOTSTRAP_HOOKS_COPILOT}}` |

**Rendering steps:**
1. Build `claude_array = json.dumps(claude_entries, ensure_ascii=False)` (compact, not pretty-printed, since it goes inside JSON string via str-replace)

   Actually: use `json.dumps(entries)` to produce array string, then do string replace in template.
   
2. Read `.tmpl` raw text; if missing → `print(f"WARNING: {tmpl_path} not found, skipping", file=sys.stderr)`; return violations
3. `result = tmpl_text.replace("{{BOOTSTRAP_HOOKS_CLAUDE}}", claude_json_array)`
4. Similarly for Copilot and Cursor arrays (only the relevant placeholder will be present per template)
5. Create parent dirs; write `result` to `hooks.json`
6. Print all collected errors to stderr
7. Return violation count

### Task 1.3: Integrate into sync_generated_plugins

After the `generate_folder_index` loop for each spec, before platform post-processing:
```python
violations = render_bootstrap_hooks(spec, spec.destination)
if violations:
    return 1
```

### Task 1.4: Update generate_copilot_runtime_layout

Remove `"rosetta-bootstrap.sh"` and `"rosetta-bootstrap.ps1"` from the filename list. Keep `"hooks.json"` and `".mcp.json"`. Copilot runtime layout still copies the generated `hooks.json` to the plugin root — this copy happens after `render_bootstrap_hooks`, so it picks up fresh content.

## Phase 2: Create hooks.json.tmpl Templates

### Task 2.1: Claude hooks.json.tmpl

Create `plugins/core-claude/.claude-plugin/hooks/hooks.json.tmpl`:
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

### Task 2.2: Cursor hooks.json.tmpl

Create `plugins/core-cursor/.cursor-plugin/hooks/hooks.json.tmpl`:
```json
{
  "version": 1,
  "hooks": {
    "sessionStart": {{BOOTSTRAP_HOOKS_CURSOR}}
  }
}
```

### Task 2.3: Codex hooks.json.tmpl

Create `plugins/core-codex/.codex-plugin/hooks.json.tmpl` (replacing the existing `hooks.json` as the source of truth):
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

### Task 2.4: Copilot hooks.json.tmpl

Create `plugins/core-copilot/.github/plugin/hooks.json.tmpl` (replacing existing `hooks.json` as source of truth):
```json
{
  "version": 1,
  "hooks": {
    "sessionStart": {{BOOTSTRAP_HOOKS_COPILOT}}
  }
}
```

## Phase 3: Update plugin.json Files

### Task 3.1: Claude plugin.json

File: `plugins/core-claude/.claude-plugin/plugin.json`

Remove entire inline `"hooks"` section. Add `"hooks": "./hooks/hooks.json"` field pointing to generated file.

### Task 3.2: Cursor plugin.json

File: `plugins/core-cursor/.cursor-plugin/plugin.json`

Add `"hooks": "./hooks/hooks.json"` field.

### Task 3.3: Codex and Copilot plugin.json — no changes

Both already have hooks in separate files with no manifest reference needed.

## Phase 4: Cleanup

### Task 4.1: Delete bootstrap scripts from source

- `plugins/core-claude/.claude-plugin/rosetta-bootstrap.sh`
- `plugins/core-copilot/.github/plugin/rosetta-bootstrap.sh`
- `plugins/core-copilot/.github/plugin/rosetta-bootstrap.ps1`

Runtime copies in `plugins/core-copilot/` will disappear after next generation run.

### Task 4.2: Run pre_commit.py

Must pass cleanly. Verify no stale references to deleted scripts.

## Phase 5: Validation

### Task 5.1: Verify generated hooks files

For each plugin, check generated `hooks.json`:
- Exists, is valid JSON, no `{{` placeholder strings remain
- Frontmatter stripped from all content
- Predefined prefix present in each hook output
- Each `additionalContext` / `additional_context` ≤ 10,000 chars
- Cursor: `{"additional_context":"..."}` format (not `hookSpecificOutput`)
- Lock snippets present in hooks 0–6; plugin path hook has no lock

### Task 5.2: Verify plugin.json files clean

- Claude and Cursor `plugin.json` have `"hooks": "./hooks/hooks.json"` and NO inline hook content
- Codex and Copilot `plugin.json` unchanged

### Task 5.3: Verify bump/generate cycle

Confirm `plugin.json` files contain only metadata (no hook content). `.tmpl` files retain placeholders. Running generator again produces identical fresh output.

### Task 5.4: Verify no regressions

- `grep -r "rosetta-bootstrap.sh" . --exclude-dir=.git` → nothing
- `grep -r "rosetta-bootstrap.ps1" . --exclude-dir=.git` → nothing
- All tests pass

## Dependencies

- Phase 1 before Phase 2 (generator must exist before templates are tested)
- Phase 2 before Phase 4 (templates must exist before old scripts deleted)
- Phase 5 after all above

## Resume Instructions

Branch: `feature/bootstrap-skills`
Repo: `/Users/isolomatov/Sources/GAIN/rosetta`
Workflow: `coding-flow`
Start from: Phase 1, Task 1.1
Context: Read this plan + specs + `scripts/plugin_generator.py` + current plugin configs in `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.github/plugin/`
