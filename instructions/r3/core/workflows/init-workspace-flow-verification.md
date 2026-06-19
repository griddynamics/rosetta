---
name: init-workspace-flow-verification
description: "Phase 9 Verification of init-workspace-flow"
tags: ["init", "workspace", "verification", "phase"]
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_verification>

<description_and_purpose>
Without a final verification pass, incomplete or inconsistent documentation ships silently. Phase 9 runs a centralized checklist, ensures nothing was missed, and enforces new-chat requirement.
</description_and_purpose>

<workflow_context>
- Phase 9 of 9 in init-workspace-flow (final phase)
- Prerequisite: Phases 1-8 complete
- Output: verification report, next steps, new-chat enforcement
</workflow_context>

<phase_steps>
1. Read state file and confirm prerequisites
2. Execute verification checklist
3. Suggest next steps
4. Enforce new chat and mark COMPLETE
</phase_steps>

<read_state step="9.1">
1. Read `agents/init-workspace-flow-state.md`
2. Confirm Phases 1-8 all marked complete
3. Collect unresolved gaps from Phase 8
</read_state>

<execute_verification step="9.2" subagent="built-in" role="Workspace initialization auditor" subagent_recommended_model="claude-sonnet-4-6,gpt-5.4-medium">

Act as a senior workspace initialization auditor. This is the final phase of workspace initialization. Consolidates all init-phase outputs into a single completeness audit, runs catch-up for gaps, and revalidates assumptions.

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed

</core_concepts>

<verification_process>

Run every checkpoint. Each must pass or have documented justification.

FILE EXISTENCE (non-empty, correct scope):

1. TECHSTACK.md — detected technologies, frameworks, build tools
2. CODEMAP.md — markdown headers, 3-4 levels, recursive children counts
3. DEPENDENCIES.md — direct dependencies only (project, package, version)
4. CONTEXT.md — business context only, no technical details
5. ARCHITECTURE.md — technical architecture, references CODEMAP.md, no business context
6. IMPLEMENTATION.md — current state, DRY references
7. ASSUMPTIONS.md — unknowns with forward references
8. AGENT MEMORY.md — self-defined purpose and initial entries
9. Each document includes self-definition (purpose, content type, style)

INIT INTEGRITY:

10. Init mode: exactly one of install, upgrade, plugin
11. Composite workspace: top-level docs as registries if composite
12. File inventory built before creation/update decisions
13. Shell files: frontmatter + single ACQUIRE, zero inline logic
14. load-context shell and bootstrap rule installed
15. Shells match schema — no structural deviations, no absolute paths
16. docs/PATTERNS/ with INDEX.md; each pattern in 2+ locations; INDEX.md is consistent

CROSS-FILE CONSISTENCY:

17. TECHSTACK frameworks appear in ARCHITECTURE
18. CONTEXT, ARCHITECTURE, IMPLEMENTATION complement — no duplication
19. coding.md ACQUIRED FROM KB and used as file creation reference
20. greppable headers used in all files

CONDITIONAL (if rules requested, N/A otherwise):

21. KB SEARCHED for IDE/Agent rules — agent's built-in knowledge is obsolete, verify KB was queried
22. Existing rules checked before creating new
23. Root agents file uses bootstrap.md template
24. Tech-specific agent files created
25. Local instructions with MoSCoW emphasis
26. Weekly check mechanism with release version
27. Subagents/commands initialized via KB instructions if supported

QUESTIONS:

28. HIGH priority gaps addressed via targeted questions

---

CATCH-UP: For failed checkpoints — identify owning skill, execute, re-verify.

ASSUMPTIONS REVALIDATION:

- Resolved entries: mark with evidence
- Duplicates: keep most detailed
- Forward references: verify target files exist
- New assumptions: track any discovered during verification

</verification_process>

</execute_verification>

<next_steps step="9.3">
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

<enforce_new_chat step="9.4">
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
