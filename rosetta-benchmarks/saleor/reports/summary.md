# Benchmark results

2 reports in `saleor/runs/`. Compare methods only within one task and one runner (templates/README.md).

## Every run

| Run ID | Folder | Kind | Status | Time first (min) | Time total (min) | Usage first | Usage total | Rework | Hidden asked / covered / missed | First-pass coverage | Follow-ups | Method steps | Done checks | Tests | Operator score | Merge-ready | Judge abs | Judge s-b-s |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- | --- | ---: | --- | ---: | ---: |
| `S-CC-01` | `small-storage-conditions/claude-code/baseline` | run | done | 29 | 70 | $1.24 | $3.31 | 63% | 0 / 4 / 3 | 57% | 3 | 1 | 7/8 | yes | 3 | no | – | – |
| `S-CC-02` | `small-storage-conditions/claude-code/grill-with-docs` | run | done | 38 | 38 | $4.82 | $4.89 | 1% | 5 / 2 / 0 | 100% | 0 | 1 | 8/8 | yes | 4 | yes | – | – |

## Comparison

### small-storage-conditions · claude-code (status done only)

| Method | n | Time first (min) | Time total (min) | Usage total | First-pass coverage | Follow-ups | Method steps | Done checks passed | Operator score | Judge abs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1 | 29 | 70 | $3.31 | 57% | 3 | 1 | 7 | 3 | – |
| grill-with-docs | 1 | 38 | 38 | $4.89 | 100% | 0 | 1 | 8 | 4 | – |
