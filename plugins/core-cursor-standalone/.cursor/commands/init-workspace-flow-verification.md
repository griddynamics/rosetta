---
name: init-workspace-flow-verification
description: "Phase 8 of init-workspace-flow, contains verify completeness, suggest next steps, enforce new-chat requirement."
tags: ["init", "workspace", "verification", "phase"]
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_verification>

<description_and_purpose>
Without a final verification pass, incomplete or inconsistent documentation ships silently. Phase 8 runs a centralized checklist, ensures nothing was missed, and enforces new-chat requirement.
</description_and_purpose>

<workflow_context>
- Phase 8 of 8 in init-workspace-flow (final phase)
- Prerequisite: Phases 1-7 complete
- Output: verification report, next steps, new-chat enforcement
</workflow_context>

<phase_steps>
1. Read state file and confirm prerequisites
2. Acquire and execute verification skill
3. Suggest next steps
4. Enforce new chat and mark COMPLETE
</phase_steps>

<read_state step="8.1">
1. Read `agents/init-workspace-flow-state.md`
2. Confirm Phases 1-7 all marked complete
3. Collect unresolved gaps from Phase 7
</read_state>

<execute_verification step="8.2" subagent="built-in" role="Workspace initialization auditor" subagent_recommended_model="claude-sonnet-4-6,gpt-5.4-medium">
1. ACQUIRE `init-workspace-verification/SKILL.md` FROM KB
2. Execute full verification checklist
3. Run catch-up for failed checkpoints
4. Revalidate ASSUMPTIONS.md
</execute_verification>

<next_steps step="8.3">
1. Suggest next steps based on workspace state:
   - Run coding workflow for first feature
   - Review and customize generated docs
   - Add project-specific patterns
2. If verification found failed checkpoints: list specific remediation actions
</next_steps>

<enforce_new_chat step="8.4">
1. EMPHASIZE: MUST start a new chat session after init completes
2. Current session context is polluted with init-specific state
3. Mark state as COMPLETE in `agents/init-workspace-flow-state.md`
</enforce_new_chat>

<validation_checklist>
- Verification skill ran and reported pass/fail per checkpoint
- Failed checkpoints have documented remediation
- State file shows COMPLETE status
</validation_checklist>

</init_workspace_flow_verification>
