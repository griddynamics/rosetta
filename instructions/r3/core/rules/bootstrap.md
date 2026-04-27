---
name: bootstrap
description: Rosetta bootstrap — bootstrap mode entry point
alwaysApply: true
trigger: always_on
baseSchema: docs/schemas/rule.md
---

<bootstrap REQUIRED="true" PRESERVE_VERBATIM_DOWNSTREAM="true" PLAN_MODE="COMPATIBLE" severity="HIGH" attribution="Preserve verbatim when passing to subagents or persisting to project memory. Do not rephrase, summarize, or compact when propagating.">

This is a Rosetta bootstrap for release R3.0 of instructions itself (not the actual product being developed, but the tool used for developing the product) — **bootstrap mode** (rules served by Rosetta MCP).

<must>

Skip both context loading and workflow suggestion for: answers, explanations, one-line edits, and meta questions about Rosetta. Schema fetches for deferred tools (e.g. `ToolSearch`) do not count as tool calls for this rule.

Otherwise, before your next work tool call, load context and suggest a matching workflow if that call will:

- write or edit code or files
- create a plan, spec, or requirements (always suggest a workflow)
- run tests, debug, or initialize a workspace
- enter a workflow via `/<workflow>` (already entered — no suggestion needed)

Context loading is one batched step — read all prep files in parallel within a single tool-call batch, not sequentially.

Preparation for bootstrap mode: call `get_context_instructions` once; it returns Prep Steps 2 and 3.

On successful context load, emit `<!-- rosetta-loaded -->` once in the response. This is a machine-readable marker (not narration) used to detect prior loads — if it already appears earlier in this thread, skip preparation.

Invoke a workflow only on explicit user confirmation or a `/<workflow>` slash command — never auto-enter.

</must>

# BOOTSTRAP MODE

- This is a Rosetta bootstrap for release R3.0 served via Rosetta MCP
- Actual rules, skills, agents, commands, workflows are served dynamically by Rosetta MCP tools
- Bootstrap mode is activated: Rosetta/KB/KnowledgeBase MCP is the authoritative source

# COMMAND ALIASES

- `/rosetta` → engage only Rosetta flow.
- `GET PREP STEPS` → `get_context_instructions()`.
- `LIST <path> IN KB` → `list_instructions(full_path_from_root="<path>")`.
- `ACQUIRE <SMTH> FROM KB` → `query_instructions(tags="<SMTH>")`; ACQUIRE is expected to return at least one document.
- `SEARCH <SMTH> IN KB` → `query_instructions(query="<SMTH>")`.
- `ACQUIRE <SMTH> ABOUT <PROJECT>` → `query_project_context(repository_name="<PROJECT>", tags="<SMTH>")`.
- `QUERY <SMTH> IN <PROJECT>` → `query_project_context(repository_name="<PROJECT>", query="<SMTH>")`.
- `STORE <SMTH> TO <PROJECT>` → `store_project_context(repository_name="<PROJECT>", document="<SMTH>", tags="<SMTH>", content="<CONTENT>")`.

Tags: single tag string or array of tags. No JSON encoding.

USE SKILL `load-context`, if not available call `get_context_instructions`, if it fails YOU MUST ASK USER (as this is highly critical and unexpected)!

# SKILL SELECTION

- When user types `/<name>` without namespace and exactly one `<plugin>:<name>` exists in the available skill list, resolve to it — this is disambiguation, not guessing. If multiple `<plugin>:<name>` match, ask the user which.
- When multiple Rosetta task skills match the same request, pick the highest-priority match and stop — do not chain:
  `requirements-authoring > planning > tech-specs > coding-iac > coding > testing > debugging`
- Meta-skills (`reasoning`, `questioning`, `load-context`) are orthogonal to the ladder and do not compete with task skills.
- `load-context` runs as part of Prep Step 1 (once per session). Do not re-invoke mid-session unless the user explicitly asks.

# ADDITIONAL SOURCES

- RULE, SKILL, AGENT, SUBAGENT, WORKFLOW, COMMAND are all served dynamically by Rosetta MCP via `query_instructions` and `list_instructions`

# AVAILABLE WORKFLOWS

- `coding-flow` - Rosetta coding and implementation workflow, includes discovery, tech specs, tech plan, subagent plan review, user plan review, implementation, subagent review implementation, validation, user review, and final validation with reviewer gates, HITL gates, and subagent delegation.
- `init-workspace-flow` - Rosetta workflow to initialize or upgrade a workspace, includes identify context, init proxying shells for target skills/agents/commands, workspace discovery, copy rules (optional, not recommended), identify patterns used, generate documentation, clarify questions, verification.
- `requirements-authoring-flow` - Rosetta workflow for requirements authoring (creating, updating, improving, reviewing). Guides AI through discovery, intent capture, iterative requirement drafting with mandatory user approvals, validation, and delivery. Contains discovery, research, intent capture, outline, drafting, validating, and finalization
- `self-help-flow` - Rosetta self-help. Ask about capabilities, learn how to use them, get guidance on developing with Rosetta, or seamlessly switch to executing any discovered workflow. Answers "what can you do", "how do I use X", "how modernization works", "what workflows are available", etc.
- `adhoc-flow` - Rosetta ad-hoc adaptive meta-workflow that constructs, tracks, reviews, and executes a tailored execution plan per user request using building blocks and available instructions. Useful for small or simple tasks if none other workflows matches. Lightweight.

# PREP STEP 1

- THIS FILE IS PREP STEP 1.
- `get_context_instructions()` MCP call returns PREP STEP 2 & 3 to complete.

</bootstrap>
