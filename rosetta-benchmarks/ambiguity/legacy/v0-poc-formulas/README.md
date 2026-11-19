# Legacy: the earlier POC formulas (v0 results)

A frozen copy of the POC's scoring as of 2026-11-18, before decision log #38. It produced the v0 numbers of the results page, Part 1: the Ambiguity Score with the ambiguity judge's interpretation spread (v0–v5: 0.366 … 0.914), and, for the four reused v0 runs, Trust (correctness + the trust judge's three scores), UT = 1 − Trust, decision ownership and the silent share.

Nothing here is used by the current scripts. Kept so those numbers stay reproducible.

| Path | What |
| --- | --- |
| [PLAN.md](./PLAN.md) | The earlier plan: phases, gates (A1–A4, U1–U2), scripts, Curiocity changes |
| [METRICS.md](./METRICS.md) | The earlier formulas: AS with interpretation spread, Trust, Consistency, Uncertainty, behaviour measures, gates |
| [RUNBOOK.md](./RUNBOOK.md), [OPERATOR-GUIDE.md](./OPERATOR-GUIDE.md) | The earlier run guides (T1 checks, claims check, trust judge), as committed before decision log #38 |
| [JUDGES-AND-SCORES.txt](./JUDGES-AND-SCORES.txt) | Short reference of the earlier judges and scores |
| [judge/](./judge/) | The ambiguity judge (on the prompts), the trust judge and the uncertainty judge; `judge/results/` holds the 18 ambiguity-judge answers |
| [prompts/](./prompts/) | The prompts folder as it was, including the earlier `checklist.json` (criticality, guessability, IDs) |
| [templates/report-additions.md](./templates/report-additions.md) | The earlier report additions (claims check, `t1_claims`, K1/K2 labels) |
| [scripts/](./scripts/) | The earlier scripts, with paths pointing to this folder |
| [reports/](./reports/) | Their generated reports, as published |
| [runs/](./runs/) | The four reused v0 runs: judge inputs, trust-judge answers (and the first round in `superseded/`), and a `README.md` pointing to each Saleor run |

**Reproduce** (from the rosetta repo root):

```bash
python3 rosetta-benchmarks/ambiguity/legacy/v0-poc-formulas/scripts/as_score.py \
  --out rosetta-benchmarks/ambiguity/legacy/v0-poc-formulas/reports/as-scores.md \
  --csv rosetta-benchmarks/ambiguity/legacy/v0-poc-formulas/reports/as-scores.csv
python3 rosetta-benchmarks/ambiguity/legacy/v0-poc-formulas/scripts/collect_runs.py --write
python3 rosetta-benchmarks/ambiguity/legacy/v0-poc-formulas/scripts/export_v0_quick.py
```

The numbers come out identical. Only the list of vague phrases found in `as-scores.md` may show two phrases of the same length in a different order: the earlier script left that order to Python. The current `scripts/as_score.py` fixes it.
