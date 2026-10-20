# Benchmark runs

One folder per run: `<task>/<runner>/<method>/` (repetitions: `<method>.r2/`, `<method>.r3/` …; pilot runs: `<method>.pilot/`, never compared). Each folder holds:

| File | What |
| --- | --- |
| `report.md` | The operator's run report, from `../templates/run-report-{small,large}.md`. Main result of the run. |
| `agent-report.md` | The agent's own report (post-implementation prompt). |
| `tokens.md` | Token breakdown (Claude Code runs), from `../scripts/session-usage.py`. |
| `<repo>.diff` | The code the agent wrote, one file per changed repo. |
| `plan.md` | Baseline only: the plan approved at the start (plan mode), if the runner saved it to a file. |

Raw session logs (`session/`) stay local and are git-ignored.
