<security_flow_deterministic_gates>

<description_and_purpose>
Run approved deterministic high-severity gates before lifecycle AI analysis.
</description_and_purpose>

<workflow_context>
Phase 3 for development, change, PR, and pipeline reviews.
</workflow_context>

<phase_steps>
1. Select deterministic gates
2. Run bounded commands
3. Preserve sanitized results
4. Choose lifecycle branch
</phase_steps>

<execute_gates step="3.1" subagent="executor" role="Bounded deterministic security-gate operator" subagent_required_model="gpt-5.6-terra-low, gpt-5.6-luna">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security`.
3. Run approved installed local tools only.
4. Preserve command, version, configuration, timestamps, exit status, and sanitized output reference.
5. Do not interpret beyond deterministic rule/severity results.
6. Return unchanged source finding records.
7. Update `security-flow-state.md`.

</execute_gates>

<branch step="3.2">
Return exactly one token with the records:

- Any deterministic high+: HIGH+.
- No deterministic high+: CLEAN.
- Tool error or incomplete evidence: ERROR; stop and report the tool error; never call the gate clean.

</branch>

<validation_checklist>
- Every required gate ran successfully.
- High+ records remain unchanged.
- Clean means zero high+ and no tool failure.
- Preserved evidence and output references contain no secret values.
</validation_checklist>

</security_flow_deterministic_gates>
