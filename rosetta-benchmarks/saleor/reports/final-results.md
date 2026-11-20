# Saleor benchmark: final results

Eight methods, two tasks (small: storage conditions; large: age-restricted products), two runners (Claude Code, Copilot CLI): 32 runs, 28 with a result. One run per method and cell. All results are judged by the diff judge v2. Source: run reports in `saleor/runs/`, values in [runs.csv](runs.csv).

Compare methods only within one task and one runner: the tasks differ, and cost is in USD for Claude Code and in AI credits for Copilot CLI.

## Part 1. Results

Judge score: 0–100 from the diff judge; "of it bonus" is the part for correct work that the baseline run did not do. Follow-ups: messages the operator had to send after the first "done". Rows are sorted by judge score.

### Small task · Claude Code

| Method | Judge score | of it bonus | Merge advice | Blockers / majors / minors | Follow-ups | Hidden requirements found at first pass | Done checks | Cost | Time, min | Output tokens |
|---|---:|---:|---|---|---:|---:|---|---:|---:|---:|
| Rosetta coding flow | 74.6 | 5.90 | merge-ready | 0 / 0 / 6 | 0 | 100% | 8/8 | $20.13 | 71 | 437k |
| Rosetta Skills | 73.6 | 4.70 | merge-ready | 0 / 0 / 5 | 2 | 86% | 8/8 | $5.64 | 56 | 118k |
| Superpowers | 73.5 | 5.45 | not merge-ready | 0 / 1 / 7 | 1 | 86% | 7/8 | $8.08 | 41 | 140k |
| Rosetta Light | 73.4 | 5.20 | merge-ready | 0 / 0 / 8 | 0 | 100% | 8/8 | $5.48 | 92 | 529k |
| Grill-with-docs | 71.6 | 4.15 | not merge-ready | 0 / 1 / 6 | 1 | 100% | 8/8 | $4.89 | 38 | 102k |
| Spec Kit | 70.7 | 2.65 | not merge-ready | 0 / 1 / 6 | 3 | 57% | 8/8 | $12.65 | 144 | 187k |
| Baseline | 66.2 | 0.00 | not merge-ready | 0 / 2 / 8 | 3 | 57% | 7/8 | $3.31 | 50 | 82k |

AWS AI-DLC: no result (stopped before the first "done").

### Small task · Copilot CLI

| Method | Judge score | of it bonus | Merge advice | Blockers / majors / minors | Follow-ups | Hidden requirements found at first pass | Done checks | Cost | Time, min | Output tokens |
|---|---:|---:|---|---|---:|---:|---|---:|---:|---:|
| Rosetta coding flow | 74.8 | 6.05 | merge-ready | 0 / 0 / 6 | 2 | 86% | 8/8 | 1,172 cr | 76 | 284k |
| Spec Kit | 69.0 | 4.65 | not merge-ready | 0 / 3 / 11 | 5 | 100% | 8/8 | 870 cr | 39 | 111k |
| Rosetta Skills | 67.2 | 3.15 | not merge-ready | 0 / 3 / 12 | 3 | 86% | 7/8 | 635 cr | 13 | 38k |
| Superpowers | 67.0 | 2.00 | not merge-ready | 0 / 1 / 16 | 2 | 86% | 8/8 | 1,976 cr | 154 | 255k |
| Grill-with-docs | 66.7 | 3.90 | not merge-ready | 2 / 1 / 10 | 2 | 100% | 8/8 | 452 cr | 17 | 74k |
| Rosetta Light | 66.4 | 1.75 | not merge-ready | 0 / 3 / 10 | 2 | 86% | 8/8 | 617 cr | 61 | 254k |
| Baseline | 66.0 | 0.00 | not merge-ready | 0 / 2 / 11 | 5 | 71% | 8/8 | 389 cr | 27 | 45k |

AWS AI-DLC: no result (review gate looped at intent capture; no code written).

### Large task · Claude Code

| Method | Judge score | of it bonus | Merge advice | Blockers / majors / minors | Follow-ups | Hidden requirements found at first pass | Done checks | Cost | Time, min | Output tokens |
|---|---:|---:|---|---|---:|---:|---|---:|---:|---:|
| Rosetta Light | 78.4 | 10.60 | not merge-ready | 0 / 1 / 8 | 2 | 89% | 12/12 | $57.65 | 309 | 3.50M |
| Rosetta coding flow | 76.6 | 8.95 | merge-ready | 0 / 0 / 8 | 2 | 89% | 12/12 | $54.97 | 273 | 1.30M |
| Rosetta Skills | 75.0 | 7.70 | merge-ready | 0 / 0 / 11 | 2 | 100% | 12/12 | $24.73 | 173 | 738k |
| Grill-with-docs | 71.2 | 5.55 | not merge-ready | 0 / 3 / 10 | 2 | 100% | 12/12 | $10.17 | 55 | 134k |
| Superpowers | 67.9 | 2.40 | not merge-ready | 0 / 2 / 14 | 1 | 56% | 12/12 | $35.11 | 202 | 410k |
| Spec Kit | 67.8 | 3.40 | not merge-ready | 1 / 3 / 11 | 5 | 56% | 12/12 | $11.04 | 83 | 232k |
| Baseline | 64.6 | 0.00 | not merge-ready | 0 / 3 / 14 | 5 | 44% | 12/12 | $7.84 | 68 | 172k |

AWS AI-DLC: no result (stopped after 6+ hours, about $160).

### Large task · Copilot CLI

| Method | Judge score | of it bonus | Merge advice | Blockers / majors / minors | Follow-ups | Hidden requirements found at first pass | Done checks | Cost | Time, min | Output tokens |
|---|---:|---:|---|---|---:|---:|---|---:|---:|---:|
| Rosetta Skills | 78.5 | 10.95 | not merge-ready | 0 / 1 / 8 | 1 | 78% | 11/12 | 1,644 cr | 73 | 304k |
| Rosetta Light | 76.8 | 9.55 | merge-ready | 0 / 0 / 12 | 3 | 89% | 12/12 | 2,215 cr | 260 | 979k |
| Superpowers | 72.7 | 7.65 | not merge-ready | 0 / 3 / 14 | 2 | 78% | 7/12 | 1,888 cr | 160 | 280k |
| Rosetta coding flow | 69.3 | 6.00 | not merge-ready | 1 / 5 / 14 | 10 | 56% | 11/12 | 1,901 cr | 86 | 334k |
| Spec Kit | 67.6 | 4.75 | not merge-ready | 1 / 1 / 18 | 4 | 67% | 12/12 | 1,024 cr | 57 | 152k |
| Grill-with-docs | 65.5 | 5.00 | not merge-ready | 1 / 5 / 18 | 5 | 100% | 12/12 | 849 cr | 43 | 112k |
| Baseline | 64.0 | 0.00 | not merge-ready | 0 / 3 / 17 | 10 | 56% | 12/12 | 1,747 cr | 37 | 84k |

AWS AI-DLC: no result yet (L-CP-05, no run report).

## Part 2. What the judge scores show

- **Scores cluster around 70.** Each of 39 metrics gets 0–10; a metric with no findings gets 7, so a run with no findings scores 70. Only the worst finding in a metric counts (1 major and 1 major + 4 minors give the same grade). Six metrics got 7 in every run (2.3, 3.3, 4.3, 4.5, 5.2, 7.2). Base scores are 60–70; the bonus adds 0–11.
- **A Rosetta method is #1 in all four cells.** On large · Claude Code, Rosetta methods hold #1–#3.
- **Most of the lead on the large task is bonus.** Large · Claude Code: 5.05 of the 7.2-point lead. Large · Copilot CLI: 3.3 of the 5.8-point lead. Rosetta averages 9.1 bonus points against 2.8 for the others on large · Claude Code, and 8.8 against 4.4 on large · Copilot CLI.
- **Fewer findings.** Rosetta has fewer minors and more strengths in all four cells, and fewer majors and blockers in three of four.
- **Where Rosetta does not lead:** small · Claude Code is a tie (74.6 against Superpowers 73.5); there the lead comes from the metrics, not the bonus. Other methods score higher on data and migration integrity (1.3) and error handling (1.2).
- **Limits:** one run per method, so gaps of 1–2 points are within noise. Changing metric weights or the bonus scale moves the Rosetta lead by about half a point or less.

## Part 3. Leagues

Each run is placed by how much a person had to fix after the agent said "done". Small and large tasks have separate thresholds: the large task has more scope (9 hidden requirements, 12 checks, three apps). Order inside a league is by runner, then method; it is not a ranking. Cost, time, and tokens do not change the league.

- **Missed requirements:** hidden requirements the agent did not find out itself; the operator had to add them.
- **Feature bugs:** the agent said "done", but the feature does not work (e.g., Save stays disabled).
- **Broken build, tests, or page:** a page fails with an error, or the type check or tests fail.
- **Judge:** score, merge advice, blockers / majors / minors. The judge was told to ignore dashboard type errors (known benchmark deficiency, BENCHMARKS.md); they are counted in the "broken" column.

| League | Small task | Large task |
|---|---|---|
| **1. Works, good solution** | no feature bugs or breakage, at most 2 missed requirements, all checks pass | at most 1 bug or breakage, at most 3 missed requirements, all checks pass |
| **2. Accepted, with errors** | at most 2 bugs or breakages, at most 1 failed check | at most 3 bugs or breakages, at most 1 failed check |
| **3. Not recommended** | more than League 2 allows, a judge blocker, or no result | same |

### Small task (7 hidden requirements, 8 checks)

**League 1. Works, good solution** (5 runs)

| Runner | Method | Missed requirements | Feature bugs | Broken build, tests, or page | Done checks | Judge | Cost | Time, min | Output tokens | What happened |
|---|---|---:|---:|---:|---|---|---:|---:|---:|---|
| Claude Code | Rosetta coding flow | 0 | 0 | 0 | 8/8 | 74.6, merge-ready, 0 / 0 / 6 | $20.13 | 71 | 437k | No follow-ups |
| Copilot CLI | Rosetta coding flow | 1 | 0 | 0 | 8/8 | 74.8, merge-ready, 0 / 0 / 6 | 1,172 cr | 76 | 284k | Missed: webhook/CSV export |
| Claude Code | Rosetta Light | 0 | 0 | 0 | 8/8 | 73.4, merge-ready, 0 / 0 / 8 | $5.48 | 92 | 529k | No follow-ups |
| Copilot CLI | Rosetta Light | 1 | 0 | 0 | 8/8 | 66.4, not merge-ready, 0 / 3 / 10 | 617 cr | 61 | 254k | Missed: webhook/CSV export |
| Copilot CLI | Superpowers | 1 | 0 | 0 | 8/8 | 67.0, not merge-ready, 0 / 1 / 16 | 1,976 cr | 154 | 255k | Missed: webhook/CSV export |

**League 2. Accepted, with errors** (7 runs)

| Runner | Method | Missed requirements | Feature bugs | Broken build, tests, or page | Done checks | Judge | Cost | Time, min | Output tokens | What happened |
|---|---|---:|---:|---:|---|---|---:|---:|---:|---|
| Claude Code | Baseline | 3 | 0 | 0 | 7/8 | 66.2, not merge-ready, 0 / 2 / 8 | $3.31 | 50 | 82k | 3 missed requirements; 1 check failed |
| Copilot CLI | Baseline | 2 | 1 | 1 | 8/8 | 66.0, not merge-ready, 0 / 2 / 11 | 389 cr | 27 | 45k | Save button disabled; dashboard tests failing |
| Claude Code | Grill-with-docs | 0 | 0 | 1 | 8/8 | 71.6, not merge-ready, 0 / 1 / 6 | $4.89 | 38 | 102k | Dashboard type check fails |
| Claude Code | Rosetta Skills | 1 | 0 | 1 | 8/8 | 73.6, merge-ready, 0 / 0 / 5 | $5.64 | 56 | 119k | Dashboard type check fails (the judge was told to ignore type errors) |
| Copilot CLI | Rosetta Skills | 1 | 1 | 0 | 7/8 | 67.2, not merge-ready, 0 / 3 / 12 | 635 cr | 13 | 39k | Save button disabled; 1 check failed |
| Claude Code | Spec Kit | 3 | 0 | 0 | 8/8 | 70.7, not merge-ready, 0 / 1 / 6 | $12.65 | 144 | 187k | 3 missed requirements |
| Claude Code | Superpowers | 1 | 0 | 0 | 7/8 | 73.5, not merge-ready, 0 / 1 / 7 | $8.08 | 41 | 140k | 1 check failed |

**League 3. Not recommended** (4 runs)

| Runner | Method | Missed requirements | Feature bugs | Broken build, tests, or page | Done checks | Judge | Cost | Time, min | Output tokens | What happened |
|---|---|---:|---:|---:|---|---|---:|---:|---:|---|
| Claude Code | AWS AI-DLC | – | – | – | – | – | stopped | stopped | – | No result: stopped during its Construction phase |
| Copilot CLI | AWS AI-DLC | – | – | – | – | – | 491 cr | ~62 | – | No result: 11 questions, then its review gate looped; no code written |
| Copilot CLI | Grill-with-docs | 0 | 1 | 0 | 8/8 | 66.7, not merge-ready, 2 / 1 / 10 | 452 cr | 17 | 74k | 2 judge blockers |
| Copilot CLI | Spec Kit | 0 | 2 | 2 | 8/8 | 69.0, not merge-ready, 0 / 3 / 11 | 870 cr | 39 | 111k | Save; cleared value still shown; failing test; type check |

### Large task (9 hidden requirements, 12 checks)

**League 1. Works, good solution** (3 runs)

| Runner | Method | Missed requirements | Feature bugs | Broken build, tests, or page | Done checks | Judge | Cost | Time, min | Output tokens | What happened |
|---|---|---:|---:|---:|---|---|---:|---:|---:|---|
| Claude Code | Grill-with-docs | 0 | 1 | 0 | 12/12 | 71.2, not merge-ready, 0 / 3 / 10 | $10.17 | 55 | 134k | Dashboard UI hidden behind the staging-schema flag; still hidden on the default build (judge major) |
| Claude Code | Rosetta coding flow | 1 | 0 | 1 | 12/12 | 76.6, merge-ready, 0 / 0 / 8 | $54.97 | 273 | 1.30M | Customer page reloaded in an endless loop |
| Claude Code | Rosetta Light | 1 | 0 | 1 | 12/12 | 78.4, not merge-ready, 0 / 1 / 8 | $57.65 | 309 | 3.50M | 2 new tests failing |

**League 2. Accepted, with errors** (5 runs)

| Runner | Method | Missed requirements | Feature bugs | Broken build, tests, or page | Done checks | Judge | Cost | Time, min | Output tokens | What happened |
|---|---|---:|---:|---:|---|---|---:|---:|---:|---|
| Claude Code | Baseline | 5 | 0 | 0 | 12/12 | 64.6, not merge-ready, 0 / 3 / 14 | $7.84 | 68 | 172k | 5 missed requirements |
| Copilot CLI | Rosetta Light | 1 | 1 | 1 | 12/12 | 76.8, merge-ready, 0 / 0 / 12 | 2,215 cr | 260 | 979k | Product page crashed; translation key shown instead of the label |
| Claude Code | Rosetta Skills | 0 | 1 | 1 | 12/12 | 75.0, merge-ready, 0 / 0 / 11 | $24.73 | 173 | 739k | Failing test; an eligible adult could not buy |
| Copilot CLI | Rosetta Skills | 2 | 0 | 0 | 11/12 | 78.5, not merge-ready, 0 / 1 / 8 | 1,644 cr | 73 | 304k | Save button disabled (check 2); stopped at the AI credit limit, remaining follow-ups not sent |
| Claude Code | Superpowers | 4 | 0 | 0 | 12/12 | 67.9, not merge-ready, 0 / 2 / 14 | $35.11 | 202 | 410k | 4 missed requirements (sent as 1 follow-up) |

**League 3. Not recommended** (8 runs)

| Runner | Method | Missed requirements | Feature bugs | Broken build, tests, or page | Done checks | Judge | Cost | Time, min | Output tokens | What happened |
|---|---|---:|---:|---:|---|---|---:|---:|---:|---|
| Claude Code | AWS AI-DLC | – | – | – | – | – | ~$160 | 360+ | – | No result: stopped after 6+ hours |
| Copilot CLI | AWS AI-DLC | – | – | – | – | – | – | – | – | No result yet (L-CP-05, no run report) |
| Copilot CLI | Baseline | 4 | 5 | 1 | 12/12 | 64.0, not merge-ready, 0 / 3 / 17 | 1,747 cr | 37 | 84k | 6 bugs and breakages |
| Copilot CLI | Grill-with-docs | 0 | 3 | 1 | 12/12 | 65.5, not merge-ready, 1 / 5 / 18 | 849 cr | 43 | 112k | 4 bugs and breakages; judge blocker |
| Copilot CLI | Rosetta coding flow | 4 | 3 | 1 | 11/12 | 69.3, not merge-ready, 1 / 5 / 14 | 1,901 cr | 86 | 334k | Product page crash, search label, guest prompt, wrong refusal reason; judge blocker; 1 check failed |
| Claude Code | Spec Kit | 4 | 0 | 0 | 12/12 | 67.8, not merge-ready, 1 / 3 / 11 | $11.04 | 83 | 232k | Judge blocker: a dashboard customer save erases the birthday |
| Copilot CLI | Spec Kit | 3 | 0 | 0 | 12/12 | 67.6, not merge-ready, 1 / 1 / 18 | 1,024 cr | 57 | 152k | Judge blocker; build broken |
| Copilot CLI | Superpowers | 2 | 0 | 0 | 7/12 | 72.7, not merge-ready, 0 / 3 / 14 | 1,888 cr | 160 | 280k | 5 of 12 checks fail at the end |
