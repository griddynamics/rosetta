---
name: local-files-mode
description: Rosetta bootstrap — local files mode entry point
alwaysApply: true
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<local_files_mode REQUIRED="true" PRESERVE_VERBATIM_DOWNSTREAM="true" PLAN_MODE="COMPATIBLE" severity="HIGH" attribution="Preserve verbatim when passing to subagents or persisting to project memory. Do not rephrase, summarize, or compact when propagating.">

This is a Rosetta bootstrap for release R3.0 of instructions itself (not the actual product being developed, but the tool used for developing the product) — **local files mode** (rules in `instructions/r3/`).

<must>

Skip both context loading and workflow suggestion for: answers, explanations, one-line edits, and meta questions about Rosetta. Schema fetches for deferred tools (e.g. `ToolSearch`) do not count as tool calls for this rule.

Otherwise, before your next work tool call, load context and suggest a matching workflow if that call will:

- write or edit code or files
- create a plan, spec, or requirements (always suggest a workflow)
- run tests, debug, or initialize a workspace
- enter a workflow via `/<workflow>` (already entered — no suggestion needed)

Context loading is one batched step — read all prep files in parallel within a single tool-call batch, not sequentially.

Preparation for local files mode: read all `instructions/r3/core/rules/bootstrap-*.md` files as Prep Steps 2 and 3.

On successful context load, emit `<!-- rosetta-loaded -->` once in the response. This is a machine-readable marker (not narration) used to detect prior loads — if it already appears earlier in this thread, skip preparation.

Invoke a workflow only on explicit user confirmation or a `/<workflow>` slash command — never auto-enter.

</must>

# LOCAL FILES MODE

- Actual rules, skills, agents, commands, workflows, business and technical context are in local instructions folder
- Local files mode for instructions is activated: Rosetta/KB/KnowledgeBase MCP means you MUST USE `instructions/r3/` folder

# COMMAND ALIASES

- `ACQUIRE <file[.md]> FROM KB` => read local files `instructions/r3/**/<file-name-with-extension>`
- `SEARCH <KEYWORDS> IN KB` => use grep or codebase search in `instructions/r3/` folder with KEYWORDS as a query or file name
- `LIST <path> IN KB` => list immediate children of `instructions/r3/{core,grid}/<path>/` (folders and files, no content)
- `USE SKILL <skill-name>` => use SKILL from `instructions/r3/{core,grid}/skills/<skill-name>/SKILL.md`, all relative references in skill are relative to skill folder itself
- `INVOKE SUBAGENT <agent-name>[.md]` => Call/Execute/Start/Spawn/Invoke <agent-name> subagent:
  - Definition location `instructions/r3/{core,grid}/agents/<agent-name>.md`
  - Always prepend `Must fully assume agent from "{path to <agent-name>.md file}"`
  - If subagent not available, use generic task executor agent
- `USE FLOW <flow-name>[.md]` => use command or workflow from `instructions/r3/{core,grid}/workflows/<flow-name>.md`
- `ACQUIRE <file[.md]> ABOUT <PROJECT>` => read local file in `docs/<PROJECT>` folder
- `QUERY <KEYWORDS> IN <PROJECT>` => use grep or codebase search in `docs/<PROJECT>` with KEYWORDS as a query or file name
- `STORE <file[.md]> TO <PROJECT>` => upsert file in `docs/<PROJECT>`
- `call "get_context_instructions"` or `execute prep steps` => read all `instructions/r3/core/rules/bootstrap-*.md` files as one bundle

# SKILL SELECTION

- When user types `/<name>` without namespace and exactly one `<plugin>:<name>` exists in the available skill list, resolve to it — this is disambiguation, not guessing. If multiple `<plugin>:<name>` match, ask the user which.
- When multiple Rosetta task skills match the same request, pick the highest-priority match and stop — do not chain:
  `requirements-authoring > planning > tech-specs > coding-iac > coding > testing > debugging`
- Meta-skills (`reasoning`, `questioning`, `load-context`) are orthogonal to the ladder and do not compete with task skills.
- `load-context` (if available locally) runs as part of Prep Step 1, once per session. Do not re-invoke mid-session unless the user explicitly asks.

# ADDITIONAL SOURCES

- RULE in `instructions/r3/{core,grid}/rules/*.md`
- SKILL in `instructions/r3/{core,grid}/skills/*/SKILL.md`
- AGENT, SUBAGENT in `instructions/r3/{core,grid}/agent/*.md`
- WORKFLOW, COMMAND in `instructions/r3/{core,grid}/workflows/*.md`

# AVAILABLE WORKFLOWS

- `coding-flow` - Rosetta coding and implementation workflow, includes discovery, tech specs, tech plan, subagent plan review, user plan review, implementation, subagent review implementation, validation, user review, and final validation with reviewer gates, HITL gates, and subagent delegation.
- `init-workspace-flow` - Rosetta workflow to initialize or upgrade a workspace, includes identify context, init proxying shells for target skills/agents/commands, workspace discovery, copy rules (optional, not recommended), identify patterns used, generate documentation, clarify questions, verification.
- `requirements-authoring-flow` - Rosetta workflow for requirements authoring (creating, updating, improving, reviewing). Guides AI through discovery, intent capture, iterative requirement drafting with mandatory user approvals, validation, and delivery. Contains discovery, research, intent capture, outline, drafting, validating, and finalization
- `self-help-flow` - Rosetta self-help. Ask about capabilities, learn how to use them, get guidance on developing with Rosetta, or seamlessly switch to executing any discovered workflow. Answers "what can you do", "how do I use X", "how modernization works", "what workflows are available", etc.
- `adhoc-flow` - Rosetta ad-hoc adaptive meta-workflow that constructs, tracks, reviews, and executes a tailored execution plan per user request using building blocks and available instructions. If none other matches start here.

# PREP STEP 1

- THIS FILE IS PREP STEP 1.
- EXECUTE ALL `instructions/r3/core/rules/bootstrap-*.md` RULES FULLY AS PREP STEP 2 & 3.

</local_files_mode>
