# results-history

Durable, git-tracked snapshots of Curiocity e2e runs, kept so run behaviour and scores
can be **compared over time** (vanilla vs vanilla-full vs rosetta; "better or cheaper").

## What's in here

Each subdirectory is one run, named by its Curiocity run stamp
(`run-<ISO-timestamp>Z/`), containing that run's **own output files, verbatim** — no
hand-authored summaries:

```
results-history/
  run-<stamp>/
    suite.json            # machine-readable suite result (gates, groups, cost, timing, metrics)
    suite.md              # the human-readable suite report (the comparison table)
    snapshot-meta.json    # provenance: source path, curiocity version, git commit + dirty flag, timestamps
    trials/<case>/<agent>/<repeat>/
      trial.json          # per-trial scores, gates, evaluators, tokens/cost/time, qna
      raw-transcript.jsonl# the agent's native transcript (source of truth for views/hooks)
      trajectory.jsonl    # normalized events (what the llm-judge + views are built from)
      screen.log          # ANSI-free rendered screen dump
      workspace.diff      # exactly what code the arm produced
      views/*.md          # conversation / hooks / tools / skills (human-readable lenses)
```

Full fidelity is intentional: it's the complete record needed to *revalidate how a past
run behaved* (re-read it, re-inspect the diff, re-derive views, re-judge).

## How to add a snapshot

Ephemeral run output lands in `../.runtime/results/` (gitignored). To promote a completed
run into history:

```
node tests/e2e-tests/snapshot-run.mjs            # snapshots the most recent run
node tests/e2e-tests/snapshot-run.mjs <run-dir>  # or a specific run dir (one with suite.json)
```

Then commit the new `results-history/run-<stamp>/` directory yourself (repo policy: no
auto-commit).

## Comparing over time

Diff `suite.md` (or `suite.json`) and the per-arm `trial.json` across two run stamps to
see how gates, judge scores, Manual-QA, hook coverage, tokens, and cost moved. Because
snapshots are verbatim Curiocity output stamped with the curiocity version + git commit
(`snapshot-meta.json`), each entry is attributable to the exact harness that produced it.

> If history grows too heavy, prune the copied file set via the `PRUNE` list in
> `snapshot-run.mjs` (e.g. drop `raw-transcript.jsonl`) — it does not change what a run
> produces, only what is retained here.
