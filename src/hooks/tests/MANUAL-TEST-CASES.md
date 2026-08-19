# Manual Test Cases — loose-files.js Hook

> **Purpose:** Verify that `loose-files.js` fires correctly in each IDE, and that the stdin objects
> received at runtime match the shapes in our test fixtures. Run these cases in
> `/Users/akoziar/dev/gd/incarno/robotic-platform-frontend/` (INCARNO project).
>
> **Antigravity:** Hooks ARE supported — one combined adapter for all three surfaces
> (Antigravity 2.0 / CLI / IDE): `src/hooks/src/adapters/antigravity.ts`, covered by
> `src/hooks/tests/adapter.antigravity.test.ts` and `src/hooks/tests/e2e/antigravity.e2e.test.ts`.
> `loose-files` specifically is NOT bundled for Antigravity — it has no non-blocking delivery
> channel, so advise-only hooks can never reach the model (see `excludeHooks` for
> `core-antigravity` in `src/hooks/scripts/build-bundles.mjs`). So there is nothing to test
> for THIS hook on Antigravity.
>
> **Known stale below (NOT corrected here — see issue #229 report):** the expected-output JSON
> blocks, the Windsurf column of the test matrix, and TC-5 were written against an older revision
> of the hook. Verified current behavior: the nudge text is
> `<file> appears to be a loose file outside a module. Intended? A temporary file? <marker>?`
> (`nudgeMessage` in `src/hooks/src/hooks/loose-files.ts`); the Claude Code envelope carries
> `permissionDecision: "allow"` and no `continue`/`suppressOutput`; and the hook fires only on tool
> kind `write`, so `Edit` no longer nudges.

---

## How to Capture Real stdin (Debug Mode)

Before running test cases, optionally install a debug capture hook alongside the real hook.
Add this to the hook config TEMPORARILY to dump raw stdin to a file:

**Claude Code** — add a second hook in the `Write|Edit` matcher group:
```json
{ "type": "command", "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>require('fs').writeFileSync('/tmp/hook-stdin-cc.json',d))\"" }
```

**Cursor** — add a second entry under `postToolUse`:
```json
{ "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>require('fs').writeFileSync('/tmp/hook-stdin-cursor.json',d))\"" }
```

**Windsurf** — add a second entry under `post_write_code`:
```json
{ "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>require('fs').writeFileSync('/tmp/hook-stdin-windsurf.json',d))\"", "show_output": false }
```

Then compare `/tmp/hook-stdin-*.json` against the fixture objects below.

---

## Fixture Objects (Expected Stdin)

These are the exact shapes our unit tests use. Real IDE output MUST match these field sets.

### Claude Code — PostToolUse Write

**Fixture:** `src/hooks/tests/fixtures/claude-code-post-tool-use-write.json`

```json
{
  "session_id": "<any string>",
  "transcript_path": "<any path>",
  "cwd": "<project root>",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_use_id": "<any string>",
  "tool_input": {
    "file_path": "<absolute path to written file>",
    "content": "<file content>"
  },
  "tool_response": {
    "type": "create",
    "filePath": "<absolute path>",
    "content": "<file content>",
    "structuredPatch": [],
    "originalFile": null
  }
}
```

**Key fields to verify:**
- `hook_event_name` = `"PostToolUse"` (PascalCase)
- `tool_name` = `"Write"`
- `tool_input.file_path` = absolute path to file
- `session_id` present

---

### Claude Code — PostToolUse Edit

**Fixture:** `src/hooks/tests/fixtures/claude-code-post-tool-use-edit.json`

```json
{
  "session_id": "<any string>",
  "transcript_path": "<any path>",
  "cwd": "<project root>",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "tool_name": "Edit",
  "tool_use_id": "<any string>",
  "tool_input": {
    "file_path": "<absolute path to edited file>",
    "old_string": "<replaced text>",
    "new_string": "<replacement text>"
  },
  "tool_response": {
    "filePath": "<absolute path>"
  }
}
```

**Key fields to verify:**
- `hook_event_name` = `"PostToolUse"` (PascalCase)
- `tool_name` = `"Edit"`
- `tool_input.file_path` present (no `content` field for Edit)

---

### Cursor — PostToolUse Write

**Fixture:** `src/hooks/tests/fixtures/cursor-post-tool-use-write.json`

```json
{
  "hook_event_name": "postToolUse",
  "conversation_id": "<any string>",
  "generation_id": "<any string>",
  "cursor_version": "<version like 2.4.0>",
  "model": "<model name>",
  "workspace_roots": ["<project root>"],
  "user_email": null,
  "transcript_path": null,
  "tool_name": "Write",
  "tool_input": {
    "file_path": "<absolute path>",
    "content": "<file content>"
  },
  "tool_output": "<JSON string with filePath>",
  "tool_use_id": "<any string>",
  "cwd": "<project root>",
  "duration": <number>
}
```

**Key fields to verify:**
- `hook_event_name` = `"postToolUse"` (camelCase — differs from Claude Code!)
- `conversation_id` present (NOT `session_id`)
- `cursor_version` present
- `tool_name` = `"Write"` (same casing as Claude Code)
- `tool_input.file_path` present

**After adapter normalization (`normalize(raw)`):**
```json
{
  "hook_event_name": "PostToolUse",
  "session_id": "<conversation_id value>",
  "tool_name": "Write",
  "tool_input": { "file_path": "<path>", "content": "<content>" }
}
```

---

### Windsurf — post_write_code

**Fixture:** `src/hooks/tests/fixtures/windsurf-post-tool-use-write.json`

```json
{
  "agent_action_name": "post_write_code",
  "trajectory_id": "<any string>",
  "execution_id": "<any string>",
  "timestamp": "<ISO 8601>",
  "model_name": "<model name>",
  "tool_info": {
    "file_path": "<absolute path>",
    "edits": [
      { "old_string": "", "new_string": "<file content>" }
    ]
  }
}
```

**Key fields to verify:**
- `agent_action_name` = `"post_write_code"` (NO `hook_event_name` at top level)
- `trajectory_id` present (NOT `session_id`)
- All data nested inside `tool_info`

**After adapter normalization (`normalize(raw)`):**
```json
{
  "hook_event_name": "PostToolUse",
  "session_id": "<trajectory_id value>",
  "tool_name": "Write",
  "tool_input": { "file_path": "<path from tool_info.file_path>" }
}
```

---

## Expected Output Objects

### Nudge Output (when file IS loose) — hook stdout

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "<filename> appears to be a loose file outside a module. Consider adding __init__.py to its directory tree to make it part of a proper module."
  },
  "continue": true,
  "suppressOutput": false
}
```

For `.js` files:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "<filename> appears to be a loose file outside a module. Consider adding package.json to its directory tree to make it part of a proper module."
  },
  "continue": true,
  "suppressOutput": false
}
```

### No Output (when file is NOT loose or is excluded)

Hook exits with code `0` and writes nothing to stdout.

---

## IDE-Specific Output Format (after formatOutput)

### Claude Code — identity pass-through (same as canonical)
```json
{
  "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": "..." },
  "continue": true,
  "suppressOutput": false
}
```

### Cursor — mapped format
```json
{
  "additional_context": "... appears to be a loose file ..."
}
```
(Note: `additional_context` snake_case, no `continue` or `suppressOutput`)

### Windsurf — additionalContext preserved
```json
{
  "additionalContext": "... appears to be a loose file ..."
}
```
(Note: camelCase, no `continue`)

---

## Test Matrix

| TC | Action in IDE | File Path | Module Marker | Claude Code | Cursor | Windsurf |
|----|--------------|-----------|---------------|-------------|--------|----------|
| 1 | Write `.py` | `src/orphan.py` | None | NUDGE | NUDGE | NUDGE |
| 2 | Write `.py` | `src/mypkg/utils.py` | `src/mypkg/__init__.py` exists | no output | no output | no output |
| 3 | Write `.js` | `src/helper.js` | None | NUDGE | NUDGE | NUDGE |
| 4 | Write `.js` | `src/myapp/app.js` | `src/myapp/package.json` exists | no output | no output | no output |
| 5 | Edit `.py` | `src/orphan.py` | None | NUDGE | NUDGE | n/a* |
| 6 | Run Bash | — | — | no output | no output | n/a† |
| 7 | Write `.ts` | `src/types.ts` | — | no output | no output | no output |
| 8 | Write `.py` | `node_modules/foo/bar.py` | — | no output | no output | no output |
| 9 | Write `.py` | `scripts/setup.py` | — | no output | no output | no output |

> *Windsurf TC-5: Windsurf only has `post_write_code`, which maps to Write. Edit actions send a
> different event that `loose-files.js` filters out after normalization — so no nudge is expected.
>
> †Windsurf TC-6: Not applicable — Windsurf `post_run_command` maps to `Bash`, but we don't
> register that hook event, so the hook never runs.

---

## Test Cases — Step-by-Step Instructions

### TC-1: Loose Python file → NUDGE

**Setup:** Make sure `src/orphan.py` does NOT have `__init__.py` anywhere in its directory tree.

**Action:** Ask the AI to create `src/orphan.py` with any content.

**Expected stdin to hook** (Claude Code):
```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": { "file_path": "/Users/akoziar/dev/gd/incarno/robotic-platform-frontend/src/orphan.py", "content": "..." }
}
```

**Expected hook stdout:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "orphan.py appears to be a loose file outside a module. Consider adding __init__.py to its directory tree to make it part of a proper module."
  },
  "continue": true,
  "suppressOutput": false
}
```

**IDE tells AI:** A context message with the nudge text appears in the conversation.

**Pass if:** AI receives nudge and optionally suggests creating `__init__.py`.
**Fail if:** No nudge appears, or hook exits non-zero.

---

### TC-2: Python file inside module → No nudge

**Setup:** Ensure `src/mypackage/__init__.py` exists.

**Action:** Ask the AI to create `src/mypackage/utils.py`.

**Expected:** Hook runs, `isLooseFile` returns `false` (finds `__init__.py`), hook writes nothing to stdout, exits 0.

**Pass if:** No nudge message in AI conversation.
**Fail if:** Spurious nudge appears.

---

### TC-3: Loose JavaScript file → NUDGE

**Setup:** Make sure `src/helper.js` is NOT under any directory with `package.json`.
(Note: INCARNO root has `package.json` — so use a path several levels deeper if the root's `package.json` would be found. Use a temp dir outside the project, or test with a path that has no `package.json` up the tree.)

**Action:** Ask the AI to create a `.js` file where no `package.json` exists in the tree.

**Expected hook stdout:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "helper.js appears to be a loose file outside a module. Consider adding package.json to its directory tree to make it part of a proper module."
  },
  "continue": true,
  "suppressOutput": false
}
```

**Pass if:** Nudge mentions `package.json`.

> **Note:** In INCARNO (which has a root `package.json`), any `.js` file in the project will NOT
> be loose because the root `package.json` is found during the upward walk. To trigger TC-3,
> test with a path outside the INCARNO root, e.g. `/tmp/test-loose/helper.js` — manually pipe
> a fixture to the hook script (see "Manual pipe test" below).

---

### TC-4: JS file inside module → No nudge

**Action:** Ask the AI to create `src/components/Button.js` (INCARNO has root `package.json`).

**Expected:** No nudge (root `package.json` found during walk).

**Pass if:** No nudge.

---

### TC-5: Edit a loose `.py` file → NUDGE (Claude Code and Cursor only)

**Action:** Ask the AI to edit an existing `src/orphan.py` (no `__init__.py` in tree).

**Expected stdin tool_name:** `"Edit"` (not `"Write"`).

**Pass if:** Nudge appears (Edit tool is in `ALLOWED_TOOLS`).

---

### TC-6: Bash command → No hook output

**Action:** Ask the AI to run `ls -la`.

**Expected:** Hook is registered only for `Write|Edit`, so it does NOT fire for Bash.

**Pass if:** No nudge appears.

---

### TC-7: TypeScript file → No nudge

**Action:** Ask the AI to create `src/types.ts`.

**Expected:** `shouldCheck` returns `false` (`.ts` not in `ALLOWED_EXTENSIONS`).

**Pass if:** No nudge.

---

### TC-8: File in `node_modules/` → No nudge

**Action:** Manually pipe fixture to test this (AI won't normally write to node_modules):
```bash
echo '{"hook_event_name":"PostToolUse","tool_name":"Write","session_id":"s1","tool_input":{"file_path":"/tmp/node_modules/foo/bar.py","content":"pass"}}' \
  | node src/hooks/dist/bundles/core-claude/loose-files.js
```

**Expected:** No output (exit 0, empty stdout).

---

### TC-9: File in `scripts/` → No nudge

```bash
echo '{"hook_event_name":"PostToolUse","tool_name":"Write","session_id":"s1","tool_input":{"file_path":"/tmp/scripts/setup.py","content":"pass"}}' \
  | node src/hooks/dist/bundles/core-claude/loose-files.js
```

**Expected:** No output (exit 0, empty stdout).

---

## Manual Pipe Tests (No IDE Needed)

These allow verifying the hook logic without opening an IDE. Run from the Rosetta repo root.

The hook bundles are BUILT, not committed (`src/hooks/dist/` is gitignored), and each bundle
embeds only one IDE adapter. Build them first, then invoke the bundle for the IDE whose stdin
shape you are piping:

```bash
npm --prefix src/hooks run build
```

### Trigger nudge (loose Python)
```bash
echo '{"hook_event_name":"PostToolUse","tool_name":"Write","session_id":"s1","tool_input":{"file_path":"/tmp/orphan.py","content":"pass"}}' \
  | node src/hooks/dist/bundles/core-claude/loose-files.js
```
Expected output:
```json
{"hookSpecificOutput":{"hookEventName":"PostToolUse","permissionDecision":"allow","additionalContext":"orphan.py appears to be a loose file outside a module. Intended? A temporary file? __init__.py?"}}
```

### No nudge (file in module)
```bash
mkdir -p /tmp/mypkg && touch /tmp/mypkg/__init__.py
echo '{"hook_event_name":"PostToolUse","tool_name":"Write","session_id":"s1","tool_input":{"file_path":"/tmp/mypkg/utils.py","content":"pass"}}' \
  | node src/hooks/dist/bundles/core-claude/loose-files.js
```
Expected: no output, exit 0.

### Test with Cursor fixture shape
```bash
cat src/hooks/tests/fixtures/cursor-post-tool-use-write.json \
  | node src/hooks/dist/bundles/core-cursor/loose-files.js
```
Expected: nudge for `app.js` at `/proj/src/app.js` (no `package.json` at `/proj/src/`), in Cursor's
output format:
```json
{"additional_context":"app.js appears to be a loose file outside a module. Intended? A temporary file? package.json?","permission":"allow"}
```

### Test with Windsurf fixture shape
```bash
cat src/hooks/tests/fixtures/windsurf-post-tool-use-write.json \
  | node src/hooks/dist/bundles/core-windsurf/loose-files.js
```
Expected: no output, exit 0. Windsurf's `post_write_code` carries an `edits[]` array, so the adapter
normalizes it to `MultiEdit` (tool kind `multi-edit`), while `loose-files` only fires on tool kind
`write` — see `TOOL_KINDS` in `src/hooks/src/runtime/ide-rows/windsurf.ts` and `on.toolKinds` in
`src/hooks/src/hooks/loose-files.ts`. The Windsurf expectations elsewhere in this document predate
that mapping and are stale.

---

## Fixture Object Cross-Check

Before running IDE tests, verify unit tests pass to confirm fixture objects match hook logic:

```bash
cd /Users/akoziar/dev/gd/rosetta

# Adapter tests (all 6 IDEs detected correctly) + loose-files logic tests.
# The suite is vitest; `npm test` builds the bundles first (see src/hooks/package.json).
npm --prefix src/hooks test -- tests/adapter.test.ts tests/loose-files.test.ts

# Antigravity adapter coverage
npm --prefix src/hooks test -- tests/adapter.antigravity.test.ts tests/e2e/antigravity.e2e.test.ts
```

All tests must be green before proceeding to manual IDE tests.

---

## Results Checklist

| Test | Claude Code | Cursor | Windsurf | Notes |
|------|-------------|--------|----------|-------|
| TC-1 Loose .py Write | [ ] | [ ] | [ ] | |
| TC-2 .py in module (no nudge) | [ ] | [ ] | [ ] | |
| TC-3 Loose .js Write | [ ] | [ ] | [ ] | Use manual pipe if INCARNO root has package.json |
| TC-4 .js in module (no nudge) | [ ] | [ ] | [ ] | |
| TC-5 Edit loose .py | [ ] | [ ] | n/a | |
| TC-6 Bash (no nudge) | [ ] | [ ] | n/a | |
| TC-7 .ts file (no nudge) | [ ] | [ ] | [ ] | |
| TC-8 node_modules/ (no nudge) | manual pipe | manual pipe | manual pipe | |
| TC-9 scripts/ (no nudge) | manual pipe | manual pipe | manual pipe | |

**Stdin shape verified against fixtures:**
- [ ] Claude Code stdin matches `claude-code-post-tool-use-write.json`
- [ ] Cursor stdin matches `cursor-post-tool-use-write.json` (camelCase `postToolUse`, `conversation_id`)
- [ ] Windsurf stdin matches `windsurf-post-tool-use-write.json` (`agent_action_name`, `tool_info`)
