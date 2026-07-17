# Curiocity suite report

- Run: `tests/e2e-tests/.runtime/results/run-2026-07-16T16-56-09-189Z/run-2026-07-16T16-56-09Z`
- Created: 2026-07-16T17:07:58.951Z
- Trials: 3 · Matrix cells: 3

## Gate

- Result: **FAIL** (exit 1)
- Failures:
  - coding-vanilla::claude-code: mean score 38.0 < minScore 60
  - coding-vanilla::claude-code: pass-rate 0.00 < minPassRate 0.8
  - coding-vanilla-full::claude-code: mean score 57.0 < minScore 60
  - coding-vanilla-full::claude-code: pass-rate 0.00 < minPassRate 0.8

## Groups (case × agent)

| Case | Agent | Trials | Passed | Failed | Errors | Pass-rate | Mean score | Stability |
|---|---|---|---|---|---|---|---|---|
| coding-rosetta | claude-code | 1 | 1 | 0 | 0 | 1.00 | 89.0 | stable-pass |
| coding-vanilla | claude-code | 1 | 0 | 1 | 0 | 0.00 | 38.0 | stable-fail |
| coding-vanilla-full | claude-code | 1 | 0 | 1 | 0 | 0.00 | 57.0 | stable-fail |

## Cost (per model × source)

| Case | Agent | Source | Model | Input | Output | Reasoning | Cache write | Cache read | Total | $ |
|---|---|---|---|---|---|---|---|---|---|---|
| coding-rosetta | claude-code | agent | claude-sonnet-5 | 134 | 25607 | 0 | 116432 | 4358822 | 4500995 | $13.81027 |
| coding-rosetta | claude-code | fast | anthropic/claude-sonnet-5 | 2345 | 33 | 0 | 0 | 0 | 2378 | $0.00753 |
| coding-rosetta | claude-code | workhorse | anthropic/claude-sonnet-5 | 4744 | 32 | 0 | 0 | 0 | 4776 | $0.01471 |
| coding-rosetta | claude-code | judge | anthropic/claude-sonnet-5 | 29379 | 2284 | 0 | 0 | 0 | 31663 | $0.12240 |
| coding-vanilla | claude-code | agent | claude-sonnet-5 | 18 | 1439 | 0 | 20512 | 315340 | 337309 | $1.02920 |
| coding-vanilla | claude-code | fast | anthropic/claude-sonnet-5 | 391 | 11 | 0 | 0 | 0 | 402 | $0.00134 |
| coding-vanilla | claude-code | judge | anthropic/claude-sonnet-5 | 4173 | 639 | 0 | 0 | 0 | 4812 | $0.02210 |
| coding-vanilla-full | claude-code | agent | claude-sonnet-5 | 54 | 6411 | 0 | 32120 | 1087794 | 1126379 | $3.45607 |
| coding-vanilla-full | claude-code | fast | anthropic/claude-sonnet-5 | 479 | 11 | 0 | 0 | 0 | 490 | $0.00160 |
| coding-vanilla-full | claude-code | judge | anthropic/claude-sonnet-5 | 13772 | 1391 | 0 | 0 | 0 | 15163 | $0.06218 |

- **Suite $ total: $18.52740** (additive across models)

## Time (total vs agent-pure)

| Case | Agent | Total | Agent (pure) | Harness react | — LLM | — overhead | Checks | Judge LLM |
|---|---|---|---|---|---|---|---|---|
| coding-rosetta | claude-code | 499.10s | 459.00s | 10.96s | 35.35s | 0.41s | 3.68s | 24.80s |
| coding-vanilla | claude-code | 38.58s | 21.59s | 2.30s | 12.22s | 0.00s | 4.02s | 9.92s |
| coding-vanilla-full | claude-code | 171.20s | 148.37s | 2.88s | 18.59s | 0.00s | 3.16s | 15.72s |

## Turn metrics

| Case | Agent | Turns | Question turns | Interruptions | Mean turns | Mean q-turns | Mean interruptions |
|---|---|---|---|---|---|---|---|
| coding-rosetta | claude-code | 3 | 2 | 1 | 3.0 | 2.0 | 1.0 |
| coding-vanilla | claude-code | 1 | 0 | 0 | 1.0 | 0.0 | 0.0 |
| coding-vanilla-full | claude-code | 1 | 0 | 0 | 1.0 | 0.0 | 0.0 |

## External metrics

| Case | Agent | Metric | Mean | Min | Max | Stddev | Count |
|---|---|---|---|---|---|---|---|
| coding-rosetta | claude-code | manual_qa_ran_service | 1.0 | 1.0 | 1.0 | 0.0 | 1 |
| coding-rosetta | claude-code | manual_qa_hit_endpoint | 1.0 | 1.0 | 1.0 | 0.0 | 1 |
| coding-rosetta | claude-code | manual_qa_verified | 1.0 | 1.0 | 1.0 | 0.0 | 1 |
| coding-rosetta | claude-code | hook_events_declared | 1.0 | 1.0 | 1.0 | 0.0 | 1 |
| coding-rosetta | claude-code | hook_events_checked | 1.0 | 1.0 | 1.0 | 0.0 | 1 |
| coding-rosetta | claude-code | hook_events_fired | 1.0 | 1.0 | 1.0 | 0.0 | 1 |
| coding-rosetta | claude-code | hook_events_plugin_matched | 1.0 | 1.0 | 1.0 | 0.0 | 1 |
| coding-vanilla | claude-code | manual_qa_ran_service | 0.0 | 0.0 | 0.0 | 0.0 | 1 |
| coding-vanilla | claude-code | manual_qa_hit_endpoint | 0.0 | 0.0 | 0.0 | 0.0 | 1 |
| coding-vanilla | claude-code | manual_qa_verified | 0.0 | 0.0 | 0.0 | 0.0 | 1 |
| coding-vanilla-full | claude-code | manual_qa_ran_service | 1.0 | 1.0 | 1.0 | 0.0 | 1 |
| coding-vanilla-full | claude-code | manual_qa_hit_endpoint | 1.0 | 1.0 | 1.0 | 0.0 | 1 |
| coding-vanilla-full | claude-code | manual_qa_verified | 1.0 | 1.0 | 1.0 | 0.0 | 1 |

## Evaluators (per trial)

| Case | Agent | Repeat | Evaluator | Pass | Score | Gate | Confidence | Perplexity | Details |
|---|---|---|---|---|---|---|---|---|---|
| coding-rosetta | claude-code | 1 | file-exists | pass | — | yes | — | — | all file-exists constraints satisfied |
| coding-rosetta | claude-code | 1 | command | pass | — | yes | — | — | `cd "$(find . -type d -name spring-boot-server \| head -1)" && ./mvnw -q -Dstyle.color=never test` … |
| coding-rosetta | claude-code | 1 | manual-qa-check | pass | — | no | — | — | manual QA: passed (ran service + hit /api/health + verified 200/UP) |
| | | | ↳ manual_qa_ran_service | — | 1 | — | — | — | metric |
| | | | ↳ manual_qa_hit_endpoint | — | 1 | — | — | — | metric |
| | | | ↳ manual_qa_verified | — | 1 | — | — | — | metric |
| coding-rosetta | claude-code | 1 | hook-transcript-check | pass | — | no | — | — | SessionStart: fired+matched (context-injection token "high_important_core_policies") |
| | | | ↳ hook_events_declared | — | 1 | — | — | — | metric |
| | | | ↳ hook_events_checked | — | 1 | — | — | — | metric |
| | | | ↳ hook_events_fired | — | 1 | — | — | — | metric |
| | | | ↳ hook_events_plugin_matched | — | 1 | — | — | — | metric |
| coding-rosetta | claude-code | 1 | llm-judge | pass | 89.0 | no | 85 | — | 1) API contract correctness (20/20): New HealthController in com.bezkoder.spring.datajpa.controller… |
| coding-vanilla | claude-code | 1 | file-exists | pass | — | yes | — | — | all file-exists constraints satisfied |
| coding-vanilla | claude-code | 1 | command | pass | — | yes | — | — | `cd "$(find . -type d -name spring-boot-server \| head -1)" && ./mvnw -q -Dstyle.color=never test` … |
| coding-vanilla | claude-code | 1 | manual-qa-check | fail | — | no | — | — | manual QA: none (no live run detected) |
| | | | ↳ manual_qa_ran_service | — | 0 | — | — | — | metric |
| | | | ↳ manual_qa_hit_endpoint | — | 0 | — | — | — | metric |
| | | | ↳ manual_qa_verified | — | 0 | — | — | — | metric |
| coding-vanilla | claude-code | 1 | llm-judge | fail | 38.0 | no | 85 | — | 1) API contract correctness (20/20): New HealthController in correct package, @GetMapping resolving… |
| coding-vanilla-full | claude-code | 1 | file-exists | pass | — | yes | — | — | all file-exists constraints satisfied |
| coding-vanilla-full | claude-code | 1 | command | pass | — | yes | — | — | `cd "$(find . -type d -name spring-boot-server \| head -1)" && ./mvnw -q -Dstyle.color=never test` … |
| coding-vanilla-full | claude-code | 1 | manual-qa-check | pass | — | no | — | — | manual QA: passed (ran service + hit /api/health + verified 200/UP) |
| | | | ↳ manual_qa_ran_service | — | 1 | — | — | — | metric |
| | | | ↳ manual_qa_hit_endpoint | — | 1 | — | — | — | metric |
| | | | ↳ manual_qa_verified | — | 1 | — | — | — | metric |
| coding-vanilla-full | claude-code | 1 | llm-judge | fail | 57.0 | no | 78 | — | 1) API contract correctness (20/20): HealthController placed in correct package, GET /api/health vi… |

## Trials

| Case | Agent | Repeat | Status | Score | Verdict | Transcript |
|---|---|---|---|---|---|---|
| coding-rosetta | claude-code | 1 | passed | 89.0 | pass | hook |
| coding-vanilla | claude-code | 1 | failed | 38.0 | fail | hook |
| coding-vanilla-full | claude-code | 1 | failed | 57.0 | fail | hook |
