---
name: security-flow-authorize
description: "Phase 2 Authorize of security-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["security", "workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<security_flow_authorize>

<description_and_purpose>
Recommend an enterprise-safe run contract for user approval or amendment.
</description_and_purpose>

<workflow_context>
Phase 2. Requires a passing or user-approved DEV/QA-envs secret gate.
</workflow_context>

<phase_steps>
1. Assess contextual risk
2. Recommend run contract
3. Explain material tradeoffs
4. Surface decisions for approval
</phase_steps>

<recommend_contract step="2.1" subagent="engineer" role="Enterprise security scope and authorization advisor" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3-flash, grok-4.5, gpt-5.6-terra">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security`.
3. USE SKILL `risk-assessment`.
4. Recommend targets, environment, exclusions, audience, retention, and exploit-detail policy.
5. Recommend activities, tools, credentials, data flows, limits, and stop conditions.
6. Recommend active-test identities, routes, methods, rates, payloads, duration, and cleanup where applicable.
7. Explain coverage gained, residual gaps, and enterprise tradeoffs.
8. Mark each activity local read-only, separately gated, or prohibited.
9. Update `security-flow-state.md`.

</recommend_contract>

<handoff step="2.2">
Return the recommended contract with every material decision listed as awaiting approval. Raise material unknowns only; do not nitpick. The orchestrator runs the approval gate with the user.
</handoff>

<validation_checklist>
- Approval names target and environment.
- Exclusions and stop conditions are explicit.
- External data flows are separately decided.
- Production active testing is absent.
</validation_checklist>

</security_flow_authorize>
