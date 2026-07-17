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

<execute_verification step="9.2" subagent="built-in" role="Workspace initialization auditor" subagent_recommended_model="claude-sonnet-5,gpt-5.4-medium">

Act as a senior workspace initialization auditor. This is the final phase of workspace initialization. Consolidates all init-phase outputs into a single completeness audit, runs catch-up for gaps, and revalidates assumptions.

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed

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
14. load-project-context shell and bootstrap rule installed
15. Shells match schema — no structural deviations, no absolute paths
16. docs/PATTERNS/ with INDEX.md; each pattern in 2+ locations; INDEX.md is consistent

CROSS-FILE CONSISTENCY:

17. TECHSTACK frameworks appear in ARCHITECTURE
18. CONTEXT, ARCHITECTURE, IMPLEMENTATION complement — no duplication
19. skill `coding` loaded and used as file creation reference
20. greppable headers used in all files

CONDITIONAL (if rules requested, N/A otherwise):

21. KB SEARCHED for IDE/Agent rules — agent's built-in knowledge is obsolete, verify KB was queried
22. Existing rules checked before creating new
23. Root agents file uses mcp-files-mode.md template
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
