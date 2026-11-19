# POC vs automated benchmark

## What the POC did

Two separate tests (results page, Parts 1–3):

1. **Measuring ambiguity**, prompts only: v0 is the Saleor small task, v1–v5 add one source of ambiguity each. Each version got an Ambiguity Score, checked against an independent AI judge (ρ = 0.986). No agent ran on v1–v5. The score now comes from the text alone ([METRICS.md](./METRICS.md), section 1).
2. **Measuring the runs**, the four existing Saleor runs on v0 only (one per method): counts from the run reports and a trust judge, combined with the earlier formulas ([legacy/v0-poc-formulas/](./legacy/v0-poc-formulas/)). Some measures were feasible, others not; this led to the proposal below (decision log #38).

## The proposal: who does each step

The flow and the formulas are the same either way ([METRICS.md](./METRICS.md)); only who does each step differs. Runs before automation follow [OPERATOR-GUIDE.md](./OPERATOR-GUIDE.md).

| Step (results page, Part 4) | Automated benchmark | By hand, until automated |
| --- | --- | --- |
| 0. Prepare: prompt versions, our checklist, tests per checklist item | Once per task, by people | The same; the checks are done by hand instead of tests |
| 1. AS(prompt) | `scripts/as_score.py` | The same |
| 2. Clarify: the agent's questions answered from our checklist | Automated | The operator, from the answer sheet |
| 3. Stop 1: "List the requirements you are about to implement." → AS(requirements) | Automated message; ambiguity judge run automatically | The operator sends the message; ambiguity judge, 3 sessions started by hand |
| 4. Implement | The agent | The agent |
| 5. Stop 2: code saved; "List anything that is not done or that you did not verify." → flagged items | Automated message; claims judge run automatically | The operator sends the message; claims judge, 3 sessions started by hand |
| 6. Pass or fail per checklist item | Automated tests | The operator checks each item (report section 9) |
| 7. Sort the items: pass, honest failure, confident-wrong | `scripts/score_runs.py` | The same |
| 8. Combine the runs: AS(requirements), clarification gain, Trust, pass rate, Uncertainty | `scripts/score_runs.py`, 10 runs per tool and version | The same, 2 runs per tool and version |

Each judge runs 3 times and the majority label is used; a person spot-checks a sample.

## Still to decide

- How many prompt versions: e.g. v0, v3, v5. With 4 tools, 3 versions × 10 runs = 120 runs.
- How questions our checklist does not cover are answered.
