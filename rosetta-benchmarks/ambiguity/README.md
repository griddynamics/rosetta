# Ambiguity and uncertainty POC

Can we measure how ambiguous a request is, and how far a method's result can be relied on as the request gets less clear? This folder holds the POC on the Saleor small task (product storage conditions), in Claude Code, with Baseline, Rosetta Skills, Grill-with-docs and Superpowers. It reuses the setup and protocol of the [Saleor benchmark](../BENCHMARKS.md).

| File | What |
| --- | --- |
| [PLAN.md](./PLAN.md) | Goal, decisions, phases and gates, what is reused, how results stay reproducible, open decisions |
| [METRICS.md](./METRICS.md) | Every formula: Ambiguity Score, Consistency, Trust, Uncertainty, contradiction labels, gates |
| [EXPERIMENTS.md](./EXPERIMENTS.md) | The 20 runs (16 new, 4 reused v0 runs) with IDs, order and status |
| [OPERATOR-GUIDE.md](./OPERATOR-GUIDE.md) | What the operator does: setup, one run, the trust judge after the run |
| [RUNBOOK.md](./RUNBOOK.md) | How to run one POC run: the Saleor method file plus a few changes |
| [prompts/](./prompts/) | The six prompt versions, the detail checklist, term lists, the operator's answer sheet |
| [judge/](./judge/) | Judge prompts: ambiguity (prompt only), trust (one run), uncertainty (one cell, validation) |
| [templates/](./templates/) | Additions to the Saleor run report |
| [scripts/](./scripts/) | Scoring scripts: `as_score.py` (Task 1), `score_runs.py` (Task 2 formulas), `collect_runs.py` (all reports) |
| [reports/](./reports/) | Generated tables: AS per version, results summary |
| [decision-log.md](./decision-log.md) | Every design decision and every change to a frozen value |
| `runs/` | One folder per run, same files as a Saleor run |

**Ambiguity Score of the prompts (Task 1).** Run from the rosetta repo root. The script reads the six prompts, the checklist, the vague-term list and any ambiguity-judge results in `judge/results/`, and writes the AS table and gates A1–A2 to `reports/as-scores.md` and `.csv`. It runs no agent. Until the ambiguity judge has run, the table shows a partial AS without interpretation spread and A2 as not available.

```bash
python3 rosetta-benchmarks/ambiguity/scripts/as_score.py \
  --out rosetta-benchmarks/ambiguity/reports/as-scores.md --csv rosetta-benchmarks/ambiguity/reports/as-scores.csv
```

**All results (Task 1 and Task 2).** Run after `as_score.py`, from the rosetta repo root. It reads every run folder and judge file and rewrites `reports/summary.md`, `runs.csv`, `cells.csv` and `scores.json`; values that are missing are listed at the end of the summary, never guessed. Without `--write` it only prints.

```bash
python3 rosetta-benchmarks/ambiguity/scripts/collect_runs.py --write
```

Summary similarity (SC) needs the embedding model once per new pair of T1 messages: add `--embed` (requires `pip install sentence-transformers`; model `all-MiniLM-L6-v2`). The values are saved in `reports/sc-cache.json`, so later runs give the same numbers without the model.
