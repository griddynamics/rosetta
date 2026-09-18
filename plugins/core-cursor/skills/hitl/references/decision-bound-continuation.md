---
name: decision-bound-continuation
description: "Continue authorized routine work; pause only for unresolved human decisions."
baseSchema: docs/schemas/generic.md
---

<decision_bound_continuation>

Activate only for the scope explicitly supplied by the user or invoked workflow. Carry that scope into delegated work; clear it when the invocation ends. Never infer it from files, runtime permissions, or an unrelated task.

1. Continue routine file creation/edits, progress recording, analysis, reviews, and checks within the authorized stage and scope. Do not ask permission for each file, phase transition, or already authorized action. Existing content approvals remain valid only for their exact scope and inputs.
2. On a technical failure, pause affected mutations and diagnose first. Obtain the architect consultant's grounded recovery recommendation; the orchestrator checks it against approved intent, current requirements/plan, and permissions. No unresolved decision, new scope, changed behavior/interface/architecture, or increased risk: record the cause and recovery, repair, rerun affected checks, and continue automatically. Diagnosis and learning duties still apply; failed checks remain failed until verified.
3. Confirmation-only recovery pauses are satisfied by this scoped authorization, not by an invented approval. Repeated failure without progress, uncertain cause, conflicting advice, stale approvals, changed requirements/design, missing user inputs, or user dissatisfaction require a real decision. Present the blocker and concrete options; do not retry blindly.
4. Preserve artifact approval and final acceptance gates, security/access restrictions, and authorization for dangerous or irreversible actions. Advice does not approve scope changes, bypass a failing gate, waive checks, or authorize publication. Continue independent authorized work while a decision is pending; never cross its dependency boundary. Never cross a stage boundary: this authorization covers the invoked stage only, and that stage ends in a recorded handoff, not in the next stage.

</decision_bound_continuation>
