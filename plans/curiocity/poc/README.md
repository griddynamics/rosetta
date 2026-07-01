# Curiocity PoC — Curion worker

A proof‑of‑concept of **Curiocity**'s per‑trial worker (**Curion**): drive one coding‑agent CLI
(**Claude Code** in this PoC) through one task **in its real interactive TUI**, answer the agent's
genuine questions, capture the full **trajectory**, and **judge** the result against the case's own
criteria. Node/TypeScript, intentionally small and mostly hardcoded.

> Design context lives one level up: **[`../idea.md`](../idea.md)** (vision + validated findings &
> decisions), **[`../mvp-claude-code.md`](../mvp-claude-code.md)** (Claude Code specifics),
> **[`./poc.md`](./poc.md)** (the implementation's living notes).

---

## What it does (one run)

1. **Unzip** a source project into an isolated temp workspace (`test-library/spring-boot-react-mysql.zip`).
2. **Launch** `claude` in its **interactive TUI** over a PTY (no `--print`/headless), with the task
   prompt from `test-library/coding/prompt-request.md`.
3. **Capture the trajectory** live from the on‑disk session transcript (see "Capture" below).
4. **Answer only genuine questions** the agent asks (`AskUserQuestion` / free‑text) using a fast model;
   normal tool calls are left alone. Each exchange is recorded in a **Q&A log**.
5. **Judge** the result with a strong model against the case's validation file — emit score + verdict.

---

## Quick start

```bash
npm install
npm run smoke        # offline checks (no claude needed): unzip, LLM round-trip, judge, hook shapes
npm run dev          # full live run — MUST be run UNSANDBOXED (see Requirements)
npx tsx capture-probe.ts   # standalone proof of the capture mechanism (unsandboxed)
```

Put the LLM key in **`.env`** (git‑ignored) as `CURION_LLM_KEY=...` (used only for the QNA/judge
models via the OpenAI‑compatible client — never exported to the environment, never passed to `claude`).

---

## Requirements & gotchas (validated — see `../idea.md` findings)

- **Run unsandboxed.** A sandboxed process can't write the transcript to `~/.claude` → no capture.
- **`CLAUDE_CODE*` / `CLAUDECODE` are stripped** from the `claude` child env (else it's treated as a
  nested child session and doesn't persist its own transcript).
- **Fresh `--session-id` per run** (a reused id → `"Session ID already in use"`).
- **Key never in the environment** — read from `.env` as `CURION_LLM_KEY`, handed straight to the LLM
  client; `claude` itself uses the local profile.
- **Models:** QNA answering = `claude-haiku-4-5`; judge = `claude-sonnet-4-6`.

---

## File map

| File | What / for what |
|---|---|
| `src/index.ts` | Entry point — wires the steps: provision → launch → capture → Q&A loop → judge → emit result JSON. |
| `src/workspace.ts` | Unzips `src.zip` into an isolated temp working dir; cleans up after. |
| `src/llm-client.ts` | Vendor‑agnostic LLM access via the official `openai` SDK against an OpenAI‑compatible endpoint; key from `CURION_LLM_KEY`. No bespoke wrapper. |
| `src/pty-runner.ts` | Launches the interactive `claude` TUI via `node-pty` (strips `CLAUDE_CODE*`, injects hooks, fresh session‑id); runs the turn loop. |
| `src/hook-runner.ts` | Builds the `--settings` JSON injecting **`SessionStart`** + **`Stop`** hooks, and watches their control files. `SessionStart` → authoritative `transcript_path`; `Stop` → turn‑complete + `last_assistant_message`. |
| `src/transcript.ts` | Reads/parses the on‑disk transcript `.jsonl` into events/tool‑calls; `computeTranscriptPath()` is the fallback locator when hooks aren't available. |
| `src/judge.ts` | **Generic** judge — feeds the case's validation file (verbatim, dynamic) + distilled trajectory + produced artifacts + Q&A log to the judge model. No task‑specific logic. |
| `src/provisioner.ts` | Ensures the Rosetta plugin is available for the run (verify / marketplace install). |
| `src/smoke.ts` | Offline self‑tests (no live `claude`): unzip, LLM round‑trip, judge on a sample, hook‑settings shape, payload parsing, path formula. |
| `capture-probe.ts` | Standalone, one‑file **diagnostic** that proves interactive capture works on this machine (hooks deliver `transcript_path`/`last_assistant_message`; transcript appears ~1 s, live). |
| `poc.md` | The implementation's living notes (architecture, decisions, what's validated/stubbed). |
| `CODEMAP.md` / `DEPENDENCIES.md` / `TECHSTACK.md` | Auto‑style reference docs for the module map, deps, and stack. |
| `.env` | Git‑ignored secrets (`CURION_LLM_KEY`). Never committed. |

---

## How capture works

- **Primary (Option B): hooks.** Inject our own `SessionStart`/`Stop` hooks (only the two basic,
  cross‑agent‑portable hooks). `SessionStart` hands us the exact `transcript_path`; we tail that file
  live (~1 s latency). `Stop` fires at each turn end with `last_assistant_message` — the completion
  signal and the free‑text‑question trigger.
- **Fallback (Option A): computed path.** `~/.claude/projects/<realpath(cwd) "/"→"-">/<session-id>.jsonl`
  — deterministic since we set cwd and session‑id; no filesystem search.

Both are validated end‑to‑end (see `../idea.md`).

---

## Judging

The harness is **generic** — it does **not** encode task knowledge. It passes the case's own validation
file (e.g. `test-library/coding/prompt-validation.md`) verbatim as the rubric, plus the distilled
trajectory, the produced artifacts, and the Q&A log, to the judge model, which emits the verdict in the
format that file specifies.

---

## Status / known issues

- Capture (both options) and the generic judge are validated end‑to‑end.
- **Question detection** must fire only on a genuine user question (`AskUserQuestion` / free‑text) —
  earlier it misclassified normal tool calls (`TaskCreate`/`TaskUpdate`) as questions and derailed the
  agent. Being corrected; see `../idea.md` "Live end‑to‑end run findings".
- PoC scope: single agent (Claude Code), single hardcoded case. Other CLIs and multi‑case discovery
  are future work.
