---
name: security-flow-model-and-select
description: "Phase 4 Model and Select of security-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["security", "workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<security_flow_model_and_select>

<description_and_purpose>
Map attack surface to complete, contextual, authorized security coverage.
</description_and_purpose>

<workflow_context>
Phase 4. Broad/full reviews require a threat model before inspection.
</workflow_context>

<phase_steps>
1. Model attack surface
2. Map applicable areas
3. Select verified tools
4. Define evidence contracts
</phase_steps>

<design_coverage step="4.1" subagent="architect" role="Security architect mapping threats to contextual coverage" subagent_required_model="Claude Opus 4.8, GPT-5.5">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security` for its threat-model contract.
3. Inspect approved source/context only.
4. Identify assets, actors, entry points, trust boundaries, data flows, dependencies, and abuse cases.
5. Map each applicable area to threats and planned evidence.
6. For full review, include every applicable, available, authorized activity/tool.
7. Record exclusions with evidence and residual risk.
8. Verify each proposed tool's operational contract.
9. Update `security-flow-state.md`.

</design_coverage>

<validation_checklist>
- Threats trace to planned areas.
- Every area is included or justified.
- Tool facts are verified and dated.
- Plan stays inside approval.
</validation_checklist>

</security_flow_model_and_select>
