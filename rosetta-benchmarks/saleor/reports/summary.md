# Benchmark results

6 reports in `saleor/runs/`. Compare methods only within one task and one runner (templates/README.md).

## Every run

| Run ID | Folder | Kind | Status | Time first (min) | Time total (min) | Usage first | Usage total | Rework | Hidden asked / covered / missed | First-pass coverage | Follow-ups | Method steps | Done checks | Tests | Operator score | Merge-ready | Judge abs | Judge s-b-s |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- | --- | ---: | --- | ---: | ---: |
| `L-CC-03` | `large-age-restriction/claude-code/superpowers` | run | done | 108 | 526 | $14.31 | $35.11 | 59% | 1 / 4 / 4 | 56% | 1 | 6 | –/12 | – | – | – | – | – |
| `S-CC-01` | `small-storage-conditions/claude-code/baseline` | run | done | 29 | 70 | $1.24 | $3.31 | 63% | 0 / 4 / 3 | 57% | 3 | 1 | 7/8 | yes | 3 | no | – | – |
| `S-CC-02` | `small-storage-conditions/claude-code/grill-with-docs` | run | done | 38 | 38 | $4.82 | $4.89 | 1% | 5 / 2 / 0 | 100% | 0 | 1 | 8/8 | yes | 4 | yes | – | – |
| `S-CC-03` | `small-storage-conditions/claude-code/superpowers` | run | done | 44 | 62 | $6.76 | $8.08 | 16% | 1 / 5 / 1 | 86% | 1 | 5 | 7/8 | yes | 3 | – | – | – |
| `S-CC-04` | `small-storage-conditions/claude-code/spec-kit` | run | done | 105 | 203 | $4.58 | $12.65 | 64% | 0 / 4 / 3 | 57% | 3 | 14 | 8/8 | yes | 3 | – | – | – |
| `S-CC-06` | `small-storage-conditions/claude-code/rosetta` | run | done | 120 | 148 | $21.30 | $21.37 | 0% | 3 / 4 / 0 | 100% | 0 | 3 | 8/8 | yes | 5 | yes | – | – |

## Comparison

### small-storage-conditions · claude-code (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Judge abs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1 | 29 | 70 | $3.31 | 57% | 3 | 1 | 7 | 3 | – |
| grill-with-docs | 1 | 38 | 38 | $4.89 | 100% | 0 | 1 | 8 | 4 | – |
| superpowers | 1 | 44 | 62 | $8.08 | 86% | 1 | 5 | 7 | 3 | – |
| spec-kit | 1 | 105 | 203 | $12.65 | 57% | 3 | 14 | 8 | 3 | – |
| rosetta | 1 | 120 | 148 | $21.37 | 100% | 0 | 3 | 8 | 5 | – |

### large-age-restriction · claude-code (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Judge abs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| superpowers | 1 | 108 | 526 | $35.11 | 56% | 1 | 6 | – | – | – |

## Missing values (fill them in the report)

- large-age-restriction/claude-code/superpowers/report.md: empty done_checks_passed, tests_pass, operator_score, operator_merge_ready
- small-storage-conditions/claude-code/spec-kit/report.md: empty operator_merge_ready
- small-storage-conditions/claude-code/superpowers/report.md: empty operator_merge_ready
