---
name: security-flow-normalize-and-triage
description: "Phase 5 Normalize and Triage of security-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["security", "workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<security_flow_normalize_and_triage>

<description_and_purpose>
Convert findings losslessly, then apply independent security judgment.
</description_and_purpose>

<workflow_context>
Phase 5. Requires separate `executor` and `engineer` invocations.
</workflow_context>

<phase_steps>
1. Convert source records
2. Correlate related evidence
3. Verify material findings
4. Recommend dispositions and priority
</phase_steps>

<normalize step="5.1" subagent="executor" role="Lossless deterministic finding converter" subagent_required_model="claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security` for its normalized-finding contract.
3. Convert records mechanically.
4. Preserve source fields byte-for-byte where representable.
5. Link evidence envelopes.
6. Report conversion errors; never infer missing fields.

</normalize>

<triage step="5.2" subagent="engineer" role="Security triager correlating evidence without loss" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security`.
3. Correlate without deleting source records.
4. Seek a second signal or bounded reproduction for material high+.
5. Otherwise retain high+ as unverified.
6. Assign auditable dispositions.
7. Recommend P0-P3 using context.
8. Explain every severity uplift/downgrade separately from source severity.
9. Identify shared root cause and fix strategy.

</triage>

<validation_checklist>
- Source count and identities reconcile.
- Correlations retain every source link.
- High+ verification status is explicit.
- Dispositions and priorities have rationale.
</validation_checklist>

</security_flow_normalize_and_triage>
