# E2E test: loose-files hook — Codex

This prompt is an instruction **for you, the AI agent in Codex CLI / Codex IDE**. You perform operations using your native tools (Write, Edit, `apply_patch`, Bash). The hook `.codex/hooks/loose-files.js` fires automatically on PostToolUse — if it produces output, Codex injects it into your context as additional text. Your task is to perform a series of operations and **verify whether hook text appears in your context** after each one.

Important Codex-specific detail — **Tests C1/C2/C3 for `apply_patch` (creation-only gate, core of PR #73):** the hook expects the prefix `*** Add File:` or `*** Create File:`, but **not** `*** Update File:`. C1 verifies that Update is silently discarded by the inner regex; C2/C3 verify that Add/Create actually fire the nudge.

> **Companion prompts:** [`prompt-claude-code.md`](./prompt-claude-code.md), [`prompt-copilot.md`](./prompt-copilot.md), [`prompt-cursor.md`](./prompt-cursor.md). Files are named per-IDE (`test-codex.js`, `helper-codex.js`, `/tmp/loose-files-codex`) — all 4 prompts can run in parallel across different IDE sessions without conflicts.

## How to observe hook firing

After each operation (Write/Edit/`apply_patch`/Bash) scan the **new text** that appeared in your context for the substring `loose file`. The hook returns text like:

> `loose file outside a module — consider placing it under a package.json/__init__.py/go.mod/pyproject.toml hierarchy`

- Substring `loose file` is present in the new context → **nudge fired**.
- Substring is absent → **silent**.

A test passes when the observed outcome (fired/silent) matches the expected one.

## Prerequisites

- You are in a **test project** (not the rosetta repository) with a committed `package.json` at the root and the `core-codex` plugin installed.
- The file `.codex/hooks/loose-files.js` exists. Check with Bash: `test -f .codex/hooks/loose-files.js && echo OK` — if `OK` is missing, **stop and report**.
- `git status --porcelain package.json` is empty. Check with Bash: `git status --porcelain package.json` — if the output is non-empty, **stop and report**.

## Setup

Step 1. Get the absolute path to the project root:

```
git rev-parse --show-toplevel
```

Remember the result as `<ROOT>`.

Step 2. Prepare directories and delete leftovers from previous runs **in a single Bash command**:

```
TMP=/tmp/loose-files-codex && rm -rf "$TMP" && mkdir -p "$TMP" && cd "$(git rev-parse --show-toplevel)" && mkdir -p src scripts && rm -f test-codex.js src/test-codex.js scripts/helper-codex.js && echo "Setup OK TMP=$TMP"
```

Remember `<TMP>` = `/tmp/loose-files-codex`.

---

## Tests — Codex `apply_patch` creation-only gate (core of PR #73)

These three tests are the **core of PR #73**. They verify that the `commandMatchWhen` regex `^\*\*\* (?:Add|Create) File:` fires only on `Add File:` / `Create File:` prefixes, but not on `Update File:`.

### Test C1 — `apply_patch *** Update File:` is silent (expect: silent)

**Setup for C1:** create a pre-populated file in `<TMP>` (where there is no package.json — a loose location):

```
echo "// initial content" > /tmp/loose-files-codex/c1-target.js
```

**Action:** use **`apply_patch`** to modify this file. Exact patch (pass exactly as-is in the `command` parameter):

```
*** Begin Patch
*** Update File: /tmp/loose-files-codex/c1-target.js
@@
-// initial content
+// updated content
*** End Patch
```

**Expected:** **silent** — even though the path is loose (no `package.json` nearby), the inner regex `^\*\*\* (?:Add|Create) File:` **does not match** `Update File:`, so the hook stays silent. This is the creation-only gate from PR #73.

**Verify & Report:** expect silent.

---

### Test C2 — `apply_patch *** Add File:` fires (expect: nudge)

**Action:** use **`apply_patch`** to add a new file:

```
*** Begin Patch
*** Add File: /tmp/loose-files-codex/c2-add.js
+// new file via Add
*** End Patch
```

**Expected:** **nudge fired** — path is loose (`<TMP>` is not a module), inner regex matches `Add File:`.

**Verify & Report:** expect nudge mentioning `c2-add.js` or `loose file`.

---

### Test C3 — `apply_patch *** Create File:` fires (expect: nudge)

**Action:** use **`apply_patch`** to create a new file:

```
*** Begin Patch
*** Create File: /tmp/loose-files-codex/c3-create.js
+// new file via Create
*** End Patch
```

**Expected:** **nudge fired** — `Create File:` also matches the inner regex.

**Verify & Report:** expect nudge mentioning `c3-create.js` or `loose file`.

---

## Tests — Module detection

### Test 1 — root file, package.json present (expect: silent)

**Action:** use **Write** to create `<ROOT>/test-codex.js` with content `// test 1`.

**Expected:** silent — `package.json` is present nearby.

**Verify & Report:** expect silent.

---

### Test 2 — src/ file, package.json present (expect: silent)

**Action:** **Write** → `<ROOT>/src/test-codex.js` with content `// test 2`.

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

**Action:** **Write** → `<ROOT>/test-codex.js` with content `// test 3`.

**Expected:** **nudge fired**.

**Verify & Report:** expect nudge.

---

### Test 4 — src/ file, package.json absent (expect: nudge)

**Action:** **Write** → `<ROOT>/src/test-codex.js` with content `// test 4`.

**Expected:** **nudge fired**.

**Verify & Report:** expect nudge.

---

### Restore package.json

Run Bash:

```
git -C "$(git rev-parse --show-toplevel)" checkout -- package.json
```

---

## Tests — Tool filter

### Test 5 — Edit tool is silent (expect: silent)

**Action:** use **Edit** to modify `<ROOT>/test-codex.js` (replace current content with `// test 5 edited`).

**Expected:** silent — the hook's outer-gate matcher is `Write|apply_patch|functions.apply_patch`. Edit is not included → hook does not fire.

**Verify & Report:** expect silent.

---

### Test 7 — Bash tool is silent (expect: silent)

**Action:** **Bash**: `echo '// bash' > /tmp/loose-files-codex/bash-out.js`

**Expected:** silent — Bash is not in the outer matcher.

**Verify & Report:** expect silent.

> **Test 6 (`create_file` tool) — dropped from E2E.** Codex does not use such a tool (the agent creates files via Write or `apply_patch`). Adapter regression is covered by Vitest unit tests in `src/hooks/tests/adapter.codex.test.ts`.

---

## Tests — Extension filter

### Test 8 — `.ts` file is silent (expect: silent)

**Action:** **Write** → `<TMP>/test.ts` (`/tmp/loose-files-codex/test.ts`) with content `// ts`.

**Expected:** silent — `.ts` is not in the hook's `extOneOf`.

**Verify & Report:** expect silent.

---

### Test 9 — `.py` file, no `__init__.py` (expect: nudge)

**Action:** **Write** → `<TMP>/orphan.py` (`/tmp/loose-files-codex/orphan.py`) with content `# py`.

**Expected:** **nudge fired** — `<TMP>` has no `__init__.py` or `pyproject.toml`.

**Verify & Report:** expect nudge.

---

## Tests — Excluded paths

### Test 10 — `scripts/` path is silent (expect: silent)

**Action:** **Write** → `<ROOT>/scripts/helper-codex.js` with content `// helper`.

**Expected:** silent — `scripts/` is in the hook's `notContainsAny` exclusion list.

**Verify & Report:** expect silent.

> **Tests 11 (camelCase `filePath`) and 12 (Copilot CLI shape) — dropped from E2E.** Codex does not natively send these forms. Adapter resilience to them is covered by Vitest unit tests in `src/hooks/tests/adapter.codex.test.ts`.

---

## Cleanup

Run Bash in one command:

```
ROOT=$(git rev-parse --show-toplevel) && git -C "$ROOT" checkout -- package.json 2>/dev/null; rm -rf /tmp/loose-files-codex; rm -f "$ROOT/test-codex.js" "$ROOT/src/test-codex.js" "$ROOT/scripts/helper-codex.js"; git -C "$ROOT" status --porcelain
```

The last line of output (`git status --porcelain`) must be **empty**.

---

## Report

Output the report in exactly this format, replacing each `?` with `✅` (PASS) or `❌` (FAIL):

```
loose-files E2E — Codex
═══════════════════════════════════════════════════════
Setup
  ?  package.json clean baseline
  ?  hook bundle present at .codex/hooks/loose-files.js

Codex apply_patch (creation-only gate — PR #73)
  ?  Test C1 · apply_patch Update File         → silent
  ?  Test C2 · apply_patch Add File            → nudge
  ?  Test C3 · apply_patch Create File         → nudge

Module detection
  ?  Test 1 · root/test.js, pkg present        → silent
  ?  Test 2 · src/test.js, pkg present         → silent
  ?  Test 3 · root/test.js, no pkg             → nudge
  ?  Test 4 · src/test.js, no pkg              → nudge

Tool filter
  ?  Test 5 · tool=Edit                        → silent
  ?  Test 7 · tool=Bash                        → silent

Extension filter
  ?  Test 8 · .ts file                         → silent
  ?  Test 9 · .py file, no __init__.py         → nudge

Excluded paths
  ?  Test 10 · scripts/helper.js               → silent

Cleanup
  ?  package.json restored, /tmp/loose-files-codex removed, git status clean

═══════════════════════════════════════════════════════
Summary: N/14 PASS
```

**Rules:**
- Denominator of Summary = 14 (2 setup + 3 apply_patch C1/C2/C3 + 9 numbered + cleanup).
- After each test line add a short quote of what you observed: `→ silent (no hook text)` or `→ nudge: "<excerpt>"`.
- If a test fails — **do not repeat it**. Report it and continue.
- Special attention to C1: if an unexpected nudge arrives for Update File: — **record the exact text**, that is a clear regression of PR #73.
