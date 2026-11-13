# Benchmark results

30 reports in `saleor/runs/`. Compare methods only within one task and one runner (templates/README.md).

## Every run

| Run ID | Folder | Kind | Status | Time first (min) | Time total (min) | Usage first | Usage total | Rework | Hidden asked / covered / missed | First-pass coverage | Follow-ups | Method steps | Done checks | Tests | Operator score | Merge-ready | Diff score | Blockers / Majors / Minors | Strengths | Bonus |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- | --- | ---: | --- | ---: | --- | ---: | ---: |
| `L-CC-01` | `large-age-restriction/claude-code/baseline` | run | done | 37 | 68 | $3.86 | $7.84 | 51% | 0 / 4 / 5 | 44% | 5 | 1 | 12/12 | yes | 3 | no | 64.6 | 0 / 3 / 14 | 0 | 0 |
| `L-CC-02` | `large-age-restriction/claude-code/grill-with-docs` | run | done | 53 | 55 | $9.46 | $10.17 | 7% | 6 / 3 / 0 | 100% | 2 | 1 | 12/12 | yes | 4 | yes | 71.2 | 0 / 3 / 10 | 1 | 5.55 |
| `L-CC-03` | `large-age-restriction/claude-code/superpowers` | run | done | 76 | 202 | $14.31 | $35.11 | 59% | 1 / 4 / 4 | 56% | 1 | 6 | 12/12 | yes | 4 | yes | 67.9 | 0 / 2 / 14 | 0 | 2.4 |
| `L-CC-04` | `large-age-restriction/claude-code/spec-kit` | run | done | 51 | 83 | $5.95 | $11.04 | 46% | 0 / 5 / 4 | 56% | 5 | 5 | 12/12 | yes | 3 | no | 67.8 | 1 / 3 / 11 | 0 | 3.4 |
| `L-CC-06` | `large-age-restriction/claude-code/rosetta-flow` | run | done | 225 | 273 | $44.70 | $54.97 | 19% | 4 / 4 / 1 | 89% | 2 | 6 | 12/12 | yes | 4 | yes | 76.6 | 0 / 0 / 8 | 2 | 8.95 |
| `L-CC-08` | `large-age-restriction/claude-code/rosetta-skills` | run | done | 164 | 173 | $23.72 | $24.73 | 4% | 3 / 6 / 0 | 100% | 2 | 6 | 12/12 | yes | 5 | yes | 75.0 | 0 / 0 / 11 | 2 | 7.7 |
| `L-CC-07` | `large-age-restriction/claude-code/rosetta-light` | run | done | 275 | 309 | $53.30 | $57.65 | 8% | 4 / 4 / 1 | 89% | 2 | 2 | 12/12 | yes | 4 | yes | 78.4 | 0 / 1 / 8 | 5 | 10.6 |
| `L-CP-01` | `large-age-restriction/copilot/baseline` | run | done | 7 | 37 | 194.7 cr | 1746.5 cr | 89% | 2 / 3 / 4 | 56% | 10 | 2 | 12/12 | yes | 3 | no | 64.0 | 0 / 3 / 17 | 0 | 0 |
| `L-CP-02` | `large-age-restriction/copilot/grill-with-docs` | run | done | 27 | 43 | 600.8 cr | 848.9 cr | 29% | 7 / 2 / 0 | 100% | 5 | 1 | 12/12 | yes | 4 | yes | 65.5 | 1 / 5 / 18 | 0 | 5.0 |
| `L-CP-03` | `large-age-restriction/copilot/superpowers` | run | done | 159 | 160 | 1776.8 cr | 1887.9 cr | 6% | 2 / 5 / 2 | 78% | 2 | 6 | 7/12 | yes | 3 | no | 72.7 | 0 / 3 / 14 | 1 | 7.65 |
| `L-CP-04` | `large-age-restriction/copilot/spec-kit` | run | done | 51 | 57 | 964.1 cr | 1024.0 cr | 6% | 0 / 6 / 3 | 67% | 4 | 12 | 12/12 | yes | 2 | no | 67.6 | 1 / 1 / 18 | 0 | 4.75 |
| `L-CP-06` | `large-age-restriction/copilot/rosetta-flow` | run | done | 63 | 86 | 1276.3 cr | 1900.8 cr | 33% | 2 / 3 / 4 | 56% | 10 | 25 | 11/12 | yes | 4 | yes | 69.3 | 1 / 5 / 14 | 2 | 6.0 |
| `L-CP-08` | `large-age-restriction/copilot/rosetta-skills` | run | done | 65 | 73 | 1303.4 cr | 1644.4 cr | 21% | 4 / 3 / 2 | 78% | 1 | 10 | 11/12 | yes | 4 | yes | 78.5 | 0 / 1 / 8 | 3 | 10.95 |
| `L-CP-07` | `large-age-restriction/copilot/rosetta-light` | run | done | 251 | 260 | 1962.2 cr | 2215.1 cr | 11% | 5 / 3 / 1 | 89% | 3 | 15 | 12/12 | yes | 4 | yes | 76.8 | 0 / 0 / 12 | 2 | 9.55 |
| `S-CC-01` | `small-storage-conditions/claude-code/baseline` | run | done | 27 | 50 | $1.24 | $3.31 | 63% | 0 / 4 / 3 | 57% | 3 | 1 | 7/8 | yes | 3 | no | 66.2 | 0 / 2 / 8 | 1 | 0 |
| `S-CC-02` | `small-storage-conditions/claude-code/grill-with-docs` | run | done | 38 | 38 | $4.82 | $4.89 | 1% | 5 / 2 / 0 | 100% | 1 | 1 | 8/8 | yes | 3 | no | 71.6 | 0 / 1 / 6 | 1 | 4.15 |
| `S-CC-03` | `small-storage-conditions/claude-code/superpowers` | run | done | 36 | 41 | $6.76 | $8.08 | 16% | 1 / 5 / 1 | 86% | 1 | 5 | 7/8 | yes | 3 | no | 73.5 | 0 / 1 / 7 | 2 | 5.45 |
| `S-CC-04` | `small-storage-conditions/claude-code/spec-kit` | run | done | 91 | 144 | $4.58 | $12.65 | 64% | 0 / 4 / 3 | 57% | 3 | 14 | 8/8 | yes | 3 | no | 70.7 | 0 / 1 / 6 | 2 | 2.65 |
| `S-CC-06` | `small-storage-conditions/claude-code/rosetta-flow` | run | done | 69 | 71 | $20.02 | $20.13 | 1% | 4 / 3 / 0 | 100% | 0 | 4 | 8/8 | yes | 5 | yes | – | – / – / – | – | – |
| `S-CC-08` | `small-storage-conditions/claude-code/rosetta-skills` | run | done | 56 | 56 | $5.64 | $5.64 | 0% | 3 / 3 / 1 | 86% | 2 | 4 | 8/8 | yes | 5 | yes | 73.6 | 0 / 0 / 5 | 2 | 4.7 |
| `S-CC-07` | `small-storage-conditions/claude-code/rosetta-light` | run | done | 92 | 92 | $5.48 | $5.48 | 0% | 4 / 3 / 0 | 100% | 0 | 2 | 8/8 | yes | 5 | yes | 73.4 | 0 / 0 / 8 | 3 | 5.2 |
| `S-CC-08` | `small-storage-conditions/claude-code/rosetta-skill` | run | – | – | – | – | – | – | – / – / – | – | – | – | –/8 | – | – | – | – | – / – / – | – | – |
| `S-CP-01` | `small-storage-conditions/copilot/baseline` | run | done | 13 | 27 | 208.8 cr | 389.1 cr | 46% | 1 / 4 / 2 | 71% | 5 | 1 | 8/8 | yes | 4 | yes | 66.0 | 0 / 2 / 11 | 0 | 0 |
| `S-CP-02` | `small-storage-conditions/copilot/grill-with-docs` | run | done | 14 | 17 | 393.1 cr | 452.3 cr | 13% | 4 / 3 / 0 | 100% | 2 | 1 | 8/8 | yes | 3 | no | 66.7 | 2 / 1 / 10 | 0 | 3.9 |
| `S-CP-03` | `small-storage-conditions/copilot/superpowers` | run | done | 107 | 154 | 1406.5 cr | 1975.7 cr | 29% | 3 / 3 / 1 | 86% | 2 | 16 | 8/8 | yes | 4 | yes | 67.0 | 0 / 1 / 16 | 0 | 2.0 |
| `S-CP-04` | `small-storage-conditions/copilot/spec-kit` | run | done | 33 | 39 | 698.7 cr | 870.4 cr | 20% | 0 / 7 / 0 | 100% | 5 | 9 | 8/8 | yes | 4 | yes | 69.0 | 0 / 3 / 11 | 0 | 4.65 |
| `S-CP-05` | `small-storage-conditions/copilot/aws-ai-dlc` | run | not-qualifying | – | – | – | – | – | 3 / – / – | – | 0 | 4 | –/8 | – | – | – | – | – / – / – | – | – |
| `S-CP-06` | `small-storage-conditions/copilot/rosetta-flow` | run | done | 64 | 76 | 966.5 cr | 1172.0 cr | 18% | 2 / 4 / 1 | 86% | 2 | 21 | 8/8 | yes | 4 | yes | 74.8 | 0 / 0 / 6 | 2 | 6.05 |
| `S-CP-08` | `small-storage-conditions/copilot/rosetta-skills` | run | done | 10 | 13 | 486.6 cr | 635.3 cr | 23% | 3 / 3 / 1 | 86% | 3 | 18 | 7/8 | yes | 4 | yes | 67.2 | 0 / 3 / 12 | 0 | 3.15 |
| `S-CP-07` | `small-storage-conditions/copilot/rosetta-light` | run | done | 45 | 61 | 334.4 cr | 617.4 cr | 46% | 3 / 3 / 1 | 86% | 2 | 26 | 8/8 | yes | 4 | yes | 66.4 | 0 / 3 / 10 | 1 | 1.75 |

## Comparison

### small-storage-conditions · claude-code (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Diff score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1 | 27 | 50 | $3.31 | 57% | 3 | 1 | 7 | 3 | 66 |
| grill-with-docs | 1 | 38 | 38 | $4.89 | 100% | 1 | 1 | 8 | 3 | 72 |
| superpowers | 1 | 36 | 41 | $8.08 | 86% | 1 | 5 | 7 | 3 | 74 |
| spec-kit | 1 | 91 | 144 | $12.65 | 57% | 3 | 14 | 8 | 3 | 71 |
| rosetta | 1 | 69 | 71 | $20.13 | 100% | 0 | 4 | 8 | 5 | – |
| rosetta-skills | 1 | 56 | 56 | $5.64 | 86% | 2 | 4 | 8 | 5 | 74 |
| rosetta-light | 1 | 92 | 92 | $5.48 | 100% | 0 | 2 | 8 | 5 | 73 |

### small-storage-conditions · copilot (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Diff score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1 | 13 | 27 | 389.1 cr | 71% | 5 | 1 | 8 | 4 | 66 |
| grill-with-docs | 1 | 14 | 17 | 452.3 cr | 100% | 2 | 1 | 8 | 3 | 67 |
| superpowers | 1 | 107 | 154 | 1975.7 cr | 86% | 2 | 16 | 8 | 4 | 67 |
| spec-kit | 1 | 33 | 39 | 870.4 cr | 100% | 5 | 9 | 8 | 4 | 69 |
| rosetta | 1 | 64 | 76 | 1172.0 cr | 86% | 2 | 21 | 8 | 4 | 75 |
| rosetta-skills | 1 | 10 | 13 | 635.3 cr | 86% | 3 | 18 | 7 | 4 | 67 |
| rosetta-light | 1 | 45 | 61 | 617.4 cr | 86% | 2 | 26 | 8 | 4 | 66 |

### large-age-restriction · claude-code (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Diff score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1 | 37 | 68 | $7.84 | 44% | 5 | 1 | 12 | 3 | 65 |
| grill-with-docs | 1 | 53 | 55 | $10.17 | 100% | 2 | 1 | 12 | 4 | 71 |
| superpowers | 1 | 76 | 202 | $35.11 | 56% | 1 | 6 | 12 | 4 | 68 |
| spec-kit | 1 | 51 | 83 | $11.04 | 56% | 5 | 5 | 12 | 3 | 68 |
| rosetta | 1 | 225 | 273 | $54.97 | 89% | 2 | 6 | 12 | 4 | 77 |
| rosetta-skills | 1 | 164 | 173 | $24.73 | 100% | 2 | 6 | 12 | 5 | 75 |
| rosetta-light | 1 | 275 | 309 | $57.65 | 89% | 2 | 2 | 12 | 4 | 78 |

### large-age-restriction · copilot (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Diff score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1 | 7 | 37 | 1746.5 cr | 56% | 10 | 2 | 12 | 3 | 64 |
| grill-with-docs | 1 | 27 | 43 | 848.9 cr | 100% | 5 | 1 | 12 | 4 | 66 |
| superpowers | 1 | 159 | 160 | 1887.9 cr | 78% | 2 | 6 | 7 | 3 | 73 |
| spec-kit | 1 | 51 | 57 | 1024.0 cr | 67% | 4 | 12 | 12 | 2 | 68 |
| rosetta | 1 | 63 | 86 | 1900.8 cr | 56% | 10 | 25 | 11 | 4 | 69 |
| rosetta-skills | 1 | 65 | 73 | 1644.4 cr | 78% | 1 | 10 | 11 | 4 | 78 |
| rosetta-light | 1 | 251 | 260 | 2215.1 cr | 89% | 3 | 15 | 12 | 4 | 77 |

## Missing values (fill them in the report)

- small-storage-conditions/claude-code/rosetta-skill/report.md: empty status, t0, t1, t2, hidden_asked, hidden_covered, hidden_missed, followups, method_steps, done_checks_passed, tests_pass, operator_score, operator_merge_ready
- small-storage-conditions/copilot/aws-ai-dlc/report.md: empty t1, t2, hidden_covered, hidden_missed, done_checks_passed, tests_pass, operator_score, operator_merge_ready
