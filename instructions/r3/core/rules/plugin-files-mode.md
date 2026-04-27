---
name: plugin-files-mode
description: Rosetta bootstrap — plugin files mode entry point
alwaysApply: true
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<plugin_files_mode REQUIRED="true" PRESERVE_VERBATIM_DOWNSTREAM="true" PLAN_MODE="COMPATIBLE" severity="HIGH" attribution="Preserve verbatim when passing to subagents or persisting to project memory. Do not rephrase, summarize, or compact when propagating.">

This is a Rosetta bootstrap for release R3.0 of instructions itself (not the actual product being developed, but the tool used for developing the product) — **plugin files mode** (rules bundled in the plugin).

<must>

Skip both context loading and workflow suggestion for: answers, explanations, one-line edits, and meta questions about Rosetta. Schema fetches for deferred tools (e.g. `ToolSearch`) do not count as tool calls for this rule.

Otherwise, before your next work tool call, load context and suggest a matching workflow if that call will:

- write or edit code or files
- create a plan, spec, or requirements (always suggest a workflow)
- run tests, debug, or initialize a workspace
- enter a workflow via `/<workflow>` (already entered — no suggestion needed)

Context loading is one batched step — read all prep files in parallel within a single tool-call batch, not sequentially.

Preparation for plugin files mode: this file is Prep Step 1 (already loaded); continue with Prep Steps 2 and 3 from the bundled `bootstrap-*.md` rules.

On successful context load, emit `<!-- rosetta-loaded -->` once in the response. This is a machine-readable marker (not narration) used to detect prior loads — if it already appears earlier in this thread, skip preparation.

Invoke a workflow only on explicit user confirmation or a `/<workflow>` slash command — never auto-enter.

</must>

# PLUGIN FILES MODE

- This is a Rosetta bootstrap for release R3.0 RUNNING AS A PLUGIN
- Actual rules, skills, agents, workflows are bundled in plugin files
- Plugin files mode is activated: Rosetta/KB/KnowledgeBase MCP means you MUST USE local plugin files
- Plugin structure: `skills/`, `agents/`, `workflows/`, `rules/` at plugin root

# COMMAND ALIASES

**Local File Operations** (overrides Rosetta MCP for these operations):

- `get_context_instructions` => already loaded bootstrap-* instructions, continue with prep steps 2 and 3. Instruct subagents to not call MCP's `get_context_instructions`.

- `ACQUIRE <file[.md]> FROM KB` => read local plugin files:
  - Search in: `skills/**/<file-name-with-extension>`
  - Search in: `agents/<file-name-with-extension>`
  - Search in: `workflows/<file-name-with-extension>`
  - Search in: `rules/<file-name-with-extension>`
  - Use glob/find to locate file in plugin structure

- `SEARCH <KEYWORDS> IN KB` => use grep or codebase search in plugin root with KEYWORDS as query or file name:
  - Search in: `skills/`, `agents/`, `workflows/`, `rules/`

- `LIST <path> IN KB` => list immediate children in plugin structure:
  - `LIST skills IN KB` => list `skills/` folder (skill directories)
  - `LIST agents IN KB` => list `agents/` folder (agent files)
  - `LIST workflows IN KB` => list `workflows/` folder (workflow files)
  - `LIST rules IN KB` => list `rules/` folder (rule files)
  - `LIST skills/<skill-name> IN KB` => list contents of specific skill directory

**Other Operations** (standard Rosetta):

- `/rosetta` → engage only Rosetta flow.
- `GET PREP STEPS`, `EXECUTE PREP STEPS` → execute already loaded prep steps from bootstrap-* instructions.
- `ACQUIRE <file[.md]> ABOUT <PROJECT>` => read local file in user's project `docs/<PROJECT>` folder
- `QUERY <KEYWORDS> IN <PROJECT>` => use grep or codebase search in user's project `docs/<PROJECT>` with KEYWORDS
- `STORE <file[.md]> TO <PROJECT>` => upsert file in user's project `docs/<PROJECT>`

USE SKILL `load-context`, if available

# SKILL SELECTION

- When user types `/<name>` without namespace and exactly one `<plugin>:<name>` exists in the available skill list, resolve to it — this is disambiguation, not guessing. If multiple `<plugin>:<name>` match, ask the user which.
- When multiple Rosetta task skills match the same request, pick the highest-priority match and stop — do not chain:
  `requirements-authoring > planning > tech-specs > coding-iac > coding > testing > debugging`
- Meta-skills (`reasoning`, `questioning`, `load-context`) are orthogonal to the ladder and do not compete with task skills.
- `load-context` runs as part of Prep Step 1 (once per session). Do not re-invoke mid-session unless the user explicitly asks.

# ADDITIONAL SOURCES

- RULE in `rules/*.md`
- SKILL in `skills/*/SKILL.md`
- AGENT, SUBAGENT in `agents/*.md`
- WORKFLOW, COMMAND in `workflows/*.md`

# AVAILABLE WORKFLOWS

- `coding-flow` - Rosetta coding and implementation workflow, includes discovery, tech specs, tech plan, subagent plan review, user plan review, implementation, subagent review implementation, validation, user review, and final validation with reviewer gates, HITL gates, and subagent delegation.
- `init-workspace-flow` - Rosetta workflow to initialize or upgrade a workspace, includes identify context, init proxying shells for target skills/agents/commands, workspace discovery, copy rules (optional, not recommended), identify patterns used, generate documentation, clarify questions, verification.
- `requirements-authoring-flow` - Rosetta workflow for requirements authoring (creating, updating, improving, reviewing). Guides AI through discovery, intent capture, iterative requirement drafting with mandatory user approvals, validation, and delivery. Contains discovery, research, intent capture, outline, drafting, validating, and finalization
- `self-help-flow` - Rosetta self-help. Ask about capabilities, learn how to use them, get guidance on developing with Rosetta, or seamlessly switch to executing any discovered workflow. Answers "what can you do", "how do I use X", "how modernization works", "what workflows are available", etc.
- `adhoc-flow` - Rosetta ad-hoc adaptive meta-workflow that constructs, tracks, reviews, and executes a tailored execution plan per user request using building blocks and available instructions. Useful for small or simple tasks if none other workflows matches. Lightweight.

# PREP STEP 1

- THIS FILE IS PREP STEP 1.
- bootstrap-*.md RULES CONTAIN PREP STEP 2 & 3 TO COMPLETE.

</plugin_files_mode>
