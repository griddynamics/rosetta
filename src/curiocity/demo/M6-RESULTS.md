# Milestone 6 — Acceptance Evidence

Simplified PoC demo case (`healthcheck`) run end-to-end on **both** coding agents
(`claude-code`, `codex`) with a **real Anthropic LLM judge**. Both trials passed with
real judge verdicts; the suite gate passed with the correct exit code. The harness
behaved flawlessly; no tests were weakened and nothing was pushed.

Results directories are untracked (per policy); this file is the committed evidence.

## Reproduction command

```
cd src/curiocity
npx tsx src/cli/index.ts run \
  --source demo/cases \
  --config demo/curiocity.demo.json \
  --out <results-dir>
```

- Models (from `demo/curiocity.demo.json`): `fast=anthropic/claude-haiku-4-5`,
  `workhorse=anthropic/claude-sonnet-4-6` (judge defaults to workhorse).
- Anthropic keys auto-resolve from `src/curiocity/.env` via the existing `llm/keys`
  mechanism (never printed, never read by this milestone's author — the harness reads it).
- The harness process must run **unsandboxed** (P10) so the agent CLIs can write their
  native transcripts under `$HOME`.

## Outcome (final run)

- **Suite gate: PASS — exit code `0`.** `suite.json` + `suite.md` produced and coherent.
- Both groups `stable-pass`; no error-status trials.

| Case | Agent | Status | Score | Verdict | Turns | QnA |
|---|---|---|---|---|---|---|
| healthcheck | claude-code | passed | **100.0** | pass | 1 | 0 |
| healthcheck | codex | passed | **97.0** | pass | 1 | 0 |

Per-trial verdict combiner = `gated-mean`: the `file-exists` gate
(`HEALTHCHECK.md` + `spring-boot-server/src/main/java/**/HealthController.java`) passed
for both, then the `llm-judge` (rubric = `evaluation.md`) scored the produced artifacts.

### Judge verdicts (real Anthropic `claude-sonnet-4-6`)

- **claude-code — 100/100.** "All three rubric categories fully satisfied.
  `HealthController.java` created in the exact required package, `@RestController` +
  `@RequestMapping("/api")` + `@GetMapping("/health")`, returns
  `ResponseEntity<Map<String,String>>` `{"status":"UP"}` HTTP 200, idiomatic and matching
  `TutorialController` style. `HEALTHCHECK.md` accurate with a correct `curl` example.
  Only the two required files added; no builds, no dependency changes."
- **codex — 97/100.** Endpoint + docs full marks; identical correct implementation
  (`Collections.singletonMap("status","UP")`, `HttpStatus.OK`). Minor scope-discipline
  deduction because the workspace-scoped `.codex/hooks.json` (a **harness** artifact that
  the codex adapter writes into the workspace per arch.md §10.2, not the agent's edit)
  appears in the workspace diff. The judge correctly attributed it to the harness.

### Which transcript path ran (hook vs fallback)

Both agents completed via the **capture-hook path** — the interaction turn loop is driven
by `Stop`-hook signals (§6), and both trials reached `turnCount=1` and terminated cleanly
with **no freeze-watchdog escalation and no fallback screen-read**:
- claude-code: injected `Stop` hook (via `--settings`) delivered the turn signal.
- codex: hooks confirmed firing on codex-cli 0.142.2; the rollout JSONL parsed cleanly
  (`session_meta → task_started → turn_context → task_complete`, the last corroborating
  the `Stop` signal per §10.2).

### QnA log

**No questions were answered** for either agent (`qna: []`). The tight prompt +
permissive `qna.md` worked as intended — both agents made reasonable choices and proceeded
without asking, so the QnA workhorse path was never triggered.

### Timings

| Agent | total | agent runtime | harness-LLM | det. checks |
|---|---|---|---|---|
| claude-code | 25.8 s | 18.1 s | 7.65 s | 3 ms |
| codex | 30.0 s | 21.8 s | 7.80 s | 4 ms |

Both trials well under the 600 s per-trial cap and the < 5 min target.

### Cost block (real numbers)

Dollar amounts are **harness Anthropic spend only** (classify + judge), computed from the
`pricing` map in `demo/curiocity.demo.json`. Agent tokens are billed to the user's **own**
agent CLI auth (expected) and are reported for visibility, not priced here.

| Agent | Agent usage (in/out) | Harness fast (haiku) | Harness judge (sonnet) | Harness $ |
|---|---|---|---|---|
| claude-code | 11,816 / 1,831 (+217,811 cache-read, 12,823 cache-create) | 333 / 9 | 4,029 / 195 | **$0.01539** |
| codex | 39,390 / 1,066 | 0 / 0 | 3,549 / 310 | **$0.01530** |

- **Total harness Anthropic spend for the suite ≈ $0.031** (cents, as expected).
- Per-model $: `claude-haiku-4-5` $0.000378; `claude-sonnet-4-6` (judge) $0.0150 + $0.0153.
- claude-code's classify path fired once (haiku 333/9 tokens); codex needed no fast-model
  classification (its Stop payload classified as `done` directly).

## Suite runs used: 2 of the ≤4 cap

- **Run 1 — exit `3` (partial infra failure): codex passed (score 97), claude-code
  `agent-hung`.**
  - Root cause (from `screen.log` + reproduction): claude-code rendered
    **"Not logged in · Please run /login"** and never took a turn (0 turns → freeze
    watchdog → `agent-hung`). The Curion env allow-list (`src/orchestrator/env.ts`,
    `ALLOW_EXACT`) forwarded only `PATH/HOME/TERM/locale`. On macOS, Claude Code's
    Keychain-backed OAuth credential lookup needs **`USER`** to resolve the login context;
    without it `claude` reports "Not logged in" even though `HOME`/`~/.claude` are readable.
    Reproduced deterministically: `env -i HOME=$HOME PATH=$PATH TERM=xterm claude -p …` →
    "Not logged in"; adding `USER=$USER` → authenticates. (`LOGNAME` alone is insufficient.)
  - Fix (committed separately as `curiocity(m6-fix)`): add `USER` and `LOGNAME` to the
    allow-list. Neither is secret-shaped, so both pass `assertNoSecrets` (defense-in-depth).
    Unit test `test/unit/env-scrub.test.ts` strengthened to cover them.
- **Run 2 — exit `0`: both agents passed with real judge verdicts.** (The evidence above.)

## Non-mutation of global agent state (P11) — verified

- `~/.codex/config.toml` contains **no `curiocity-ws-*` project entry** — every
  `[projects.*]` entry is a pre-existing user project. The codex adapter's per-trial
  throwaway `CODEX_HOME` kept the real `~/.codex` untouched (the broken 0.142.2
  trust-seeding path is avoided; trust dialog cleared via `dialogPatterns`).
- claude-code writes its transcript/history to `~/.claude` — this is **expected** (P9:
  transcripts must go to `~/.claude`; provisioning is workspace-scoped via `--settings`),
  not a mutation of global config/auth.

## Post-conditions (all green)

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **231/231** passing (28 files).
- `npm run smoke` — **25/25** passing (mock-agent, token-free).
- Nothing pushed. Only Anthropic keys touched; `OPENAI_API_KEY` never read/used.

## Open questions / observed deviations

- **Minor (not a harness failure):** the codex adapter's workspace-scoped
  `.codex/hooks.json` shows up in `workspaceDiff` and cost the codex judge a small
  scope-discipline deduction (97 vs 100). The judge correctly identified it as a harness
  artifact. If desired later, the codex adapter could exclude its own injected hook files
  from the diff, or the case's `llm-judge` rubric could note the file — out of scope for M6.
- **Environment-specific fix generality:** the `USER`/`LOGNAME` allow-list addition is the
  correct macOS Keychain fix and is harmless on Linux/CI. It is squarely a harness/env
  bug, resolved in `src/orchestrator/env.ts`.
