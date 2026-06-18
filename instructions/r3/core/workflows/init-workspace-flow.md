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
2. MUST USE OPERATION_MANAGER for deterministic execution
3. MUST FOLLOW THIS WORKFLOW EXACTLY AND FULLY.
4. MUST extensively use subagents as this is a large workflow.
5. Sequential phases. Each updates `agents/init-workspace-flow-state.md`. Optional phases marked as skipped. Keep state file very brief.
6. No rush, Take your time, Be thorough, ACCURACY > SPEED
7. Dual-mode: every phase reads `state.mode` → check-exists → identify-gaps → create/update → preserve-human-content → report-changes.
8. Composite workspace: documentation phases to create top-level index referencing sub-repository docs.
9. IF state.file_count >= 50 (set by Phase 3): pass "ACQUIRE `large-workspace-handling/SKILL.md` FROM KB" to Phase 5, 7, 8 subagents.
10. Create `agents/init-workspace-flow-state.md`.
11. Conditional phases:
  - If you have already in context "RUNNING AS A PLUGIN": MUST NOT EXECUTE "shells" phase 2
  - Else MUST EXECUTE "shells" phase 2
12. Note: `rosetta@rosetta` is an MCP connector, not a plugin — it follows the normal path (shells phase 2 executes)
13. If user says to initialize rules, subagents, agents, workflows, commands it ONLY means to execute "shells" phase 2.
14. Upgrade from R2 to R3 is exactly the same process as define here, but you already have some files available, which you can reuse.
15. Additionally tell subagents: "If you want to use shell commands, prefer to combine individual shell commands into single **simple** shell script and execute it, but already available tools ALWAYS take precedence."
16. When subagents already available, you are orchestrator and senior team lead and effective manager. Orchestrator makes process poka-yoke and reliable itself, `trusts but verify`, `if anything could go wrong - it will go wrong`, provides clear context and instructions, subagents can cheat, consults with architect, makes reviewer to review and verify with fresh eyes, and uses subagents as his team. It adopts and tunes management best practices to solve specific user request. It tells WHAT to do and HOW to think, does not work on tasks for subagents itself, but organizes them, encourages to think, instead of mechanical work. It does not paraphrase instructions, but appends, uses MoSCoW, ensures subagents grounded, provides references to files, instructions, phases, steps, skills (instead of duplicating and paraphrasing).
17. Remember: subagents always start with fresh context on every run. User can not see orchestrator and subagent communication.
18. Subagent prompt must be concise, dense, factual, specific, DRY, etc.

</prerequisites>

<context phase="1" subagent="engineer" role="Workspace mode detector" subagent_required_model="claude-haiku-4-5, gemini-3-flash-preview">

1. Detect mode: install, upgrade, or plugin. Set state.mode, state.plugin_active, state.composite, state.existing_files. Creates/reads gain.json.
2. ACQUIRE `init-workspace-flow-context.md` FROM KB
3. Update state

</context>

<shells phase="2" default="true" subagent="engineer" conditional role="Shell file generator" subagent_required_model="claude-sonnet-4-6, gpt-5.4-medium">

1. Generate shell files for skills, agents, workflows. Skip if state.plugin_active.
2. Output: shell configs, bootstrap rule, load-context skill shell.
3. ACQUIRE `init-workspace-flow-shells.md` FROM KB
4. Update state

</shells>

<discovery phase="3" subagent="discoverer" role="Tech stack analyst" subagent_required_model="claude-haiku-4-5, gemini-3-flash-preview">

1. Analyze workspace tech stack, structure, file count.
2. Output: TECHSTACK.md, CODEMAP.md, DEPENDENCIES.md, state.file_count.
3. ACQUIRE `init-workspace-flow-discovery.md` FROM KB
4. Update state

</discovery>

<rules phase="4" optional="true" permanently-disabled subagent="built-in" role="Agent rules configurator" subagent_required_model="claude-sonnet-4-6, gpt-5.4-medium">
DISABLED
</rules>

<patterns phase="5" subagent="engineer" role="Pattern extractor" subagent_required_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro-preview">

1. Extract coding and architectural patterns into reusable templates.
2. Output: PATTERNS folder (one .md per pattern, INDEX.md, CHANGES.md).
3. ACQUIRE `init-workspace-flow-patterns.md` FROM KB
4. Update state. Log gaps for Phase 8.

</patterns>

<code-graph phase="6" subagent="engineer" type="HITL" role="Code-graph setup gate" subagent_required_model="claude-sonnet-4-6, gpt-5.4-medium, gemini-3.1-pro-preview">

1. From the current context only, check whether code-graph capability is already covered — registered LSPs, or semantic-search / indexing MCP tools — and tell the user what is already available. Do not search for or install anything to find out.
2. Warn the user: Third-party tool will have access to IP. Review license and policy with your manager.
3. Ask the user to choose a code-graph backend, presenting the options in this order with cost and license:
   - **Default — `CODEMAP.md`**: built-in, no install, no third party, no cost.
   - **Graphify** (`https://github.com/safishamsi/graphify`): MIT-licensed, free.
   - **GitNexus** (`https://github.com/abhigyanpatwari/GitNexus`): free for non-commercial or personal use, PAID for commercial or business use — see [GitNexus Enterprise Licensing](https://github.com/abhigyanpatwari/GitNexus?tab=readme-ov-file#enterprise).
4. On Graphify or GitNexus: USE SKILL `codemap` to install and set up the chosen backend; log the chosen backend in state. On Default: log as skipped.

</code-graph>

<documentation phase="7" subagent="architect" role="Architect and documentation analyst" subagent_required_model="claude-opus-4-8, gpt-5.4-high, gpt-5.5-high, gemini-3.1-pro-preview">

1. Create project documentation from workspace analysis.
2. Output: CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, ASSUMPTIONS.md, AGENT MEMORY.md.
3. ACQUIRE `init-workspace-flow-documentation.md` FROM KB
4. Update state. Log gaps for Phase 8.

</documentation>

<questions phase="8" type="HITL" role="Reflective gap-filler">

1. Review all docs, identify gaps, ask user reflective questions, update affected files via subagents.
2. ACQUIRE `init-workspace-flow-questions.md` FROM KB
3. Update state
4. Required: USE SKILL `questioning`

</questions>

<verification phase="9" subagent="reviewer" role="Completeness validator" subagent_required_model="claude-sonnet-4-6, gpt-5.4-medium">

1. Verify all files exist, run validation checklist, suggest next steps.
2. ACQUIRE `init-workspace-flow-verification.md` FROM KB
3. Mark state as COMPLETE.
4. Notify user: delete `init-rosetta-shells-flow.md`.
5. Demand user as MUST to start new chat session (highly visible message, red icon, bold, ASCII art, it must standout).

</verification>

</workflow_phases>

<references>

Phase files: `init-workspace-flow-context.md`, `init-workspace-flow-shells.md`, `init-workspace-flow-discovery.md`, `init-workspace-flow-rules.md`, `init-workspace-flow-patterns.md`, `init-workspace-flow-documentation.md`, `init-workspace-flow-questions.md`, `init-workspace-flow-verification.md`

Skills: `codemap`

State: `agents/init-workspace-flow-state.md`

</references>

<pitfalls>

- Phase 4 (rules) is optional — disabled by default.
- Phase 8 must update files via subagents, not just collect answers.
- Shells and rules take effect only after new chat session.

</pitfalls>

</init_workspace_flow>
