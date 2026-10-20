# Run report templates

| Template | Task | Copy to |
| --- | --- | --- |
| [run-report-small.md](./run-report-small.md) | Small: product storage conditions | `saleor/runs/small-storage-conditions/<runner>/<method>/report.md` |
| [run-report-large.md](./run-report-large.md) | Large: age-restricted products | `saleor/runs/large-age-restriction/<runner>/<method>/report.md` |

Repetitions of the same cell: folders `<method>.r2/`, `<method>.r3/`, and `repetition: 2`, `3` in the data block.

Pilot runs (a trial run to test the setup, not a result): folder `<method>.pilot/` and `status: pilot`. Pilots are kept for reference and never enter the comparison; the real run of the cell goes into `<method>/`.

Each report has two parts:

- **Data block** (YAML front matter at the top): every number of the run, with fixed names. It is the only place for numbers.
- **Evidence** (sections below it): timeline, hidden questions, "Done when" checks, red flags, and appendices with the raw `/cost` output and agent messages. Every number in the data block must be traceable to a row here.

## Measurement rules

The same rules for every operator, so results are comparable.

1. **Measure, don't estimate.** Copy numbers from the runner or the clock. Unknown → leave empty, never guess.
2. **Fixed points in time.** T0 = the moment the task prompt is sent. T1 = the agent's first message that says the task is done. T2 = the end of the agent's answer to the last follow-up. Minute precision, local time, ISO 8601 (`2026-10-20T14:05`).
3. **Usage is cumulative** for the whole session, read at T1 and again at T2. Don't subtract, add up or convert: the script does that.
4. **One cell = same conditions.** Same start tag, same seed database, same model and effort, new session, isolation check passed. Anything different goes into "Deviations" in section 8, and the run is marked in the comparison.
5. **Operator answers come from fixed sources**: the hidden-question tables (BENCHMARKS.md, section 4) and the extra answers in the same section. No other help.
6. **The operator scores before seeing other methods' results** for the same task, so one run doesn't anchor the next.

## Metric definitions

| Key | Unit | Definition |
| --- | --- | --- |
| `t0`, `t1`, `t2` | time | See rule 2. |
| `time_first_min` *(computed when comparing)* | min | `t1 − t0`. Time to the first "done". |
| `time_total_min` *(computed when comparing)* | min | `t2 − t0`. Time until the task is really done. |
| `setup_min` | min | One-time method installation and init. Not part of any run. |
| `t1_*`, `t2_*` tokens | tokens | Input, output, cache read, cache write, as the runner reports them. |
| `t1_cost_usd`, `t2_cost_usd` | USD | Claude Code `/cost` total. Copilot: leave empty. |
| `t1_premium_requests`, `t2_premium_requests` | requests | Copilot premium-request counter for the session. Claude Code: leave empty. |
| `tokens_total` *(computed when comparing)* | tokens | `t2` input + output + cache write. Cache reads are listed separately (they are cheaper). |
| `rework_share` *(computed when comparing)* | % | Usage after T1 ÷ usage at T2 (cost, or premium requests for Copilot). How much was spent to fix a "done" that wasn't done. |
| `subagents` | count | Subagents launched in the session. |
| `method_steps` | count | Messages that only move the method to its next step: `Approved, continue.` or the method's own next command. Baseline: also the plan approval in the runner's menu. |
| `questions_total` | count | Agent questions answered by the operator. `= questions_hidden + questions_extra`. |
| `followups` | count | Operator messages after T1 that ask for a fix or a missing part. |
| `retries` | count | Restarts from reset (method didn't activate, infra failure). |
| `hidden_asked` | count | Hidden questions the agent asked before or during implementation. |
| `hidden_covered` | count | Hidden questions not asked, but handled correctly by T1. |
| `hidden_missed` | count | Hidden questions that needed a follow-up. `asked + covered + missed = hidden_total`. |
| `first_pass_coverage` *(computed when comparing)* | % | `(hidden_asked + hidden_covered) ÷ hidden_total`. |
| `hidden_matches_answer` | count | Hidden questions where the final code follows the answer key. yes = 1, partly = 0.5. |
| `done_checks_passed` | count | "Done when" checks passed at T2, checked by the operator (section 4). |
| `red_flags` | count | Ticked items in section 5. |
| `tests_pass` | yes / no | The operator ran the tests at T2 and they passed. |
| `operator_score` | 1–5 | 1 = broken or missing · 2 = major gaps · 3 = works with notable gaps · 4 = minor issues only · 5 = nothing to fix. |
| `operator_merge_ready` | yes / no | Could be merged after a normal review, without rework. |
| `verified_in_code` | x/y | From the judge's step 0.3: items found implemented in the diff / items checked. |
| `judge_absolute`, `judge_side_by_side` | /40 | Judge scores (BENCHMARKS.md, section 6). |
| `judge_merge_ready` | yes / no | Judge's merge-ready verdict. |

Allowed values: `method` is one of `baseline`, `grill-with-docs`, `superpowers`, `spec-kit`, `aws-ai-dlc`, `rosetta`, `rosetta-light`. `runner` is one of `claude-code`, `copilot`, `copilot-cli`. `status` is one of `done`, `not-qualifying`, `infra-fail`, `pilot`. `setup_mark` is one of `official`, `copilot-cli`, `manual-port`.

## How runs are compared

- **Within one runner only.** The two runners use different models, so Claude Code vs Copilot is a product + model difference, not a method difference.
- **Like with like.** Light methods (Grill-with-docs, Rosetta Light, Baseline) and full-process methods (Rosetta, Spec Kit, AI-DLC, Superpowers) are also shown as separate groups, because they do different amounts of work.
- **Repetitions.** With several repetitions per cell, the comparison shows the **median** and the range (min–max) of each metric, and `n`. One run is not a result; three is the minimum for a conclusion.
- **Quality first, then cost.** A method is compared on cost only among runs that pass (`done_checks_passed` = total, `tests_pass` = yes). A cheap run that doesn't work is not "cheaper".
