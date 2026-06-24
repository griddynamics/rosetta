# Curiocity MVP — Claude Code Build Guide

> 🛑 **CORRECTION — THIS GUIDE'S RECOMMENDATION IS WRONG AND SUPERSEDED.**
> This was researched under a mistaken premise: it recommends **headless `-p` mode**, which **violates Curiocity's Core Principle** (see [`idea.md`](./idea.md)). **We do NOT use headless mode.** Curiocity must drive Claude Code's **real interactive TUI via a PTY**, because *we want the agent to ask* (permissions, clarifying questions, HITL gates) and answer it as a human would (per `qna.md`) — that interactive/HITL behavior is the **thing under test**. Headless auto-approves/bypasses those prompts and would make HITL untestable.
>
> **What is still useful here:** the launch flags that *also* apply when starting the interactive TUI — `--model`, `--mcp-config` / `--strict-mcp-config`, `--plugin-dir` / `--plugin-url`, `--add-dir`, `--settings`, env vars — plus the on-disk artifacts. **What is REJECTED:** `-p` / `--print` / `--output-format stream-json` as the *execution mode*, and any permission setting that auto-approves silently (`bypassPermissions`, blanket allowlists) — we want prompts to FIRE so we can answer them.
>
> **Trajectory in interactive mode:** capture from Claude Code's on-disk **session transcript** (`.jsonl`, path TBD) and/or the rendered screen — NOT the headless print stream. ⚠️ To be re-researched/verified in the spike.
>
> **Provenance:** `claude-code-guide` subagent on Sonnet 4.6 (2026-06-19). Sections below are kept for the still-useful flags/JSON shapes; **read them through the correction above.** A corrected interactive-driving guide is pending.

---

## 1. Headless / Non-Interactive Invocation

### Flags

| Flag | Purpose |
|---|---|
| `-p` / `--print` | Headless mode. Exits after one task. Required for all CI use. |
| `--output-format stream-json` | NDJSON stream of typed events (use this for trajectory capture) |
| `--output-format json` | Single JSON blob at exit (lighter, no streaming, but `total_cost_usd` still present) |
| `--output-format text` | Plain text; no metadata |
| `--input-format text` | Default. Prompt comes from CLI arg or piped stdin |
| `--input-format stream-json` | Accept NDJSON turns on stdin for multi-turn driving |
| `--verbose` | Emit `assistant` / `user` / tool events into stream-json (required for trajectory) |
| `--include-partial-messages` | Emit token-level deltas (for TTFT measurement; not needed for judging) |
| `--model <alias-or-id>` | `opus`, `sonnet`, `haiku`, `fable`, or full ID like `claude-opus-4-8` |
| `--session-id <uuid>` | Inject a deterministic session UUID you control |
| `--continue` / `-c` | Resume most-recent session in cwd |
| `--resume <id-or-name>` | Resume specific session by UUID or name |
| `--fork-session` | Resume but mint a new session ID (use with `--resume`) |
| `--max-turns <n>` | Hard cap on agentic turns (print mode only). Exits `error_max_turns` on breach. |
| `--max-budget-usd <n>` | Hard cost cap. Exits `error_max_budget_usd` on breach. |
| `--bare` | Skip auto-discovery of hooks, plugins, MCP, CLAUDE.md, auto-memory. Fastest for isolated CI. |
| `--no-session-persistence` | Don't write session to disk (useful for ephemeral workers). |

### Does headless need a PTY?

**No.** `-p` mode is pure stdin/stdout. The workspace-trust dialog is skipped automatically when stdout is not a TTY or when `-p` is used. No PTY, no screen-reading, no node-pty required.

### Full sample command (MVP canonical)

```bash
ANTHROPIC_API_KEY="sk-ant-..." \
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
claude \
  --bare \
  -p "Implement the feature described in TASK.md" \
  --output-format stream-json \
  --verbose \
  --model opus \
  --permission-mode bypassPermissions \
  --max-turns 50 \
  --max-budget-usd 2.00 \
  --session-id "$(uuidgen)" \
  --mcp-config /workspace/.curion/mcp.json \
  --strict-mcp-config \
  --plugin-dir /workspace/.curion/plugins/rosetta \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep" \
  --no-session-persistence \
  2>/dev/null
```

Redirect stderr separately; `--output-format stream-json` goes to stdout only.

### Session continuation in multi-turn eval harness

```bash
# Turn 1 — capture session id from result event
SESSION=$(claude --bare -p "Turn 1 prompt" \
  --output-format json --model sonnet | jq -r '.session_id')

# Turn 2 — inject follow-up (same session, new turn)
claude --bare -p "Turn 2 follow-up" \
  --resume "$SESSION" \
  --output-format json
```

**Gotchas / version caveats:**
- `--bare` is currently opt-in but will become the default for `-p` in a future release (docs warn of this). Use it explicitly.
- `--no-session-persistence` requires v2.1.x; omit on older builds.
- Piped stdin is capped at 10MB as of v2.1.128. Larger payloads must be written to a file.
- `--session-id` lets you assign a UUID you chose, making trajectory storage deterministic.

---

## 2. Trajectory JSON — stream-json Event Schema

### How to capture

```bash
claude --bare -p "..." --output-format stream-json --verbose > trajectory.ndjson
```

Each line is a self-contained JSON object (NDJSON / newline-delimited JSON).

### Top-level event types

| `type` | When emitted | Key purpose |
|---|---|---|
| `system` | First event; also on retry/plugin-install | Session init metadata |
| `user` | Each user turn (including injected tool results) | Input record |
| `assistant` | Each model response | Tool calls + text |
| `result` | Last event before process exit | Final answer + cost + usage |

### `system` event (subtype `"init"`) — first event in stream

```json
{
  "type": "system",
  "subtype": "init",
  "uuid": "e3b0c442-...",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Claude Code session initialized",
  "output_style": "default",
  "available_output_styles": ["default", "concise"],
  "tools": ["Bash", "Read", "Edit", "Write"],
  "plugins": [{ "name": "rosetta", "path": "/workspace/.curion/plugins/rosetta" }],
  "plugin_errors": []
}
```

`plugin_errors` is non-empty when a plugin failed to load — use this to fail CI fast.

### `assistant` event — tool calls live here

```json
{
  "type": "assistant",
  "uuid": "...",
  "session_id": "550e8400-...",
  "parent_tool_use_id": null,
  "message": {
    "id": "msg_01XYZ",
    "type": "message",
    "role": "assistant",
    "content": [
      { "type": "text", "text": "I'll read the file first." },
      {
        "type": "tool_use",
        "id": "toolu_01ABC",
        "name": "Read",
        "input": { "file_path": "/workspace/src/auth.ts" }
      }
    ],
    "model": "claude-opus-4-8-20250514",
    "stop_reason": "tool_use",
    "usage": { "input_tokens": 512, "output_tokens": 64 }
  }
}
```

File edits: use the `Edit` or `Write` tool_use blocks. `input.file_path`, `input.old_string`, `input.new_string` (Edit) or `input.file_path`, `input.content` (Write).

### `user` event — tool results

```json
{
  "type": "user",
  "uuid": "...",
  "session_id": "550e8400-...",
  "parent_tool_use_id": null,
  "message": {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_01ABC",
        "content": "export function login(..."
      }
    ]
  }
}
```

### `result` event (final, authoritative)

```json
{
  "type": "result",
  "subtype": "success",
  "uuid": "...",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_error": false,
  "num_turns": 7,
  "duration_ms": 34210,
  "duration_api_ms": 29800,
  "stop_reason": "end_turn",
  "result": "I've implemented the login feature in src/auth.ts...",
  "total_cost_usd": 0.01842,
  "usage": {
    "input_tokens": 18400,
    "output_tokens": 2100,
    "cache_read_input_tokens": 12000,
    "cache_creation_input_tokens": 3200
  },
  "modelUsage": {
    "claude-opus-4-8-20250514": {
      "input_tokens": 18400,
      "output_tokens": 2100
    }
  },
  "permission_denials": [],
  "terminal_reason": "end_turn",
  "ttft_ms": 380
}
```

### Error subtypes on `result`

| `subtype` | Meaning |
|---|---|
| `success` | Clean completion |
| `error_max_turns` | `--max-turns` hit |
| `error_max_budget_usd` | `--max-budget-usd` hit |
| `error_during_execution` | Runtime error |
| `error_max_structured_output_retries` | JSON schema validation failed repeatedly |

Error variants omit `result` string and `structured_output` but still include `total_cost_usd`, `usage`, `num_turns`, `duration_ms`.

### stream-json with partial messages (token streaming)

Add `--include-partial-messages` to get `stream_event` lines between assistant events. **For Curiocity judging**, only the non-partial `assistant` events and the final `result` event are needed; partial messages are optional (useful only for TTFT measurement).

**Gotchas:**
- `--verbose` is required to get `assistant`/`user` events in stream-json. Without it you only get the `result` event.
- `total_cost_usd` is a client-side estimate; use `usage` token counts for authoritative billing.
- `subagent` events from child agents include a non-null `parent_tool_use_id` — use this to reconstruct the subagent tree.

---

## 3. Interactive Permission Prompts — Critical for CI

### The problem

In headless `-p` mode, if Claude attempts a tool call that requires a permission prompt and none of the mechanisms below pre-approve it, the run aborts (in auto mode with repeated classifier blocks) or stalls/aborts (default mode). You must pick a strategy.

### Permission mode strategies

Set via `--permission-mode <mode>` or `permissions.defaultMode` in settings.

| Mode | What auto-approves | CI safety | When to use |
|---|---|---|---|
| `default` | Reads only | Blocks on writes/bash | Never (will stall) |
| `acceptEdits` | Reads + file edits + `mkdir/touch/mv/cp/rm/sed` | Moderate | Light tasks (read+edit only) |
| `dontAsk` | Only tools in `permissions.allow` rules | High | Locked-down CI with explicit allowlist |
| `auto` | Everything via AI classifier | Low-moderate | Requires Opus 4.6+ and subscription |
| `bypassPermissions` | Everything (no prompts, no checks) | Low (use in containers) | Isolated sandboxes only |

### Recommended CI approach — Option A: `dontAsk` + explicit allowlist (safest)

In a settings file (via `--settings`):
```json
{
  "permissions": {
    "defaultMode": "dontAsk",
    "allow": [
      "Bash(npm *)", "Bash(npx *)", "Bash(git *)", "Bash(python *)",
      "Bash(pytest *)", "Bash(ls *)", "Bash(cat *)", "Bash(find *)",
      "Read", "Write", "Edit", "Glob", "Grep"
    ]
  }
}
```

```bash
claude --bare -p "..." \
  --permission-mode dontAsk \
  --settings /workspace/.curion/settings.json \
  --output-format stream-json --verbose
```

Any tool call not in the allowlist is **auto-denied** (no blocking prompt). The `result` event has `permission_denials` entries to inspect post-run.

### Option B: `bypassPermissions` (sandboxed containers)

```bash
claude --bare -p "..." --dangerously-skip-permissions \
  --output-format stream-json --verbose
```

Equivalent to `--permission-mode bypassPermissions`. Skips all checks. Use only when the container has no internet/host access that matters. **Refuses to run as root/sudo** — run as a non-root user.

### Option C: `--allowedTools` per-invocation

```bash
claude --bare -p "..." --permission-mode default \
  --allowedTools "Bash(git log *)" "Bash(git diff *)" "Read" "Edit" \
  --output-format stream-json --verbose
```

Trailing ` *` enables prefix matching (the space before `*` is significant).

### Option D: `--permission-prompt-tool` (custom approval via MCP)

```bash
claude --bare -p "..." \
  --permission-prompt-tool mcp__my_approval_server__approve_tool \
  --output-format stream-json --verbose
```

Routes permission prompts to an MCP tool you control — the SDK-integrated way to implement allow/deny logic without blocking. **This is the closest analogue to Curiocity's `qna.md` guard for Claude Code.**

### Does headless mode ever block on a TTY prompt?

**No** — in `-p` mode with any of `dontAsk`, `bypassPermissions`, or `allowedTools` covering expected tool calls. In `default` mode without pre-approvals, Claude emits a permission request that — with no TTY — aborts rather than hanging.

**Gotchas:**
- `auto` mode requires v2.1.83+, Opus 4.6+/Sonnet 4.6+, and must live in `~/.claude/settings.json` (ignored in project/local settings).
- Protected paths (`.git`, `.claude`, rc files) are still prompted in all modes except `bypassPermissions` (v2.1.126+).
- `--dangerously-skip-permissions` refuses to start as root.

---

## 4. MCP Server Provisioning

### Preferred for CI: `--mcp-config <path>` + `--strict-mcp-config`

```bash
claude --bare -p "..." \
  --mcp-config /workspace/.curion/mcp.json \
  --strict-mcp-config \
  --output-format stream-json --verbose
```

`--strict-mcp-config` ignores ALL other MCP sources — only the file you pass is used. Essential for reproducible CI. Inline JSON also works (`--mcp-config '{"mcpServers":{...}}'`).

### `.mcp.json` format

```json
{
  "mcpServers": {
    "my-stdio-server": {
      "command": "/usr/local/bin/my-server",
      "args": ["--config", "${CLAUDE_PROJECT_DIR}/config.json"],
      "env": { "DB_URL": "${DB_URL}", "LOG_LEVEL": "info" },
      "timeout": 300000
    },
    "my-http-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": { "Authorization": "Bearer ${API_TOKEN}" },
      "timeout": 60000
    },
    "my-sse-server": { "type": "sse", "url": "https://events.example.com/sse" }
  }
}
```

- `type` defaults to `stdio`. `http` (alias `streamable-http`), `sse`, `ws` supported.
- Env var syntax: `${VAR}` (required) or `${VAR:-default}` — expands in `command`, `args`, `env`, `url`, `headers`.
- `timeout`: per-tool-call ms; values < 1000 ignored.
- MCP tool names: `mcp__<server>__<tool>`. Pre-approve with `"allow": ["mcp__my-server__*"]`.

**Gotchas:** `MCP_TIMEOUT` env sets startup timeout; `MAX_MCP_OUTPUT_TOKENS` raises the 10K output cap; the server name `workspace` is reserved. In headless `-p` + `--mcp-config` + `--strict-mcp-config`, no interactive approval is required (config is trusted because explicitly passed).

---

## 5. Plugin Provisioning (install the Rosetta plugin before the run)

### Plugin structure (brief)

```
my-plugin/
├── .claude-plugin/plugin.json   # manifest
├── skills/<skill>/SKILL.md
├── agents/<agent>.md
├── hooks/hooks.json
├── .mcp.json                    # plugin-bundled MCP servers
└── settings.json
```

Skills namespaced as `/rosetta:<skill>`; plugin MCP tools named `mcp__plugin_<plugin>_<serverkey>__<tool>`.

### CI-friendly load (no install, no interactive steps) — RECOMMENDED

**`--plugin-dir <path>` — load from local dir (or `.zip`, v2.1.128+):**
```bash
claude --bare -p "..." --plugin-dir /workspace/.curion/plugins/rosetta \
  --output-format stream-json --verbose
```

**`--plugin-url <url>` — fetch a zip:**
```bash
claude --bare -p "..." --plugin-url "https://artifacts.internal/rosetta-v1.2.3.zip" ...
```

Repeat the flag for multiple plugins. Both load the plugin **for that session only** — no marketplace, no persistent install, no prompts. This is the recommended Curiocity approach.

### Verify the plugin loaded (fail fast)

```bash
claude --bare -p "..." --plugin-dir ./rosetta --output-format stream-json --verbose | \
  tee trajectory.ndjson | \
  jq -e 'select(.type=="system" and .subtype=="init") |
         if (.plugin_errors|length) > 0 then error("Plugin load failed: \(.plugin_errors)") else . end' || exit 1
```

### Persistent install (for a CI base image — interactive once)

```bash
claude plugin marketplace add file:///path/to/rosetta-marketplace.json
claude plugin install rosetta@my-marketplace --scope user
```

Then enable via settings `"enabledPlugins": { "rosetta@my-marketplace": true }` (pass with `--settings`). Note: with `--bare`, installed plugins are skipped — you must pass `--plugin-dir` explicitly. `CLAUDE_CODE_SYNC_PLUGIN_INSTALL=1` installs marketplace plugins synchronously before the first turn (experimental — prefer `--plugin-dir`).

**Gotchas:** `--plugin-url` fails silently if the archive is bad/unreachable (check `plugin_errors`). Plugin MCP servers auto-connect at session start — pre-approve their tools via `--allowedTools "mcp__plugin_rosetta_*"` or a `permissions.allow` rule.

---

## 6. Readiness & Completion Detection

- **Primary signal:** the `result` event is always the last NDJSON line on stdout; the process exits after it.
- **Exit codes:** `0` = success; `1` = error (execution error, max-turns, max-budget, plugin failure, auth failure). Always parse the `result` event for `subtype`/cost/turns rather than relying on exit code alone.
- **Error surfacing:** `result.subtype` (`error_during_execution` / `error_max_turns` / `error_max_budget_usd`), `is_error:true`; auth failures exit 1 with **no** `result` event (message on stderr); `system/api_retry` events precede retries; plugin failures populate `plugin_errors` in `system/init`.
- **Background tasks:** after the `result` event, background Bash gets ~5s grace then is killed (v2.1.163+); background subagents get up to 10min (`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`).

```typescript
import { spawn } from 'child_process';
const proc = spawn('claude', ['--bare','-p',prompt,'--output-format','stream-json','--verbose'],
  { cwd: workspaceDir, env: { ...process.env, ANTHROPIC_API_KEY: key } });
proc.on('exit', (code) => { if (code !== 0) handleError(code); });
```

---

## 7. Workspace & Model Control

- **cwd:** invoke from the provisioned workspace (`spawn(..., { cwd })`). `--add-dir <path>` grants extra file access (but does not load that dir's `.claude/` config).
- **Model:** `--model opus|sonnet|haiku|fable` or a full dated ID (use the **full ID for reproducible evals**). `--fallback-model sonnet,haiku`. Env: `ANTHROPIC_MODEL`. Precedence: `--model` > `ANTHROPIC_MODEL` > settings.
- **Bounds:** `--max-turns <n>` and `--max-budget-usd <n>` (no defaults — always set both for evals).
- **Effort:** `--effort low|medium|high|xhigh|max` (model-dependent).
- **Key env vars:** `ANTHROPIC_API_KEY`, `API_TIMEOUT_MS`, `CLAUDE_CODE_CONNECT_TIMEOUT_MS`, `BASH_DEFAULT_TIMEOUT_MS`, `BASH_MAX_TIMEOUT_MS`, `MCP_TIMEOUT`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, `DISABLE_AUTOUPDATER=1`, `MAX_MCP_OUTPUT_TOKENS`.
- **Third-party providers:** `CLAUDE_CODE_USE_BEDROCK` / `_VERTEX` / `_FOUNDRY` (auto mode there needs `CLAUDE_CODE_ENABLE_AUTO_MODE=1` and Opus 4.7+).

---

## 8. MVP Recommendation

**Headless stream-json is sufficient for the Claude Code MVP** — `claude --bare -p "..." --output-format stream-json --verbose` yields the complete trajectory (tool calls, file edits, messages), final answer (`result.result`), cost (`total_cost_usd`), tokens (`usage`), timing (`duration_ms`, `ttft_ms`), plugin-load verification (`system/init.plugin_errors`), and hard bounds (`--max-turns`, `--max-budget-usd`) — with **zero PTY and zero screen-reading**.

### Recommended Curion (MVP) flow

```
1. Provision workspace (unzip src.zip into an isolated dir)
2. Write /workspace/.curion/mcp.json        (per-run MCP servers)
3. Write /workspace/.curion/settings.json   (per-run permissions/allowlist)
4. Resolve /workspace/.curion/plugins/rosetta  (dir or .zip)
5. Spawn claude with:
     --bare -p "<prompt.md>"
     --output-format stream-json --verbose
     --model <pinned-full-model-id>
     --permission-mode bypassPermissions (container) | dontAsk (with allowlist)
     --max-turns <N> --max-budget-usd <budget>
     --session-id <deterministic-uuid>
     --mcp-config .../mcp.json --strict-mcp-config
     --plugin-dir .../plugins/rosetta
     --settings .../settings.json
     --no-session-persistence
   cwd = the test-case workspace
6. Stream stdout NDJSON → trajectory store
7. On `result`: extract answer, cost, turns, errors
8. Exit(1) + no `result` → auth/startup failure
9. Deterministic judges over the workspace (build/test/lint per evaluation.md)
10. LLM judge over result + trajectory
```

### What you lose by going headless (trade-offs)

| Lost capability | Impact | Mitigation |
|---|---|---|
| Interactive plan approval | No human plan review pause | Use bypass/auto; not needed in CI |
| `/compact` mid-session | Long runs may hit context limit | `--max-turns` + catch `error_max_turns` |
| Real-time selective approval | Can't approve unexpected tool calls live | Pre-enumerate `--allowedTools` or use `--permission-prompt-tool` |
| MCP OAuth (browser) | Can't complete OAuth in CI | Use header-auth/stdio MCPs; pre-auth in base image |

**node-pty is unnecessary for Claude Code.** It would only be needed to drive a CLI that has no headless mode, or to test the interactive TUI itself.

---

## Open / Uncertain — Verify in the Spike (priority order)

1. **`--bare --plugin-dir ./rosetta` actually loads** Rosetta's skills + MCP servers (confirm via `system/init.plugins` / `plugin_errors`).
2. **`--mcp-config` + `--strict-mcp-config` + `-p`** does not stall on a "Pending approval" prompt.
3. **`bypassPermissions` in your container** passes the non-root check (some containers run UID 0 with a non-`root` username).
4. **`result` is emitted without `--verbose`** (verbose should only gate intermediate events).
5. **Exact `result` field names** (`total_cost_usd`, `usage.*`, `modelUsage`, `permission_denials`, `num_turns`, `duration_ms`, `ttft_ms`) — capture a real run and diff against this doc.
6. **Exit-code matrix** for `error_max_turns` / `error_max_budget_usd` / auth failure (run `--max-turns 1` on a multi-turn task).
7. **`permission_denials` schema** (fields per denial) — inspect a live run with a deliberately disallowed tool.
8. **`CLAUDE_CODE_SYNC_PLUGIN_INSTALL`** path, only if Rosetta must come from a marketplace rather than `--plugin-dir`.
9. **Pinned model IDs** — resolve the exact dated IDs to use for reproducible evals at run time.
10. **Version baseline** — confirm which flags exist on the Claude Code version pinned in CI (several above are v2.1.x-gated).
