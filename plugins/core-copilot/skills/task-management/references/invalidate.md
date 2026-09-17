---
name: invalidate
description: "Apply the invalidate operation for managed repository tasks."
baseSchema: docs/schemas/generic.md
---

<invalidate>

- Requirements revision -> clear current requirements, architecture, specification/plan, verification, acceptance pointers.
- Architecture revision -> clear architecture and every downstream pointer.
- Specification/plan revision -> clear specification/plan, verification, acceptance pointers.
- Delivery/evidence revision -> clear verification and acceptance pointers.
- Retain old receipts, artifacts, implementation, and history. Record cause and affected scope; never delete prior work.
- New revision input starts as pending requirements work; do not keep an old approval current while its scope is unsettled.
- Unchanged clarification needs no invalidation only after explicit comparison establishes no authoritative content change.
- Execution-only requirement metadata and plan checkbox updates preserve approvals under the normative selectors; never refresh approved hashes silently.

</invalidate>
