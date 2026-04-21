---
name: init-workspace-verification
description: "Rosetta skill to verify workspace initialization completeness and run catch-up for missed artifacts."
model: gpt-5.4
model_reasoning_effort: medium
tags: ["init", "workspace", "verification", "validation"]
baseSchema: docs/schemas/skill.md
---

<init_workspace_verification>

<role>Senior workspace initialization auditor</role>

<when_to_use_skill>
Final phase of workspace initialization. Consolidates all init-phase outputs into a single completeness audit, runs catch-up for gaps, and revalidates assumptions.
</when_to_use_skill>

<core_concepts>
- Rosetta prep steps completed
</core_concepts>

<process>

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
16. docs/PATTERNS/ with INDEX.md; each pattern in 2+ locations

CROSS-FILE CONSISTENCY:
17. TECHSTACK frameworks appear in ARCHITECTURE
18. CONTEXT, ARCHITECTURE, IMPLEMENTATION complement — no duplication
19. coding.md ACQUIRED FROM KB and used as file creation reference

CONDITIONAL (if rules requested, N/A otherwise):
20. KB SEARCHED for IDE/Agent rules — agent's built-in knowledge is obsolete, verify KB was queried
21. Existing rules checked before creating new
22. Root agents file uses bootstrap.md template
23. Tech-specific agent files created
24. Local instructions with MoSCoW emphasis
25. Weekly check mechanism with release version
26. Subagents/commands initialized via KB instructions if supported

QUESTIONS:
27. HIGH priority gaps addressed via targeted questions

---

CATCH-UP: For failed checkpoints — identify owning skill, execute, re-verify.

ASSUMPTIONS REVALIDATION:
- Resolved entries: mark with evidence
- Duplicates: keep most detailed
- Forward references: verify target files exist
- New assumptions: track any discovered during verification

DEPRECATED ARTIFACTS (notify user, do NOT auto-delete):
- `agents/init-rosetta-shells-flow-state.md` — r1 state file
- Local `init-rosetta-shells-flow.md` — replaced by init-workspace-shells skill

</process>

</init_workspace_verification>
