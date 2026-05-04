# E2E test: loose-files hook — Cursor

This prompt is an instruction **for you, the AI agent in Cursor (Cascade)**. You perform operations using your native tools (Write / `edit_file`, Bash / `run_command`). The hook `.cursor/hooks/loose-files.js` fires automatically on postToolUse — if it produces output, Cursor injects it into your context as `additional_context`. Your task is to perform a series of operations and **verify whether hook text appears in your context** after each one.

> **Companion prompts:** [`prompt-claude-code.md`](./prompt-claude-code.md), [`prompt-codex.md`](./prompt-codex.md), [`prompt-copilot.md`](./prompt-copilot.md). Files are named per-IDE (`test-cursor.js`, `helper-cursor.js`, `/tmp/loose-files-cursor`) — all 4 prompts can run in parallel across different IDE sessions without conflicts.

## How to observe hook firing

After each operation (Write / Edit / Bash) scan the **new text** that appeared in your context for the substring `loose file`. The hook returns text like:

> `loose file outside a module — consider placing it under a package.json/__init__.py/go.mod/pyproject.toml hierarchy`

- Substring `loose file` is present in the new context → **nudge fired**.
- Substring is absent → **silent**.

A test passes when the observed outcome (fired/silent) matches the expected one.

## Prerequisites

- You are in a **test project** (not the rosetta repository) with a committed `package.json` at the root and the `core-cursor` plugin installed.
- The file `.cursor/hooks/loose-files.js` exists. Check with Bash: `test -f .cursor/hooks/loose-files.js && echo OK` — if `OK` is missing, **stop and report**.
- `git status --porcelain package.json` is empty. Check with Bash: `git status --porcelain package.json` — if the output is non-empty, **stop and report**.

## Setup

Step 1. Get the absolute path to the project root:

```
git rev-parse --show-toplevel
```

Remember the result as `<ROOT>`.

Step 2. Prepare directories and delete leftovers from previous runs **in a single Bash command**:

```
TMP=/tmp/loose-files-cursor && rm -rf "$TMP" && mkdir -p "$TMP" && cd "$(git rev-parse --show-toplevel)" && mkdir -p src scripts && rm -f test-cursor.js src/test-cursor.js scripts/helper-cursor.js && echo "Setup OK TMP=$TMP"
```

Remember `<TMP>` = `/tmp/loose-files-cursor`.

---

## Tests

### Test 1 — root file, package.json present (expect: silent)

**Action:** use the **Write** tool to create `<ROOT>/test-cursor.js` with content `// test 1`.

**Expected:** silent — `package.json` is present nearby.

**Verify:** did new text containing the substring `loose file` appear in your context after Write?

**Report:** `Test 1 → silent` or `Test 1 → nudge: "<excerpt>"`.

---

### Test 2 — src/ file, package.json present (expect: silent)

**Action:** **Write** → `<ROOT>/src/test-cursor.js` with content `// test 2`.

**Expected:** silent — the hook walks `src/` → root and finds `package.json`.

**Verify & Report:** expect silent.

---

### Setup for Tests 3 & 4 — remove package.json

Run Bash:

```
rm "$(git rev-parse --show-toplevel)/package.json"
```

---

### Test 3 — root file, package.json absent (expect: nudge)

**Action:** **Write** → `<ROOT>/test-cursor.js` with content `// test 3`.

**Expected:** **nudge fired**.

**Verify & Report:** expect nudge.

---

### Test 4 — src/ file, package.json absent (expect: nudge)

**Action:** **Write** → `<ROOT>/src/test-cursor.js` with content `// test 4`.

**Expected:** **nudge fired**.

**Verify & Report:** expect nudge.

---

### Restore package.json

Run Bash:

```
git -C "$(git rev-parse --show-toplevel)" checkout -- package.json
```

---

### Test 5 — Edit tool is silent (expect: silent)

**Action:** use **Edit** (or `edit_file` — whichever is in your toolset) to modify `<ROOT>/test-cursor.js`: replace current content with `// test 5 edited`.

**Expected:** silent — the hook's outer-gate matcher is `Write` only. Edit does not trigger the hook.

**Verify & Report:** expect silent.

---

### Test 7 — Bash tool is silent (expect: silent)

**Action:** **Bash** (or `run_command`): `echo '// bash' > /tmp/loose-files-cursor/bash-out.js`

**Expected:** silent — Bash is not Write.

**Verify & Report:** expect silent.

> **Test 6 (`create_file` tool) — dropped from E2E.** Cursor Cascade has no native `create_file` tool (Cursor uses Write for file creation). Adapter regression for non-standard tool names is covered by Vitest unit tests in `hooks/tests/adapter.cursor.test.ts`.

---

### Test 8 — `.ts` file is silent (expect: silent)

**Action:** **Write** → `<TMP>/test.ts` (`/tmp/loose-files-cursor/test.ts`) with content `// ts`.

**Expected:** silent — `.ts` is not in the hook's `extOneOf`.

**Verify & Report:** expect silent.

---

### Test 9 — `.py` file, no `__init__.py` (expect: nudge)

**Action:** **Write** → `<TMP>/orphan.py` (`/tmp/loose-files-cursor/orphan.py`) with content `# py`.

**Expected:** **nudge fired** — `<TMP>` has no `__init__.py` or `pyproject.toml`.

**Verify & Report:** expect nudge.

---

### Test 10 — `scripts/` path is silent (expect: silent)

**Action:** **Write** → `<ROOT>/scripts/helper-cursor.js` with content `// helper`.

**Expected:** silent — `scripts/` is in the hook's `notContainsAny` exclusion list.

**Verify & Report:** expect silent.

> **Tests 11 (camelCase `filePath`) and 12 (Copilot CLI shape) — dropped from E2E.** Cursor does not natively send these forms. Adapter resilience to them is covered by Vitest unit tests in `hooks/tests/adapter.cursor.test.ts`.

---

## Cleanup

Run Bash in one command:

```
ROOT=$(git rev-parse --show-toplevel) && git -C "$ROOT" checkout -- package.json 2>/dev/null; rm -rf /tmp/loose-files-cursor; rm -f "$ROOT/test-cursor.js" "$ROOT/src/test-cursor.js" "$ROOT/scripts/helper-cursor.js"; git -C "$ROOT" status --porcelain
```

The last line of output (`git status --porcelain`) must be **empty**.

---

## Report

Output the report in exactly this format, replacing each `?` with `✅` (PASS) or `❌` (FAIL):

```
loose-files E2E — Cursor
═══════════════════════════════════════════════════════
Setup
  ?  package.json clean baseline
  ?  hook bundle present at .cursor/hooks/loose-files.js

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
  ?  package.json restored, /tmp/loose-files-cursor removed, git status clean

═══════════════════════════════════════════════════════
Summary: N/11 PASS
```

**Rules:**
- Denominator of Summary = 11 (2 setup + 9 numbered + cleanup).
- After each test line add a short quote of what you observed: `→ silent (no hook text)` or `→ nudge: "<excerpt>"`.
- If a test fails — **do not repeat it**. Report it and continue.
