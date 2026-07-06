# Curiocity

An evals/testing harness that drives interactive coding-agent CLIs (Claude Code, Codex CLI) through a prompt over a real PTY, reads each CLI's native on-disk transcript as the source of truth, auto-answers the agent's genuine questions via LLM, then scores every run with deterministic checks + an LLM judge and gates CI on the aggregate.

- **Curiocity** (orchestrator) discovers cases, builds the `agent × case × repeat` matrix, forks one worker per cell, aggregates, reports, and picks the exit code.
- **Curion** (worker) owns exactly one trial in an isolated workspace and returns one verdict + metrics.

The full design lives in [`architecture.md`](./docs/architecture.md). This README is how to run it. The [`demo/`](./demo) folder is the living example.

## Prerequisites

- **Node ≥ 20.**
- **A C/C++ build toolchain** — `node-pty` compiles a native addon at install (Xcode Command Line Tools on macOS, `build-essential` on Linux). Without it, install fails. CI images need build tools.
- **The agent CLIs installed and authenticated** by you. Curiocity never manages agent auth. Install `claude` and/or `codex`, sign in once, done.
- **An unsandboxed process.** A sandboxed harness blocks the agent from writing under `$HOME`, so no transcript ever appears. `validate`/`run` preflight agent-home writeability and fail fast. Run outside any sandbox.
- **LLM API keys** for the harness roles (question-answering + judging). See [Models, effort & cost](#models-effort--cost).

## Install & run

Published to npm, so no clone needed:

```bash
npx -y curiocity@latest validate --source ./cases
npx -y curiocity@latest run --source ./cases
```

Local dev from this folder:

```bash
npm install           # builds node-pty
npm run dev -- validate --source demo/cases    # tsx, no build step
npm run build && node dist/cli.js run --source demo/cases
```

## Quickstart (demo)

The demo runs two cases against Claude Code and Codex on the cheap model tier. It needs an authenticated `claude`/`codex` and an Anthropic key (see below).

```bash
# 1. Dry-run: see the resolved matrix + config, run nothing.
node dist/cli.js run --source demo/cases --config demo/curiocity.demo.json --dry-run

# 2. Discovery + preflight only: valid cases, skip reasons, P10 check.
node dist/cli.js validate --source demo/cases

# 3. Run the suite (evaluate + cost + stats ON by default).
node dist/cli.js run --source demo/cases --config demo/curiocity.demo.json

# 4. Re-score a stored run with new stats/thresholds — never re-runs agents.
node dist/cli.js report ./curiocity-results/run-<timestamp>
```

## Commands

```
curiocity run --source <dir> [options]        # suite mode: evaluate/cost/stats ON
curiocity run --prompt <file|text> [options]  # inline mode: OFF by default (--evaluate to enable)
curiocity report <resultsDir> [--reporter json,markdown] [--config <file>]
curiocity validate --source <dir>             # discovery dry-run + P10 preflight
```

`run` options (all override config; every one usable in CI):

| Option | Meaning |
|---|---|
| `--agent <id>` (repeatable) | limit agents |
| `--case <glob>` (repeatable) | limit cases by name |
| `--repeats <n>` | override case repeats |
| `--concurrency <n>` | pool size (1 = serial debugging) |
| `--timeout <sec>` | per-trial wall-clock cap |
| `--evaluate` / `--no-evaluate` | toggle evaluation (D9 default per mode) |
| `--collect-cost` / `--no-collect-cost` | toggle cost collection |
| `--only-evaluator <id>` / `--skip-evaluator <id>` | narrow the eval pipeline |
| `--mirror` | stream PTY output live |
| `--keep-workspace` | keep all workspaces (not just failed ones) |
| `--dry-run` | print resolved matrix + config, run nothing |
| `--prompt/--qna/--eval/--src` | inline-case inputs |
| `--fast-model / --workhorse-model / --judge-model <provider/model>` | tier overrides |
| `--agent-model <id>=<model>` / `--agent-effort <id>=<effort>` (repeatable) | per-agent model/effort |
| `--out <dir>`, `--config <file>` | paths |

## Authoring a case

`--source <folder>`: each immediate subfolder is one case. A subfolder is runnable only when **all five files** are present, else it is skipped with a logged reason (`validate` lists both).

| File | Role |
|---|---|
| `prompt.md` | The task, passed to the agent as its launch argument. |
| `config.json` | Agents, timeout, repeats, evaluators, provisioning, setup/teardown. |
| `qna.md` | Policy for answering the agent's genuine questions — approvals, denials, and a hard "if unsure, abort". Consumed only by the answering LLM. |
| `evaluation.md` | Prose rubric for the LLM judge, passed verbatim. Deterministic checks do NOT live here. |
| `src.zip` | Source archive unzipped into the workspace before launch. "From scratch" tasks ship a minimal/empty zip. |

**Inline case:** `--prompt <file|text>` (+ optional `--qna`, `--eval`, `--src`, `--agent`) builds the same case in memory. Missing pieces get neutral defaults; evaluation is off unless `--evaluate` + `--eval`.

### Evaluators

Declared as `evaluators` entries in `config.json`; `use` names a built-in. `gate:true` makes a failure fail the trial; `weight` sets its share of the scored mean.

- **`file-exists`** — globs that must / must-not exist in the final workspace.
- **`command`** — run a build/test/lint string via shell; assert the exit code.
- **`trajectory-check`** — assert `tool_call` events matched a pattern (the "did our plugin actually run" gate). `toolPattern` is one regex or a per-agent map.
- **`llm-judge`** — judge model scores 0–100 from `evaluation.md` + distilled trajectory + produced artifacts (`artifacts` globs, size-capped) + QnA log.
- **`external`** — run any program that reads a JSON object (file **paths**, not blobs) on stdin and prints `{"values":[{"name":string,"value":number}]}` on stdout, e.g. `{"values":[{"name":"coverage","value":87}]}` (each `value` in 0-100). Optional `scoreMetric`/`passThreshold` turn a metric into a pass/score; otherwise the metrics are informational. Non-zero exit / bad JSON / out-of-range / timeout fails the evaluator.

Example (from [`demo/cases/healthcheck/config.json`](./demo/cases/healthcheck/config.json)):

```jsonc
{
  "agents": ["claude-code", "codex"],
  "timeoutSec": 600,
  "repeats": 1,
  "evaluators": [
    { "use": "file-exists", "must": ["HEALTHCHECK.md", "**/HealthController.java"], "gate": true },
    { "use": "llm-judge", "rubric": "evaluation.md", "artifacts": ["**/*.md"], "weight": 1.0 },
    { "use": "external", "command": "node", "args": ["count-changed-files.mjs"], "timeoutSec": 30 }
  ],
  "combiner": "gated-mean"
}
```

The default combiner `gated-mean`: every `gate:true` result must pass (else the trial fails with score capped), then the verdict score is the weighted mean of scored results vs `passThreshold` (default 60).

## Configuration

Precedence, lowest to highest: **built-in defaults < top-level config (`--config`, default `./curiocity.config.json`) < case `config.json` < CLI flags.** Provisioning merges by name (same name overrides, new adds). Setup/teardown arrays concatenate (top-level first).

Top-level config sketch:

```jsonc
{
  "codingagents": { "claude-code": { /* profile */ }, "codex": { /* profile */ } },
  "models":  { "fast": "anthropic/claude-haiku-4-5", "workhorse": "anthropic/claude-sonnet-4-6" },
  "pricing": {                                      // optional; enables $ in cost-rollup
    "anthropic/claude-haiku-4-5":  { "inputPer1M": 1.0, "outputPer1M": 5.0 },
    "anthropic/claude-sonnet-4-6": { "inputPer1M": 3.0, "outputPer1M": 15.0 }
  },
  "provision": { "mcps": [], "plugins": [] },
  "setup": [], "teardown": [],
  "gate": { "minScore": 60, "minPassRate": 0.8, "maxStddev": 10 },
  "concurrency": 4,
  "out": "./curiocity-results"
}
```

**Setup/teardown and the `command` evaluator run user-authored shell lines** (`shell:true`) — they take shell syntax by design and are trusted at the case-authoring level. The `external` evaluator invokes a program with an explicit argv (no shell). No agent output is ever interpolated into a shell command.

## Models, effort & cost

Three harness roles map to `"provider/model"` strings: `fast` (high-frequency classification), `workhorse` (question replies), `judge` (defaults to workhorse). Providers: `anthropic`, `openai` (add one = dependency + a line in `llm/providers.ts`).

The **agent's own model/effort** is a separate dimension from the harness roles: set `agentModel`/`agentEffort` on the profile, per-case, or via `--agent-model`/`--agent-effort`.

**Cost policy — track and warn, never abort.** Aborting mid-suite contaminates benchmark results.
- Cheap tier is the default for the bulk of testing: Claude Code on **Sonnet at low reasoning effort** (supports auto permission mode; Haiku does not), Codex on **gpt-5.4-mini**. Reserve smarter/full-effort models for final validation.
- Token counts are always reported. Dollar amounts come only from the config `pricing` map; unpriced models report tokens-only with a warning.
- An optional `budgetUsd` over-budget warns once and keeps going.

**Keys.** Resolved once at startup, held in memory, shipped to workers over IPC, masked in logs, never written to disk. Per provider, precedence is `CURIOCITY_<PROVIDER>_KEY` then the provider-standard var (e.g. `ANTHROPIC_API_KEY`), checked first in the environment, then in a `.env` file in the current working directory. A provider with no key is fine unless a role actually needs it.

## Stats

Computed per `(case × agent)` group and suite-wide, from stored trial JSON (so `report` applies new stats retroactively):

- **`score-stats`** — min/max/mean/median/stddev of scores (repeats > 1).
- **`pass-rate`** — passed / (passed + failed); error-status trials excluded.
- **`stability`** — stable-pass / flaky / stable-fail per group.
- **`cost-rollup`** — tokens (+$ if priced) itemized per model × per source (agent vs harness fast/workhorse/judge). Only the `$` total is additive across models.
- **`time-rollup`** — measured decomposition: total wall + per-phase walls, plus `agentPureMs` (agent execution, excluding all harness reaction) vs `harnessReactMs` (LLM time per model vs overhead), and turn metrics (`turnsTotal`, `questionTurns`, `interruptions`).

## Exit codes

| Code | Meaning |
|---|---|
| `0` | all groups pass all gates; no error-status trials |
| `1` | gate failure (score / pass-rate / flakiness) |
| `2` | config error or total infra failure (invalid config, no runnable trials, preflight failed) |
| `3` | partial infra failure: some trials ended in an error status, but every gate on completed trials passes |

Gate failure takes precedence over partial-infra (both → `1`). The gate is evaluated per `(case × agent)` group: `minScore` vs mean, `minPassRate` vs pass-rate, `maxStddev` vs stddev (repeats > 1 only). Any violating group fails the suite.

## Results

Each run writes a timestamped dir under `--out`:

```
run-<timestamp>/
  suite.json   suite.md            # aggregate: config snapshot, matrix, stats, gate
  trials/<case>/<agent>/<repeat>/
    trial.json trajectory.jsonl raw-transcript.jsonl screen.log workspace.diff
```

`report <dir>` recomputes stats + reporters + gate from the stored `TrialResult`s. It never re-runs agents, evaluators, or the judge.

## Development

```bash
npm run dev        # tsx CLI, no build
npm run build      # tsup → dist/
npm run lint       # tsc --noEmit (strict)
npm test           # vitest: unit + integration
npm run smoke      # integration only: full fork+PTY loop against the mock agent, zero tokens
```

Contract tests against your locally installed CLIs: `npm run contract:claude`, `npm run contract:codex`. Live E2E is manual/nightly and needs authenticated CLIs.

### Known `npm audit` findings

`npm audit` reports 5 vulnerabilities (1 critical, 1 high, 3 moderate), all in the `vitest → vite → esbuild / @vitest/mocker / vite-node` chain:

- **All are dev-only** (test runner). They never ship — the published package is `dist/` only (see `files` in `package.json`).
- **All describe the vite/vitest dev server or UI server**, which this project never runs; CI uses `vitest run`.
- **The only fix is a major vitest bump** (`vitest@4`), which risks the test gates. Deferred to a dedicated upgrade rather than folded into a release. Re-audit after any vitest upgrade.
