<security_flow_normalize_and_triage>

<description_and_purpose>
Convert findings losslessly, then apply independent security judgment.
</description_and_purpose>

<workflow_context>
Phase 6. Requires separate `executor` and `engineer` invocations.
</workflow_context>

<phase_steps>
1. Convert source records
2. Correlate related evidence
3. Verify material findings
4. Recommend dispositions and priority
</phase_steps>

<normalize step="6.1" subagent="executor" role="Lossless deterministic finding converter" subagent_required_model="gpt-5.4-low">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security` for its normalized-finding contract.
3. Convert records mechanically.
4. Preserve source fields byte-for-byte where representable.
5. Link evidence envelopes.
6. Report conversion errors; never infer missing fields.
7. Update `security-flow-state.md`.

</normalize>

<triage step="6.2" subagent="engineer" role="Security triager correlating evidence without loss" subagent_required_model="gpt-5.4-medium">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security`.
3. Correlate without deleting source records.
4. Seek a second signal or bounded reproduction for material high+.
5. Otherwise retain high+ as unverified.
6. Assign auditable dispositions.
7. Recommend P0-P3 using context.
8. Explain every severity uplift/downgrade separately from source severity.
9. Identify shared root cause and fix strategy.
10. Update `security-flow-state.md`.

</triage>

<validation_checklist>
- Source count and identities reconcile.
- Correlations retain every source link.
- High+ verification status is explicit.
- Dispositions and priorities have rationale.
</validation_checklist>

</security_flow_normalize_and_triage>
