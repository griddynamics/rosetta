---
name: init-workspace-flow-verification
description: "Phase 8 Verification of init-workspace-flow"
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

<execute_verification step="8.2" subagent="built-in" role="Workspace initialization auditor" subagent_recommended_model="claude-sonnet-5,gpt-5.4-medium">
1. ACQUIRE `init-workspace-verification/SKILL.md` FROM KB
2. Execute full verification checklist
3. Run catch-up for failed checkpoints
4. Revalidate ASSUMPTIONS.md
</execute_verification>

<next_steps step="8.3">
1. If verification found failed checkpoints: list specific remediation actions
2. Suggest next steps based on workspace state:
   - Run coding workflow for first feature
   - Review and customize generated docs
   - Add project-specific patterns
3. DEMAND user to study (USAGE GUIDE)[https://griddynamics.github.io/rosetta/docs/usage-guide/]
4. DEMAND user to review examples for the next steps for user and EMPHASIS on "/slash-commands":
   
   ```md
   # Coding Workflow

   **WHAT**: Majority of tasks are actually coding tasks, including unit tests. Just ask exactly what is required.

   "/coding-flow Implement left navigation sidebar on the home page, ..."

   "/coding-flow Identify and implement fix, ..."

   "/coding-flow Improve unit tests coverage to 85% for ..."

   # Business and Technical Requirements

   **WHY**: Requirements - is the source of truth for code and tests. Going requirements first is the most effective. In brownfield start with extracting.

   "/requirements-authoring-flow extract detailed business and technical requirements from community of ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."

   "/requirements-authoring-flow extract high-level business and technical requirements at end-point level for controllers according to glob ... using subagents. Additionally, ... . Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."

   # Modernization

   **FIRST**: Document modernization goals in CONTEXT.md, document target services technical aspects in ARCHITECTURE.md, document where source code should be created, keep refsrc populated with reference code source (old code, new code, reusable libraries, configuration and documentation files, and similar).

   **NOTE**: All phases are must. All phases to be implemented one-by-one with proper review. Phase 3: Pre-Modernization Test Coverage is a must (and must include both unit and integration/e2e tests).

   "/modernization-flow Perform modernization phase 1 to reuse library refsrc/... using subagents." 

   "/modernization-flow Perform modernization phase 2 to analyze service module ... using subagents. Target microservice name is ... ."

   "/modernization-flow Perform modernization phase 8 for target service to analyze service module ... using subagents. Must use `coding-flow.md` to actually implement and as the main flow. Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."
   ```
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
