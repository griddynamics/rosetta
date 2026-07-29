<security_flow_report_and_package>

<description_and_purpose>
Produce sanitized review artifacts and concise remediation inputs.
</description_and_purpose>

<workflow_context>
Phase 7. Final security phase; never starts downstream remediation.
</workflow_context>

<phase_steps>
1. Build sanitized report
2. Recommend remediation groups
3. Obtain INDEX approval
4. Emit concise task files
</phase_steps>

<prepare_package step="7.1" subagent="engineer" role="Security reporter and remediation-input designer" subagent_required_model="inherit">

1. USE SKILL `subagent-directives`.
2. USE SKILL `security` for report, run, finding, remediation-task, and task-INDEX contracts.
3. USE SKILL `sensitive-data`.
4. Produce sanitized `report.md`, `findings.json`, and `run.json`.
5. Group by remediation area plus shared root cause/fix strategy.
6. Never group by file, folder, repository, component, or location.
7. Recommend membership, splits, priority, dependencies, order, and one-shot boundaries.
8. Draft `tasks/INDEX.md`; do not create task files yet.

</prepare_package>

<index_hitl step="7.2">
The executing agent must USE SKILL `hitl` to present the INDEX recommendation and tradeoffs. Require explicit approval or amendments.
</index_hitl>

<emit_tasks step="7.3" subagent="engineer" role="Concise coding-flow request author" subagent_required_model="inherit">

1. Apply approved grouping exactly.
2. Emit one concise `tasks/<task-id>.md` per one-shot group.
3. Reference findings/report/evidence; never duplicate evidence.
4. Record dependencies; never execute them.
5. With storage approval, write under `docs/security/<run-id>/`.
6. Otherwise return sanitized artifacts without committing.
7. Remove temporary raw scanner output after finalization.

</emit_tasks>

<deterministic_high_branch>
- Preserve deterministic source records unchanged.
- Mark unverified claims as unverified.
- Prepare only the minimum sanitized report and task package.
- Require a new clean deterministic run after separate remediation.
- Do not perform phases 3-6 retrospectively.
</deterministic_high_branch>

<validation_checklist>
- INDEX approval is recorded.
- Every finding is represented or dispositioned.
- Tasks follow fix similarity, not location.
- No task performs or invokes remediation.
- Output contains no secret values.
</validation_checklist>

</security_flow_report_and_package>
