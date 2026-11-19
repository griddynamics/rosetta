# Ambiguity and uncertainty POC

Can we measure how ambiguous a request is, how much of that ambiguity an agent removes before it builds, and how far its "done" can be trusted? This folder holds the POC on the Saleor small task (product storage conditions), in Claude Code, with Baseline, Rosetta Skills, Grill-with-docs and Superpowers. It reuses the setup and protocol of the [Saleor benchmark](../BENCHMARKS.md).

| File | What |
| --- | --- |
| [METRICS.md](./METRICS.md) | The flow, the terms and every formula: AS(prompt), AS(requirements), Trust, pass rate, Uncertainty |
| [OPERATOR-GUIDE.md](./OPERATOR-GUIDE.md) | What the operator does: setup, one run with its two stops, the two judges after the run |
| [EXPERIMENTS.md](./EXPERIMENTS.md) | The runs with IDs, order and status |
| [POC-VS-AUTOMATED.md](./POC-VS-AUTOMATED.md) | What the POC did, and who does each step of the proposal: automated, or by hand until then |
| [prompts/](./prompts/) | The six prompt versions, our checklist (`checklist.json`), the vague-term list, the operator's answer sheet |
| [judge/](./judge/) | The ambiguity judge and the claims judge |
| [templates/](./templates/) | Additions to the Saleor run report |
| [scripts/](./scripts/) | `as_score.py` (AS of the prompt versions), `score_runs.py` (all run and cell scores) |
| [reports/](./reports/) | Generated tables |
| [decision-log.md](./decision-log.md) | Every design decision and every change to a frozen value |
| [legacy/v0-poc-formulas/](./legacy/v0-poc-formulas/) | The earlier plan, formulas, guides, judges, scripts and reports, unchanged: they produced the v0 numbers of the results page, Part 1 |
| `runs/` | One folder per run, same files as a Saleor run |

## Plan

- **Done.** Test 1: six prompt versions (v0 = the Saleor small task, v1–v5 more ambiguous), each with an Ambiguity Score; no agent ran on v1–v5. Test 2: the four Saleor runs on v0 (one per method), scored with the earlier formulas. Results page, Parts 1–3; what they led to: decision log #36–#38.
- **Next.** Runs with the flow of METRICS.md: by hand first ([EXPERIMENTS.md](./EXPERIMENTS.md): v3 and v5, 2 repeats per method), then automated with 10 runs per tool and version ([POC-VS-AUTOMATED.md](./POC-VS-AUTOMATED.md)).
- **Kept from the start:** small task only; Claude Code only (Sonnet 5.5, medium), with the same pinned versions and method environments as the Saleor benchmark; each method's v0 Saleor run is never rerun; work on branch `benchmarks/ambiguity-poc`, nothing pushed until the owner decides.
- **Open:** how many prompt versions the runs use; how questions our checklist does not cover are answered; the team's review of the checklist items and weights.

## Rules

- Everything that decides a number is a file in this folder, in git: prompts, checklist, term list, answer sheet, judge prompts, scripts, formulas, decision log.
- Scores come from scripts, never by hand: rerunning them on the same files gives the same numbers.
- Every judge answer is saved as returned, with model and date ([judge/README.md](./judge/README.md)).
- Raw session logs are never committed, in any form, as in the Saleor benchmark. They are used only locally, the way Saleor uses them (`tokens.md`, the times of the agent's stops). Every agent text the scores need is copied word for word into the run report.

## Scores

From the rosetta repo root. Both scripts read only files and run no agent; without `--write` they only print.

```bash
python3 rosetta-benchmarks/ambiguity/scripts/as_score.py --write     # reports/as-scores.md, .csv
python3 rosetta-benchmarks/ambiguity/scripts/score_runs.py --write   # reports/summary.md, runs.csv, cells.csv, scores.json
```

Missing values are listed at the end of `reports/summary.md`, never guessed.
