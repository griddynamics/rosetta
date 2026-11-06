# E2E test: loose-files hook — GitHub Copilot

This prompt is an instruction **for you, the AI agent in GitHub Copilot (Agent / CLI)**. You perform operations using your native tools (Write / `create_file`, Edit, Bash). The hook `.github/hooks/loose-files.js` fires automatically on PostToolUse — if it produces output, Copilot injects it into your context as additional text. Your task is to perform a series of operations and **verify whether hook text appears in your context** after each one.

> **Companion prompts:** [`prompt-claude-code.md`](./prompt-claude-code.md), [`prompt-codex.md`](./prompt-codex.md), [`prompt-cursor.md`](./prompt-cursor.md). Files are named per-IDE (`test-copilot.js`, `helper-copilot.js`, `/tmp/loose-files-copilot`) — all 4 prompts can run in parallel across different IDE sessions without conflicts.

## How to observe hook firing

After each operation (Write / `create_file` / Edit / Bash) scan the **new text** that appeared in your context for the substring `loose file`. The hook returns text like:

> `loose file outside a module — consider placing it under a package.json/__init__.py/go.mod/pyproject.toml hierarchy`

- Substring `loose file` is present in the new context → **nudge fired**.
- Substring is absent → **silent**.

A test passes when the observed outcome (fired/silent) matches the expected one.

## Prerequisites

- You are in a **test project** (not the rosetta repository) with a committed `package.json` at the root and the `rosetta-copilot` plugin installed.
- The file `.github/hooks/loose-files.js` exists. Check with Bash: `test -f .github/hooks/loose-files.js && echo OK` — if `OK` is missing, **stop and report**.
- `git status --porcelain package.json` is empty. Check with Bash: `git status --porcelain package.json` — if the output is non-empty, **stop and report**.

## Setup

Step 1. Get the absolute path to the project root:

```
git rev-parse --show-toplevel
```

Remember the result as `<ROOT>`.

Step 2. Prepare directories and delete leftovers from previous runs **in a single Bash command**:

```
TMP=/tmp/loose-files-copilot && rm -rf "$TMP" && mkdir -p "$TMP" && cd "$(git rev-parse --show-toplevel)" && mkdir -p src scripts && rm -f test-copilot.js src/test-copilot.js scripts/helper-copilot.js && echo "Setup OK TMP=$TMP"
```

Remember `<TMP>` = `/tmp/loose-files-copilot`.

---

## Tests

### Test 1 — root file, package.json present (expect: silent)

**Action:** use the **Write** tool (or `create_file` if that is how your toolset names file creation) to create `<ROOT>/test-copilot.js` with content `// test 1`.

**Expected:** silent — `package.json` is present nearby.

**Verify:** did new text containing the substring `loose file` appear in your context after the operation?

**Report:** `Test 1 → silent` or `Test 1 → nudge: "<excerpt>"`.

---

### Test 2 — src/ file, package.json present (expect: silent)

**Action:** **Write** / `create_file` → `<ROOT>/src/test-copilot.js` with content `// test 2`.

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

**Action:** **Write** / `create_file` → `<ROOT>/test-copilot.js` with content `// test 3`.

**Expected:** **nudge fired**.

**Verify & Report:** expect nudge.

---

### Test 4 — src/ file, package.json absent (expect: nudge)

**Action:** **Write** / `create_file` → `<ROOT>/src/test-copilot.js` with content `// test 4`.

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

**Action:** use **Edit** (or `replace_string_in_file`/`edit_file` — whichever is in your toolset) to modify `<ROOT>/test-copilot.js`: replace current content with `// test 5 edited`.

**Expected:** silent — the hook's outer-gate matcher is `Write|create_file`. Edit is not included → hook does not fire.

**Verify & Report:** expect silent.

---

### Test 6 — `create_file` tool fires (expect: nudge)

**Action:** if your toolset has a **native** `create_file` tool (separate from Write), use it to create `<TMP>/orphan-create.js` (`/tmp/loose-files-copilot/orphan-create.js`) with content `// orphan via create_file`. If you only have Write — use Write (the test is valid for both names, since the outer-gate matcher is `Write|create_file`).

**Expected:** **nudge fired** — `<TMP>` has no module marker, `.js` is in `extOneOf`, the tool matches the outer matcher.

**Verify & Report:** expect nudge.

---

### Test 7 — Bash tool is silent (expect: silent)

**Action:** **Bash**: `echo '// bash' > /tmp/loose-files-copilot/bash-out.js`

**Expected:** silent — Bash is not in the outer matcher.

**Verify & Report:** expect silent.

---

### Test 8 — `.ts` file is silent (expect: silent)

**Action:** **Write** / `create_file` → `<TMP>/test.ts` (`/tmp/loose-files-copilot/test.ts`) with content `// ts`.

**Expected:** silent — `.ts` is not in `extOneOf`.

**Verify & Report:** expect silent.

---

### Test 9 — `.py` file, no `__init__.py` (expect: nudge)

**Action:** **Write** / `create_file` → `<TMP>/orphan.py` (`/tmp/loose-files-copilot/orphan.py`) with content `# py`.

**Expected:** **nudge fired** — `<TMP>` has no `__init__.py` or `pyproject.toml`.

**Verify & Report:** expect nudge.

---

### Test 10 — `scripts/` path is silent (expect: silent)

**Action:** **Write** / `create_file` → `<ROOT>/scripts/helper-copilot.js` with content `// helper`.

**Expected:** silent — `scripts/` is in the hook's `notStartsWithAny` exclusion list.

**Verify & Report:** expect silent.

> **Tests 11 (camelCase `filePath`) and 12 (Copilot CLI shape `toolName`/`toolArgs`) — dropped from E2E.** This test run goes through a real Copilot Agent or CLI, which forms the hook input itself — synthetic shape variants do not arise in practice. Adapter resilience to them (including dual-mode `normalize` for CC-shape vs Copilot-CLI shape) is covered by Vitest unit tests in `src/hooks/tests/adapter.copilot.test.ts`.

---

## Cleanup

Run Bash in one command:

```
ROOT=$(git rev-parse --show-toplevel) && git -C "$ROOT" checkout -- package.json 2>/dev/null; rm -rf /tmp/loose-files-copilot; rm -f "$ROOT/test-copilot.js" "$ROOT/src/test-copilot.js" "$ROOT/scripts/helper-copilot.js"; git -C "$ROOT" status --porcelain
```

The last line of output (`git status --porcelain`) must be **empty**.

---

## Report

Output the report in exactly this format, replacing each `?` with `✅` (PASS) or `❌` (FAIL):

```
loose-files E2E — GitHub Copilot
═══════════════════════════════════════════════════════
Setup
  ?  package.json clean baseline
  ?  hook bundle present at .github/hooks/loose-files.js

Module detection
  ?  Test 1 · root/test.js, pkg present        → silent
  ?  Test 2 · src/test.js, pkg present         → silent
  ?  Test 3 · root/test.js, no pkg             → nudge
  ?  Test 4 · src/test.js, no pkg              → nudge

Tool filter
  ?  Test 5 · tool=Edit                        → silent
  ?  Test 6 · tool=create_file (or Write)      → nudge
  ?  Test 7 · tool=Bash                        → silent

Extension filter
  ?  Test 8 · .ts file                         → silent
  ?  Test 9 · .py file, no __init__.py         → nudge

Excluded paths
  ?  Test 10 · scripts/helper.js               → silent

Cleanup
  ?  package.json restored, /tmp/loose-files-copilot removed, git status clean

═══════════════════════════════════════════════════════
Summary: N/12 PASS
```

**Rules:**
- Denominator of Summary = 12 (2 setup + 10 numbered + cleanup).
- After each test line add a short quote of what you observed: `→ silent (no hook text)` or `→ nudge: "<excerpt>"`.
- If a test fails — **do not repeat it**. Report it and continue.
- In Test 6 explicitly state in the report which tool name you used (`create_file` or `Write`) — this is important for understanding outer matcher coverage.
