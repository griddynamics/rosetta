# Lint-Format Advisory Hook — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

> **WORKTREE SETUP — READ FIRST:**
> All work happens in a dedicated git worktree, NOT in the main checkout.
> **Task 0 must be executed first** — it creates the worktree at
> `.worktrees/lint-format-advisory/` (relative to repo root `/Users/akoziar/dev/gd/rosetta`).
> After Task 0, ALL file edits, `git add`, `git commit`, and `npm` commands
> run from inside `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/`.
> Use absolute paths in all tool calls. Never commit in the main checkout.

**Goal:** Add a `PostToolUse` hook that nudges AI agents to add a plan step for syntax/type/lint/format checks after editing any monitored code file, without running those checks itself.

**Architecture:** Single hook entry file (`lint-format-advisory.ts`) using `defineHook` DSL with `extOneOfCi` predicate and `throttle.dedupBy: ['session','filePath']`. Zero runtime deps. Registered in all four plugin trees. No library split — logic is `advise(message(filePath))`, no evaluation module needed.

**Tech Stack:** TypeScript 5.4, Node.js CJS, vitest 4, esbuild (auto-bundled per IDE by `scripts/build-bundles.mjs`).

**Branch:** `feat/hooks-lint-format-advisory` from `v3`. Worktree: `.worktrees/lint-format-advisory/`. PR target: `v3`.

**Repo root:** `/Users/akoziar/dev/gd/rosetta`
**Worktree root:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`
**Plan file (absolute):** `/Users/akoziar/dev/gd/rosetta/docs/plans/2026-05-05-lint-format-advisory.md`

---

## Key File Paths

| Role | Path (relative to repo root) |
| --- | --- |
| Hook entry (create) | `hooks/src/hooks/lint-format-advisory.ts` |
| Tests (create) | `hooks/tests/lint-format-advisory.test.ts` |
| Plan doc (create in worktree) | `docs/plans/2026-05-05-lint-format-advisory.md` |
| claude registration (modify) | `plugins/core-claude/hooks/hooks.json` |
| cursor registration (modify) | `plugins/core-cursor/hooks/hooks.json` |
| copilot registration (modify) | `plugins/core-copilot/hooks/hooks.json` |
| codex registration (modify) | `plugins/core-codex/.codex/hooks.json` |
| IMPLEMENTATION.md (modify) | `agents/IMPLEMENTATION.md` |
| Regression test (read-only) | `hooks/tests/regression/hooks-registered.test.ts` |
| Throttle API | `hooks/src/runtime/throttle.ts` |
| define-hook | `hooks/src/runtime/define-hook.ts` |
| result-helpers | `hooks/src/runtime/result-helpers.ts` |
| Reference test | `hooks/tests/md-file-advisory.test.ts` |
| Write fixture | `hooks/tests/fixtures/claude-code-post-tool-use-write.json` |
| Edit fixture | `hooks/tests/fixtures/claude-code-post-tool-use-edit.json` |
| Cursor fixture | `hooks/tests/fixtures/cursor-post-tool-use-write.json` |

---

## Task 0: Create Worktree + Gitignore + Baseline

> **Working directory for this task:** repo root `/Users/akoziar/dev/gd/rosetta`
> After Step 4 all subsequent tasks use the worktree root.

**Files:** Modify `.gitignore` at repo root, create worktree at `.worktrees/lint-format-advisory/`.

### Step 1: Fetch v3 and create the worktree

```bash
cd /Users/akoziar/dev/gd/rosetta
git fetch origin v3
git worktree add .worktrees/lint-format-advisory -b feat/hooks-lint-format-advisory v3
```

Expected: directory `.worktrees/lint-format-advisory/` created; `git worktree list` shows the new entry on branch `feat/hooks-lint-format-advisory`.

### Step 2: Check if `.worktrees/` is already gitignored

```bash
cd /Users/akoziar/dev/gd/rosetta
git check-ignore -v .worktrees 2>/dev/null && echo "IGNORED" || echo "NOT_IGNORED"
```

### Step 3: Add gitignore entry if needed (skip if output was `IGNORED`)

```bash
echo "/.worktrees/" >> /Users/akoziar/dev/gd/rosetta/.gitignore
```

### Step 4: Copy this plan file into the worktree and make first commit

From here all work is inside the worktree:

```bash
WROOT=/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory

cp /Users/akoziar/dev/gd/rosetta/docs/plans/2026-05-05-lint-format-advisory.md \
   "$WROOT/docs/plans/2026-05-05-lint-format-advisory.md"

cd "$WROOT"
git add .gitignore docs/plans/2026-05-05-lint-format-advisory.md
git commit -m "chore(repo): ignore /.worktrees/ and add implementation plan"
```

### Step 5: Install hook dependencies (inside worktree)

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks
npm install
```

Expected: installs from `package-lock.json`, no audit errors.

### Step 6: Verify baseline — MUST pass before writing any new code

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks
npm run check && npm run test
```

Expected: TypeScript compiles clean, all existing tests pass.
**If tests fail — STOP. Report failures. Do not proceed to Task 1.**

---

## Task 1: Write Failing Unit Tests for `advisoryMessage`

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`
> All file paths below are relative to this worktree root.

**Files:**
- Create: `hooks/tests/lint-format-advisory.test.ts`

### Step 1: Create the test file

```typescript
// hooks/tests/lint-format-advisory.test.ts
import { test, describe, expect } from 'vitest';
import { Readable, Writable } from 'stream';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import ccEdit from './fixtures/claude-code-post-tool-use-edit.json';
import cursorWrite from './fixtures/cursor-post-tool-use-write.json';

import { advisoryMessage, lintFormatAdvisoryHook } from '../src/hooks/lint-format-advisory';
import { runHook } from '../src/runtime/run-hook';

// ── helper ────────────────────────────────────────────────────────────────────

async function execute(payload: unknown): Promise<string> {
  let output = '';
  const stdin = Readable.from([JSON.stringify(payload)]);
  const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
  await runHook(lintFormatAdvisoryHook, { stdin, stdout });
  return output;
}

const expectedClaude = (filePath: string) => JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    permissionDecision: 'allow',
    additionalContext: advisoryMessage(filePath),
  },
});

// ── unit: advisoryMessage ─────────────────────────────────────────────────────

describe('advisoryMessage', () => {
  test('matches spec wording exactly', () => {
    expect(advisoryMessage('src/app.ts')).toBe(
      'Files were modified. Add a plan step (if not already present) to run syntax, type, lint, and format checks on: src/app.ts.'
    );
  });

  test('embeds filePath verbatim', () => {
    expect(advisoryMessage('/abs/path/to/foo.py')).toContain('/abs/path/to/foo.py');
  });
});
```

### Step 2: Run test — must fail

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks
npm test -- lint-format-advisory
```

Expected output: FAIL — `Cannot find module '../src/hooks/lint-format-advisory'`.

If it passes: something is wrong — investigate before proceeding.

---

## Task 2: Implement the Hook (Make Unit Tests Pass)

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`

**Files:**
- Create: `hooks/src/hooks/lint-format-advisory.ts`

### Step 1: Write the hook

```typescript
// hooks/src/hooks/lint-format-advisory.ts
import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { advise } from '../runtime/result-helpers';

const MONITORED_EXTENSIONS = [
  '.html', '.css', '.js', '.ts', '.jsx', '.tsx',
  '.py', '.cs', '.ps1', '.cmd', '.java', '.go', '.rs', '.md',
] as const;

export const advisoryMessage = (filePath: string): string =>
  `Files were modified. Add a plan step (if not already present) to run syntax, type, lint, and format checks on: ${filePath}.`;

export const lintFormatAdvisoryHook = defineHook({
  name: 'lint-format-advisory',
  on: {
    event: 'PostToolUse',
    toolKinds: ['write', 'edit', 'multi-edit', 'patch', 'create', 'replace'],
    filePath: {
      extOneOfCi: MONITORED_EXTENSIONS,
      notContainsAny: [
        'node_modules/', '.venv/', '__pycache__/',
        'dist/', 'build/', '.git/',
      ],
    },
  },
  throttle: { dedupBy: ['session', 'filePath'] },
  run: (ctx) => advise(advisoryMessage(ctx.filePath)),
});

runAsCli(lintFormatAdvisoryHook, module);
```

### Step 2: Run tests — must pass

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks
npm test -- lint-format-advisory
```

Expected: 2 passing (the `advisoryMessage` unit tests).

---

## Task 3: Add Extension-Gating Integration Tests

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`

**Files:**
- Modify: `hooks/tests/lint-format-advisory.test.ts` (append to existing file)

### Step 1: Append extension tests

Add after the `advisoryMessage` describe block:

```typescript
// ── integration: extension gating ────────────────────────────────────────────

describe('extension gating — fires for monitored extensions', () => {
  const monitored = ['.ts', '.js', '.jsx', '.tsx', '.py', '.go', '.rs',
                     '.java', '.cs', '.html', '.css', '.md', '.ps1', '.cmd'];

  for (const ext of monitored) {
    test(`fires for ${ext}`, async () => {
      const payload = { ...ccWrite, tool_input: { file_path: `src/foo${ext}` } };
      expect(await execute(payload)).toBe(expectedClaude(`src/foo${ext}`));
    });
  }
});

describe('extension gating — silent for non-monitored extensions', () => {
  const ignored = ['.json', '.gitignore', '.env', '.lock', '.toml', '.yaml', '.sh', '.txt'];

  for (const ext of ignored) {
    test(`silent for ${ext}`, async () => {
      const payload = { ...ccWrite, tool_input: { file_path: `src/foo${ext}` } };
      expect(await execute(payload)).toBe('');
    });
  }
});
```

### Step 2: Run tests

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks
npm test -- lint-format-advisory
```

Expected: 2 + 14 + 8 = 24 passing. No code changes needed — extension logic is already in `extOneOfCi`.

### Step 3: Commit

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory
git add hooks/tests/lint-format-advisory.test.ts hooks/src/hooks/lint-format-advisory.ts
git commit -m "feat(hooks): add lint-format-advisory hook and unit tests"
```

---

## Task 4: Add Path-Exclusion Tests

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`

**Files:**
- Modify: `hooks/tests/lint-format-advisory.test.ts` (append)

### Step 1: Append path exclusion tests

```typescript
// ── integration: path exclusions ─────────────────────────────────────────────

describe('path exclusions — Claude Code', () => {
  const excluded = [
    'node_modules/react/index.ts',
    '.venv/lib/site-packages/foo.py',
    '__pycache__/module.py',
    'dist/bundle.js',
    'build/output.ts',
    '.git/hooks/pre-commit.py',
  ];

  for (const filePath of excluded) {
    test(`silent for ${filePath}`, async () => {
      const payload = { ...ccWrite, tool_input: { file_path: filePath } };
      expect(await execute(payload)).toBe('');
    });
  }
});
```

### Step 2: Run tests

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks
npm test -- lint-format-advisory
```

Expected: 24 + 6 = 30 passing. No code changes needed.

---

## Task 5: Add Throttle-Dedupe Tests

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`

**Files:**
- Modify: `hooks/tests/lint-format-advisory.test.ts` (append)

### Step 1: Append throttle tests

```typescript
// ── integration: throttle dedupe ─────────────────────────────────────────────
//
// Throttle is file-lock-based (os.tmpdir(), 5-second TTL).
// Tests use unique session_id values to avoid cross-test lock collisions.

describe('throttle dedupe', () => {
  test('silent on immediate re-fire for same session+file', async () => {
    const payload = {
      ...ccWrite,
      session_id: 'throttle-A-' + Date.now(),
      tool_input: { file_path: 'throttle-a.ts' },
    };
    const first = await execute(payload);
    const second = await execute(payload);
    expect(first).not.toBe('');   // first fire: advisory
    expect(second).toBe('');      // immediate re-fire: throttled
  });

  test('fires for different filePath in same session', async () => {
    const sessionId = 'throttle-B-' + Date.now();
    const payloadA = { ...ccWrite, session_id: sessionId, tool_input: { file_path: 'b-file-a.ts' } };
    const payloadB = { ...ccWrite, session_id: sessionId, tool_input: { file_path: 'b-file-b.ts' } };
    expect(await execute(payloadA)).not.toBe('');
    expect(await execute(payloadB)).not.toBe('');
  });

  test('fires for same file in a different session', async () => {
    const payloadA = { ...ccWrite, session_id: 'throttle-C1-' + Date.now(), tool_input: { file_path: 'shared-c.ts' } };
    const payloadB = { ...ccWrite, session_id: 'throttle-C2-' + Date.now(), tool_input: { file_path: 'shared-c.ts' } };
    expect(await execute(payloadA)).not.toBe('');
    expect(await execute(payloadB)).not.toBe('');
  });
});
```

### Step 2: Run tests

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks
npm test -- lint-format-advisory
```

Expected: 30 + 3 = 33 passing.

---

## Task 6: Add Tool-Event Filter + Multi-IDE Tests

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`

**Files:**
- Modify: `hooks/tests/lint-format-advisory.test.ts` (append)

### Step 1: Append tests

```typescript
// ── integration: tool/event filter ───────────────────────────────────────────

describe('tool and event filter', () => {
  test('silent for Read tool', async () => {
    const payload = { ...ccWrite, tool_name: 'Read', tool_input: { file_path: 'src/app.ts' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for Bash tool', async () => {
    const payload = { ...ccWrite, tool_name: 'Bash', tool_input: { command: 'cat src/app.ts' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for PreToolUse event', async () => {
    const payload = { ...ccWrite, hook_event_name: 'PreToolUse', tool_input: { file_path: 'src/app.ts' } };
    expect(await execute(payload)).toBe('');
  });

  test('fires for Edit tool', async () => {
    const payload = { ...ccEdit, tool_input: { ...ccEdit.tool_input, file_path: 'src/app.ts' } };
    expect(await execute(payload)).not.toBe('');
  });
});

// ── integration: Cursor format ────────────────────────────────────────────────

describe('Cursor format', () => {
  test('fires for .ts — Cursor output shape', async () => {
    const payload = {
      ...cursorWrite,
      session_id: 'cursor-' + Date.now(),
      tool_input: { ...cursorWrite.tool_input, file_path: 'src/app.ts' },
    };
    const out = await execute(payload);
    expect(out).not.toBe('');
    const parsed = JSON.parse(out);
    expect(parsed.permission).toBe('allow');
    expect(parsed.additional_context).toContain('src/app.ts');
  });

  test('silent for .json — Cursor', async () => {
    const payload = {
      ...cursorWrite,
      tool_input: { ...cursorWrite.tool_input, file_path: 'config.json' },
    };
    expect(await execute(payload)).toBe('');
  });
});

// ── integration: error robustness ────────────────────────────────────────────

describe('error handling', () => {
  test('silent for empty stdin', async () => {
    let output = '';
    const stdin = Readable.from(['']);
    const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
    await runHook(lintFormatAdvisoryHook, { stdin, stdout });
    expect(output).toBe('');
  });

  test('silent for malformed JSON', async () => {
    let output = '';
    const stdin = Readable.from(['not-json']);
    const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
    await runHook(lintFormatAdvisoryHook, { stdin, stdout });
    expect(output).toBe('');
  });

  test('silent for unknown IDE shape', async () => {
    expect(await execute({ unknown_field: 'value' })).toBe('');
  });
});
```

### Step 2: Run full suite

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks
npm test -- lint-format-advisory
```

Expected: all tests pass (~45 total).

### Step 3: Commit

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory
git add hooks/tests/lint-format-advisory.test.ts
git commit -m "test(hooks): complete lint-format-advisory test suite — extension, exclusion, throttle, multi-IDE"
```

---

## Task 7: Register in All Four Plugin hooks.json Files

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`

**Files:**
- Modify: `plugins/core-claude/hooks/hooks.json`
- Modify: `plugins/core-cursor/hooks/hooks.json`
- Modify: `plugins/core-copilot/hooks/hooks.json`
- Modify: `plugins/core-codex/.codex/hooks.json`

### core-claude — `plugins/core-claude/hooks/hooks.json`

Add to the `"PostToolUse"` array (alongside existing entries):

```json
{
  "matcher": "Write|Edit|MultiEdit",
  "hooks": [
    {
      "type": "command",
      "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/lint-format-advisory.js\""
    }
  ]
}
```

### core-cursor — `plugins/core-cursor/hooks/hooks.json`

Add to the `"postToolUse"` array (lowercase key, flat format):

```json
{
  "matcher": "Write|Edit",
  "command": "node .cursor/hooks/lint-format-advisory.js"
}
```

### core-copilot — `plugins/core-copilot/hooks/hooks.json`

Add to the `"PostToolUse"` array (paths use `.github/hooks/`):

```json
{
  "matcher": "Write|Edit|create_file|replace_string_in_file|multi_replace_string_in_file",
  "hooks": [
    {
      "type": "command",
      "command": "node \".github/hooks/lint-format-advisory.js\""
    }
  ]
}
```

### core-codex — `plugins/core-codex/.codex/hooks.json`

Add to the `"PostToolUse"` array (paths use `.codex/hooks/`):

```json
{
  "matcher": "Write|Edit|apply_patch|functions.apply_patch",
  "hooks": [
    {
      "type": "command",
      "command": "node .codex/hooks/lint-format-advisory.js"
    }
  ]
}
```

### Step after each edit: verify JSON is valid

```bash
python3 -c "import json; json.load(open('plugins/core-claude/hooks/hooks.json'))"
python3 -c "import json; json.load(open('plugins/core-cursor/hooks/hooks.json'))"
python3 -c "import json; json.load(open('plugins/core-copilot/hooks/hooks.json'))"
python3 -c "import json; json.load(open('plugins/core-codex/.codex/hooks.json'))"
```

Expected: no output (all valid).

### Commit registrations

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory
git add plugins/core-claude/hooks/hooks.json \
        plugins/core-cursor/hooks/hooks.json \
        plugins/core-copilot/hooks/hooks.json \
        plugins/core-codex/.codex/hooks.json
git commit -m "feat(hooks): register lint-format-advisory in all four plugin hooks.json files"
```

---

## Task 8: Build + Full Test Suite + Regression Check

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`

### Step 1: Type-check

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks
npm run check
```

Expected: no errors.

### Step 2: Build bundles

```bash
npm run build
```

Expected: exits 0. Verify these files exist:

```bash
ls /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks/dist/bundles/core-claude/lint-format-advisory.js
ls /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks/dist/bundles/core-cursor/lint-format-advisory.js
ls /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks/dist/bundles/core-copilot/lint-format-advisory.js
ls /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory/hooks/dist/bundles/core-codex/lint-format-advisory.js
```

Expected: all four files exist.

### Step 3: Run full test suite (includes regression)

```bash
npm run test
```

Expected: all tests pass, specifically:
- `lint-format-advisory.test.ts` — all new tests
- `hooks-registered.test.ts` — `lint-format-advisory.js is referenced` for all 4 plugins

If regression fails on a specific plugin: the corresponding `hooks.json` was not updated correctly in Task 7. Fix and re-run.

---

## Task 9: Update IMPLEMENTATION.md

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`

**Files:**
- Modify: `agents/IMPLEMENTATION.md`

### Step 1: Append paragraph under the existing `### Hooks —` section

Find the line `### Hooks — dangerous-actions PreToolUse Hook` and add a new sibling section after its closing paragraph:

```markdown
### Hooks — lint-format-advisory PostToolUse Hook

- Added `hooks/src/hooks/lint-format-advisory.ts`: PostToolUse advisory hook that nudges AI agents to add a plan step for syntax, type, lint, and format checks after editing a code file.
- Monitored extensions: `.html`, `.css`, `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.cs`, `.ps1`, `.cmd`, `.java`, `.go`, `.rs`, `.md`.
- Throttle: `dedupBy: ['session','filePath']` — one advisory per (session, file) within a 5-second window; Copilot double-fire deduped automatically.
- No plan_manager coupling (deferred to future PR alongside actual linter execution).
- Registered in all four plugins. Full vitest suite (~45 tests).
```

### Step 2: Commit

```bash
cd /Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory
git add agents/IMPLEMENTATION.md
git commit -m "docs(impl): record lint-format-advisory hook in IMPLEMENTATION.md"
```

---

## Task 10: Push + Open PR

> **Working directory:** `/Users/akoziar/dev/gd/rosetta/.worktrees/lint-format-advisory`

### Step 1: Push branch

```bash
git push -u origin feat/hooks-lint-format-advisory
```

### Step 2: Open PR

```bash
gh pr create \
  --title "feat(hooks): add lint-format-advisory PostToolUse advisory hook" \
  --base v3 \
  --head feat/hooks-lint-format-advisory \
  --body "$(cat <<'EOF'
## Summary

- Adds `hooks/src/hooks/lint-format-advisory.ts`: PostToolUse hook that emits an advisory nudging AI agents to run syntax/type/lint/format checks after editing a code file.
- Monitored: `.html .css .js .ts .jsx .tsx .py .cs .ps1 .cmd .java .go .rs .md`.
- Throttle: `dedupBy: ['session','filePath']` — no spam on rapid edits; Copilot double-fire absorbed by same mechanism.
- Registered in all four plugin trees (`core-claude`, `core-cursor`, `core-copilot`, `core-codex`).
- Adds `/.worktrees/` to `.gitignore` (infrastructure).
- AC#3 (plan-step dedup) deferred — documented in `hooks-linked-unicorn` brainstorm notes.

## Test plan

- [ ] `cd hooks && npm run check` — no TS errors
- [ ] `cd hooks && npm run build` — four bundles produced
- [ ] `cd hooks && npm run test` — all tests pass including regression
- [ ] Manual smoke: edit `.ts` file in Claude Code session → advisory appears; edit `.json` → silent; same `.ts` immediately again → silent

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed. Copy URL and verify the diff in the browser.

---

## Acceptance Criteria Checklist

| AC | Verified by |
| --- | --- |
| (1) Advisory fires for any monitored extension | Task 3 — table-driven extension tests |
| (2) Silent for non-code extensions | Task 3 — negative extension tests |
| (3) Dedupe (plan-step version deferred) | Task 5 — throttle tests |
| (4) Non-blocking, informational | `advise()` → `permissionDecision: 'allow'` + `additionalContext` |
| (5) Tested on ≥ 1 coding agent | Task 10 — manual smoke + all 4 plugins registered |

## Deferred

- Strict plan-step dedup (read `plan.json`, scan for lint/format step).
- Actual linter invocation (per-extension tooling map).
- Session-long throttle TTL (extend `throttle.ts` with per-hook `ttlMs` option).
