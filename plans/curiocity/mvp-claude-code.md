# Curiocity MVP — Driving Claude Code in Interactive TUI Mode (via PTY)

> **Scope:** MVP targets **Claude Code only**; other CLIs follow behind the same adapter. See [`idea.md`](./idea.md).
>
> **Core principle (non-negotiable):** Curiocity drives Claude Code's **real interactive TUI over a PTY** — never headless `-p`/`--print`. **What we test is that our Rosetta plugins/skills/subagents/workflows execute properly** inside the agent. Tool-**permission** prompts are noise → run in **auto mode** (`--permission-mode auto`) so they don't block. The agent's **substantive** questions (e.g. from our HITL skill) are still answered as a human, per `qna.md`. This guide replaces the earlier headless draft.
>
> **Provenance:** `claude-code-guide` subagent on **Sonnet 4.6** (2026-06-22), from Anthropic Claude Code docs.
>
> ⚠️ **Verify before building.** Flag names, env vars, transcript paths, prompt text, and JSON shapes below are research output and may be partly model-generated or version-specific. Confirm each against the **exact installed Claude Code version** (real PTY capture) during the spike. The prioritized "Verify in Spike" list at the end is the to-do for that.

**Doc sources (verify):** cli-reference, sessions, permission-modes, interactive-mode, permissions, mcp, settings, commands under `https://code.claude.com/docs/en/`.

---

## 1. Launch the interactive TUI with an initial prompt

`claude "your prompt"` (positional arg, **no `-p`**) starts the full interactive TUI **and** pre-submits that string as the first user turn. This is the launch method.

| Command | Behavior |
|---|---|
| `claude` | interactive session, idle prompt |
| `claude "query"` | **interactive session + auto-submits the query** ✅ use this |
| `claude -p "query"` | headless, exits after one turn ❌ never |

**Valid interactive launch flags:** `--model <alias\|id>`, `--add-dir <path>` (repeatable), `--mcp-config <path>` + `--strict-mcp-config`, `--plugin-dir <path>` / `--plugin-url <url>` (repeatable), `--settings <path\|json>`, `--permission-mode <mode>`, `--session-id <uuid>`, `--name`/`-n`, `--continue`/`-c`, `--resume`/`-r`, `--append-system-prompt`, `--verbose`, `--ax-screen-reader` (flat text, no decorations — useful for parsing; needs a recent version).

**Headless-only flags — never use:** `-p`/`--print`, `--output-format`, `--max-turns`, `--max-budget-usd`, `--no-session-persistence`, `--input-format`.

**PTY requirements:** Claude Code detects interactive via `stdin.isTTY` → a real PTY (node-pty) is required. Set `TERM=xterm-256color`, a wide size (e.g. **220×50**) to avoid wrap breaking output parsing, and consider `--ax-screen-reader` + `NO_COLOR=1` for clean text. Recommended env for eval isolation: `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, `DISABLE_AUTOUPDATER=1`, `DISABLE_AUTO_COMPACT=1`.

```typescript
import * as pty from 'node-pty';

function spawnClaude(o: { cwd: string; prompt: string; model?: string; mcpConfig?: string; sessionId: string; configDir: string }) {
  const args = [o.prompt, '--permission-mode', 'auto', '--session-id', o.sessionId];
  if (o.model) args.push('--model', o.model);
  if (o.mcpConfig) args.push('--mcp-config', o.mcpConfig, '--strict-mcp-config');
  return pty.spawn('claude', args, {
    name: 'xterm-256color', cols: 220, rows: 50, cwd: o.cwd,
    env: { ...process.env, TERM: 'xterm-256color', CLAUDE_CONFIG_DIR: o.configDir,
           CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1', DISABLE_AUTOUPDATER: '1', DISABLE_AUTO_COMPACT: '1' },
  });
}
```

---

## 2. Readiness detection

No machine-readable "ready" event exists; detect heuristically. Startup renders a welcome box, then a status line (`model · mode · cwd`) and the idle prompt `> `. With `claude "prompt"` the agent fires immediately (you won't see idle first). Strategy: after ~600ms of no new output, strip ANSI and check the last non-empty line — `^>` = idle/ready; a permission/dialog pattern = waiting for input. On a fresh dir, the **workspace-trust dialog fires first** (§8) — handle it before anything else.

---

## 3. Submitting input like a user

Write prompt text + `\r` to submit. Newline-without-submit: `\x0a` (Ctrl+J) or `\` then `\r`. node-pty writes go to the PTY slave directly, so you do **not** emit bracketed-paste sequences yourself.

```typescript
const submit = (t: pty.IPty, s: string) => t.write(s + '\r');
const newlineNoSubmit = (t: pty.IPty, lines: string[]) => t.write(lines.join('\x0a') + '\r');
```

---

## 4. Permissions — use AUTO mode (don't babysit prompts)

**Use `--permission-mode auto`.** Tool-permission prompts (bash/edit) are noise we don't test — auto mode runs routine ops without prompting, while **plugins/skills/subagents/MCP tools run normally** and the agent's **substantive clarifying questions are NOT suppressed** (so our HITL skill still gates and we answer those via `qna.md`). A background safety classifier prevents genuinely dangerous unattended actions; after repeated blocks it falls back to prompting — handleable over the PTY (unlike headless, which aborts).

**Auto-mode constraints (verify against shipped version):**
- Claude Code **≥ v2.1.83**; model **Opus 4.6+ / Sonnet 4.6** (API). Bedrock/Vertex/Foundry: Opus 4.7+/4.8 and `CLAUDE_CODE_ENABLE_AUTO_MODE=1`.
- `defaultMode:"auto"` is honored **only in `~/.claude/settings.json`** (user scope), ignored in project settings. The `--permission-mode auto` flag works regardless.
- Entering auto mode drops broad allow rules (e.g. `Bash(*)`, `Bash(python*)`); narrow rules survive. Explicit `ask` rules still prompt.

**Alternatives:** `bypassPermissions` (zero prompts/checks — only in a fully isolated container; no protection vs prompt-injection) and `acceptEdits` (edits auto, bash/network still prompt). **Avoid `dontAsk`** — it auto-*denies* anything not pre-allowed, so unlisted tool calls our skills make would silently fail.

**Prompts that still appear even in auto mode** (handle as a user, or pre-empt):

| Prompt | Detect (regex, illustrative) | Handling |
|---|---|---|
| Workspace trust (first run in dir) | `Do you trust\|files in this folder` | `y\r` / `1\r`, or pre-trust (§8) |
| MCP trust (new server) | `New MCP server\|trust this server` | `1\r`, or pre-approve via reused config dir |
| Plugin trust (first install) | `install plugin\|trust.*plugin` | `1\r`, or pre-install before the run |
| Auto-mode opt-in (first time only) | `Enter auto mode\|auto mode` | accept once during image setup |
| Substantive clarifying question | idle `> `, no numbered options | answer per `qna.md` + `\r` |

Navigation when a prompt does appear: number keys select; Enter confirms; arrows cycle tabs; Esc cancels. Number-key selection is most reliable from a PTY. **Pre-flight** (in the base image) to eliminate the one-time prompts: run once interactively to accept workspace-trust + auto-mode opt-in, pre-install plugins, set `defaultMode:"auto"` in `~/.claude/settings.json`.

---

## 5. Trajectory capture (interactive)

Interactive sessions persist a transcript JSONL at:
```
$CLAUDE_CONFIG_DIR/projects/<encoded-cwd>/<session-id>.jsonl
   (default base ~/.claude/)
```
**Written automatically — no flag required.** Interactive session persistence is on by default (it's what powers `--continue`/`--resume`); there is **no analogous param** to enable it. (The thing you may recall — `--output-format stream-json` — is the *headless* live stdout stream, a different mechanism we do not use.) `<encoded-cwd>` = the cwd with every `/` replaced by `-` (verified empirically). Set a **unique `CLAUDE_CONFIG_DIR` per run** for isolation and pass `--session-id <uuid>` so you know the filename up front. The file is written **incrementally** (tail-able). Each line is a JSON event — `user`, `assistant` (with `text` and `tool_use` blocks), tool results, session metadata. This is the **authoritative trajectory** for judging. Retention defaults to 30 days (`cleanupPeriodDays`); `CLAUDE_CODE_SKIP_PROMPT_HISTORY` disables writing (don't set it). Whether per-message `usage`/cost appears inline — verify in spike; fallback is `/usage` before exit.

**Cost/tokens:** may not be reliably inline per-message. Fallback: send `/usage\r` (or `/cost\r`) before exit and capture the rendered totals, or enable OpenTelemetry (`CLAUDE_CODE_ENABLE_TELEMETRY`). **Verify** whether per-message `usage` appears in the JSONL.

```typescript
import * as fs from 'fs/promises';
function pollTranscript(p: string, onEvent: (e: any) => void) {
  let pos = 0;
  const iv = setInterval(async () => {
    try { const st = await fs.stat(p); if (st.size <= pos) return;
      const buf = await fs.readFile(p, 'utf8'); const lines = buf.slice(pos).split('\n'); pos = st.size;
      for (const l of lines) { if (l.trim()) try { onEvent(JSON.parse(l)); } catch {} }
    } catch {}
  }, 300);
  return () => clearInterval(iv);
}
```

---

## 6. Completion & idle detection; ending the session

Working state shows spinners / "Running…" / "Editing…" lines; **idle** = `> ` prompt returns and no output for ~800ms (tune). More reliable than screen-scraping: watch the **transcript** for a new `assistant` turn appended after your `user` line.

End cleanly: send `/exit\r` (preferred); fallback `\x04` (Ctrl+D) after ~5s; `/quit\r` is an alias; `\x03\x03` only when idle. Expect exit code `0` on clean exit (verify).

```typescript
async function close(t: pty.IPty) {
  t.write('/exit\r');
  return new Promise<number>(res => { t.onExit(({exitCode}) => res(exitCode));
    setTimeout(() => { try { t.write('\x04'); } catch {} }, 5000); });
}
```

---

## 7. MCP & plugin provisioning at launch

`--mcp-config <file> --strict-mcp-config` (interactive-valid) loads only our servers and ignores user/project MCP config — essential for isolation. `--plugin-dir <dir|.zip>` / `--plugin-url <url>` load session-only plugins (this is how we inject the **Rosetta** plugin). Both may trigger **trust dialogs** ("New MCP server… trust?", "install plugin?") — since each run uses a fresh `CLAUDE_CONFIG_DIR`, expect them every run; answer as a user (`1\r`) or pre-approve via a reused config dir / `--settings`. Pre-approve plugin/MCP tool calls' permissions only if you don't want those specific prompts (usually you *do* want them).

---

## 8. Workspace-trust dialog (fires first, on fresh dirs)

First launch in a never-seen directory shows "Do you trust the files in this folder?" **before** the banner/prompt processing. Answer via PTY: `y\r` or `1\r`. Put trust-dialog detection at the **top** of the state machine (it precedes all agent output). Since Curiocity uses fresh workspace + config per run, it fires every run. (`CLAUDE_CODE_TRUST_ALL_DIRS` is rumored but unconfirmed — verify; prefer answering it as a user, which is realistic.)

---

## Recommended Curion MVP loop

```
LAUNCH (claude "<prompt.md>" --permission-mode auto --session-id <uuid>
        --mcp-config … --strict-mcp-config --plugin-dir <rosetta> ; cwd=workspace)
→ AWAIT_TRUST  (answer y\r; or pre-trusted in base image)
→ AWAIT_READY
→ AGENT LOOP, on each PTY chunk (ANSI-stripped):
     trust/MCP/plugin dialog  → approve (or pre-empted in base image)
     tool permission           → auto mode handles it (no action needed)
     substantive question      → answer per qna.md + \r
     idle >600ms               → emit TURN_COMPLETE
   in parallel: tail transcript JSONL → trajectory store
→ on TURN_COMPLETE & no pending input: (optionally /usage\r to capture cost) → /exit\r
→ read final transcript → deterministic checks (evaluation.md) + LLM judge
                          + judge: did our plugins/skills/subagents/workflows actually run?
```

(A fuller node-pty sketch combining §1–§6 is straightforward to assemble from the snippets above; treat all detection regexes as version-specific and confirm in the spike.)

---

## Verify in Spike (priority order)

1. **Workspace-trust dialog** exact text/format/keystroke on the shipped version (fresh dir).
2. **Tool-permission prompt** exact text + option layout (is `1`=Yes always? any `y/n` variants?) — capture raw PTY for a Bash and an Edit permission.
3. **Does `claude "prompt"` fire the trust dialog before processing the prompt**, or mid-turn?
4. **Transcript JSONL schema** — real field names/nesting; whether `usage`/cost is per-message or end-only. Dump a real transcript.
5. **`CLAUDE_CONFIG_DIR` project-dir encoding** of the CWD; confirm `<session-id>.jsonl` filename pattern; confirm `--session-id` controls it.
6. **Idle `> ` exact format** (with/without `--ax-screen-reader`; trailing space?).
7. **Multi-line input** — `\x0a` inserts newline without submitting in Claude Code's input layer.
8. **MCP trust dialog with `--strict-mcp-config`** — suppressed or still fires per server?
9. **`--settings` inline JSON merge** behavior — confirm it doesn't pull in user `permissions.allow` that suppress prompts.
10. **Plugin trust dialog** format for `--plugin-dir` (same as MCP?).
11. **JSONL flush timing** — per-line flush vs batched; any partial-line writes (would break parsing).
12. **Clean `/exit` exit code** (`0`?) and behavior under `--ax-screen-reader`.
13. **`TERM`/size sensitivity** — does omitting `TERM=xterm-256color` degrade init; is there a clean low-noise rendering mode for parsing.
