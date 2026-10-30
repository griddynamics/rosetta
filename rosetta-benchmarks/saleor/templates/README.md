# Run report templates

| Template | Task | Copy to |
| --- | --- | --- |
| [run-report-small.md](./run-report-small.md) | Small: product storage conditions | `saleor/runs/small-storage-conditions/<runner>/<method>/report.md` |
| [run-report-large.md](./run-report-large.md) | Large: age-restricted products | `saleor/runs/large-age-restriction/<runner>/<method>/report.md` |

One folder per run ID. A new run of the same ID replaces the folder: commit the old run first, then it stays in git history.

Each report has two parts:

- **Data block** (YAML front matter at the top): every number of the run, with fixed names. It is the only place for numbers.
- **Evidence** (sections below it): timeline, hidden questions, "Done when" checks, red flags, and appendices with the raw `/usage` output and agent messages. Every number in the data block must be traceable to a row here.

## Measurement rules

The same rules for every operator, so results are comparable.

1. **Measure, don't estimate.** Copy numbers from the runner or the clock. Unknown → leave empty, never guess.
2. **Fixed points in time.** T0 = the moment the task prompt is sent. T1 = the agent's first message that says the task is done. T2 = the end of the agent's answer to the last protocol follow-up (`extra-work` rows do not move T2). Minute precision, local time, ISO 8601 (`2026-10-20T14:05`). Run time is gap-free: `t1` − `t0` minus the time the agent was blocked waiting for the operator (BENCHMARKS.md, section 5, "Time without the operator's gaps"). `t0` in the data block is the effective start; the real `t0` is timeline row #1.
3. **Usage is cumulative** for the whole session, read at T1 and again at T2. Don't subtract T1 from T2 and don't convert units. The one sum you do make: each `t1_*` / `t2_*` token field is the sum over all model rows of that `/usage` panel (main model, every subagent model, runner-internal model), as the runner shows them; never one row, and never the session-log totals from `tokens.md` (the log can miss subagent calls). The cost or credits field is the runner's own total, and the model costs must add up to it.
4. **One cell = same conditions.** Same start tag, same seed database, same model and effort, new session, isolation check passed. Anything different goes into "Deviations" in section 8, and the run is marked in the comparison.
5. **Operator answers come from fixed sources**: the hidden-question tables (BENCHMARKS.md, section 4) and the extra answers in the same section. No other help.
6. **The operator scores before seeing other methods' results** for the same task, so one run doesn't anchor the next.
7. **Size comes from the diff, not from the runner.** The "Code changes" (Claude Code) or "Changes" (Copilot) line of `/usage` is the main agent's own edit-tool lines only and is not the size of the change. Report the size from the saved `<repo>.diff` files (BENCHMARKS.md, step 10), keep it in section 2 with the usage by model table, and never quote the counter as the size.

## Metric definitions

| Key | Unit | Definition |
| --- | --- | --- |
| `t0`, `t1`, `t2` | time | See rule 2. |
| `time_first_min` *(computed when comparing)* | min | `t1 − t0`. Time to the first "done". |
| `time_total_min` *(computed when comparing)* | min | `t2 − t0`. Time until the task is really done. |
| `setup_min` | min | One-time method installation and init. Not part of any run. |
| `t1_*`, `t2_*` tokens | tokens | Input, output, cache read, cache write, as the runner reports them. |
| `t1_cost_usd`, `t2_cost_usd` | USD | Claude Code: the `Total cost` line of `/usage`. Copilot: leave empty. |
| `t1_ai_credits`, `t2_ai_credits` | AI credits | Copilot CLI: AI credits for the session, from `/usage` or `tokens.md`. Claude Code: leave empty. |
| `tokens_total` *(computed when comparing)* | tokens | `t2` input + output + cache write. Cache reads are listed separately (they are cheaper). |
| `rework_share` *(computed when comparing)* | % | Usage after T1 ÷ usage at T2 (cost for Claude Code, AI credits for Copilot CLI). How much was spent to fix a "done" that wasn't done. |
| `subagents` | count | Subagents launched in the session. |
| `method_steps` | count | Messages that only move the method to its next step: `Approved, continue.` or the method's own next command. Baseline: also the plan approval in the runner's menu. |
| `questions_total` | count | Agent questions answered by the operator. `= questions_hidden + questions_extra`. |
| `followups` | count | Operator messages that ask for a fix or a missing part: hidden questions not covered at the T1 check, and things the operator found broken in their own check. Not counted: `extra-work` rows (any message the protocol does not define, e.g. an extra check or an idea suggested by a helper). Their usage is reported separately in Appendix A, block `## Extra work`. |
| `retries` | count | Restarts from reset (method didn't activate, infra failure). |
| `hidden_asked` | count | Hidden questions the agent asked before or during implementation. |
| `hidden_covered` | count | Hidden questions not asked, but handled correctly by T1. |
| `hidden_missed` | count | Hidden questions that needed a follow-up. `asked + covered + missed = hidden_total`. |
| `first_pass_coverage` *(computed when comparing)* | % | `(hidden_asked + hidden_covered) ÷ hidden_total`. |
| `hidden_matches_answer` | count | Hidden questions where the original result (the first pass, before any follow-up) follows the answer key: asked and answered correctly, or covered at T1; a miss that needed a follow-up does not count. yes = 1, partly = 0.5. |
| `done_checks_passed` | count | "Done when" checks passed at T2, checked by the operator (section 4). |
| `red_flags` | count | Ticked items in section 5. |
| `tests_pass` | yes / no | The operator ran the tests at T2 and they passed. |
| `operator_score` | 1–5 | 1 = broken or missing · 2 = major gaps · 3 = works with notable gaps · 4 = minor issues only · 5 = nothing to fix. |
| `operator_merge_ready` | yes / no | Could be merged after a normal review, without rework. |
| `verified_in_code` | x/y | From the judge's step 0.3: items found implemented in the diff / items checked. |
| `judge_total` | number | Diff score: Σ(value × weight) / Σ(10 × weight) × 100 + bonus (BENCHMARKS.md, section 6). |
| `judge_bonus` | number | Bonus points for bugs the run fixed and distinct improvements related to the job. |
| `judge_blockers`, `judge_majors`, `judge_minors`, `judge_strengths` | count | Findings of the diff judge by level. |
| `judge_merge_ready_advice` | none / no / yes | The judge's advice on `operator_merge_ready`; the operator decides. |

Allowed values: `method` is one of `baseline`, `grill-with-docs`, `superpowers`, `spec-kit`, `aws-ai-dlc`, `rosetta`, `rosetta-light`, `rosetta-skills`. `runner` is one of `claude-code`, `copilot`. `status` is one of `done`, `not-qualifying`, `infra-fail`. `setup_mark` is one of `official`, `manual-port`.

## How runs are compared

- **Within one runner only.** The two runners use different models, so Claude Code vs Copilot is a product + model difference, not a method difference.
- **Like with like.** Light methods (Grill-with-docs, Rosetta Light, Baseline) and full-process methods (Rosetta, Spec Kit, AI-DLC, Superpowers) are also shown as separate groups, because they do different amounts of work.
- **One run per cell for now.** A re-run replaces the earlier one (it stays in git history); no medians yet.
- **Quality first, then cost.** A method is compared on cost only among runs that pass (`done_checks_passed` = total, `tests_pass` = yes). A cheap run that doesn't work is not "cheaper".
