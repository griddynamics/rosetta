---
name: inspect
description: "Apply the inspect operation for managed repository tasks."
baseSchema: docs/schemas/generic.md
---

<inspect>

1. Validate passport schema, identity, canonical paths, unique ID, and all referenced evidence before deriving status.
2. Recompute content fingerprints and upstream bindings; do not trust cached stage/progress or historical receipts.
3. Derive exactly one stage from current evidence:

| Condition, evaluated in order | Stage | Next action |
|---|---|---|
| No current approved requirements | `requirements-needed` | Define or revise requirements |
| Requirements current; architecture or specification/plan approval missing/stale | `spec-needed` | Prepare/approve architecture, specification, plan |
| Design current; verified, accepted delivery missing/stale | `implementation-needed` | Implement, verify, or obtain final acceptance |
| Current verified delivery explicitly accepted | `done` | None; revise only on request |

4. Show progress, blockers, and stale evidence separately. Corruption/unreadable content -> `unknown`, never a fabricated stage.
   Missing/changed bound evidence is stale; malformed receipt semantics are invalid. Neither authorizes downstream work.
5. Inspection is read-only. On the next authorized mutation, record detected invalidation before continuing.
   Return missing prerequisites to the caller; do not execute a later stage to manufacture them.

</inspect>
