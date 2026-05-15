# loose-files hook — E2E test prompts

Per-IDE test prompts for the `loose-files` PostToolUse hook
(source: [`hooks/src/hooks/loose-files.ts`](../../../hooks/src/hooks/loose-files.ts)).

> **Note:** unlike other `test-library/` categories, this folder does **not** follow the
> `prompt-request.md`/`prompt-validation.md`/`trigger.txt` convention used by the Rosetta
> instruction-evaluation framework. These are **E2E specs for AI agents running inside each
> IDE** — the agent executes real tool operations, the IDE fires the hook with its actual
> PostToolUse payload, and the agent observes hook output injected into its context.

## Files

| File | When to use |
|------|-------------|
| [`prompt-claude-code.md`](./prompt-claude-code.md) | Test the hook installed at `.claude/hooks/loose-files.js` (Claude Code) |
| [`prompt-codex.md`](./prompt-codex.md) | Test the hook installed at `.codex/hooks/loose-files.js` (Codex CLI / Codex IDE) |
| [`prompt-copilot.md`](./prompt-copilot.md) | Test the hook installed at `.github/hooks/loose-files.js` (GitHub Copilot Agent / CLI) |
| [`prompt-cursor.md`](./prompt-cursor.md) | Test the hook installed at `.cursor/hooks/loose-files.js` (Cursor) |
| [`prompt-windsurf.md`](./prompt-windsurf.md) | Test the hook installed at `.windsurf/hooks/loose-files.js` (Windsurf Cascade) — bundle exists, plugin not yet packaged |

Each per-IDE prompt is **self-contained**: it has its own prerequisites, setup, tests, cleanup,
and report template inline. Feed the file directly to an AI agent in the matching IDE — no
companion files needed.

## Per-IDE test inventory

| Test group | claude-code | codex | copilot | cursor | windsurf |
|------------|:-----------:|:-----:|:-------:|:------:|:--------:|
| Tests 1-4 — module detection | ✔ | ✔ | ✔ | ✔ | ✔ |
| Tests 5, 7 — tool filter (Edit/Bash silent) | ✔ | ✔ | ✔ | ✔ | — |
| Test 5b — edit fires on loose path (Windsurf-specific) | — | — | — | — | ✔ |
| Test 6 — `create_file` fires | — | — | ✔ | — | — |
| Test 7 — Bash silent | ✔ | ✔ | ✔ | ✔ | ✔ |
| Tests 8-9 — extension filter | ✔ | ✔ | ✔ | ✔ | ✔ |
| Test 10 — excluded paths | ✔ | ✔ | ✔ | ✔ | ✔ |
| C1/C2/C3 — `apply_patch` creation-only gate | — | ✔ | — | — | — |
| **Total checks (incl. setup + cleanup)** | **11** | **14** | **12** | **11** | **12** |

**Test 6 is Copilot-only** because only `core-copilot` outer-gate matcher includes `create_file`
(alongside `Write`). **C1/C2/C3 are Codex-only** because `apply_patch` is the Codex creation
tool. **Test 5b is Windsurf-only** because Windsurf maps both file creation and file
modification to `post_write_code → Write` — there is no distinct Edit event, so the hook fires
on edits too. Tests 11/12 (adapter shape edge cases) are covered by Vitest unit tests in
`hooks/tests/adapter.<ide>.test.ts`, not E2E.

## How to run

Each prompt is **natural-language instructions for the AI agent inside the matching IDE**. The
agent reads it, performs real tool operations (Write/Edit/Bash/apply_patch), observes hook
output injected into its context, and reports PASS/FAIL. There are no bash scripts to run —
only agent-driven E2E.

### Sequential (one IDE at a time)

```bash
# In IDE №1 (e.g., Claude Code session):
cat test-library/hooks/loose-files/prompt-claude-code.md
# → paste / feed to the agent → agent runs all checks → emits Report

# Then in IDE №2 (e.g., Codex session):
cat test-library/hooks/loose-files/prompt-codex.md
# → ... etc.
```

### Parallel (all IDEs simultaneously)

Open **separate test projects** (one per IDE), each with `core-<ide>` plugin installed and
`package.json` committed. In each IDE's session, paste the corresponding prompt. They will
not collide because:

- **Per-IDE TMP prefix:** each prompt sets `TMP="/tmp/loose-files-<ide>"` — no `/tmp` collisions.
- **Per-IDE filenames:** test files are named `test-<ide>.js`, `src/test-<ide>.js`,
  `scripts/helper-<ide>.js` — no cross-session conflicts.
- **Separate `$ROOT`:** each test project has its own `git rev-parse` — `package.json`
  manipulation is isolated.

The five IDE sessions run independently and emit five independent Reports.

## Prerequisites (per IDE / test project)

- Separate test project (NOT the rosetta repo itself) with `package.json` committed at root.
- The corresponding rosetta plugin (`core-<ide>`) installed; the bundle file exists at the
  expected path (e.g. `.claude/hooks/loose-files.js`).
- `node` 20+.

## Cleanup guarantee

Every prompt's Setup step begins with an idempotent cleanup (`rm -rf $TMP && mkdir -p $TMP`)
to wipe any leftovers from a prior crashed run. After completion (success or failure), the
Cleanup step restores `package.json` via `git checkout` and removes the
`/tmp/loose-files-<ide>` directory. Final assertion: `git status --porcelain` returns empty.

## Source of truth

The hook itself: [`hooks/src/hooks/loose-files.ts`](../../../hooks/src/hooks/loose-files.ts)

Outer-gate matchers (per IDE):
- [`plugins/core-claude/hooks/hooks.json`](../../../plugins/core-claude/hooks/hooks.json)
- [`plugins/core-codex/.codex/hooks.json`](../../../plugins/core-codex/.codex/hooks.json)
- [`plugins/core-copilot/hooks/hooks.json`](../../../plugins/core-copilot/hooks/hooks.json)
- [`plugins/core-cursor/hooks/hooks.json`](../../../plugins/core-cursor/hooks/hooks.json)
- Windsurf: `plugins/core-windsurf/` not yet created — see `prompt-windsurf.md` for the assumed hooks.json shape

Compiled bundles:
[`hooks/dist/bundles/core-<ide>/loose-files.js`](../../../hooks/dist/bundles/)
