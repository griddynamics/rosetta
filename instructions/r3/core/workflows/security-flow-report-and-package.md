---
name: security-flow-report-and-package
description: "Phase 8 Report and Package of security-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["security", "workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<security_flow_report_and_package>

<description_and_purpose>
Produce sanitized review artifacts and concise remediation inputs.
</description_and_purpose>

<workflow_context>
Phase 8. Final security phase; never starts downstream remediation.
</workflow_context>

<phase_steps>
1. Build sanitized report
2. Recommend remediation groups
3. Obtain INDEX approval
4. Emit concise task files
</phase_steps>

<prepare_package step="8.1" subagent="engineer" role="Security reporter and remediation-input designer" subagent_required_model="claude-sonnet-5, gpt-5.6-terra-medium, gemini-3.7-flash-low, grok-4.6">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security` for report, run, finding, remediation-task, and task-INDEX contracts.
3. USE SKILL `sensitive-data`.
4. Produce sanitized `report.md`, `findings.json`, and `run.json`.
5. Group by remediation area plus shared root cause/fix strategy.
6. Never group by file, folder, repository, component, or location.
7. Recommend membership, splits, priority, dependencies, order, and one-shot boundaries.
8. Draft `tasks/INDEX.md`; do not create task files yet.
9. Update `security-flow-state.md`.

</prepare_package>

<index_handoff step="8.2">
Return the drafted INDEX marked pending-approval, with grouping rationale and tradeoffs. The orchestrator runs the approval gate with the user.
</index_handoff>

<emit_tasks step="8.3" subagent="engineer" role="Concise coding-flow request author" subagent_required_model="claude-sonnet-5, gpt-5.6-terra-medium, gemini-3.7-flash-low, grok-4.6">

1. Apply approved grouping exactly.
2. Emit one concise `tasks/<task-id>.md` per one-shot group.
3. Reference findings/report/evidence; never duplicate evidence.
4. Record dependencies; never execute them.
5. With storage approval, write under `docs/security/<run-id>/`.
6. Otherwise return sanitized artifacts without committing.
7. Keep raw scanner output in `docs/security/<run-id>/raw/`; never commit it.
8. Ask the user to review and commit; never commit or delete on their behalf.
9. Update `security-flow-state.md`.

</emit_tasks>

<deterministic_high_branch>
- Preserve deterministic source records unchanged.
- Mark unverified claims as unverified.
- Prepare only the minimum sanitized report and task package.
- Require a new clean deterministic run after separate remediation.
- Do not re-run modeling, inspection, normalization, or independent review retrospectively.
</deterministic_high_branch>

<validation_checklist>
- INDEX approval is recorded.
- Every finding is represented or dispositioned.
- Tasks follow fix similarity, not location.
- No task performs or invokes remediation.
- Output contains no secret values.
</validation_checklist>

</security_flow_report_and_package>
