---
name: init-workspace-flow
description: "Rosetta workflow to initialize or upgrade a workspace, includes identify context, init proxying shells for target skills/agents/commands, workspace discovery, copy rules (optional, not recommended), identify patterns used, generate documentation, clarify questions, verification."
tags: ["workflow", "init", "workspace"]
baseSchema: docs/schemas/workflow.md
---

<init_workspace_flow>

<description_and_purpose>

Problem: Workspace initialization is multi-phase, order-dependent, and must handle install/upgrade/plugin modes without overwriting human content.
Validation: State file tracks every phase with file inventory; verification confirms all files exist.

</description_and_purpose>

<workflow_phases>

- Rosetta prep steps completed
- Sequential phases. Each updates `agents/init-workspace-flow-state.md`. Optional phases marked as skipped. Keep state file very brief.
- ACCURACY > SPEED
- Dual-mode: every phase reads `state.mode` → check-exists → identify-gaps → create/update → preserve-human-content → report-changes.
- MUST extensively use subagents as this is a large workflow.
- Composite workspace: documentation phases create top-level registry referencing sub-repository docs.
- IF state.file_count >= 50 (set by Phase 3): pass "ACQUIRE `large-workspace-handling/SKILL.md` FROM KB" to Phase 5, 6, 8 subagents.
- Before Phase 1: create `agents/init-workspace-flow-state.md`.
- If user explicitly stated he wants to HAVE ALL RULES LOCALLY IN ADVANCE, ONLY then execute phase `init-workspace-flow-rules.md`, otherwise phase `init-workspace-flow-shells.md`.
- If user says to initialize rules, subagents, agents, workflows, commands it still means `init-workspace-flow-shells.md`.

<context phase="1" subagent="built-in" role="Workspace mode detector" subagent_recommended_model="claude-haiku-4-5, gemini-3-flash-preview">

1. Detect mode: install, upgrade, or plugin. Set state.mode, state.plugin_active, state.composite, state.existing_files.
2. ACQUIRE `init-workspace-flow-context.md` FROM KB
3. Update state

</context>

<shells phase="2" default="true" subagent="built-in" if="NOT(EXPLICIT ALL LOCAL RULES)" role="Shell file generator" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium">

1. Generate shell files for skills, agents, workflows. Skip if state.plugin_active.
2. Output: shell configs, bootstrap rule, load-context skill shell.
3. ACQUIRE `init-workspace-flow-shells.md` FROM KB
4. Update state

</shells>

<discovery phase="3" subagent="built-in" role="Tech stack analyst" subagent_recommended_model="claude-haiku-4-5, gemini-3-flash-preview">

1. Analyze workspace tech stack, structure, file count.
2. Output: TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md, state.file_count.
3. ACQUIRE `init-workspace-flow-discovery.md` FROM KB
4. Update state

</discovery>

<rules phase="4" optional="true" if="EXPLICIT ALL LOCAL RULES" subagent="built-in" role="Agent rules configurator" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium">

1. Create local agent rules for IDE/OS/project. Disabled by default — runs only on explicit user request.
2. Output: core agents file, tech-specific rule files.
3. ACQUIRE `init-workspace-flow-rules.md` FROM KB
4. Update state

</rules>

<patterns phase="5" subagent="built-in" role="Pattern extractor" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro-preview">

1. Extract coding and architectural patterns into reusable templates.
2. Output: PATTERNS folder (one .md per pattern, INDEX.md, CHANGES.md).
3. ACQUIRE `init-workspace-flow-patterns.md` FROM KB
4. Update state. Log gaps for Phase 7.

</patterns>

<documentation phase="6" subagent="built-in" role="Documentation analyst" subagent_recommended_model="claude-opus-4-6, gpt-5.4-high, gemini-3.1-pro-preview">

1. Create project documentation from workspace analysis.
2. Output: CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, AGENT MEMORY.md.
3. ACQUIRE `init-workspace-flow-documentation.md` FROM KB
4. Update state. Log gaps for Phase 7.

</documentation>

<questions phase="7" type="HITL" role="Reflective gap-filler">

1. Review all docs, identify gaps, ask user reflective questions, update affected files via subagents.
2. ACQUIRE `init-workspace-flow-questions.md` FROM KB
3. Update state

</questions>

<verification phase="8" subagent="built-in" role="Completeness validator" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium">

1. Verify all files exist, run validation checklist, suggest next steps.
2. ACQUIRE `init-workspace-flow-verification.md` FROM KB
3. Mark state as COMPLETE.
4. Notify user: delete `init-rosetta-shells-flow.md`. MUST start new chat session.

</verification>

</workflow_phases>

<references>

Phase files: `init-workspace-flow-context.md`, `init-workspace-flow-shells.md`, `init-workspace-flow-discovery.md`, `init-workspace-flow-rules.md`, `init-workspace-flow-patterns.md`, `init-workspace-flow-documentation.md`, `init-workspace-flow-questions.md`, `init-workspace-flow-verification.md`

State: `agents/init-workspace-flow-state.md`

</references>

<pitfalls>

- Phase 4 (rules) is optional — disabled by default.
- Phase 7 must update files via subagents, not just collect answers.
- Shells and rules take effect only after new chat session.

</pitfalls>

</init_workspace_flow>
