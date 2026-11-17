# Ambiguity POC: experiment matrix

All runs of the POC. **v0 (the base prompt) is never rerun:** each method's v0 cell is its one Saleor run, as recorded. v3 and v5 get 2 new repeats each. That is **4 reused + 16 new runs** (+1 optional). Small task, Claude Code 2.1.305, Sonnet 5.5 · medium, pinned versions and environments as in [BENCHMARKS.md](../BENCHMARKS.md). How to run one: [RUNBOOK.md](./RUNBOOK.md). Prompts: [prompts/](./prompts/).

Run ID: `S-CC-<method #>-<version>-r<repeat>`, with the Saleor method numbers (01 Baseline, 02 Grill-with-docs, 03 Superpowers, 08 Rosetta Skills). Run folder: `runs/small-storage-conditions/claude-code/<method>/<version>-r<repeat>/`.

Status values: `planned` · `running` · `done` · `infra-fail` (rerun from a clean reset, same ID) · `reused` (a Saleor run, not rerun).

## Summary

| Method | Start tag | v0 (reused, 1 run) | v3 | v5 | New runs | Phase |
| --- | --- | --- | --- | --- | ---: | --- |
| Baseline | `baseline-v1` | `S-CC-01` | r1, r2 | r1, r2 (+ r3 optional) | 4 (+1) | 2 |
| Rosetta Skills | `rosetta-skills-v1` | `S-CC-08` | r1, r2 | r1, r2 | 4 | 3 |
| Grill-with-docs | `grill-v1` | `S-CC-02` | r1, r2 | r1, r2 | 4 | 4 |
| Superpowers | `superpowers-v1` | `S-CC-03` | r1, r2 | r1, r2 | 4 | 4 |

**What the reused runs differ in** (from their Saleor reports; recorded, not fixed):

| Run | Difference from the current method file | Missing for the POC |
| --- | --- | --- |
| `S-CC-01` | – | T1 "Done when" checks |
| `S-CC-08` | – | T1 checks; T1 message (Appendix B is empty) |
| `S-CC-02` | Old setup (report section 8): plugin `447ca70` (now `49dd158`), Claude Code 2.1.304, a nested upstream `CLAUDE.md` not removed, agent shell on Node 20 | T1 checks |
| `S-CC-03` | Old setup (report section 8): plain prompt without the entry command `/superpowers:brainstorming` | T1 checks; T1 message (Appendix B has only the hidden-check answer and the T2 message) |

New v3 and v5 runs follow the current method files. For Grill-with-docs and Superpowers, the v0 → v3 step therefore also includes the setup change; the summary marks those two v0 cells.

## All runs, in run order

The order mixes versions inside each phase, so time of day and operator learning don't line up with ambiguity.

| # | Run ID | Phase | Method | Version | Repeat | Run folder | Status |
| ---: | --- | ---: | --- | --- | ---: | --- | --- |
| 1 | `S-CC-01-v0-r1` | 2 | Baseline | v0 | 1 | [saleor/…/baseline/](../saleor/runs/small-storage-conditions/claude-code/baseline/) (= `S-CC-01`) | reused |
| 2 | `S-CC-01-v5-r1` | 2 | Baseline | v5 | 1 | `runs/small-storage-conditions/claude-code/baseline/v5-r1/` | planned |
| 3 | `S-CC-01-v3-r1` | 2 | Baseline | v3 | 1 | `runs/small-storage-conditions/claude-code/baseline/v3-r1/` | planned |
| 4 | `S-CC-01-v5-r2` | 2 | Baseline | v5 | 2 | `runs/small-storage-conditions/claude-code/baseline/v5-r2/` | planned |
| 5 | `S-CC-01-v3-r2` | 2 | Baseline | v3 | 2 | `runs/small-storage-conditions/claude-code/baseline/v3-r2/` | planned |
| 6 | `S-CC-01-v5-r3` | 2 | Baseline | v5 | 3 | `runs/small-storage-conditions/claude-code/baseline/v5-r3/` | optional |
| 7 | `S-CC-08-v0-r1` | 3 | Rosetta Skills | v0 | 1 | [saleor/…/rosetta-skills/](../saleor/runs/small-storage-conditions/claude-code/rosetta-skills/) (= `S-CC-08`) | reused |
| 8 | `S-CC-08-v3-r1` | 3 | Rosetta Skills | v3 | 1 | `runs/small-storage-conditions/claude-code/rosetta-skills/v3-r1/` | planned |
| 9 | `S-CC-08-v5-r1` | 3 | Rosetta Skills | v5 | 1 | `runs/small-storage-conditions/claude-code/rosetta-skills/v5-r1/` | planned |
| 10 | `S-CC-08-v3-r2` | 3 | Rosetta Skills | v3 | 2 | `runs/small-storage-conditions/claude-code/rosetta-skills/v3-r2/` | planned |
| 11 | `S-CC-08-v5-r2` | 3 | Rosetta Skills | v5 | 2 | `runs/small-storage-conditions/claude-code/rosetta-skills/v5-r2/` | planned |
| 12 | `S-CC-02-v0-r1` | 4 | Grill-with-docs | v0 | 1 | [saleor/…/grill-with-docs/](../saleor/runs/small-storage-conditions/claude-code/grill-with-docs/) (= `S-CC-02`) | reused |
| 13 | `S-CC-03-v0-r1` | 4 | Superpowers | v0 | 1 | [saleor/…/superpowers/](../saleor/runs/small-storage-conditions/claude-code/superpowers/) (= `S-CC-03`) | reused |
| 14 | `S-CC-02-v3-r1` | 4 | Grill-with-docs | v3 | 1 | `runs/small-storage-conditions/claude-code/grill-with-docs/v3-r1/` | planned |
| 15 | `S-CC-03-v5-r1` | 4 | Superpowers | v5 | 1 | `runs/small-storage-conditions/claude-code/superpowers/v5-r1/` | planned |
| 16 | `S-CC-02-v5-r1` | 4 | Grill-with-docs | v5 | 1 | `runs/small-storage-conditions/claude-code/grill-with-docs/v5-r1/` | planned |
| 17 | `S-CC-03-v3-r1` | 4 | Superpowers | v3 | 1 | `runs/small-storage-conditions/claude-code/superpowers/v3-r1/` | planned |
| 18 | `S-CC-02-v5-r2` | 4 | Grill-with-docs | v5 | 2 | `runs/small-storage-conditions/claude-code/grill-with-docs/v5-r2/` | planned |
| 19 | `S-CC-03-v3-r2` | 4 | Superpowers | v3 | 2 | `runs/small-storage-conditions/claude-code/superpowers/v3-r2/` | planned |
| 20 | `S-CC-02-v3-r2` | 4 | Grill-with-docs | v3 | 2 | `runs/small-storage-conditions/claude-code/grill-with-docs/v3-r2/` | planned |
| 21 | `S-CC-03-v5-r2` | 4 | Superpowers | v5 | 2 | `runs/small-storage-conditions/claude-code/superpowers/v5-r2/` | planned |

For reused runs, the POC files (`judge-input.md`, trust-judge JSON, a `README.md` that points to the Saleor folder) go to `runs/small-storage-conditions/claude-code/<method>/v0-r1/`; the Saleor folder is not changed.

## Expected cost

From the Saleor small-task Claude Code runs: Baseline about 50 min and $3, Rosetta Skills about 56 min and $6, Grill-with-docs about 38 min and $5, Superpowers about 41 min and $8 at v0. More ambiguous versions are expected to take longer (more questions, more follow-ups). Rough total for 16 runs: 15–19 operator hours and $110–180, plus the judge sessions.
