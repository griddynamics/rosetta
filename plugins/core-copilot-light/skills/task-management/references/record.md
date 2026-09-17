---
name: record
description: "Apply the record operation for managed repository tasks."
baseSchema: docs/schemas/generic.md
---

<record>

1. Re-inspect before every write. Apply the reference contract for content, receipts, and append-only history.
2. Save partial work and open questions without approval. Persist the exact resumable next action and relevant state/handoff references.
   After interruption, repeat delivery review/testing/validation unless a current complete verification receipt proves freshness.
3. Record approvals only from explicit human decisions covering the displayed current material; capture scope and evidence.
   An automation opt-out permits execution, not a fabricated human receipt or accepted delivery.
4. Record requirements, architecture, specification/plan, verification, and acceptance separately; bind each to its required predecessors.
5. Mark done only after current verification covers every acceptance criterion and explicit human delivery acceptance exists.
   Failed/skipped/unperformed checks and unresolved acceptance criteria prevent completion; record reasons and blockers.
6. Update only task-owned artifacts. Preserve existing workflow state as execution detail; link it, do not copy its entire ledger.

</record>
