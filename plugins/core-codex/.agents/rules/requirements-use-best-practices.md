---
name: requirements-use-best-practices
description: Rules for consuming requirements with strict traceability, explicit approvals, and no unapproved scope.
alwaysApply: false
tags: ["requirements", "rules", "best practices"]
---

<requirements_use_best_practices>

Problem: Delivery drifts when requirements are interpreted loosely, traceability is incomplete, or ambiguities are silently assumed.

Validation: Every in-scope result maps to approved requirement IDs with explicit evidence and user-reviewed gaps.

<must>

1. USE FLOW `requirements-use-flow` fully
2. Confirm in-scope requirement IDs first
3. Keep HITL back-and-forth active
4. Escalate ambiguity before proceeding
5. Map each task to requirement ID
6. Map each test to requirement ID
7. Keep assumptions explicit and approved
8. Reject untraceable scope additions
9. Report coverage gaps explicitly
10. Capture final user coverage approval

</must>

<should>

1. Use small review batches
2. Keep matrix updated continuously
3. Prioritize Must requirements first
4. Surface over-implementation risk early

</should>

<core_concepts>

- Approved requirements are execution contract
- Draft requirements need explicit decision
- Deprecated requirements must not drive scope
- No requirement ID means out-of-scope
- Facts and assumptions stay separated
- Traceability is bidirectional

</core_concepts>

<best_practices>

- Start from IDs and statuses
- Ask targeted clarifying questions
- Show options when conflicts appear
- Request approval before reinterpretation
- Keep completion claims evidence-backed

</best_practices>

<pitfalls>

- Silent assumption of missing behavior
- Executing from Draft requirements
- Ignoring requirement priority
- Skipping explicit user checkpoints
- Marking complete without proof links

</pitfalls>

</requirements_use_best_practices>
