---
name: coding-agents-hooks-authoring
description: "To author, register, and test Rosetta hooks, add a SemanticKind, or debug a hook that won't fire."
tags: [hooks, authoring, registration]
disable-model-invocation: false
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<hooks_authoring>

### Hook entry rule

Only files that export `defineHook(…)` AND call `runAsCli(hook, module)` belong directly in `src/hooks/src/hooks/`.
Every `.ts` at the top level of that directory becomes a standalone CJS bundle distributed to all 5 IDEs (claude, codex, copilot, cursor, windsurf).
Helper/data files without `runAsCli` belong in a named subdirectory: `src/hooks/src/hooks/<feature>/`.

### Helper placement

- Feature-local helpers → `src/hooks/src/hooks/<feature>/` (e.g. `src/hooks/src/hooks/dangerous-actions/patterns.ts`).
- Cross-hook runtime helpers → `src/hooks/src/runtime/`.

### Build is non-recursive

`src/hooks/scripts/build-bundles.mjs:24` uses `readdirSync(hooksDir).filter(f => f.endsWith('.ts'))`.
There is **no `{ recursive: true }`**. Subdirectories are invisible to the bundler.
Adding a top-level `.ts` without `runAsCli` produces a dead bundle for all 5 IDEs.

### Adding a SemanticKind

When a hook needs a new tool category (e.g. `mcp-call`):

1. **`src/hooks/src/runtime/ide-registry.ts`** — add a row to `TOOL_KINDS` with all 5 IDE columns (`null` where the event doesn't exist). `SemanticKind = keyof typeof TOOL_KINDS` so TypeScript enforces coverage.
2. **`src/hooks/src/runtime/ide-rows/<ide>.ts`** — if the kind requires special logic (e.g. prefix-match for `mcp__.*`), add a conditional branch at the top of `lookupToolKind` in the IDE-row file before the table loop. Table-driven lookup alone cannot handle open-ended tool name patterns.
3. **Hook entry** — add the new kind to `def.on.toolKinds`.
4. **Matcher in `hooks.json.tmpl`** — widen to include new tool names/patterns.

Order matters: `run-hook.ts:98` gates on `toolKinds` before calling `run(ctx)`. Matcher passes the event in; `toolKinds` must include the mapped kind or the call is dropped silently.

### Registration

Every new hook must appear in every plugin's `hooks.json`. The canonical source is `plugins/core-claude/hooks/hooks.json.tmpl` (and equivalent templates in other plugins). Direct edits to generated `hooks.json` files are overwritten on the next `npx rosettify-plugins@latest` run.

Paths by plugin:
- `plugins/core-claude/hooks/hooks.json.tmpl` → `hooks.json`
- `plugins/core-copilot/hooks/hooks.json.tmpl` → `hooks/hooks.json`
- `plugins/core-cursor/.cursor/hooks/hooks.json.tmpl` → `hooks.json`
- `plugins/core-codex/.codex/hooks/hooks.json.tmpl` → `hooks.json`
- `plugins/core-windsurf/` — bundles are distributed but hooks.json registration is not covered by the regression test (`hooks-registered.test.ts`); register manually if needed.

### Platform-scoped events

`PreToolUse` is absent on Copilot (`'copilot': null` in `ide-registry.ts`). If a hook uses a platform-exclusive event, add its name to `CLAUDE_CODE_ONLY_HOOKS` Set in `src/hooks/tests/regression/hooks-registered.test.ts`. Before adding a second scoped hook, refactor the Set to `Map<string, Set<IdeName>>`.

### Tests

Co-locate tests in `src/hooks/tests/<hook-name>.test.ts`. The regression test (`src/hooks/tests/regression/hooks-registered.test.ts`) automatically discovers all `.ts` entries at `src/hooks/src/hooks/` top level and asserts each is referenced in every plugin's `hooks.json`. A new hook without registration immediately fails the regression guard.

### Sync command

After any source change under `src/hooks/src/` or `instructions/r{2,3}/core/`:

```bash
venv/bin/python scripts/pre_commit.py
```

This builds CJS bundles, runs full test suite, and runs `npx rosettify-plugins@latest` to sync `instructions/r{2,3}/core/` → all plugin directories.

### Pitfalls

- **Helper files in top-level** — produces dead bundles for all 5 IDEs + false regression test failures without `isLibraryModule` workaround. Fix: move to subdirectory.
- **Missing registration** — hook fires silently nowhere; regression test catches this at CI time.
- **Secrets in Evidence** — `buildDenyMessage` echoes `evidence` to transcript by default. Pass `redact=true` for DANGEROUS_CONTENT matches (AWS keys, PEM certs, SQL with row data).
- **Regex `[rf]{2,}` false positives** — matches `rm -rr` and `rm -ff`. Require both flags with lookaheads: `/\brm\s+-(?=[a-zA-Z]*[rR])(?=[a-zA-Z]*[fF])[a-zA-Z]+\b/`.
- **`$`-anchor vs trailing slash** — path patterns like `/\.kube\/config$` fail when tested against `filePath` with trailing slash. Always test against `normalizedPath = filePath.replace(/\/+$/, '')`.
- **Matcher without toolKinds mapping** — adding a name to the JSON matcher but not to `lookupToolKind` and `def.on.toolKinds` is inert.

### Reference files

```
src/hooks/scripts/build-bundles.mjs
src/hooks/src/runtime/ide-registry.ts
src/hooks/src/runtime/ide-rows/claude-code.ts
src/hooks/src/runtime/run-hook.ts:98
plugins/core-claude/hooks/hooks.json.tmpl
src/hooks/tests/regression/hooks-registered.test.ts
```

</hooks_authoring>
