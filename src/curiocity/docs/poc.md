# Curiocity PoC

**One case × Claude Code — Curion worker PoC**

---

## What Was Built

A Node/TypeScript PoC of the **Curion worker** — the per-trial unit of the Curiocity harness. It implements the full loop for one hardcoded case (spring-boot health-check) × Claude Code, incorporating all mechanisms validated by the interactive-capture experiment (2026-06-23):

1. Unzip `test-library/spring-boot-react-mysql.zip` into an isolated temp dir
2. Check Rosetta plugin (no-op — already in default profile)
3. Spawn Claude Code in its **real interactive TUI over node-pty** (never headless); strip `CLAUDECODE` + all `CLAUDE_CODE*` from the child env so the session persists its transcript
4. Inject `SessionStart` + `Stop` hooks via `--settings <file>`; receive authoritative `transcript_path` from `SessionStart` hook; drive turn loop from `Stop` hook signals
5. Tail the on-disk `.jsonl` trajectory live via `fs.watch` on the `transcript_path` from `SessionStart`; fallback to computed path if hook never fires
6. Judge: deterministic file checks + `claude-sonnet-4-6` LLM judge (validation file verbatim + distilled trajectory + artifacts + Q&A log)

---

## Architecture

```
src/
  index.ts        orchestrator — wires all steps
  llm-client.ts   askLlm via openai SDK → Anthropic compat endpoint
  workspace.ts    unzip + macOS __MACOSX noise handling
  provisioner.ts  no-op (Rosetta in default profile)
  hook-runner.ts  buildHookSettings; watchSessionStart; watchStopSignals; cleanupCtrlDir
  pty-runner.ts   node-pty spawn; CLAUDECODE/CLAUDE_CODE* stripped; hook-driven turn loop; QNA via Haiku
  transcript.ts   computeTranscriptPath (fallback only); fs.watch tail; JSONL parser
  judge.ts        deterministic checks + LLM judge → verdict
  smoke.ts        smoke test (no PTY needed)
```

**Data flow:**

```
ZIP → workspace (temp dir)
    → buildHookSettings() → ctrlDir/settings.json (SessionStart + Stop hooks)
    → spawn claude "<prompt>" --permission-mode auto --session-id <fresh-uuid> --settings <settings.json>
         env: inherited minus CLAUDECODE, CLAUDE_CODE*, ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL
    → SessionStart hook fires → writes ctrlDir/session-start.json
         watchSessionStart() reads transcript_path (authoritative)
         fallback: computeTranscriptPath(cwd, sessionId) if hook never fires
    → PTY screen dialog loop (concurrent, deterministic screen patterns)
         trust/theme/MCP/auto dialog → y / Enter / 1 (never unsolicited)
    → Stop hook fires after each turn → appends line to ctrlDir/stop.jsonl
         watchStopSignals() reads last_assistant_message:
           question? → Haiku classifies → answer typed into PTY → record Q&A
           task done? → /exit sent → session finishes
         safety cap → /exit + clean exit
    → tail transcript_path live (fs.watch)
    → locateTranscript → readTranscripts
    → judge: sonnet-4-6 receives:
         [1] validation file verbatim
         [2] distilled trajectory (tool steps, trimmed results, assistant text)
         [3] produced artifacts (read from workspace)
         [4] Q&A log (text questions + answers)
    → combined verdict (score 0–100) + JSON result file
```

---

## Key Design Decisions (validated 2026-06-23)

| Decision | Implementation |
|---|---|
| Hook injection | `--settings <file>` with SessionStart + Stop hooks alongside existing hooks |
| Transcript path | **Authoritative:** `transcript_path` from `SessionStart` hook. **Fallback:** `computeTranscriptPath(cwd, sessionId)` — `realpathSync(cwd).split('/').join('-')` |
| Turn detection | Stop hook signal (`last_assistant_message`) — not timers, not JSONL parsing |
| Child env | All of `process.env` minus `CLAUDECODE`, `CLAUDE_CODE*`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL` |
| Session ID | Fresh `randomUUID()` per run — reuse causes "Session ID already in use" instant exit |
| LLM key | `parseEnvFile(.env)` → `CURION_LLM_KEY`; never in `process.env`; never passed to `claude` |
| PTY mode | Interactive TUI; no `--print`; no `--output-format` |
| Unsolicited input | Never injected — only trust/theme dialogs (screen patterns) and answered questions |
| JSONL tailing | `fs.watch` on `transcript_path`; file appears within ~1 s of `SessionStart` |
| Judge input | 4 inputs: validation file verbatim + distilled trajectory + artifacts + Q&A log |
| Q&A log | Free-text questions from `last_assistant_message`; included in result JSON |

---

## Hook Settings Shape (verified)

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "cat > <ctrlDir>/session-start.json" }] }],
    "Stop":         [{ "hooks": [{ "type": "command", "command": "cat >> <ctrlDir>/stop.jsonl" }] }]
  }
}
```

- `SessionStart` receives: `{ session_id, transcript_path, cwd, model, source, hook_event_name, ... }`
- `Stop` receives: `{ session_id, transcript_path, last_assistant_message, stop_hook_active, hook_event_name, ... }`

---

## LLM Routing

Both models use `openai` SDK pointing at the Anthropic OpenAI-compat endpoint (`https://api.anthropic.com/v1`):

- **QNA answering:** `claude-haiku-4-5` — fast, cheap; answers the agent's questions during the PTY run
- **Judge:** `claude-sonnet-4-6` — workhorse; scores the full run against the validation file

---

## How to Run

### Prerequisites

- Node.js ≥ 18
- `claude` CLI installed and authenticated (https://code.claude.com)
- `CURION_LLM_KEY` (preferred) or `ANTHROPIC_API_KEY` in `plans/curiocity/poc/.env`

```
CURION_LLM_KEY=sk-ant-...
```

### Install

```bash
cd plans/curiocity/poc
npm install
```

### Type check

```bash
npx tsc --noEmit
```

### Smoke test (no PTY, no claude CLI needed)

```bash
npm run smoke
```

Exercises: unzip, transcript parsing, deterministic judge, Haiku LLM round-trip, `computeTranscriptPath` unit check, hook settings shape, hook payload parsing.
Expected output: `16 passed, 0 failed`.

### Full run (requires unsandboxed claude CLI + real PTY)

```bash
npm run dev
# or: npm run build && npm start
```

**Must run unsandboxed** — a sandboxed process blocks `claude`'s writes to `~/.claude` and no transcript appears. The orchestrator validates this step separately.

Runs the full Curion loop. Takes up to 30 minutes (safety cap; normal run ~5–10 min).
Output: verdict + score to stdout, JSON result to `/tmp/curion-result-<session-id>.json`.

---

## Hardcoded Assumptions

- **One zip:** `test-library/spring-boot-react-mysql.zip`
- **One task:** `test-library/coding/prompt-request.md` — "Add a health-check API endpoint"
- **One validation file:** `test-library/coding/prompt-validation.md` — passed verbatim to the judge
- **One agent:** Claude Code (`claude` CLI, `--permission-mode auto`)
- **QNA context:** hardcoded in `src/index.ts`; approves any reasonable implementation

---

## Judge

- **Deterministic gate:** both `plans/healthcheck/healthcheck-SPECS.md` + `healthcheck-PLAN.md` must exist
- **LLM judge:** `claude-sonnet-4-6` scores 0–100 against the validation file; pass threshold ≥ 60
- **Combined:** deterministic gate must pass; if it fails, score is capped at 40

---

## What Is Stubbed / Untested in Smoke

| Item | Status |
|---|---|
| PTY run (real Claude Code) | Requires unsandboxed `claude` CLI — orchestrator validates separately |
| Rosetta plugin install | No-op (Rosetta in default profile); reserved for future per-case MCP injection |
| Trajectory transcript parsing | Tested with synthetic JSONL; real Claude Code fields verified at runtime |
| Token cost reporting | Haiku returns inputTokens/outputTokens; Claude Code's own usage not yet parsed |
| Headless terminal model | Not used; ANSI stripped with a regex; sufficient for PoC dialog detection |

---

## Next Steps

1. **Orchestrator validates the live PTY run** unsandboxed — confirm `SessionStart`/`Stop` hook payloads, trust dialog, JSONL field names against installed Claude Code version
2. **Wire real `qna.md` per case** instead of hardcoded qnaContext string
3. **Multi-case support** — discover cases under `--source`, dispatch one Curion per case
4. **Rosetta regression gate** — deterministic check that Rosetta skills/workflows ran (tool_use entries referencing Rosetta tools)
5. **Cost tracking** — parse per-message usage from JSONL once real field names confirmed
