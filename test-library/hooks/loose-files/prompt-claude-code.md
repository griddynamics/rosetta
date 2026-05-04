# E2E test: loose-files hook — Claude Code

This prompt is an instruction **for you, the AI agent in Claude Code**. You perform operations using your native tools (Write, Edit, Bash). The hook `.claude/hooks/loose-files.js` fires automatically on PostToolUse — if it produces output, Claude Code injects it into your context as additional text. Your task is to perform a series of operations and **verify whether hook text appears in your context** after each one.

> **Companion prompts:** [`prompt-codex.md`](./prompt-codex.md), [`prompt-copilot.md`](./prompt-copilot.md), [`prompt-cursor.md`](./prompt-cursor.md). Files are named per-IDE (`test-claude.js`, `helper-claude.js`, `/tmp/loose-files-claude`) — all 4 prompts can run in parallel across different IDE sessions without conflicts.

## How to observe hook firing

After each operation (Write/Edit/Bash) scan the **new text** that appeared in your context for the substring `loose file`. The hook returns text like:

> `loose file outside a module — consider placing it under a package.json/__init__.py/go.mod/pyproject.toml hierarchy`

- Substring `loose file` is present in the new context → **nudge fired**.
- Substring is absent → **silent**.

A test passes when the observed outcome (fired/silent) matches the expected one.

## Prerequisites

- You are in a **test project** (not the rosetta repository) with a committed `package.json` at the root and the `core-claude` plugin installed.
- The file `.claude/hooks/loose-files.js` exists. Check with Bash: `test -f .claude/hooks/loose-files.js && echo OK` — if `OK` is missing, **stop and report**.
- `git status --porcelain package.json` is empty (no uncommitted changes to `package.json`). Check with Bash: `git status --porcelain package.json` — if the output is non-empty, **stop and report**.

## Setup

Step 1. Get the absolute path to the project root:

```
git rev-parse --show-toplevel
```

Remember the result as `<ROOT>` — you will substitute it in the instructions below.

Step 2. Prepare directories and delete leftovers from previous runs **in a single Bash command**:

```
TMP=/tmp/loose-files-claude && rm -rf "$TMP" && mkdir -p "$TMP" && cd "$(git rev-parse --show-toplevel)" && mkdir -p src scripts && rm -f test-claude.js src/test-claude.js scripts/helper-claude.js && echo "Setup OK TMP=$TMP"
```

Remember `<TMP>` = `/tmp/loose-files-claude`.

---

## Tests

### Test 1 — root file, package.json present (expect: silent)

**Action:** use the **Write** tool to create `<ROOT>/test-claude.js` with the content `// test 1`.

**Expected:** silent — `package.json` is present in the same directory → file is not considered loose.

**Verify:** did new text containing the substring `loose file` appear in your context after Write?

**Report:** `Test 1 → silent` (if nothing arrived) or `Test 1 → nudge: "<excerpt>"` (if it arrived).

---

### Test 2 — src/ file, package.json present (expect: silent)

**Action:** use **Write** to create `<ROOT>/src/test-claude.js` with the content `// test 2`.

**Expected:** silent — the hook walks `src/` → root and finds `package.json`.

**Verify & Report:** same as Test 1.

---

### Setup for Tests 3 & 4 — remove package.json

Run Bash:

```
rm "$(git rev-parse --show-toplevel)/package.json"
```

From this point until `package.json` is restored, any Write operation in `<ROOT>` or `<ROOT>/src/` should trigger a nudge.

---

### Test 3 — root file, package.json absent (expect: nudge)

**Action:** **Write** → `<ROOT>/test-claude.js` with content `// test 3`.

**Expected:** **nudge fired** — `package.json` is absent; the hook walks up to the FS root and finds no module marker.

**Verify & Report:** expect text with `loose file` to appear in context.

---

### Test 4 — src/ file, package.json absent (expect: nudge)

**Action:** **Write** → `<ROOT>/src/test-claude.js` with content `// test 4`.

**Expected:** **nudge fired** — same as Test 3, but from `src/`.

**Verify & Report:** expect nudge.

---

### Restore package.json

Run Bash:

```
git -C "$(git rev-parse --show-toplevel)" checkout -- package.json
```

After this command `package.json` is back in place — subsequent tests in `<ROOT>` will be silent by default.

---

### Test 5 — Edit tool is silent (expect: silent)

**Action:** use **Edit** to modify `<ROOT>/test-claude.js`: replace its current content (e.g. `// test 4`, left by Test 4) with `// test 5 edited`.

**Expected:** silent — the hook's outer-gate matcher is `Write` only. Edit does not trigger the hook at all.

**Verify & Report:** expect silent.

---

### Test 7 — Bash tool is silent (expect: silent)

**Action:** use **Bash**: `echo '// bash' > /tmp/loose-files-claude/bash-out.js`

**Expected:** silent — Bash is not Write.

**Verify & Report:** expect silent.

> **Test 6 (`create_file` tool) — dropped from E2E.** Claude Code has no native `create_file` tool (CC uses Write for both creation and overwriting). Adapter regression for non-standard tool names is covered by Vitest unit tests in `hooks/tests/adapter.claude-code.test.ts`.

---

### Test 8 — `.ts` file is silent (expect: silent)

**Action:** **Write** → `<TMP>/test.ts` (i.e. `/tmp/loose-files-claude/test.ts`) with content `// ts`.

**Expected:** silent — `.ts` is not in the hook's `extOneOf` (`.js`, `.py`, `.go`, ...).

**Verify & Report:** expect silent.

---

### Test 9 — `.py` file, no `__init__.py` (expect: nudge)

**Action:** **Write** → `<TMP>/orphan.py` (i.e. `/tmp/loose-files-claude/orphan.py`) with content `# py`.

**Expected:** **nudge fired** — `<TMP>` has no `__init__.py` and no `pyproject.toml`, file is loose.

**Verify & Report:** expect nudge.

---

### Test 10 — `scripts/` path is silent (expect: silent)

**Action:** **Write** → `<ROOT>/scripts/helper-claude.js` with content `// helper`.

**Expected:** silent — `scripts/` is in the hook's `notContainsAny` exclusion list.

**Verify & Report:** expect silent.

> **Tests 11 (camelCase `filePath`) and 12 (Copilot CLI shape) — dropped from E2E.** Claude Code natively sends snake_case `file_path` to the hook and does not use Copilot-CLI shape — these input variants do not occur in real usage. Adapter resilience to them is covered by Vitest unit tests in `hooks/tests/adapter.claude-code.test.ts`.

---

## Cleanup

Run Bash in one command:

```
ROOT=$(git rev-parse --show-toplevel) && git -C "$ROOT" checkout -- package.json 2>/dev/null; rm -rf /tmp/loose-files-claude; rm -f "$ROOT/test-claude.js" "$ROOT/src/test-claude.js" "$ROOT/scripts/helper-claude.js"; git -C "$ROOT" status --porcelain
```

The last line of output (`git status --porcelain`) must be **empty** — this means cleanup left no traces.

---

## Report

After running all tests, output the report in exactly this format, replacing each `?` with `✅` (PASS) or `❌` (FAIL):

```
loose-files E2E — Claude Code
═══════════════════════════════════════════════════════
Setup
  ?  package.json clean baseline
  ?  hook bundle present at .claude/hooks/loose-files.js

Module detection
  ?  Test 1 · root/test.js, pkg present       → silent
  ?  Test 2 · src/test.js, pkg present        → silent
  ?  Test 3 · root/test.js, no pkg            → nudge
  ?  Test 4 · src/test.js, no pkg             → nudge

Tool filter
  ?  Test 5 · tool=Edit                       → silent
  ?  Test 7 · tool=Bash                       → silent

Extension filter
  ?  Test 8 · .ts file                        → silent
  ?  Test 9 · .py file, no __init__.py        → nudge

Excluded paths
  ?  Test 10 · scripts/helper.js              → silent

Cleanup
  ?  package.json restored, /tmp/loose-files-claude removed, git status clean

═══════════════════════════════════════════════════════
Summary: N/11 PASS
```

**Rules:**
- Denominator of Summary = 11 (2 setup + 9 tests + cleanup).
- After each test line add a short quote of what you observed: `→ silent (no hook text)` or `→ nudge: "loose file outside a module..."`. This makes the report auditable.
- If a test fails — **do not repeat it**. Report it and continue.
- If you received an unexpected nudge on a silent test, or silence on a nudge test — **record the exact string** the hook returned (or its absence). That is the useful diagnostic for PR review.
