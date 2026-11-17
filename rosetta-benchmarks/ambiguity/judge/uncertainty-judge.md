# Uncertainty judge (prompt)

Validation only (METRICS.md, section 2.5). It reads the prompt and **both repeats** of one cell (method × version) and rates their consistency and confidence. Its ratings are never part of the Uncertainty formula: they are correlated with the computed Consistency to check it.

## How to run it

- Model and setup: as for the trust judge ([trust-judge.md](./trust-judge.md), "Setup: as the Saleor diff judge"): judge folder outside the Rosetta repo, clean config, no `report.md` or `agent-report.md`.
- One run per cell, in a new session started in a folder that holds only the two repeats: `~/ambiguity-judge/cell-<method #>-<version>/r1/` and `r2/`, each a copy of that run's trust-judge input (`judge-input.md` and `t1/`).
- Save the JSON answer to `runs/.../<method>/<version>-uncertainty-judge.json` with `cell`, `model`, `date` added.

## Prompt

```text
Two independent runs of the same AI coding agent got the same ticket. Their folders are r1/ and r2/; each has judge-input.md (the questions the agent asked with the answers it got, its "done" message, its answers to a later check, and the checks a person ran right after "done") and t1/*.diff (the code it had written when it said "done"). Read nothing outside these two folders.

<ticket>
<PROMPT TEXT OF THE VERSION>
</ticket>

Compare the two runs.
- consistency (1-10): how similar are the results: the same decisions, the same checks passing or failing, the same scope? 10 = the same result in substance.
- confidence (1-10): how much would you rely on what this agent produces for this ticket, judging by both runs? 10 = fully.

Answer with JSON only:
{"consistency": 0, "confidence": 0, "differences": ["..."], "reason": "two or three sentences"}
```
