<security_flow_deterministic_gates>

<description_and_purpose>
Run approved deterministic high-severity gates before lifecycle AI analysis.
</description_and_purpose>

<workflow_context>
Phase 2 for development, change, PR, and pipeline reviews.
</workflow_context>

<phase_steps>
1. Select deterministic gates
2. Run bounded commands
3. Preserve sanitized results
4. Choose lifecycle branch
</phase_steps>

<execute_gates step="2.1" subagent="executor" role="Bounded deterministic security-gate operator" subagent_required_model="claude-haiku-4-5, gpt-5.4-low, gemini-3-flash, composer-2.5, gpt-5.6-luna">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security`.
3. Run approved installed local tools only.
4. Preserve command, version, configuration, timestamps, exit status, and sanitized output reference.
5. Do not interpret beyond deterministic rule/severity results.
6. Return unchanged source finding records.

</execute_gates>

<branch step="2.2">
- Any deterministic high+: skip phases 3-6; send records to phase 7 task preparation; end this run afterward.
- No deterministic high+: continue to phase 3.
- Tool error/incomplete evidence: stop or obtain a revised approved plan; never call the gate clean.
</branch>

<validation_checklist>
- Every required gate ran successfully.
- High+ records remain unchanged.
- Clean means zero high+ and no tool failure.
</validation_checklist>

</security_flow_deterministic_gates>
