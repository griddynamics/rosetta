# SpecFlow Vocabulary Reference

Standard terms used by the SpecFlow connector skill. Projects may override these in `gain.json` → `vocabulary`.

## Iteration Status

Values returned in the `status` field of `check_status` responses:

| Status | User-facing meaning |
|--------|---------------------|
| `pending`      | Queued, not yet started. |
| `analysis`     | Specification analysis or planning in progress. |
| `initializing` | Allocating resources before generation starts. |
| `running`      | Code generation in progress. |
| `completed`    | Finished successfully — outputs ready. |
| `failed`       | Encountered an error — retry or investigate. |

## Key Checkpoints

The `checkpoint` field in `check_status` responses advances through internal stages. Two checkpoints are meaningful to users:

| Checkpoint | Meaning |
|------------|---------|
| `planning_done`   | Planning is reviewable in `outputs_dir`. Generation can now start (`can_run_generation: true`). |
| `estimation_done` | The full iteration is complete, including outputs archival. |

## Vocabulary Overrides

If `gain.json` contains a `vocabulary` block, those definitions take precedence over the defaults in this file.
