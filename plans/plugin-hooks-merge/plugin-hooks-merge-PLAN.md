# Plugin Hooks Merge Plan

This plan defines how to finish merging plugin hook changes from `main` and `v3` without losing either feature set.

## Goal

Merge the two hook systems into one coherent plugin-generation flow:

- `main` owns generated hook configuration through `hooks.json.tmpl`.
- `v3` owns custom hook runtime assets through `hooks/dist/bundles` and `hooks/dist/shell`.
- Bootstrap shell scripts are removed.
- Custom runtime hook assets remain extensible and are copied generically.

## Current Facts

- `main` introduced template rendering in `scripts/plugin_generator.py`.
- `main` renders bootstrap payloads into `hooks.json` from `hooks.json.tmpl`.
- `v3` introduced the TypeScript hooks runtime in `hooks/`.
- `v3` introduced `loose-files.js` as a generated custom hook bundle.
- `rosetta-bootstrap.sh` is stale because bootstrap now comes from generated hook JSON or native IDE rules.
- `loose-files.js` is valid and must be preserved.
- Cursor uses native rules for bootstrap; Cursor hooks are for additional custom runtime hooks.

## Non-Goals

- Do not rename existing functions or fields unless required for correctness.
- Do not remove the TypeScript hooks runtime.
- Do not hardcode copied custom runtime asset filenames.
- Do not add plugin-specific branching where a declarative plugin spec field can express the behavior.
- Do not commit or push.

## Required Code Changes

### `scripts/plugin_generator.py`

Keep existing names:

- Keep `hook_subdir`.
- Keep `sync_hooks_into_plugins()`.
- Keep `generate_copilot_runtime_layout()`.
- Keep `generate_cursor_runtime_layout()`.

Add a generic plugin spec field:

```python
runtime_asset_subdirs: tuple[Path, ...] = ()
```

Use it to mirror generated hook runtime assets to extra runtime locations when an IDE needs them.

Expected plugin specs:

```python
PluginSyncSpec(
    name="core-claude",
    destination=repo_root / "plugins" / "core-claude",
    preserved_folder=".claude-plugin",
    preserved_files=("hooks",),
    normalize_models=True,
    generated_indexes=("rules", "workflows"),
    templates=("hooks/hooks.json.tmpl",),
    hook_subdir=Path("hooks"),
)
```

```python
PluginSyncSpec(
    name="core-cursor",
    destination=repo_root / "plugins" / "core-cursor",
    preserved_folder=".cursor-plugin",
    preserved_files=("hooks",),
    generated_indexes=("rules", "workflows"),
    templates=("hooks/hooks.json.tmpl",),
    hook_subdir=Path(".cursor") / "hooks",
)
```

```python
PluginSyncSpec(
    name="core-copilot",
    destination=repo_root / "plugins" / "core-copilot",
    preserved_folder=".github",
    copilot_models=True,
    rename_agents=True,
    generated_indexes=("rules", "workflows"),
    templates=(".github/plugin/hooks.json.tmpl",),
    hook_subdir=Path(".github") / "plugin",
    runtime_asset_subdirs=(Path("."),),
)
```

```python
PluginSyncSpec(
    name="core-codex",
    destination=repo_root / "plugins" / "core-codex",
    preserved_folder=".codex-plugin",
    codex_models=True,
    generated_indexes=("rules", "workflows"),
    templates=(".codex-plugin/hooks.json.tmpl",),
    hook_subdir=Path(".codex") / "hooks",
)
```

Change `generate_copilot_runtime_layout()` to copy only static config files:

```python
for filename in ("hooks.json", ".mcp.json"):
```

Do not copy `loose-files.js`, `rosetta-bootstrap.sh`, or `rosetta-bootstrap.ps1` in `generate_copilot_runtime_layout()`.

Change `generate_cursor_runtime_layout()` to copy the generated template output:

```python
source_hooks = destination / "hooks" / "hooks.json"
cursor_hooks = destination / ".cursor" / "hooks.json"
```

Do not copy from `.cursor-plugin/hooks.json`.

Change `sync_hooks_into_plugins()`:

- Source custom bundle assets from `hooks/dist/bundles/<plugin-name>/`.
- Source generic shell assets from `hooks/dist/shell/`.
- Copy both source sets into `spec.destination / spec.hook_subdir`.
- Preserve non-managed files already in the target folder.
- Mirror the same managed assets into each `spec.runtime_asset_subdirs` target.
- Do not special-case Copilot by plugin name.
- Do not hardcode `loose-files.js` or any shell filename.

Expected behavior today:

- Bundle assets copy `loose-files.js`.
- Shell assets copy zero files after stale bootstrap shell deletion.
- Copilot mirrors `loose-files.js` to plugin root through `runtime_asset_subdirs`.

### `scripts/pre_commit.py`

Keep current high-level order:

1. `build_hooks()`
2. `sync_generated_plugins()`
3. `sync_hooks_into_plugins()`
4. type validation
5. tests

Reason:

- Hook bundles must exist before custom hook assets can be copied.
- Plugin templates must be rendered before hook assets are synchronized into their final folders.

### `hooks/`

Delete obsolete bootstrap shell files:

- `hooks/shell/rosetta-bootstrap.sh`
- `hooks/dist/shell/rosetta-bootstrap.sh`

Keep generic shell asset support:

- Add `hooks/shell/.gitkeep`.
- Add `hooks/dist/shell/.gitkeep` only if an empty generated shell output directory must remain tracked.

Keep TypeScript hook runtime:

- Keep `hooks/src/**`.
- Keep `hooks/tests/**`.
- Keep `hooks/scripts/build-bundles.mjs`.
- Keep `hooks/dist/bundles/**/loose-files.js`.

### `hooks/package.json`

Keep shell asset distribution generic.

Preferred build script shape:

```json
"build": "tsc && node scripts/build-bundles.mjs && rm -rf dist/shell && mkdir -p dist/shell && cp -R shell/. dist/shell/"
```

This works because `hooks/shell/.gitkeep` keeps the source directory present.

### Hook Templates

Update templates so `hooks.json` is the source of hook configuration and generated custom assets are referenced from there.

#### `plugins/core-claude/hooks/hooks.json.tmpl`

Keep the existing `SessionStart` block unchanged.

Insert this exact `PostToolUse` block as a sibling key under `hooks`:

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/loose-files.js\""
      }
    ]
  }
]
```

#### `plugins/core-cursor/hooks/hooks.json.tmpl`

Replace the entire file contents with this exact text:

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "node .cursor/hooks/loose-files.js"
      }
    ]
  }
}
```

No `sessionStart` section. Cursor loads bootstrap via native rules, not via this template.

#### `plugins/core-copilot/.github/plugin/hooks.json.tmpl`

Keep the existing `sessionStart` block unchanged.

Insert this exact `PostToolUse` block as a sibling key under `hooks`. The shape, casing, matcher, nested `hooks` array, and `${CLAUDE_PLUGIN_ROOT}/loose-files.js` path are taken verbatim from `git show origin/v3:plugins/core-copilot/.github/plugin/hooks.json`:

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/loose-files.js\""
      }
    ]
  }
]
```

The `loose-files.js` referenced here lives at the Copilot plugin root, mirrored there by `runtime_asset_subdirs=(Path("."),)`.

#### `plugins/core-codex/.codex-plugin/hooks.json.tmpl`

Keep the existing `SessionStart` block unchanged.

Insert this exact `PostToolUse` block as a sibling key under `hooks`:

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "node .codex/hooks/loose-files.js"
      }
    ]
  }
]
```

## Required Generated Output Cleanup

Delete stale bootstrap shell copies:

- `plugins/core-claude/hooks/rosetta-bootstrap.sh`
- `plugins/core-cursor/.cursor/hooks/rosetta-bootstrap.sh`
- `plugins/core-copilot/.github/plugin/rosetta-bootstrap.sh`
- `plugins/core-copilot/.github/plugin/rosetta-bootstrap.ps1`
- `plugins/core-copilot/rosetta-bootstrap.sh`
- `plugins/core-copilot/rosetta-bootstrap.ps1`
- `plugins/core-codex/.codex/hooks/rosetta-bootstrap.sh`

Keep generated custom hook assets:

- `plugins/core-claude/hooks/loose-files.js`
- `plugins/core-cursor/.cursor/hooks/loose-files.js`
- `plugins/core-copilot/.github/plugin/loose-files.js`
- `plugins/core-copilot/loose-files.js`
- `plugins/core-codex/.codex/hooks/loose-files.js`

Delete stale duplicate Cursor static hook config:

- `plugins/core-cursor/.cursor-plugin/hooks.json`

Keep generated Cursor runtime hook config:

- `plugins/core-cursor/hooks/hooks.json`
- `plugins/core-cursor/.cursor/hooks.json`

Both must derive from `plugins/core-cursor/hooks/hooks.json.tmpl`.

## Required Repository Hygiene

### `hooks/.gitignore`

Replace this exact block:

```
node_modules/
dist/tests/
*.log
```

With this exact block:

```
node_modules/
dist/tests/
dist/bundles/
*.log
```

Do not edit the repo root `.gitignore`; it already delegates hooks output to `hooks/.gitignore` (`# Hooks build output handled by hooks/.gitignore`).

Untrack the already-tracked bundle files without deleting them on disk:

```bash
git rm -r --cached hooks/dist/bundles/
```

## Required Build/CI Changes

### `run-tests.sh`

Insert this exact block immediately after the existing `rosettify` block (after line 42, before `echo -e "${GREEN}Test validation passed${NC}"`):

```bash
if [ -d "$SCRIPT_DIR/hooks/node_modules" ]; then
    echo -e "${BLUE}Running hooks tests...${NC}"
    npm --prefix "$SCRIPT_DIR/hooks" run test
else
    echo -e "${YELLOW}WARNING: hooks/node_modules not found. Skipping hooks tests.${NC}"
    echo -e "${YELLOW}To enable: npm --prefix hooks install${NC}"
fi
```

No separate build step: `hooks/package.json` defines `"test": "npm run build && node --test 'dist/tests/*.test.js'"`, so the test script builds itself.

## Documentation Change

Apply the literal edits below. Do not paraphrase. Do not add commentary, rationale, deprecation notes, or change-log lines.

### `docs/ARCHITECTURE.md`

Replace this exact line:

```
Each plugin has a preserved config folder (`.claude-plugin/`, `.cursor-plugin/`, `.github/`, `.codex-plugin/`) containing the IDE-specific manifest (`plugin.json`), the `hooks.json.tmpl` template, and any static configs. Everything outside that folder is generated — wiped and regenerated on each sync. `hooks.json` is the rendered output of the template and is fully regenerated on every sync, not preserved as static content. Cursor does not need hooks to load bootstrap, because rules are supported (template placeholder still must be generated!)
```

With this exact line:

```
Each plugin has a preserved config folder (`.claude-plugin/`, `.cursor-plugin/`, `.github/`, `.codex-plugin/`) holding the IDE manifest (`plugin.json`) and static configs. The `hooks.json.tmpl` template is preserved per plugin spec — for Copilot and Codex inside the preserved config folder, for Claude and Cursor in a sibling `hooks/` folder also preserved via `preserved_files`. Everything outside preserved paths is wiped and regenerated on each sync. `hooks.json` is the rendered template output and is fully regenerated on every sync, not preserved as static content. All plugin hook templates carry custom runtime hooks (e.g., `loose-files.js`); Claude, Copilot, and Codex templates additionally embed the bootstrap payload, while Cursor relies on native rules for bootstrap.
```

No other edits to `docs/ARCHITECTURE.md`.

### `docs/CODEMAP.md`

Replace this exact block:

```
#### instructions/r2/core/workflows/ — 14 workflow files

init-workspace-flow.md init-workspace-flow-discovery.md init-workspace-flow-shells.md
init-workspace-flow-context.md init-workspace-flow-patterns.md init-workspace-flow-rules.md
init-workspace-flow-documentation.md init-workspace-flow-questions.md init-workspace-flow-verification.md
coding-flow.md adhoc-flow.md adhoc-flow-with-plan-manager.md requirements-authoring-flow.md self-help-flow.md
```

With this exact block:

```
#### instructions/r2/core/workflows/ — 14 workflow files

init-workspace-flow.md init-workspace-flow-discovery.md init-workspace-flow-shells.md
init-workspace-flow-context.md init-workspace-flow-patterns.md init-workspace-flow-rules.md
init-workspace-flow-documentation.md init-workspace-flow-questions.md init-workspace-flow-verification.md
coding-flow.md adhoc-flow.md code-analysis-flow.md requirements-authoring-flow.md self-help-flow.md
```

Replace this exact block:

```
#### instructions/r2/core/rules/ — 11 rule files

bootstrap-core-policy.md bootstrap-execution-policy.md bootstrap-guardrails.md
bootstrap-hitl-questioning.md bootstrap-rosetta-files.md bootstrap.md
local-files-mode.md plugin-files-mode.md requirements-best-practices.md
requirements-use-best-practices.md speckit-integration-policy.md
```

With this exact block:

```
#### instructions/r2/core/rules/ — 10 rule files

bootstrap-core-policy.md bootstrap-execution-policy.md bootstrap-guardrails.md
bootstrap-rosetta-files.md bootstrap.md
local-files-mode.md plugin-files-mode.md requirements-best-practices.md
requirements-use-best-practices.md speckit-integration-policy.md
```

No other edits to `docs/CODEMAP.md`.

## R2/R3 Mirror Discipline

Every change applied under `instructions/r2/...` MUST be applied identically to the corresponding path under `instructions/r3/...`. The two trees are byte-identical today (`diff -qr instructions/r2/core instructions/r3/core` → empty). Re-run that diff at the end of implementation and confirm it stays empty.

## Validation Commands

Run after implementation:

```bash
git diff --name-only --diff-filter=U
rg -n "rosetta-bootstrap\\.sh|rosetta-bootstrap\\.ps1" scripts plugins hooks
rg -n "loose-files\\.js" plugins scripts hooks
PYTHONPYCACHEPREFIX=/tmp/pycache-rosetta python3 -m py_compile scripts/plugin_generator.py scripts/pre_commit.py
git diff --check --cached
diff -qr instructions/r2/core instructions/r3/core | rg -v '\\.DS_Store'
git ls-files hooks/dist/bundles/
rg -n "bootstrap-hitl-questioning\\.md|adhoc-flow-with-plan-manager\\.md" docs
```

`git ls-files hooks/dist/bundles/` must return empty.
`rg` against `docs` must return empty.

Run when hook dependencies are available:

```bash
npm --prefix hooks test
```

If `tsc` is unavailable, report the dependency gap and do not install dependencies without approval.

## Final Review

Before reporting back, compare the actual generated plugin files against this plan:

- Confirm each plugin `hooks.json` is generated from the expected `hooks.json.tmpl`.
- Confirm generated hook configs reference `loose-files.js` at the runtime path where the asset was copied.
- Confirm no generated plugin config references `rosetta-bootstrap.sh` or `rosetta-bootstrap.ps1`.
- Confirm Copilot root runtime assets are mirrored through `runtime_asset_subdirs`, not hardcoded filename logic.
- Confirm Cursor bootstrap remains native `rules` only, with hooks used only for custom runtime behavior.
- Confirm generated plugin outputs match the intended architecture before summarizing results.

## Review Constraints

- No commit.
- No push.
- No fetch after this point.
- Keep changes available for human review.
