# Handoff: QA Adapter Normalization — Live E2E Pending

**Branch:** `qa/adapter-validation-2026-05-19`
**Base:** `v3`
**Handoff date:** 2026-05-23
**Status:** Offline validation COMPLETE. Live E2E (Tasks 4-7) and final report (Tasks 8-10) PENDING.

---

## What was already done (no action needed)

| Task | What | Result |
|------|------|--------|
| Task 0 | PRE-FLIGHT: evidence dir OK, sign-off obtained, gap-issue #4 → OUT-OF-SCOPE | ✅ |
| Task 1 | Branch created, hooks built, exports verified, pre_commit.py OK | ✅ |
| Task 2 | Rewrote tautological normalize tests → per-IDE toMatchObject (B4 fix); added dedupKey unit tests (B5 fix) | ✅ |
| Task 3 | Offline fixture snapshot (8 fixtures, all PASS), formatOutput snapshot (5 IDEs) | ✅ |
| Task 8 | Gap-issues filed: #93-#98 | ✅ |
| **Commit 1** | `633f289` — tests + offline evidence | ✅ |

---

## What you need to do

### Overview

```
Tasks 4-7   Live E2E per IDE → write evidence files → Commit 2
Task 7.5    Dedup verification
Task 9      Assemble QA report (fill in live results)
Task 10     Update TODO.md with issue URLs → Commit 3 → PR body update
```

---

## Prerequisites

```bash
# 1. Checkout the branch
cd ~/dev/gd/rosetta
git checkout qa/adapter-validation-2026-05-19
git pull

# 2. Build hooks (needed for normalize() calls)
cd src/hooks && npm ci && npm run build && cd ../..

# 3. Recreate /tmp workspaces (volatile — lost on reboot)
mkdir -p /tmp/qa-rosetta-cc/.claude \
  /tmp/qa-rosetta-cursor/.cursor/hooks \
  /tmp/qa-rosetta-codex/.codex/hooks \
  /tmp/qa-rosetta-copilot/.github/plugin
```

### dump.js — готовый скрипт в репо

**Не нужно создавать dump.js вручную.** Используй уже существующий скрипт:

```
src/hooks/tests/fixtures/dump-stdin.js
```

Он записывает stdin в `/tmp/hook-stdin-dump.jsonl` (JSON Lines, append-режим — каждый вызов добавляет строку с timestamp). Просто укажи абсолютный путь в hook config:

```json
"command": "node /Users/<YOU>/dev/gd/rosetta/src/hooks/tests/fixtures/dump-stdin.js"
```

После срабатывания хука читай последнюю запись:
```bash
tail -1 /tmp/hook-stdin-dump.jsonl | python3 -m json.tool | jq '.input'
```

> Альтернативно: ниже приведены inline-команды для создания per-IDE dump.js с таймаутом (план M13). Используй их если хочешь изолированные per-IDE файлы вместо общего `.jsonl`.

---

## Task 4: Live E2E — Claude Code

### Step 1: Hook command (dump.js)

**Вариант A — рекомендуемый:** используй готовый скрипт из репо (см. Prerequisites выше):
```
"command": "node /Users/<YOU>/dev/gd/rosetta/src/hooks/tests/fixtures/dump-stdin.js"
```
Результат будет в `/tmp/hook-stdin-dump.jsonl`. Читай последнюю строку: `tail -1 /tmp/hook-stdin-dump.jsonl | jq '.input'`

**Вариант B — per-IDE изолированный файл с таймаутом:**
```bash
cat > /tmp/qa-rosetta-cc/dump.js << 'EOF'
const fs = require('fs');
const OUT = '/tmp/hook-stdin-cc.json';
const timer = setTimeout(() => { fs.writeFileSync('/tmp/hook-stdin-cc.timeout', 'no data in 30s'); process.exit(0); }, 30000);
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => { clearTimeout(timer); fs.writeFileSync(OUT, data); });
process.stdin.on('error', e => { clearTimeout(timer); fs.writeFileSync('/tmp/hook-stdin-cc.err', e.message); });
EOF
```

### Step 2: Create settings.json (hook registration)

```bash
cat > /tmp/qa-rosetta-cc/.claude/settings.json << 'EOF'
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [{ "type": "command", "command": "node /tmp/qa-rosetta-cc/dump.js" }]
      }
    ]
  }
}
EOF
python3 -c 'import json; json.load(open("/tmp/qa-rosetta-cc/.claude/settings.json")); print("JSON valid")'
```

### Step 3: Trigger live Write in NEW Claude Code session

Open a new terminal:
```bash
cd /tmp/qa-rosetta-cc
claude  # or: claude --dangerously-skip-permissions
```

Inside that session, ask:
```
Write the text "hello qa\n" to /tmp/qa-rosetta-cc/test.txt
```

### Step 4: Verify hook fired

```bash
ls -la /tmp/hook-stdin-cc.json /tmp/hook-stdin-cc.err /tmp/hook-stdin-cc.timeout 2>&1
# Expected: only hook-stdin-cc.json exists
```

### Step 5: Run normalize() on capture

```bash
cd ~/dev/gd/rosetta/hooks && node -e "
const { normalize } = require('./dist/src/adapter.js');
const raw = require('/tmp/hook-stdin-cc.json');
const r = normalize(raw);
console.log(JSON.stringify({ ide: r.ide, event: r.event, toolKind: r.toolKind, file_path: r.file_path }, null, 2));
"
# Expected: ide="claude-code", event="PostToolUse", toolKind="write"
```

### Step 6: Sanitize (MANDATORY before commit — M1)

```bash
jq '
  .session_id = "[REDACTED]" |
  .tool_use_id = "[REDACTED]" |
  .transcript_path = "[REDACTED]" |
  .cwd = "$HOME/[REDACTED]" |
  if .tool_input.content then .tool_input.content = (.tool_input.content[0:200] + "…[truncated]") else . end |
  if .tool_response then .tool_response = "[truncated]" else . end
' /tmp/hook-stdin-cc.json > /tmp/hook-stdin-cc-sanitized.json

grep -E "(session_id.*\"[^\"REDACTED]{5}|/Users/[a-zA-Z]+/|[A-Z0-9]{40,})" /tmp/hook-stdin-cc-sanitized.json \
  && echo "FAIL: secrets remain" || echo "PASS: sanitized"
```

### Step 7: Write evidence markdown

Create `docs/qa/2026-05-19-adapter-evidence/e2e-claude-code.md`:

```markdown
# Live E2E Evidence — Claude Code

## Raw stdin (sanitized)
```json
<paste content of /tmp/hook-stdin-cc-sanitized.json>
```

## normalize() output
```json
<paste output of Step 5>
```

## Result: PASS
- IDE detected: claude-code
- Event: PostToolUse
- toolKind: write
```

### Step 8: Update matrix

```bash
sed -i '' 's/Task4: claude-code (actual: pending).*/Task4: claude-code (actual: claude-code) | status: PASS/' \
  docs/qa/2026-05-19-adapter-evidence/e2e-ide-matrix.txt
```

---

## Task 5: Live E2E — Cursor

Same pattern. Key differences:

**dump.js:** используй `src/hooks/tests/fixtures/dump-stdin.js` (вариант A) или создай per-IDE файл (вариант B):

**Hook config** (`.cursor/hooks.json` — lowercase event, flat structure, no nested hooks array):
```bash
mkdir -p /tmp/qa-rosetta-cursor/.cursor/hooks
cat > /tmp/qa-rosetta-cursor/.cursor/hooks/dump.js << 'EOF'
const fs = require('fs');
const OUT = '/tmp/hook-stdin-cursor.json';
const timer = setTimeout(() => { fs.writeFileSync('/tmp/hook-stdin-cursor.timeout', 'no data in 30s'); process.exit(0); }, 30000);
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { data += c; });
process.stdin.on('end', () => { clearTimeout(timer); fs.writeFileSync(OUT, data); });
process.stdin.on('error', e => { clearTimeout(timer); fs.writeFileSync('/tmp/hook-stdin-cursor.err', e.message); });
EOF

cat > /tmp/qa-rosetta-cursor/.cursor/hooks.json << 'EOF'
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      { "matcher": "Write", "command": "node /tmp/qa-rosetta-cursor/.cursor/hooks/dump.js" }
    ]
  }
}
EOF
python3 -c 'import json; json.load(open("/tmp/qa-rosetta-cursor/.cursor/hooks.json")); print("JSON valid")'
```

Open Cursor → File > Open Folder → `/tmp/qa-rosetta-cursor/`
Ask: `Write the text "hello qa\n" to /tmp/qa-rosetta-cursor/test.txt`

Evidence file: `docs/qa/2026-05-19-adapter-evidence/e2e-cursor.md`

> **Fallback:** If Cursor unavailable → use Codex. Name evidence `e2e-cursor-fallback-codex.md`.
> Update matrix: `sed -i '' 's/Task5: cursor (actual: pending).*/Task5: cursor (actual: codex) | status: PASS/' ...`

---

## Task 6: Live E2E — Codex

**MUTUAL-EXCLUSION GATE first:**
```bash
grep "Task5.*codex" docs/qa/2026-05-19-adapter-evidence/e2e-ide-matrix.txt \
  && echo "BLOCKED: Task 5 already used Codex. Task 6 cannot also fall back to Copilot. Escalate."
```

**dump.js:** используй `src/hooks/tests/fixtures/dump-stdin.js` (вариант A) или создай per-IDE файл (вариант B):

**Hook config** (PascalCase, same as Claude Code, but nested under `.codex/`):
```bash
mkdir -p /tmp/qa-rosetta-codex/.codex/hooks
cat > /tmp/qa-rosetta-codex/.codex/hooks/dump.js << 'EOF'
const fs = require('fs');
const OUT = '/tmp/hook-stdin-codex.json';
const timer = setTimeout(() => { fs.writeFileSync('/tmp/hook-stdin-codex.timeout', 'no data in 30s'); process.exit(0); }, 30000);
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { data += c; });
process.stdin.on('end', () => { clearTimeout(timer); fs.writeFileSync(OUT, data); });
process.stdin.on('error', e => { clearTimeout(timer); fs.writeFileSync('/tmp/hook-stdin-codex.err', e.message); });
EOF

cat > /tmp/qa-rosetta-codex/.codex/hooks.json << 'EOF'
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|apply_patch|functions.apply_patch",
        "hooks": [{ "type": "command", "command": "node /tmp/qa-rosetta-codex/.codex/hooks/dump.js" }]
      }
    ]
  }
}
EOF
python3 -c 'import json; json.load(open("/tmp/qa-rosetta-codex/.codex/hooks.json")); print("JSON valid")'
```

Evidence file: `docs/qa/2026-05-19-adapter-evidence/e2e-codex.md`

---

## Task 7: Live E2E — Copilot

**MUTUAL-EXCLUSION GATE first:**
```bash
grep -c "copilot" docs/qa/2026-05-19-adapter-evidence/e2e-ide-matrix.txt
# If >= 2: STOP. File coverage-gap issue.
```

**dump.js:** используй `src/hooks/tests/fixtures/dump-stdin.js` (вариант A) или создай per-IDE файл (вариант B):

**Hook config** (`.github/plugin/hooks.json` — paired bash/powershell):
> **Important:** In `plugins/core-copilot/` there are 3 different hooks.json files. Use `.github/plugin/hooks.json` — that is the production path.

```bash
mkdir -p /tmp/qa-rosetta-copilot/.github/plugin
cat > /tmp/qa-rosetta-copilot/dump.js << 'EOF'
const fs = require('fs');
const OUT = '/tmp/hook-stdin-copilot.json';
const timer = setTimeout(() => { fs.writeFileSync('/tmp/hook-stdin-copilot.timeout', 'no data in 30s'); process.exit(0); }, 30000);
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { data += c; });
process.stdin.on('end', () => { clearTimeout(timer); fs.writeFileSync(OUT, data); });
process.stdin.on('error', e => { clearTimeout(timer); fs.writeFileSync('/tmp/hook-stdin-copilot.err', e.message); });
EOF

cat > /tmp/qa-rosetta-copilot/.github/plugin/hooks.json << 'EOF'
{
  "version": 1,
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|create_file",
        "hooks": [{ "type": "command", "bash": "node /tmp/qa-rosetta-copilot/dump.js", "powershell": "node /tmp/qa-rosetta-copilot/dump.js" }]
      }
    ]
  }
}
EOF
python3 -c 'import json; json.load(open("/tmp/qa-rosetta-copilot/.github/plugin/hooks.json")); print("JSON valid")'
```

Evidence file: `docs/qa/2026-05-19-adapter-evidence/e2e-copilot.md`

---

## Task 7.5: Dedup Verification

Register 2 hooks for the same event in Claude Code workspace, trigger one Write, verify each hook fires exactly once:

```bash
cat > /tmp/qa-rosetta-cc/.claude/settings.json << 'EOF'
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          { "type": "command", "command": "date -u +%s%N >> /tmp/hook-dedup.log && echo hook-1 >> /tmp/hook-dedup.log" },
          { "type": "command", "command": "date -u +%s%N >> /tmp/hook-dedup.log && echo hook-2 >> /tmp/hook-dedup.log" }
        ]
      }
    ]
  }
}
EOF
rm -f /tmp/hook-dedup.log
```

Trigger one Write in Claude Code session, then:
```bash
cat /tmp/hook-dedup.log
echo "Line count: $(wc -l < /tmp/hook-dedup.log)"
# Expected: 4 lines (hook-1: 2 lines, hook-2: 2 lines — each fired exactly once)
```

Evidence file: `docs/qa/2026-05-19-adapter-evidence/e2e-dedup-verification.md`

---

## Commit 2 (after Tasks 4-7.5)

```bash
cd ~/dev/gd/rosetta
git add docs/qa/2026-05-19-adapter-evidence/

# SANITIZATION GATE — must pass before commit:
git diff --staged docs/qa/2026-05-19-adapter-evidence/ \
  | grep -E "(session_id.*\"[^\"]{10}|/Users/[a-zA-Z]+/[a-zA-Z])" \
  && echo "FAIL: secrets found" || echo "PASS: sanitized"

python3 scripts/pre_commit.py
git commit -m "qa(hooks): live E2E captures for claude-code/cursor/codex/copilot; dedup verification"
```

---

## Task 9: Complete the QA Report

The partial report is at `docs/qa/2026-05-19-adapter-normalization-report.md`.
Fill in `[PENDING]` fields with actual results from Tasks 4-7.5.
Update the Overall Verdict based on live results.

---

## Task 10: Update TODO.md + update PR

```bash
cat >> docs/TODO.md << TODOEOF

## TODO: Hooks adapter gaps (from QA 2026-05-19)

- **Gemini CLI hook validation** — https://github.com/griddynamics/rosetta/issues/93
- **Antigravity support docs update** — https://github.com/griddynamics/rosetta/issues/94 — AC: update ARCHITECTURE.md:28-29 and CONTEXT.md:107 within 1 sprint
- **Unknown-tool fallback live test** — https://github.com/griddynamics/rosetta/issues/95
- **Adapter as public consumable module** — https://github.com/griddynamics/rosetta/issues/96
- **OpenCode + JetBrains/Junie validation** — https://github.com/griddynamics/rosetta/issues/97
- **VS Code hook support** — https://github.com/griddynamics/rosetta/issues/98
TODOEOF

grep '\[URL\]' docs/TODO.md && echo "FAIL: placeholders remain" || echo "PASS"
```

Then:
```bash
python3 scripts/pre_commit.py
git commit -m "qa(hooks): QA report + gap-issues appended to TODO.md"
git push origin qa/adapter-validation-2026-05-19
# Then update the PR body with final verdict
```

---

## Hook schema quick reference (IDE differences)

| IDE | Config path | Event case | Structure |
|-----|------------|------------|-----------|
| Claude Code | `.claude/settings.json` | `PostToolUse` (PascalCase) | `hooks: [{type, command}]` nested array |
| Cursor | `.cursor/hooks.json` | `postToolUse` (camelCase) | flat `{matcher, command}` |
| Codex | `.codex/hooks.json` | `PostToolUse` (PascalCase) | `hooks: [{type, command}]` nested array |
| Copilot | `.github/plugin/hooks.json` | `PostToolUse` (PascalCase) | `hooks: [{type, bash, powershell}]` paired |

---

## Gap-issues filed (for reference in report)

| # | Issue | URL |
|---|-------|-----|
| 1 | Gemini CLI not validated | https://github.com/griddynamics/rosetta/issues/93 |
| 2 | Antigravity docs contradiction | https://github.com/griddynamics/rosetta/issues/94 |
| 3 | Unknown-tool fallback not live-tested | https://github.com/griddynamics/rosetta/issues/95 |
| 4 | Adapter not public consumable (OUT-OF-SCOPE) | https://github.com/griddynamics/rosetta/issues/96 |
| 5 | OpenCode + JetBrains/Junie not validated | https://github.com/griddynamics/rosetta/issues/97 |
| 6 | VS Code in CONTEXT.md:107 but no adapter | https://github.com/griddynamics/rosetta/issues/98 |
