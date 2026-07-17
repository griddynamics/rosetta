---
name: init-workspace-flow
description: "Workflow for initializing or upgrading a workspace: context, discovery, documentation, etc."
tags: ["workflow"]
user-invocable: true
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
2. MUST use todo tasks for reliability
3. MUST FOLLOW THIS WORKFLOW EXACTLY AND FULLY.
4. MUST extensively use subagents as this is a large workflow.
5. Sequential phases. Each updates `agents/init-workspace-flow-state.md`. Optional phases marked as skipped. Keep state file very brief.
6. No rush, Take your time, Be thorough, ACCURACY > SPEED
7. Dual-mode: every phase reads `state.mode` → check-exists → identify-gaps → create/update → preserve-human-content → report-changes.
8. Composite workspace: documentation phases to create top-level index referencing sub-repository docs.
9. IF state.file_count >= 100 (set by Phase 3): pass "USE SKILL `large-workspace-handling`" to Phase 5, 7, 8 subagents.
10. Create `agents/init-workspace-flow-state.md`.
11. Conditional phases:
  - If you have already in context "RUNNING AS A PLUGIN": MUST NOT EXECUTE "shells" phase 2
  - Else MUST EXECUTE "shells" phase 2
12. Note: `rosetta@rosetta` is an MCP connector, not a plugin — it follows the normal path (shells phase 2 executes)
13. If user says to initialize rules, subagents, agents, workflows, commands it ONLY means to execute "shells" phase 2.
14. Upgrade from R2 to R3 is exactly the same process as define here, but you already have some files available, which you can reuse.
15. Additionally tell subagents: "If you want to use shell commands, prefer to combine individual shell commands into single **simple** shell script and execute it, but already available tools ALWAYS take precedence."
16. When subagents already available, you are orchestrator and senior team lead and effective manager. Orchestrator makes process poka-yoke and reliable itself, provides clear context and instructions, uses subagents as his team, tells WHAT to do and HOW to think, does not work on tasks for subagents itself nor provides mechanical tasks nor paraphrases instructions, but appends context, ensures subagents provide grounded information, provides already known references to files, instructions, phases, steps, skills, keep agents focused. Prompt subagents to report honestly, concise, terse, and we exact links to files it created/modified.
17. Remember: subagents always start with fresh context on every run. User can not see orchestrator and subagent communication.
18. Subagent prompt must be concise, terse, factual, specific, DRY, grounded, etc.
19. ENFORCE provided required subagent models and effort levels.

</prerequisites>

<context phase="1" role="Workspace mode detector">

1. Detect mode: install, upgrade, or plugin. Set state.mode, state.plugin_active, state.composite, state.existing_files. Creates/reads gain.json. GAIN.json questions keep for questions phase.
2. APPLY PHASE `init-workspace-flow-context.md`
3. Update state

</context>

<shells phase="2" default="true" subagent="engineer" conditional role="Shell file generator" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, grok-4.5, gpt-5.6-terra">

1. Generate shell files for skills, agents, workflows. Skip if state.plugin_active.
2. Input: IDEs, Output: shell configs, bootstrap rule, load-project-context skill shell.
3. APPLY PHASE `init-workspace-flow-shells.md`
4. Update state

</shells>

<discovery phase="3" subagent="discoverer" role="Tech stack analyst" subagent_required_model="claude-haiku-4-5, gpt-5.4-mini-medium, gemini-3.5-flash, composer-2.5, gpt-5.6-luna">

1. Analyze workspace tech stack, structure, source code file count.
2. Output: TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md, state.file_count.
3. APPLY PHASE `init-workspace-flow-discovery.md`
4. Update state

</discovery>

<rules phase="4" optional="true" permanently-disabled subagent="built-in" role="Agent rules configurator" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, grok-4.5, gpt-5.6-terra">
DISABLED
</rules>

<patterns phase="5" subagent="engineer" role="Pattern extractor" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro-preview, grok-4.5, gpt-5.6-terra">

1. Extract coding and architectural patterns into reusable templates.
2. Output: PATTERNS folder (one .md per pattern, INDEX.md, CHANGES.md).
3. APPLY PHASE `init-workspace-flow-patterns.md`
4. Update state. Log gaps for Phase 8.

</patterns>

<code-graph phase="6" subagent="engineer" type="HITL" role="Code-graph setup gate" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, gemini-3.1-pro-preview, grok-4.5, gpt-5.6-terra">

1. Suggest user to install LSPs xor code graphs if relevant
2. Output: user selection, updates to CONTEXT.md
3. APPLY PHASE `init-workspace-flow-codegraph.md`
4. Update state. Log gaps for Phase 6.

</code-graph>

<documentation phase="7" subagent="architect" role="Architect and documentation analyst" subagent_required_model="claude-opus-4-8, gpt-5.4-high, gpt-5.5-high, gemini-3.1-pro-preview, gpt-5.6-sol">

1. Create project documentation from workspace analysis.
2. Output: CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, AGENT MEMORY.md.
3. APPLY PHASE `init-workspace-flow-documentation.md`
4. Update state. Log gaps for Phase 8.

</documentation>

<questions phase="8" type="HITL" role="Reflective gap-filler">

1. Review all docs, identify gaps, ask user reflective questions, update affected files via subagents.
2. APPLY PHASE `init-workspace-flow-questions.md`
3. Update state
4. Required: USE SKILL `questioning`

</questions>

<verification phase="9" subagent="reviewer" role="Completeness validator" subagent_required_model="claude-sonnet-5, gpt-5.4-medium, grok-4.5, gpt-5.6-terra">

1. Verify all files exist, run validation checklist, suggest next steps.
2. APPLY PHASE `init-workspace-flow-verification.md`
3. Mark state as COMPLETE.

</verification>

</workflow_phases>

<next_steps>
1. DEMAND user as MUST to start new chat session (highly visible message, red icon, bold, ASCII art, it must standout).
2. DEMAND user to study (USAGE GUIDE)[https://griddynamics.github.io/rosetta/docs/usage-guide/]
3. DEMAND user to review examples for the next steps for user and EMPHASIS on "/slash-commands":
   
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

   "/modernization-flow Perform modernization phase 8 for target service to analyze service module ... using subagents. Must USE FLOW `coding-flow.md` to actually implement and as the main flow. Once done spawn subagent to validate and repeat an entire loop until there are no issues detected."
   ```
</next_steps>

<pitfalls>

- Phase 8 must update files, not just collect answers.
- Shells and rules take effect only after new chat session.

</pitfalls>

</init_workspace_flow>
