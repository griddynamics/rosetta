---
name: consultation
description: "Prepare task-scoped architect context and durable consultation evidence."
baseSchema: docs/schemas/generic.md
---

<consultation>

1. Inspect the resolved task. Return a consultation brief: repository and task identity, current stage, original intent, current artifacts/approvals, affected context, known gaps, pending decision, and prior advice. Draft requirements are valid consultation inputs; label unknowns, never invent them.
2. Bind a consultant to this repository, task, and conversation only. Reuse that live instance across stages; never reuse another task's context. After interruption or a new chat, rebuild the brief from current sources and durable evidence, not a stored agent ID or stale TEMP files.
3. Consultant output: examined inputs, findings with evidence, alternatives/tradeoffs, recommendation, unresolved questions, and whether a human decision is needed. Advice is execution evidence, never an approval or independent review.
4. Persist each material consultation and its disposition through the record operation: SMALL may append concise notes to `## History`; classify detailed reports in `artifacts.execution` before creation and link them through `continuation.handoff_ref`. Include current input references, unresolved risks, and next consultation; TEMP and live agent IDs are optional accelerators.
5. Reconsult when relevant inputs change. Present unresolved decision-bearing findings at the applicable human gate. Reject unsupported advice; do not change approved content or create approval receipts from recommendations.

</consultation>
