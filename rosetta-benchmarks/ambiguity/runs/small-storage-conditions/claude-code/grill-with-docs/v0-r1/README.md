---
# Reused Saleor run as the v0 cell of this method (EXPERIMENTS.md, PLAN.md 4). The Saleor folder is not changed.
# scripts/score_runs.py reads the Saleor report from saleor_folder and the POC fields below.
poc_schema: ambiguity-poc/v1
run_id: S-CC-02-v0-r1
prompt_version: v0
repeat: 1
reused_from: S-CC-02
saleor_folder: saleor/runs/small-storage-conditions/claude-code/grill-with-docs
questions_unanticipated:   # optional: questions no answer-sheet row covered ("NEW extra" in the Saleor timeline)
---

# S-CC-02-v0-r1 (reused)

The v0 cell of this method is the Saleor run `S-CC-02`, as recorded: [report](../../../../../../saleor/runs/small-storage-conditions/claude-code/grill-with-docs/report.md).

POC files in this folder: `judge-input.md`, `t1/` (the final diffs of the Saleor run, see judge/trust-judge.md), `trust-judge-r1..3.json`.
