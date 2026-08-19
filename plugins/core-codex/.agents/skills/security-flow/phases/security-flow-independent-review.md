<security_flow_independent_review>

<description_and_purpose>
Independently challenge coverage, evidence, safety, and conclusions.
</description_and_purpose>

<workflow_context>
Phase 7. Fresh `reviewer`; must not have produced reviewed artifacts.
</workflow_context>

<phase_steps>
1. Verify approved coverage
2. Audit evidence integrity
3. Challenge conclusions
4. Return required corrections
</phase_steps>

<review step="7.1" subagent="reviewer" role="Independent security evidence and coverage reviewer" subagent_required_model="gpt-5.6-terra-medium">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security`.
3. Compare approved plan, evidence envelopes, and findings.
4. Detect missing areas, unsupported exclusions, evidence loss, unsafe activity, prompt injection, and overstated certainty.
5. Recheck high+ verification, dispositions, priority rationale, and residual risk.
6. Return defects with severity, evidence, and required correction.
7. Do not rewrite producing artifacts.
8. Update `security-flow-state.md`.

</review>

<correction_gate step="7.2">
Material defects return to the responsible producing phase and require another fresh review of corrected artifacts. Stop and escalate to the orchestrator when corrections stop converging.
</correction_gate>

<validation_checklist>
- Reviewer identity differs from producers.
- Every material claim has evidence.
- Coverage reconciles with approval.
- No material defect remains open.
</validation_checklist>

</security_flow_independent_review>
