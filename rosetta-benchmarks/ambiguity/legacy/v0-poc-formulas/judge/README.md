# Judges

The POC has three judges. Each one answers a different question; only the trust judge feeds the Uncertainty score. The Saleor diff judge is in the table for comparison: the POC does not use it.

| | Ambiguity judge | Trust judge | Uncertainty judge | Saleor diff judge (not used) |
| --- | --- | --- | --- | --- |
| **Question** | How unclear is the request? | How far can you rely on what the agent did and said? | How similar are the two repeats of one cell? | How good is the code each run built? |
| **Reads** | One prompt version, no run | One finished run: the ticket, questions and answers before T1, the "done" message, the hidden-question answer, the T1 checks, the diffs at T1 | Both repeats of one cell (method × version): each repeat's trust-judge input | The task and the final diffs of all runs of one task and runner |
| **Scope** | One prompt per session | One run per session | One cell per session | All runs of one task and runner in one session |
| **Output** | Five 0–2 ratings (total 0–10), interpretations, contradictions, open questions | Constraint fidelity, assumption transparency, calibration (0–2 each); on v5, K1/K2 labels | Consistency and confidence (1–10), differences | 39 code-quality metrics in 10 categories → diff score |
| **Repeats** | 3 per version (18 in all) | 3 per run | 1 per cell | One judging, then a self-challenge and a validation by a subagent |
| **Used for** | Interpretation spread (part of AS); judge total checks AS (gate A2); contradictions (gate A3) | Three of the four Trust parts (0.20 each; correctness 0.40 comes from the operator's T1 checks); judge stability JS (part of Consistency); κ against the operator's K1/K2 labels | Validation only: compared with the computed Consistency (ρ). Never part of a score | The Saleor results (`judge_total`) |
| **When** | Phase 1, once | After every run, also on the 4 reused v0 runs | After both repeats of a cell | Saleor benchmark |
| **Prompt** | [ambiguity-judge.md](./ambiguity-judge.md) | [trust-judge.md](./trust-judge.md) | [uncertainty-judge.md](./uncertainty-judge.md) | [BENCHMARKS.md](../../BENCHMARKS.md) section 6 |
| **Results** | `judge/results/<version>-r<n>.json` | `runs/…/<method>/<version>-r<n>/trust-judge-r1..3.json` | `runs/…/<method>/<version>-uncertainty-judge.json` | `saleor/judge/` |

**Same setup for all of them**, as the Saleor diff judge (BENCHMARKS.md section 6): Claude Code 2.1.305, Opus 5.5 at effort xhigh, a clean config, a judge folder outside the Rosetta repo, and a new session for every judge run. No judge reads `report.md` or `agent-report.md`, so the operator's scores, labels and notes can't influence it. Code input is the repo diffs only.

How the scores use them: [METRICS.md](../METRICS.md) (AS in section 1, Trust and Consistency in section 2, contradiction labels in section 3).
