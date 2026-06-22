# E2E test: loose-files hook — Windsurf (Cascade)

This prompt is an instruction **for you, the AI agent in Windsurf (Cascade)**. You perform operations using your native tools (write_code / edit_code, run_command). The hook `.windsurf/hooks/loose-files.js` fires automatically on `post_write_code` — if it produces output, Windsurf injects it into your context. Your task is to perform a series of operations and **verify whether hook text appears in your context** after each one.

> **Important — plugin not yet installed:** `plugins/core-windsurf/` does not exist yet. The compiled bundle lives at `src/hooks/dist/bundles/core-windsurf/loose-files.js`. Before running this prompt, copy or symlink it to `.windsurf/hooks/loose-files.js` in your test project and configure the outer-gate matcher in `.windsurf/hooks.json` (see Prerequisites). This prompt describes the intended E2E contract for when the plugin is created.

> **Companion prompts:** [`prompt-claude-code.md`](./prompt-claude-code.md), [`prompt-codex.md`](./prompt-codex.md), [`prompt-copilot.md`](./prompt-copilot.md), [`prompt-cursor.md`](./prompt-cursor.md). Files are named per-IDE (`test-windsurf.js`, `helper-windsurf.js`, `/tmp/loose-files-windsurf`) — all prompts can run in parallel across different IDE sessions without conflicts.

## Windsurf-specific: no distinct Edit event

Unlike other IDEs, Windsurf emits `post_write_code` for **both file creation and file modification**. The adapter maps `post_write_code → tool_name = "Write"`. This means:

- **Creating a file** → `post_write_code` → `Write` → hook fires (if file is loose).
- **Editing an existing file** → also `post_write_code` → `Write` → hook fires too.

**Test 5** in this prompt therefore expects **nudge** (not silent), which is the opposite of every other IDE. This is by design — the hook correctly fires on all code writes.

## How to observe hook firing

After each operation scan the **new text** that appeared in your context for the substring `loose file`. The hook returns text like:

> `loose file outside a module — consider placing it under a package.json/__init__.py/go.mod/pyproject.toml hierarchy`

- Substring `loose file` is present in the new context → **nudge fired**.
- Substring is absent → **silent**.

A test passes when the observed outcome (fired/silent) matches the expected one.

## Prerequisites

- You are in a **test project** (not the rosetta repository) with a committed `package.json` at the root.
- The file `.windsurf/hooks/loose-files.js` is present and wired up. Check with Bash:
  ```
  test -f .windsurf/hooks/loose-files.js && echo OK
  ```
  If `OK` is missing, **stop and report**.
- A `.windsurf/hooks.json` (or equivalent Windsurf hooks config) routes `post_write_code` events to `node .windsurf/hooks/loose-files.js`. Minimal example:
  ```json
  {
    "version": 1,
    "hooks": {
      "postToolUse": [
        { "matcher": "post_write_code", "command": "node .windsurf/hooks/loose-files.js" }
      ]
    }
  }
  ```
  Adjust if the actual Windsurf hooks.json schema differs.
- `git status --porcelain package.json` is empty. Check with Bash:
  ```
  git status --porcelain package.json
  ```
  If the output is non-empty, **stop and report**.

## Setup

Step 1. Get the absolute path to the project root:

```
git rev-parse --show-toplevel
```

Remember the result as `<ROOT>`.

Step 2. Prepare directories and delete leftovers from previous runs **in a single Bash command**:

```
TMP=/tmp/loose-files-windsurf && rm -rf "$TMP" && mkdir -p "$TMP" && cd "$(git rev-parse --show-toplevel)" && mkdir -p src scripts && rm -f test-windsurf.js src/test-windsurf.js scripts/helper-windsurf.js && echo "Setup OK TMP=$TMP"
```

Remember `<TMP>` = `/tmp/loose-files-windsurf`.

---

## Tests

### Test 1 — root file, package.json present (expect: silent)

**Action:** use your write tool to create `<ROOT>/test-windsurf.js` with content `// test 1`.

**Expected:** silent — `package.json` is present in the same directory → file is not loose.

**Verify:** did new text containing the substring `loose file` appear in your context?

**Report:** `Test 1 → silent` or `Test 1 → nudge: "<excerpt>"`.

---

### Test 2 — src/ file, package.json present (expect: silent)

**Action:** write `<ROOT>/src/test-windsurf.js` with content `// test 2`.

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

**Action:** write `<ROOT>/test-windsurf.js` with content `// test 3`.

**Expected:** **nudge fired**.

**Verify & Report:** expect nudge.

---

### Test 4 — src/ file, package.json absent (expect: nudge)

**Action:** write `<ROOT>/src/test-windsurf.js` with content `// test 4`.

**Expected:** **nudge fired**.

**Verify & Report:** expect nudge.

---

### Restore package.json

Run Bash:

```
git -C "$(git rev-parse --show-toplevel)" checkout -- package.json
```

---

### Test 5 — Edit operation fires (expect: nudge) ⚠️ Windsurf-specific

**Action:** modify (edit) `<ROOT>/test-windsurf.js`: replace its current content with `// test 5 edited`.

**Expected:** **nudge fired** — unlike other IDEs where only Write fires the hook, Windsurf maps all code writes (including edits) to `post_write_code → Write`, so the hook fires here too. File is in `<ROOT>` with `package.json` present, so result is **silent** on loose-file check — wait, `package.json` is present at this point → file is NOT loose → **silent**.

> Correction: `package.json` was restored before this test. So `<ROOT>/test-windsurf.js` with `package.json` present → **silent** (not loose). The Windsurf-vs-other-IDEs difference shows up in Tests 3/4 where any write-like op fires, but the loose-file gate still applies. **This test is silent.**

**Verify & Report:** expect silent.

---

### Test 5b — Edit on loose file fires (expect: nudge) ⚠️ Windsurf-specific

**Action:** modify (edit) `<TMP>/test-windsurf.js` — first create it, then edit it:

1. Write `<TMP>/test-windsurf.js` with content `// initial` (nudge expected, loose path — note it).
2. Then edit the same file: replace content with `// edited`.

**Expected for step 2:** **nudge fired** — Windsurf edit → `post_write_code` → `Write` → hook runs → file is still loose → nudge. This is the key behavioral difference from other IDEs (where Edit would be silent).

**Verify & Report:** record both step 1 and step 2 outcomes.

---

### Test 7 — Bash tool is silent (expect: silent)

**Action:** run command: `echo '// bash' > /tmp/loose-files-windsurf/bash-out.js`

**Expected:** silent — `post_run_command` maps to `Bash`, not in the outer-gate matcher.

**Verify & Report:** expect silent.

---

### Test 8 — `.ts` file is silent (expect: silent)

**Action:** write `<TMP>/test.ts` (`/tmp/loose-files-windsurf/test.ts`) with content `// ts`.

**Expected:** silent — `.ts` is not in the hook's `extOneOf`.

**Verify & Report:** expect silent.

---

### Test 9 — `.py` file, no `__init__.py` (expect: nudge)

**Action:** write `<TMP>/orphan.py` (`/tmp/loose-files-windsurf/orphan.py`) with content `# py`.

**Expected:** **nudge fired** — `<TMP>` has no `__init__.py` or `pyproject.toml`.

**Verify & Report:** expect nudge.

---

### Test 10 — `scripts/` path is silent (expect: silent)

**Action:** write `<ROOT>/scripts/helper-windsurf.js` with content `// helper`.

**Expected:** silent — `scripts/` is in the hook's `notContainsAny` exclusion list.

**Verify & Report:** expect silent.

---

## Cleanup

Run Bash in one command:

```
ROOT=$(git rev-parse --show-toplevel) && git -C "$ROOT" checkout -- package.json 2>/dev/null; rm -rf /tmp/loose-files-windsurf; rm -f "$ROOT/test-windsurf.js" "$ROOT/src/test-windsurf.js" "$ROOT/scripts/helper-windsurf.js"; git -C "$ROOT" status --porcelain
```

The last line of output (`git status --porcelain`) must be **empty**.

---

## Report

Output the report in exactly this format, replacing each `?` with `✅` (PASS) or `❌` (FAIL):

```
loose-files E2E — Windsurf (Cascade)
═══════════════════════════════════════════════════════
Setup
  ?  package.json clean baseline
  ?  hook bundle present at .windsurf/hooks/loose-files.js

Module detection
  ?  Test 1 · root/test.js, pkg present        → silent
  ?  Test 2 · src/test.js, pkg present         → silent
  ?  Test 3 · root/test.js, no pkg             → nudge
  ?  Test 4 · src/test.js, no pkg              → nudge

Tool filter (Windsurf: edit = post_write_code = Write)
  ?  Test 5  · edit op, pkg present            → silent (not loose)
  ?  Test 5b · edit op, loose path             → nudge  (⚠ differs from other IDEs)
  ?  Test 7  · tool=Bash (run_command)         → silent

Extension filter
  ?  Test 8 · .ts file                         → silent
  ?  Test 9 · .py file, no __init__.py         → nudge

Excluded paths
  ?  Test 10 · scripts/helper.js               → silent

Cleanup
  ?  package.json restored, /tmp/loose-files-windsurf removed, git status clean

═══════════════════════════════════════════════════════
Summary: N/12 PASS
```

**Rules:**
- Denominator of Summary = 12 (2 setup + 10 tests incl. 5b + cleanup).
- After each test line add a short quote of what you observed: `→ silent (no hook text)` or `→ nudge: "<excerpt>"`.
- If a test fails — **do not repeat it**. Report it and continue.
- Test 5b is the key Windsurf-specific regression check: if it is silent, the `post_write_code` → `Write` adapter mapping is broken or the outer-gate matcher is misconfigured.
