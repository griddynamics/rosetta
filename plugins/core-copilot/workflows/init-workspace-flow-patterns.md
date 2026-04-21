---
name: init-workspace-flow-patterns
description: "Phase 5 of init-workspace-flow, contains extract coding and architectural patterns into reusable templates."
tags: ["init", "workspace", "patterns", "phase"]
baseSchema: docs/schemas/phase.md
---

<init_workspace_flow_patterns>

<description_and_purpose>
Extract recurring code structures into explicit reusable pattern templates. Without them, agents reinvent conventions per task. Proof: docs/PATTERNS/ contains INDEX.md, per-module files, and CHANGES.md referenced by downstream coding tasks.
</description_and_purpose>

<workflow_context>
- Phase 5 of 8 in init-workspace-flow
- Input: CODEMAP, source code
- Output: docs/PATTERNS/ (INDEX.md, per-module files, CHANGES.md)
- Prerequisite: Phase 3 complete (CODEMAP exists)
</workflow_context>

<phase_steps>
1. Read state and CODEMAP
2. Acquire pattern extraction skill
3. Execute multi-agent pattern extraction
4. Update state, log gaps
</phase_steps>

<read_state step="5.1">
1. Read `agents/init-workspace-flow-state.md`
2. Confirm Phase 3 complete and CODEMAP exists
3. Read state.mode for dual-mode behavior
</read_state>

<acquire_skills step="5.2">
1. ACQUIRE `init-workspace-patterns/SKILL.md` FROM KB
</acquire_skills>

<execute_extraction step="5.3" subagent="built-in" role="Senior pattern analyst extracting reusable conventions" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro-preview">
1. Read CODEMAP, identify distinct modules
2. Required skill `init-workspace-patterns`
3. Spawn built-in subagent per module scope for pattern extraction
4. Merge subagent results into docs/PATTERNS/ structure
5. Deduplicate patterns found across modules
</execute_extraction>

<update_state step="5.4">
1. Write Phase 5 completion to `agents/init-workspace-flow-state.md`
2. Update PATTERNS row in file inventory
3. Log gaps for Phase 7
</update_state>

<validation_checklist>
- docs/PATTERNS/INDEX.md exists and lists all extracted pattern files
- Every CODEMAP module has pattern coverage or explicit skip reason
- State file shows Phase 5 complete
- Upgrade mode: no human-curated patterns overwritten
</validation_checklist>

<pitfalls>
- Do not extract implementation details as patterns — only genuinely recurring structures
- Scope subagents by CODEMAP module boundaries, not arbitrary directory splits
</pitfalls>

</init_workspace_flow_patterns>
