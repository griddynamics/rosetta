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

- All Rosetta prep steps MUST be FULLY completed (get_context_instructions called and all three prep steps completed).
- MUST FOLLOW THIS WORKFLOW EXACTLY AND FULLY.
- MUST extensively use subagents as this is a large workflow.
- Sequential phases. Each updates `agents/init-workspace-flow-state.md`. Optional phases marked as skipped. Keep state file very brief.
- ACCURACY > SPEED
- Dual-mode: every phase reads `state.mode` → check-exists → identify-gaps → create/update → preserve-human-content → report-changes.
- Composite workspace: documentation phases create top-level registry referencing sub-repository docs.
- IF state.file_count >= 50 (set by Phase 3): pass "ACQUIRE `large-workspace-handling/SKILL.md` FROM KB" to Phase 5, 6, 8 subagents.
- Before Phase 1: create `agents/init-workspace-flow-state.md`.
- Conditional phases:
  - If you have already in context "RUNNING AS A PLUGIN": MUST NOT EXECUTE "shells" phase 2
  - Else MUST EXECUTE "shells" phase 2
- Note: `rosetta@rosetta` is an MCP connector, not a plugin — it follows the normal path (shells phase 2 executes)
- If user says to initialize rules, subagents, agents, workflows, commands it ONLY means to execute "shells" phase 2.
- Upgrade from R1 to R2 is exactly the same process as define here, but you already have some files available, which you can reuse.
- Additionally tell subagents: "If you want to use shell commands, prefer to combine individual shell commands into single **simple** shell script in `agents/TEMP` and execute it, but already available tools ALWAYS take precedence."

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
4. Update state. Log gaps for Phase 7.

</patterns>

<documentation phase="6" subagent="built-in" role="Documentation analyst" subagent_recommended_model="claude-opus-4-8, gpt-5.4-high, gpt-5.5-high, gemini-3.1-pro-preview">

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
4. Notify user: delete `init-rosetta-shells-flow.md`. MUST start new chat session (highly visible message, red icon, bold, ASCII art, it must standout).
5. Request user to study https://griddynamics.github.io/rosetta/docs/usage-guide/
5. Suggest examples for the next steps for user and make sure to emphasis on "/slash-commands":
   ```
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
