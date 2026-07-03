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

---

# Milestone 6.5 — Live QnA validation (`qna-probe`)

The `qna-probe` case (`demo/cases/qna-probe/`) is the FIRST live exercise of the P3/§6
answer path. Its prompt REQUIRES the agent to ask which greeting language to use
(English or Spanish) BEFORE writing `greeting.txt` — a structured `AskUserQuestion` for
Claude Code, a free-text question for Codex (which has no structured tool). `qna.md`
answers **English**; evaluators are `file-exists greeting.txt` + `grep -iq hello` (both
gates) + an `llm-judge`.

Reproduction: `run --source demo/cases --case qna-probe --config demo/curiocity.demo.json`
(harness models: fast=haiku, workhorse/judge=sonnet-4-6; Anthropic only; `OPENAI_API_KEY`
never read; harness unsandboxed per P10).

## Suite runs used: 3 of the ≤3 cap

- **Run 1 — both failed.** Root causes (two real gaps this probe exposed):
  1. **claude-code (`agent-hung`):** Claude Code 2.1.199 buffers a pending
     `AskUserQuestion` — the `tool_use` is written to the transcript only AFTER it is
     answered, so transcript-based `detectStructuredQuestion` can never see it while
     pending; the menu lives only on the screen.
  2. **codex (`failed`, no file):** the engine located the transcript ONCE at t0; on the
     codex fallback path (rollout not yet written) it kept a non-existent sentinel path
     forever → empty trajectory → the agent flew blind.
- **Run 2 — claude-code PASSED (100), codex failed (25).** Fixes for both run-1 causes
  applied (screen-based structured detection + arrow-key menu answer; engine re-locates
  the transcript until the file exists). claude-code now asks, is answered, and completes.
  Codex tried its `request_user_input` tool (unavailable in Default mode), fell back to a
  free-text question, then emitted `task_complete` — which the engine's `detectCompletion`
  swallowed as "done" before classifying the question.
- **Run 3 — claude-code PASSED (100), codex `agent-hung`.** Fix applied: a `task_complete`
  marker no longer forces "done" when the turn-final message ends in `?` (a genuine
  question). Codex now asks, and the harness **detects + classifies + composes + types the
  answer "English"** (recorded in the QnA log). The remaining gap: codex-cli's interactive
  composer read the rapid `text\r` burst as a multi-line PASTE, so the answer sat unsent in
  `›` and codex idled to the freeze watchdog.
  - **Post-cap fix (unit-verified, live re-verification pending):** added a `type+enter`
    submit mode (type the text, settle, then a DISCRETE Enter) and set it on the codex
    profile. Verified via a `TerminalSession` integration test; the 3-run live cap was
    reached, so a 4th live codex run was NOT performed.

## Claude Code — QnA exchange (run 3, live)

- **Question asked (structured `AskUserQuestion`):** "Which language should the greeting in
  greeting.txt be in?" (options English / Spanish).
- **Answer typed:** "English" — detected from the SCREEN menu (transcript had no pending
  tool_use), composed by the workhorse from `qna.md`, submitted by arrow-navigation + Enter.
- **transcriptSource:** `hook` (recorded field). **Verdict:** pass, **judge 100/100**.
  `greeting.txt` created containing "Hello"; both gates + judge passed.
- **Per-turn timeline (2 turns, measured):** turn 1 `turnStart→stopAt` ≈ 2.0 s (agent asked)
  → answer typed; turn 2 ≈ 3.6 s (agent wrote the file) → done.
- **Time decomposition:** total 16.13 s · **agent-pure 5.59 s** (measured from the timeline)
  · harness-react 1.90 s · harness-LLM 5.08 s · judge-LLM 3.18 s · checks 0.02 s.
- **Full token breakdown (real, per model × source):** agent `claude-sonnet-5`
  input 9436 / output 515 / **cacheRead 115294** / **cacheWrite 8288** (tokens-only — agent
  billed to the user's own auth, model not in the pricing map); harness fast (haiku)
  268/9 $0.00031, workhorse (sonnet) 198/4 $0.00065, judge (sonnet) 1403/98 $0.00568. The
  cache classes are captured from the real transcript exactly as §12 requires.

## Codex — QnA exchange (run 3, live)

- **Question asked (free-text):** "Which language should I use for the greeting: English or
  Spanish?" (`request_user_input` was unavailable in Default mode, so codex asked in plain
  text — the intended non-structured path).
- **Answer typed:** "English" — the harness detected the Stop, classified it as a question
  (fast model), composed the answer from `qna.md`, and typed it. **Recorded in the QnA log.**
- **transcriptSource:** `hook`. **Outcome:** `agent-hung` — the typed answer was not
  finalized by codex's composer (see the run-3 root cause + `type+enter` fix above), so
  `greeting.txt` was never written. The answer PATH (detect → classify → compose → type) is
  live-validated; the submit-finalization fix is applied and unit-verified but not
  live-re-verified within the 3-run cap.
- **Full token breakdown (real):** agent `gpt-5.5` input 5328 / output 100 / **reasoning
  210** / **cacheRead 19200** (tokens-only) — codex's reasoning + cached-input classes are
  captured and decomposed disjointly (input excludes cached; output excludes reasoning).

## What the qna-probe proves for M6.5

- The full-breakdown usage schema (`input/output/reasoning/cacheWrite/cacheRead/total/raw`)
  is populated from REAL transcripts for both providers, itemized per model × source, with
  tiered $ where priced and tokens-only + a warning where not.
- The time decomposition (per-phase walls, per-turn timeline, MEASURED `agentPureMs`,
  harness LLM-vs-overhead, judge-vs-checks) is populated and rendered total-vs-pure.
- `transcriptSource` is persisted and rendered.
- The §6 answer path works end-to-end for Claude Code (structured) and, for Codex, through
  answer composition + typing (free-text), with the final submit-finalization fix applied.

## Open questions / observed deviations

- **Minor (not a harness failure):** the codex adapter's workspace-scoped
  `.codex/hooks.json` shows up in `workspaceDiff` and cost the codex judge a small
  scope-discipline deduction (97 vs 100). The judge correctly identified it as a harness
  artifact. If desired later, the codex adapter could exclude its own injected hook files
  from the diff, or the case's `llm-judge` rubric could note the file — out of scope for M6.
- **Environment-specific fix generality:** the `USER`/`LOGNAME` allow-list addition is the
  correct macOS Keychain fix and is harmless on Linux/CI. It is squarely a harness/env
  bug, resolved in `src/orchestrator/env.ts`.

---

# Milestone 6.6 — agentModel + external evaluator + turn metrics (cheap-tier live)

Three features landed and were live-validated on the **cheap agent-model tier** (the point
of feature 1): pin the agent CLIs to cheap models for the bulk of testing.

- **agentModel (§5.2):** optional `AgentProfile.agentModel` + per-case `agentModels` map +
  CLI `--agent-model <agentId>=<model>` (repeatable), D13 precedence (profile < case < CLI).
  Rendered by each adapter's `buildLaunch` (claude `--model <id>`, codex `-m <id>`, mock
  no-op). Each trial records **both** the requested model and the observed model (the
  CLI's SessionStart payload — the M6.5 recorded truth of what actually ran) plus a
  tolerant `mismatch` flag (alias/full-id substrings agree).
- **`external` evaluator (§11):** hook-style contract — a JSON object string of paths +
  identity on stdin, `{"values":[{name,value 0-100}]}` on stdout, `timeoutSec`; metrics
  recorded per trial and rolled up per metric name (mean/min/max/stddev — the new `metrics`
  stat); optional `scoreMetric`/`passThreshold`/`gate`/`weight`; non-zero exit / bad JSON /
  out-of-range / timeout → gate-aware evaluator error. Example `count-changed-files.mjs`
  ships with the healthcheck case and is wired into its `config.json` (informational).
- **Turn metrics (§12):** `turnsTotal` / `questionTurns` (once per turn regardless of
  question count within) / `interruptions` (consecutive question-turns collapsed) derived
  from the per-turn timeline, stored per trial, rolled up (`turn-metrics` stat), rendered
  in `suite.md`.
- **Submit path (§5.3, binding):** bracketed paste is the single production submit path —
  every `submitLine` is four separate PTY writes (`\x1b[200~`, text, `\x1b[201~`, then a
  discrete `\r`); all v1 profiles use `paste+enter`, `enter` is a plain fallback.

## Cheap-tier model identifiers (verified empirically against the installed CLIs)

| Agent | Requested (pinned) | Observed (SessionStart) | mismatch |
|---|---|---|---|
| claude-code | `haiku` (alias) | `claude-haiku-4-5-20251001` | **false** |
| codex | `gpt-5.4-mini` | `gpt-5.4-mini` | **false** |

- claude's `--model haiku` alias resolves to **`claude-haiku-4-5-20251001`** on the
  installed CLI (2.1.199) — the cheap Haiku tier available here is 4.5, not the notional
  "Haiku 3.5"; the tolerant comparison correctly treats alias ⊂ full-id as agreement.
- codex accepts **`-m gpt-5.4-mini`** and reports it back verbatim (exact match).
- Both pinned in `demo/curiocity.demo.json` via `codingagents.<id>.agentModel`.

## Step-0 — pending codex QnA fix: CONFIRMED

`run --case qna-probe --agent codex` (default model) → **passed**, score 90. The M6.5
`type+enter` submit fix works live: question asked → "English" answered (recorded in the
QnA log) → `greeting.txt` written → completed. No code fix needed (the submit path was
subsequently generalized to bracketed paste for all modes per the §5.3 ruling).

## Final cheap-tier suite — both cases × both agents (exit 0, all 4 passed)

`run --source demo/cases --config demo/curiocity.demo.json` (cheap models pinned):

| Case | Agent | agentModel (req → obs, mismatch) | Status | Score | Turns / Q-turns / Interruptions | External metric |
|---|---|---|---|---|---|---|
| healthcheck | claude-code | haiku → claude-haiku-4-5-20251001, false | passed | 100 | 1 / 0 / 0 | files-changed=2 |
| healthcheck | codex | gpt-5.4-mini → gpt-5.4-mini, false | passed | 97 | 1 / 0 / 0 | files-changed=3 |
| qna-probe | claude-code | haiku → claude-haiku-4-5-20251001, false | passed | 100 | 2 / 1 / 1 | — |
| qna-probe | codex | gpt-5.4-mini → gpt-5.4-mini, false | passed | 100 | 2 / 1 / 1 | — |

- **Suite gate: PASS — exit 0.** All 4 trials completed; requested == observed model for
  every trial (all `mismatch: false`). Turn metrics populated (qna-probe: 1 question turn,
  1 interruption; healthcheck: no questions). External `files-changed` metrics present for
  both healthcheck trials and rendered in `suite.md` (`## External metrics`). The cheap
  models scored well here (healthcheck 100/97, qna-probe 100/100) — an honest lower score
  or a justified fail on a cheap model would also have been acceptable; harness correctness
  is the bar, and all four ran clean.
- **codex healthcheck `files-changed=3` vs claude's `2`:** codex's diff includes its own
  workspace-scoped `.codex/hooks.json` (a harness artifact per §10.2), matching the M6
  judge's observation — the external metric independently corroborates it.

### Harness Anthropic $ (fast/workhorse/judge only; agent tokens billed to the user's CLI)

Agent models `claude-haiku-4-5-20251001` and `gpt-5.4-mini` are not in the demo `pricing`
map → reported **tokens-only** (as designed). Harness classify/judge spend remained cents.

## Runs used

- Step-0 codex qna-probe: 1 (passed, confirmed).
- agentModel-identifier probes: 2 of ≤2 — (1) claude `haiku` on qna-probe revealed the
  observed id AND surfaced the permission-prompt gap below; (2) combined qna-probe × both
  agents with the fixed config → both passed, both identifiers confirmed.
- Suite runs: 1 of ≤2 — the final 4-trial run above (exit 0). Second suite run not needed.

## Open questions / deviations

- **claude `--permission-mode auto` + a cheap model prompts for edits (harness gap the
  cheap tier exposed).** Probe 1 (`haiku`) hung: claude asked+answered correctly, drafted
  `greeting.txt`, then rendered a **"Do you want to create greeting.txt?"** edit-permission
  prompt that `auto` did NOT auto-approve (M6.5's claude passed the same case on *sonnet*
  under `auto` with no prompt — `auto` appears to delegate the decision to the model, and
  the cheap model chose to ask). The harness has no handler for a recurring edit-permission
  prompt (`dialogPatterns` dedupe per-pattern and so cannot clear repeated prompts), so it
  froze → `agent-hung`. **Fix applied in the demo config only:** override claude's args to
  `--permission-mode acceptEdits`, which deterministically auto-accepts edits (P2: "permission
  prompts are noise"). The **adapter default remains `auto`** per arch §10.1/P2 — this is a
  deviation confined to `demo/curiocity.demo.json`. **Recommendation:** reconsider the
  adapter default (`acceptEdits`/`bypassPermissions`) or add recurring-permission handling,
  since `auto` does not reliably auto-handle permissions across models.
- **Time decomposition attribution for single-turn done trials (pre-existing, M6.5):**
  healthcheck shows `agentPureMs ≈ 0` with the agent's work time landing in `launchMs`
  (~17 s). Cause: claude's `json-only` readiness returns only after output settles, i.e.
  after the agent has finished the single turn, so the turn loop sees an already-complete
  transcript (turnStart ≈ stopAt). This is a readiness/interact boundary quirk of the M6.5
  time-decomposition, not a M6.6 change; turn metrics (derived from the same timeline) are
  unaffected and correct.
