# Benchmark results

15 reports in `saleor/runs/`. Compare methods only within one task and one runner (templates/README.md).

## Every run

| Run ID | Folder | Kind | Status | Time first (min) | Time total (min) | Usage first | Usage total | Rework | Hidden asked / covered / missed | First-pass coverage | Follow-ups | Method steps | Done checks | Tests | Operator score | Merge-ready | Judge abs | Judge s-b-s |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- | --- | ---: | --- | ---: | ---: |
| `L-CC-01` | `large-age-restriction/claude-code/baseline` | run | done | 37 | 100 | $3.86 | $7.84 | 51% | 0 / 4 / 5 | 44% | 5 | 1 | 12/12 | yes | 3 | no | – | – |
| `L-CC-02` | `large-age-restriction/claude-code/grill-with-docs` | run | done | 53 | 83 | $9.46 | $10.17 | 7% | 6 / 3 / 0 | 100% | 2 | 1 | 12/12 | yes | 4 | no | – | – |
| `L-CC-03` | `large-age-restriction/claude-code/superpowers` | run | done | 76 | 494 | $14.31 | $35.11 | 59% | 1 / 4 / 4 | 56% | 1 | 6 | –/12 | – | – | – | – | – |
| `L-CC-04` | `large-age-restriction/claude-code/spec-kit` | run | done | 103 | 373 | $5.95 | $11.04 | 46% | 0 / 5 / 4 | 56% | 5 | 5 | 12/12 | yes | 3 | no | not run | not run |
| `L-CC-08` | `large-age-restriction/claude-code/rosetta-skills` | run | done | 119 | 243 | $62.50 | $67.47 | 7% | 4 / 4 / 1 | 89% | 1 | 2 | 12/12 | yes | 5 | yes | – | – |
| `L-CC-07` | `large-age-restriction/claude-code/rosetta-light` | run | done | 348 | 431 | $53.30 | $57.65 | 8% | 4 / 4 / 1 | 89% | 2 | 2 | 12/12 | yes | 4 | yes | – | – |
| `S-CC-01` | `small-storage-conditions/claude-code/baseline` | run | done | 29 | 70 | $1.24 | $3.31 | 63% | 0 / 4 / 3 | 57% | 3 | 1 | 7/8 | yes | 3 | no | – | – |
| `S-CC-02` | `small-storage-conditions/claude-code/grill-with-docs` | run | done | 38 | 38 | $4.82 | $4.89 | 1% | 5 / 2 / 0 | 100% | 0 | 1 | 8/8 | yes | 4 | yes | – | – |
| `S-CC-03` | `small-storage-conditions/claude-code/superpowers` | run | done | 36 | 54 | $6.76 | $8.08 | 16% | 1 / 5 / 1 | 86% | 1 | 5 | 7/8 | yes | 3 | – | – | – |
| `S-CC-04` | `small-storage-conditions/claude-code/spec-kit` | run | done | 105 | 203 | $4.58 | $12.65 | 64% | 0 / 4 / 3 | 57% | 3 | 14 | 8/8 | yes | 3 | – | – | – |
| `S-CC-06` | `small-storage-conditions/claude-code/rosetta-flow` | run | done | 120 | 148 | $21.30 | $21.37 | 0% | 3 / 4 / 0 | 100% | 0 | 3 | 8/8 | yes | 5 | yes | – | – |
| `S-CC-08` | `small-storage-conditions/claude-code/rosetta-skills` | run | done | 56 | 56 | $5.64 | $5.64 | 0% | 3 / 3 / 1 | 86% | 1 | 4 | 8/8 | yes | 5 | yes | – | – |
| `S-CC-07` | `small-storage-conditions/claude-code/rosetta-light` | run | done | 92 | 92 | $5.48 | $5.48 | 0% | 4 / 3 / 0 | 100% | 0 | 2 | 8/8 | yes | 5 | yes | – | – |
| `S-CC-08` | `small-storage-conditions/claude-code/rosetta-skill` | run | – | – | – | – | – | – | – / – / – | – | – | – | –/8 | – | – | – | – | – |
| `S-CP-03` | `small-storage-conditions/copilot/superpowers` | run | – | 107 | 5174 | 1407 req | 1976 req | 29% | 3 / 3 / 1 | 86% | 2 | 16 | 8/8 | yes | – | – | – | – |

## Comparison

### small-storage-conditions · claude-code (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Judge abs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1 | 29 | 70 | $3.31 | 57% | 3 | 1 | 7 | 3 | – |
| grill-with-docs | 1 | 38 | 38 | $4.89 | 100% | 0 | 1 | 8 | 4 | – |
| superpowers | 1 | 36 | 54 | $8.08 | 86% | 1 | 5 | 7 | 3 | – |
| spec-kit | 1 | 105 | 203 | $12.65 | 57% | 3 | 14 | 8 | 3 | – |
| rosetta | 1 | 120 | 148 | $21.37 | 100% | 0 | 3 | 8 | 5 | – |
| rosetta-skills | 1 | 56 | 56 | $5.64 | 86% | 1 | 4 | 8 | 5 | – |
| rosetta-light | 1 | 92 | 92 | $5.48 | 100% | 0 | 2 | 8 | 5 | – |

### large-age-restriction · claude-code (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Judge abs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1 | 37 | 100 | $7.84 | 44% | 5 | 1 | 12 | 3 | – |
| grill-with-docs | 1 | 53 | 83 | $10.17 | 100% | 2 | 1 | 12 | 4 | – |
| superpowers | 1 | 76 | 494 | $35.11 | 56% | 1 | 6 | – | – | – |
| spec-kit | 1 | 103 | 373 | $11.04 | 56% | 5 | 5 | 12 | 3 | – |
| rosetta-skills | 1 | 119 | 243 | $67.47 | 89% | 1 | 2 | 12 | 5 | – |
| rosetta-light | 1 | 348 | 431 | $57.65 | 89% | 2 | 2 | 12 | 4 | – |

## Missing values (fill them in the report)

- large-age-restriction/claude-code/superpowers/report.md: empty done_checks_passed, tests_pass, operator_score, operator_merge_ready
- small-storage-conditions/claude-code/rosetta-skill/report.md: empty status, t0, t1, t2, hidden_asked, hidden_covered, hidden_missed, followups, method_steps, done_checks_passed, tests_pass, operator_score, operator_merge_ready
- small-storage-conditions/claude-code/spec-kit/report.md: empty operator_merge_ready
- small-storage-conditions/claude-code/superpowers/report.md: empty operator_merge_ready
- small-storage-conditions/copilot/superpowers/report.md: empty status, operator_score, operator_merge_ready
