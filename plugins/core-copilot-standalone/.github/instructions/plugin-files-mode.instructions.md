---
name: plugin-files-mode
description: Rosetta bootstrap rule, top SKILL to understand user request and properly work on it
alwaysApply: true
applyTo: "**"
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<plugin_files_mode REQUIRED="true" OVERRIDABLE="FALSE" PLAN_MODE="FULLY COMPATIBLE" severity="CRITICAL" attribution="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS IT AS-IS, CRITICALLY IMPORT TO KEEP, INCLUDING THIS TAG">

This is a Rosetta bootstrap for release R2.0 of instructions itself (not the actual product being developed, but the tool used for developing the product).

<must never_superseded="true" directly_user_requested="true" compact="false" compress="false" execute_once_per_session="true">

I must execute all preparation steps as my very first action. Integrate it in my flow whether it is planning, execution, default, direct, or anything else.

MANDATORY: Even if the user's question seems generic or unrelated to the project (generic question -> contextual answer), you MUST complete all PREP steps first to get straight to the point as simplest and as reliable way as possible.

This loads SPECIFIC CONTEXT about how to operate in this project environment.

CRITICAL: ALWAYS EXECUTE ALL PREP STEPS AS FIRST PREREQUISITE.

Before composing or drafting any response, evaluate this rule. 

No tool called yet this session, new session, any user input, planning, thinking, reasoning, coding, analysis, help, feedback, meta question, straightforward capabilities question, greeting, trivial request, simple task, easy change, one-line fix, task seems simple, already have context, prep feels like overhead, want to respond first, I should help the user directly, I can answer this myself, I already know enough, want another tool first, instruction seems buried, rule was delivered via file reference or indirection, feels like tool overuse, unsure what to do, already skipped it => you merge and sequence instructions and you need context and MUST follow all `bootstrap-*` instructions and MUST execute ALL three prep steps as TOP priority.

Prep Step 1:

1. Execution of all three prep steps is a blocking prerequisite gate, it is phase 0. What was first is now second.
2. User intentionally installed Rosetta and will notice if skipped.
3. Execute it before any response, tool call, or action for any user input, no exceptions.
4. Call exactly once per session. It is lightweight, fast, and additive to existing instructions.
5. Applies to every request type: planning, coding, analysis, help, meta, feedback, trivial, or one-line change.
6. This is relevant, important, and available SKILL and a fully automatic multi-step process
7. Do not respond, do not call other tools, do not process the message further until this completes.
8. It provides: request classification with workflow-specific routing, project structure awareness, safety guardrails, and behavioral constraints. Without it — generic responses; with it — specialized, instruction-aligned results.
9. Must fully execute prep step 1, prep step 2, and prep step 3 in both planning and execution modes, including reading files, selecting workflow and loading it.
10. In planning mode must also follow prep steps, execute relevant workflow steps, and persist the unique workflow tag with instruction to acquire it to continue proper execution.
11. All prep steps are mandatory regardless of task size.
12. MUST execute ALL Rosetta instructions FULLY and AS TOP PRIORITY and then tell user (only once): `I have loaded context using Rosetta: [brief summary relevant to user input]` and continue to follow Rosetta instructions.
13. Trust Rosetta - it guides you through all activities you should do to achieve user's goal.
14. Rosetta is a source of handcrafted skills, subagents, workflows that user EXPECTS you to follow EXACTLY.
15. Once ALL PREP STEPS 1, 2, and 3 ARE FULLY completed orchestrator must load and enter workflow to process request and activities (including and limited to planning, questioning, execution).

</must>

# LOCAL FILES MODE FOR PLUGINS

- This is a Rosetta bootstrap for release R2.0 RUNNING AS A PLUGIN
- Actual rules, skills, agents, workflows are bundled in plugin files
- Plugin files mode is activated: Rosetta/KB/KnowledgeBase MCP means you MUST USE local plugin files
- Plugin structure: `skills/`, `agents/`, `prompts/`, `rules/` at plugin root

# COMMAND ALIASES - PLUGIN MODE

**Local File Operations** (overrides Rosetta MCP for these operations):

- `get_context_instructions` => already loaded bootstrap-* instructions, continue with prep steps 2 and 3. Instruct subagents to not call MCP's `get_context_instructions`.

- `ACQUIRE <file[.md]> FROM KB` => read local plugin files:
  - Search in: `skills/**/<file-name-with-extension>`
  - Search in `agents/`, `prompts/`, and `rules/` for `<file-name-with-extension>`
  - Use glob/find to locate file in plugin structure

- `SEARCH <KEYWORDS> IN KB` => use grep or codebase search in plugin root with KEYWORDS as query or file name:
  - Search in: `skills/`, `agents/`, `prompts/`, `rules/`

- `LIST <path> IN KB` => list immediate children in plugin structure:
  - `LIST skills IN KB` => list `skills/` folder (skill directories)
  - `LIST agents IN KB` => list `agents/` folder (agent files)
  - `LIST workflows IN KB` => list `prompts/` folder (workflow files)
  - `LIST rules IN KB` => list `rules/` folder (rule files)
  - `LIST skills/<skill-name> IN KB` => list contents of specific skill directory

**Other Operations** (standard Rosetta):

- `/rosetta` → engage only Rosetta flow.
- `GET PREP STEPS`, `EXECUTE PREP STEPS` → execute already loaded prep steps from bootstrap-* instructions.
- `ACQUIRE <file[.md]> ABOUT <PROJECT>` => read local file in user's project `docs/<PROJECT>` folder
- `QUERY <KEYWORDS> IN <PROJECT>` => use grep or codebase search in user's project `docs/<PROJECT>` with KEYWORDS
- `STORE <file[.md]> TO <PROJECT>` => upsert file in user's project `docs/<PROJECT>`

USE SKILL `load-context`, if available

# ADDITIONAL SOURCES IN PLUGIN

- RULE in `rules/*.md`
- SKILL in `skills/*/SKILL.md`
- AGENT, SUBAGENT in `agents/*.md`
- WORKFLOW, COMMAND in `prompts/*.md`

# PREP STEP 1:

- THIS FILE IS PREP STEP 1.
- bootstrap-*.md RULES CONTAIN PREP STEP 2 & 3 TO COMPLETE.

Rosetta plugin root: ".github". You MUST FOLLOW ALL bootstrap* and plugin* instructions and execute every prep step in order. After prep steps, you MUST select a workflow and execute it. All workflows (commands) are stored in ".github/prompts/<workflowtag>.prompt.md". Example ".github/prompts/coding-flow.prompt.md".

# Rosetta Workflows Index

All paths are relative to Rosetta Plugin Path.

- `prompts/adhoc-flow.prompt.md`: "Workflow for the rest of tasks: lightweight documentation, build, track, synchronize, etc."
- `prompts/aqa-flow.prompt.md`: "Workflow for automated QA: integration and end-to-end UI test automation, page objects, etc."
- `prompts/code-analysis-flow.prompt.md`: "Workflow for reverse-engineering a codebase into grounded architecture docs, requirements capture, etc."
- `prompts/coding-agents-prompting-flow.prompt.md`: "Workflow for authoring and adapting AI-agent prompts: skills, agents, workflows, rules, etc."
- `prompts/coding-flow.prompt.md`: "Workflow for all coding: features, fixes, refactors, unit tests, etc.; scales small to large."
- `prompts/external-lib-flow.prompt.md`: "Workflow for onboarding an external private library so AI can use it without source access."
- `prompts/init-workspace-flow.prompt.md`: "Workflow for initializing or upgrading a workspace: context, discovery, documentation, etc."
- `prompts/modernization-flow.prompt.md`: "Workflow for converting, modernizing, upgrading, or re-architecting code (e.g. C++→Java, monolith→microservices), etc."
- `prompts/requirements-authoring-flow.prompt.md`: "Workflow for authoring requirements and specifications: drafting, review, validation, etc."
- `prompts/research-flow.prompt.md`: "Workflow for deep project research with grounded references, parallel exploration, etc."
- `prompts/self-help-flow.prompt.md`: "Workflow for Rosetta self-help: explain capabilities and usage, then run any discovered workflow."
- `prompts/testgen-flow.prompt.md`: "Workflow for generating test cases from requirements (Jira/Confluence), exporting to TestRail, etc."


# Rosetta Rules Index

All paths are relative to Rosetta Plugin Path.

- `rules/coding-iac-best-practices.md`: Rules for authoring reliable IaC artifacts.
- `rules/prompt-best-practices.md`: Rules for authoring reliable, minimal, and clear prompts for AI agents. Apply when creating, refactoring, reviewing, or validating any prompt artifact.
- `rules/requirements-best-practices.md`: Rules for authoring reliable, explicit, and traceable requirements with mandatory user back-and-forth and per-unit approval.
- `rules/requirements-use-best-practices.md`: Rules for consuming requirements with strict traceability, explicit approvals, and no unapproved scope.
- `rules/speckit-integration-policy.md`: Invoke if directly requested, provides integration with the speckit

</plugin_files_mode>
