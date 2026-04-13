---
name: bootstrap-hitl-questioning
description: Rules for human-in-the-loop (HITL), user communication, questioning, approvals, and coordination during agent execution.
trigger: always_on
alwaysApply: true
tags: ["rosetta-bootstrap", "guardrails", "hitl", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_hitl_questioning severity="CRITICAL" apply="ALWAYS" back_and_forth_with_user="REQUIRED">

<must>

1. MUST USE SKILL `hitl` for user interactions, approvals, checkpoints, working with user, and mismatch handling.
2. MUST USE SKILL `questioning` when unknowns or ambiguities exist.
3. HITL is mandatory for all request sizes per bootstrap-core-policy sizing rules.

</must>

</bootstrap_hitl_questioning>
