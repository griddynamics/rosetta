# Benchmark runs

One folder per run: `<task>/<runner>/<method>/`. One folder per run ID. A new run of the same ID replaces the folder: commit the old run first, then it stays in git history. Each folder holds:

| File | What |
| --- | --- |
| `report.md` | The operator's run report, from `../templates/run-report-{small,large}.md`. Main result of the run. |
| `agent-report.md` | The agent's own report (post-implementation prompt). |
| `tokens.md` | Token breakdown (Claude Code runs), from `../scripts/session-usage.py`. |
| `<repo>.diff` | The code the agent wrote, one file per changed repo. |
| `isolation.txt` | Isolation-check output from before T0. |
| `workspace-root/` | Files the method wrote in the workspace root (specs, plans, glossary), if any. |
| `plan.md` | Baseline only: the plan approved at the start (plan mode), if the runner saved it to a file. |

Raw session logs (`session/`) stay local and are git-ignored.

Summary of all runs: `python3 saleor/scripts/collect-results.py` (see BENCHMARKS.md, section 6, "Final table").
