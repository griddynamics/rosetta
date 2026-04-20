---
name: bootstrap-hitl-questioning
description: Rules for human-in-the-loop (HITL), user communication, questioning, approvals, and coordination during agent execution.
trigger: always_on
alwaysApply: true
tags: ["rosetta-bootstrap", "guardrails", "hitl", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_hitl_questioning severity="CRITICAL" apply="ALWAYS">

<must>

1. MUST USE SKILL `hitl` — loaded RIGHT WITH IMPLEMENTATION for ALL tasks by default.
2. THE ONLY exception: user DIRECTLY EXPLICITLY requests with EXACTLY "fully autonomous" or "No HITL".

</must>

</bootstrap_hitl_questioning>
