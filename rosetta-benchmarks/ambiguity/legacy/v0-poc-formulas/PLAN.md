# Ambiguity and uncertainty POC: plan

> **The earlier plan, kept unchanged** (moved here by decision log #39). The current measures and run flow are those of the top-level [METRICS.md](../../METRICS.md): AS(prompt) and AS(requirements), Trust, pass rate and Uncertainty, with two stops per run and two judges (ambiguity judge, claims judge). Where the phases, gates and scripts below name the trust judge, Consistency, JS, UT, gates U1–U2 or A2–A4, they describe the earlier design, kept in [legacy/v0-poc-formulas/](./legacy/v0-poc-formulas/); they are revised with the team before phase 2.

## 1. Goal

Two POC tasks (team task list, "Part 1: POC"):

1. **Score the ambiguity of a request.** A set of prompt versions from clear to ambiguous, each with an Ambiguity Score (AS) that ranks them in the expected order and agrees with an independent review.
2. **Score the uncertainty of a method's result.** Run Rosetta Skills and Baseline on prompts of known ambiguity and test whether uncertainty rises with ambiguity and whether the two methods differ. End with a **go / no-go** for the full benchmark.

The POC is also run for Superpowers and Grill-with-docs, so the results give a first comparison and a new column for the benchmark report.

## 2. Decisions

| Date | Decision |
| --- | --- |
| 2026-11-16 | Everything is run **manually**, with the existing Saleor protocol. Automation (Curiocity) is the last step (section 6). |
| 2026-11-16 | **Small task only** (product storage conditions), **Claude Code only** (Sonnet 5.5, medium), the same pinned versions and method environments as the Saleor benchmark. |
| 2026-11-16 | **6 prompt versions** (v0–v5), one ambiguity dimension added per step (cumulative ladder). All 6 are scored offline; runs use **v0, v3, v5**. |
| 2026-11-16 | **Answered condition only.** Contradictions are planted inside v5. |
| 2026-11-16 | **v0 is never rerun:** each method's v0 cell is its Saleor run (`S-CC-01`, `-02`, `-03`, `-08`), as recorded. **2 repeats** at v3 and v5. Baseline is the calibration and the reference (Claude Code with no method added); an optional 3rd repeat on Baseline v5 estimates the noise. |
| 2026-11-16 | Methods: Baseline, Rosetta Skills, Grill-with-docs, Superpowers. |
| 2026-11-16 | Work on branch `benchmarks/ambiguity-poc` (from `benchmarks/saleor-v2`). Nothing is pushed until the owner decides. |

Later decisions and every change to a frozen value go to [decision-log.md](./decision-log.md).

## 3. Phases and gates

| Phase | What | Runs | Output | Gate to go on |
| --- | --- | ---: | --- | --- |
| 0. Setup | This folder: plan, formulas, prompts, answer sheet, judge prompts, report additions, scripts | 0 | This branch | Team review of the checklist priorities and the prompts (open decisions 1–2) |
| 1. Ambiguity (Task 1) | `as_score.py`; ambiguity judge 3 × 6 versions; blind human ranking; one hand adjustment if needed; **freeze section 1 of METRICS.md** | 0 | [reports/as-scores.md](./reports/as-scores.md) | A1–A4 (METRICS.md 1.3) |
| 2. Calibration (Baseline) | 4 new Baseline runs (+1 optional); trust judge 3 × per run, also on the 4 reused v0 runs; scoring scripts run end to end; fix what breaks; **freeze section 2** | 4 (+1) | First Uncertainty values; working pipeline | Every run scored with no missing value; trust judge spread JS ≥ 0.7 |
| 3. Uncertainty (Task 2) | 4 new Rosetta Skills runs; Baseline vs Rosetta Skills | 4 | Go / no-go report | U1–U2 (METRICS.md 4.1) |
| 4. Comparison | 4 Grill-with-docs + 4 Superpowers runs; summary table and 2 charts; new columns in the benchmark report. Data only, no gate and no verdict (METRICS.md 4.1) | 8 | `reports/summary.md`, charts, wiki page | – |
| 5. Automation (later) | Curiocity runs the same cells; compare with the manual runs | – | See section 6 | Automated results match the manual ones |

**First, before phase 2 (decided 2026-11-17):** v0 results for all four methods from the reused Saleor runs: AS, Trust (trust judge 3 × per run), UT and the behavior measures. New runs resume after these numbers are in.

Phases 3 and 4 run only after the gate before them passes. A no-go at phase 3 stops phase 4 until the adjustments are made.

## 4. What is reused from the Saleor benchmark

- **Setup, method environments, versions, isolation check, reset, post-implementation prompt, follow-up rules**: unchanged ([BENCHMARKS.md](../BENCHMARKS.md), [saleor/methods/](../saleor/methods/)). The operator follows the method file of each method; [RUNBOOK.md](./RUNBOOK.md) lists only what changes.
- **Hidden questions and extra answers**: unchanged (BENCHMARKS.md section 4), plus [prompts/answer-sheet.md](./prompts/answer-sheet.md) for v1–v5.
- **Run report**: the Saleor template plus [templates/report-additions.md](./templates/report-additions.md).
- **Saleor runs on the base prompt are never rerun.** Each method's v0 cell is its one Saleor run, as recorded: `S-CC-01` (Baseline), `S-CC-08` (Rosetta Skills), `S-CC-02` (Grill-with-docs), `S-CC-03` (Superpowers). With one run, v0 has Trust but no Consistency, so v0 is compared through UT (METRICS.md 2.3). None of them has T1 "Done when" checks, so their correctness uses the 7 hidden-question checkpoints only (METRICS.md 2.2). `S-CC-08` and `S-CC-03` have no T1 message on record, so no hedge density. `S-CC-02` and `S-CC-03` ran on an older setup ([EXPERIMENTS.md](./EXPERIMENTS.md)); new runs follow the current method files, and those two v0 cells are marked in the summary.

## 5. Reproducible and traceable

- **Everything that decides a number is a file in this folder**, in git: prompts, checklist, term lists, answer sheet, judge prompts, scripts, formulas, decision log.
- **Every run has a folder** (`runs/small-storage-conditions/claude-code/<method>/<version>-r<n>/`) with the same files as a Saleor run: `report.md`, `agent-report.md`, `tokens.md`, `<repo>.diff`, `isolation.txt`, plus the T1 snapshot `t1/` (RUNBOOK.md step 7), `judge-input.md` and `trust-judge-r1..3.json`. Every number in a report's data block is traceable to a row in its evidence sections.
- **Every judge answer is saved as returned**, with model and date. Judges run in fresh, clean sessions, set up as the Saleor diff judge: a judge folder outside the Rosetta repo, a clean config, and no `report.md` or `agent-report.md`. Their input is `judge-input.md`, which the assistant builds from the report, and the T1 snapshot ([judge/trust-judge.md](./judge/trust-judge.md)).
- **Scores come from scripts**, never by hand: rerunning them on the same files gives the same numbers.
- **Session logs: exactly as in the Saleor benchmark.** Raw Claude Code session logs are never committed, in any form (also not redacted). They are used only the way Saleor uses them, locally: `session-usage.py` → `tokens.md`, and the times of the agent's stops. Every agent text the scores need comes from the run report: the timeline (questions and answers) and Appendix B (the T1 "done" message and the answer to the hidden-question check, word for word, copied from the terminal).

### Scripts

| Script | Does | Status |
| --- | --- | --- |
| `scripts/as_score.py` | AS(prompt) per version, deterministic (METRICS.md 1) | done |
| `scripts/score_runs.py` | AS(requirements) and clarification gain per run; Trust, pass rate and Uncertainty per cell; `reports/summary.md`, `runs.csv`, `cells.csv`, `scores.json` (METRICS.md 1–3) | done |
| `scripts/charts.py` | The two charts of METRICS.md section 4 | to do (phase 3) |

## 6. Automation later (Curiocity)

[src/curiocity](../../src/curiocity/) already drives Claude Code through a real terminal, answers questions from a policy file, saves every transcript and rescores stored runs. It needs these changes before it can run these cells (on this branch, phase 5):

1. Use a method's own `CLAUDE_CONFIG_DIR` (today it must stay unset, and transcripts are read from `~/.claude`).
2. A per-repo `git diff` against the start tag instead of `diff -ruN` of the whole workspace (the Saleor workspace with dependencies is too large).
3. Scripted messages after the first "done" (hidden-question check, post-implementation prompt) and mid-run (the Contradicted condition).
4. A Saleor stack per trial on its own ports (fixed ports 8000, 3000, 9000 in `bench.sh`) to run cells in parallel.
5. Optional: a Copilot CLI adapter.

The manual runs of this POC are the reference that the automated runs are checked against.

## 7. Open decisions

1. **Checklist values:** the team reviews criticality and guessability in [prompts/checklist.json](./prompts/checklist.json) (draft) before phase 1.
2. **Human ranker** for gate A4: a team member who did not write the prompts.
3. **Optional 3rd Baseline repeat** on v5 (1 more run).
4. **Operators:** one operator per method for all its runs, if possible.
