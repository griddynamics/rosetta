# Benchmark results

10 reports in `saleor/runs/`. Compare methods only within one task and one runner (templates/README.md).

## Every run

| Run ID | Folder | Kind | Status | Time first (min) | Time total (min) | Usage first | Usage total | Rework | Hidden asked / covered / missed | First-pass coverage | Follow-ups | Method steps | Done checks | Tests | Operator score | Merge-ready | Judge abs | Judge s-b-s |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- | --- | ---: | --- | ---: | ---: |
| `L-CC-02` | `large-age-restriction/claude-code/grill-with-docs` | run | done | 53 | 83 | $9.46 | $10.17 | 7% | 6 / 3 / 0 | 100% | 2 | 1 | 12/12 | yes | 4 | no | – | – |
| `L-CC-03` | `large-age-restriction/claude-code/superpowers` | run | done | 108 | 526 | $14.31 | $35.11 | 59% | 1 / 4 / 4 | 56% | 1 | 6 | –/12 | – | – | – | – | – |
| `S-CC-01` | `small-storage-conditions/claude-code/baseline` | run | done | 29 | 70 | $1.24 | $3.31 | 63% | 0 / 4 / 3 | 57% | 3 | 1 | 7/8 | yes | 3 | no | – | – |
| `S-CC-02` | `small-storage-conditions/claude-code/grill-with-docs` | run | done | 38 | 38 | $4.82 | $4.89 | 1% | 5 / 2 / 0 | 100% | 0 | 1 | 8/8 | yes | 4 | yes | – | – |
| `S-CC-03` | `small-storage-conditions/claude-code/superpowers` | run | done | 44 | 62 | $6.76 | $8.08 | 16% | 1 / 5 / 1 | 86% | 1 | 5 | 7/8 | yes | 3 | – | – | – |
| `S-CC-04` | `small-storage-conditions/claude-code/spec-kit` | run | done | 105 | 203 | $4.58 | $12.65 | 64% | 0 / 4 / 3 | 57% | 3 | 14 | 8/8 | yes | 3 | – | – | – |
| `S-CC-06` | `small-storage-conditions/claude-code/rosetta-flow` | run | done | 120 | 148 | $21.30 | $21.37 | 0% | 3 / 4 / 0 | 100% | 0 | 3 | 8/8 | yes | 5 | yes | – | – |
| `S-CC-08` | `small-storage-conditions/claude-code/rosetta-skills` | run | done | 56 | 56 | $5.64 | $5.64 | 0% | 3 / 3 / 1 | 86% | 1 | 4 | 8/8 | yes | 5 | yes | – | – |
| `S-CC-07` | `small-storage-conditions/claude-code/rosetta-light` | run | done | 92 | 92 | $5.48 | $5.48 | 0% | 4 / 3 / 0 | 100% | 0 | 2 | 8/8 | yes | 5 | yes | – | – |
| `S-CC-08` | `small-storage-conditions/claude-code/rosetta-skill` | run | – | – | – | – | – | – | – / – / – | – | – | – | –/8 | – | – | – | – | – |

## Comparison

### small-storage-conditions · claude-code (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Judge abs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1 | 29 | 70 | $3.31 | 57% | 3 | 1 | 7 | 3 | – |
| grill-with-docs | 1 | 38 | 38 | $4.89 | 100% | 0 | 1 | 8 | 4 | – |
| superpowers | 1 | 44 | 62 | $8.08 | 86% | 1 | 5 | 7 | 3 | – |
| spec-kit | 1 | 105 | 203 | $12.65 | 57% | 3 | 14 | 8 | 3 | – |
| rosetta | 1 | 120 | 148 | $21.37 | 100% | 0 | 3 | 8 | 5 | – |
| rosetta-skills | 1 | 56 | 56 | $5.64 | 86% | 1 | 4 | 8 | 5 | – |
| rosetta-light | 1 | 92 | 92 | $5.48 | 100% | 0 | 2 | 8 | 5 | – |

### large-age-restriction · claude-code (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Judge abs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| grill-with-docs | 1 | 53 | 83 | $10.17 | 100% | 2 | 1 | 12 | 4 | – |
| superpowers | 1 | 108 | 526 | $35.11 | 56% | 1 | 6 | – | – | – |

## Missing values (fill them in the report)

- large-age-restriction/claude-code/superpowers/report.md: empty done_checks_passed, tests_pass, operator_score, operator_merge_ready
- small-storage-conditions/claude-code/rosetta-skill/report.md: empty status, t0, t1, t2, hidden_asked, hidden_covered, hidden_missed, followups, method_steps, done_checks_passed, tests_pass, operator_score, operator_merge_ready
- small-storage-conditions/claude-code/spec-kit/report.md: empty operator_merge_ready
- small-storage-conditions/claude-code/superpowers/report.md: empty operator_merge_ready
