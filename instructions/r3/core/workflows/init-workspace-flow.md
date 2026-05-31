---
name: init-workspace-flow
description: "Rosetta workflow to initialize or upgrade a workspace, includes identify context, init proxying shells for target skills/agents/commands, workspace discovery, copy rules (optional, not recommended), identify patterns used, generate documentation, clarify questions, verification."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<init_workspace_flow>

<description_and_purpose>

Problem: Workspace initialization is multi-phase, order-dependent, and must handle install/upgrade/plugin modes without overwriting human content.
Validation: State file tracks every phase with file inventory; verification confirms all files exist.

</description_and_purpose>

<workflow_phases>

<prerequisites phase="0", applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed
2. MUST USE OPERATION_MANAGER for deterministic execution
3. MUST FOLLOW THIS WORKFLOW EXACTLY AND FULLY.
4. MUST extensively use subagents as this is a large workflow.
5. Sequential phases. Each updates `agents/init-workspace-flow-state.md`. Optional phases marked as skipped. Keep state file very brief.
6. ACCURACY > SPEED
7. Dual-mode: every phase reads `state.mode` → check-exists → identify-gaps → create/update → preserve-human-content → report-changes.
8. Composite workspace: documentation phases create top-level registry referencing sub-repository docs.
9. IF state.file_count >= 50 (set by Phase 3): pass "ACQUIRE `large-workspace-handling/SKILL.md` FROM KB" to Phase 5, 7, 8 subagents.
10. Create `agents/init-workspace-flow-state.md`.
11. Conditional phases:
  - If you have already in context "RUNNING AS A PLUGIN": MUST NOT EXECUTE "shells" phase 2
  - Else MUST EXECUTE "shells" phase 2
12. Note: `rosetta@rosetta` is an MCP connector, not a plugin — it follows the normal path (shells phase 2 executes)
13. If user says to initialize rules, subagents, agents, workflows, commands it ONLY means to execute "shells" phase 2.
14. Upgrade from R2 to R3 is exactly the same process as define here, but you already have some files available, which you can reuse.
15. Additionally tell subagents: "If you want to use shell commands, prefer to combine individual shell commands into single **simple** shell script in `agents/TEMP` and execute it, but already available tools ALWAYS take precedence."

</prerequisites>

<context phase="1" subagent="built-in" role="Workspace mode detector" subagent_recommended_model="claude-haiku-4-5, gemini-3-flash-preview">

1. Detect mode: install, upgrade, or plugin. Set state.mode, state.plugin_active, state.composite, state.existing_files.
2. ACQUIRE `init-workspace-flow-context.md` FROM KB
3. Update state

</context>

<shells phase="2" default="true" subagent="built-in" conditional role="Shell file generator" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium">

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

<rules phase="4" optional="true" permanently-disabled subagent="built-in" role="Agent rules configurator" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium">
DISABLED
</rules>

<patterns phase="5" subagent="built-in" role="Pattern extractor" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro-preview">

1. Extract coding and architectural patterns into reusable templates.
2. Output: PATTERNS folder (one .md per pattern, INDEX.md, CHANGES.md).
3. ACQUIRE `init-workspace-flow-patterns.md` FROM KB
4. Update state. Log gaps for Phase 8.

</patterns>

<gitnexus phase="6" subagent="built-in" type="HITL" role="Code-graph setup gate" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro-preview">

1. Ask user exactly: "Install GitNexus for enhanced code-graph navigation? (recommended)"
2. If yes: USE SKILL `gitnexus-setup`; log as installed in state.
3. If no: skip silently; log as skipped in state.

</gitnexus>

<documentation phase="7" subagent="built-in" role="Documentation analyst" subagent_recommended_model="claude-opus-4-8, gpt-5.4-high, gpt-5.5-high, gemini-3.1-pro-preview">

1. Create project documentation from workspace analysis.
2. Output: CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, AGENT MEMORY.md.
3. ACQUIRE `init-workspace-flow-documentation.md` FROM KB
4. Update state. Log gaps for Phase 8.

</documentation>

<questions phase="8" type="HITL" role="Reflective gap-filler">

1. Review all docs, identify gaps, ask user reflective questions, update affected files via subagents.
2. ACQUIRE `init-workspace-flow-questions.md` FROM KB
3. Update state

</questions>

<verification phase="9" subagent="built-in" role="Completeness validator" subagent_recommended_model="claude-sonnet-4-6, gpt-5.4-medium">

1. Verify all files exist, run validation checklist, suggest next steps.
2. ACQUIRE `init-workspace-flow-verification.md` FROM KB
3. Mark state as COMPLETE.
4. Demand user as MUST to start new chat session (highly visible message, red icon, bold, ASCII art, it must standout).

</verification>

</workflow_phases>

<references>

Phase files: `init-workspace-flow-context.md`, `init-workspace-flow-shells.md`, `init-workspace-flow-discovery.md`, `init-workspace-flow-rules.md`, `init-workspace-flow-patterns.md`, `init-workspace-flow-documentation.md`, `init-workspace-flow-questions.md`, `init-workspace-flow-verification.md`

Skills: `gitnexus-setup`

State: `agents/init-workspace-flow-state.md`

</references>

<pitfalls>

- Phase 4 (rules) is optional — disabled by default.
- Phase 8 must update files via subagents, not just collect answers.
- Shells and rules take effect only after new chat session.

</pitfalls>

</init_workspace_flow>
