---
# Core Identity (Required)
name: [Agent Name, must match file name without extension]
description: [ "Rosetta [lightweight subagent|full subagent]" + Brief description of WHEN and HOW to use this agent and WHAT it does]

# Mode (Optional, remove if not needed)
mode: [Defines agent type] [string] [OpenCode] [ex: primary, subagent]

# Model Configuration (Optional, remove if not needed)
model: [Specifies which LLM model to use, any thinking/reasoning must be done with stronger models and high reasoning efforts, while execution with cheaper] [string] [Cursor, OpenCode, Claude Code] [ex: claude-4.6-sonnet]
temperature: [Controls response randomness] [float] [OpenCode] [ex: 0.7]

[Latest Models: Anthropic (claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5), OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high, gpt-5.4-medium, gpt-5.4-high, gpt-5.5-high), Google (gemini-3.1-pro-preview, gemini-3-flash-preview), Z.ai (glm-5).]

[Model families: large (smart and slow) {opus, high, pro}, medium (workhorse) {sonnet, medium, glm-5, kimi-k2.5, minimax-m2.5}, small (fast, not smart) {haiku, glm-4.7, flash, mini, low} ]

# Tools Configuration (Optional, remove if not needed)
tools: [Array specifying which tools are enabled, dangerous, only limit if it is a must and you know exactly in advance, otherwise remove completely] [array] [Claude Code] [ex: ["read", "grep"]]
tools: [Object specifying which tools are enabled, dangerous, only limit if it is a must and you know exactly in advance, otherwise remove completely] [object] [OpenCode] [ex: {write: false, edit: false, bash: false}]
disallowedTools: [Array specifying which tools to deny] [array] [Claude Code] [ex: ["bash", "write"]]

# Permission Configuration (Optional, remove if not needed)
permission: [Access control agent actions] [object] [OpenCode] [ex: {edit: deny}]
permissionMode: [Permission behavior] [string] [Claude Code] [ex: default, acceptEdits, dontAsk, bypassPermissions, plan]
readonly: [If true, the subagent runs with restricted write permissions] [boolean] [Cursor] 

# Execution Behavior (Optional, remove if not needed)
is_background: [If true, the subagent runs in the background] [boolean] [Cursor] 
steps: [Maximum number of agentic iterations] [int] [OpenCode] [ex: 10]
disable: [If true, the agent will be disabled] [boolean] [OpenCode] 
hidden: [If true, hidden from @ autocomplete menu] [boolean] [OpenCode] 

# Content & Extensions (Optional, remove if not needed)
skills: [Array with skills to load into agent context at startup] [array] [Claude Code] [ex: ["skill1", "skill2"]]
hooks: [Lifecycle hooks the subagent] [object] [Claude Code] [ex: {onStart: "Initialize environment", onComplete: "Clean up resources"}]
prompt: [Specifies a custom system prompt file] [string] [OpenCode] [ex: file:./prompts/code-review.txt]

# Knowledge Base Tags (remove if empty, use the same tag to bundle, publisher will automatically add tags of parent folder names and file name with extension, and file name parts split by dash)
tags: ["one", "second"]

# do not remove baseSchema!
baseSchema: docs/schemas/agent.md
--- 

<[the_agent_name]>

[ONLY FOR TEMPLATE EXECUTOR: imperative bullet points, shorter lines, distinguish references to repository files vs instructions; skill/subagent names will be in context already, so just reference it. the rest of instruction folder files: rules/templates/workflows/assets/subfolders of skill/etc must be ACQUIRE'd / SEARCH'd / LIST'd to be used]

<role>

[Define role with specialization to assume, use expressive language, seniority, brilliant and short]
[Example: You are a senior prompt engineer and an expert in meta prompting and meta processes generating short and expressive rules with brilliant ideas.]

</role>

<purpose>

[KEEP THIS VERY SHORT. Define a problem and retrospectively introspectively validation proof that this prompt actually solves the problem, Clear statement of the agent's primary purpose and goals]
[Also, one additional problem subagents always solve is context overload if used properly]

</purpose>

<capabilities>

[Optional, list specific capabilities and what the agent can do]

- Capability 1
- Capability 2
...

</capabilities>

<prerequisites>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed

[List any requirements before using this agent]

- [Required files to read]
- [Required knowledge]
- [Required tools and MCPs]
- [Required context]

</prerequisites>

<process>

[Optional, define the step-by-step process this agent follows]

1. [action description]
2. [action description]
...

</process>

<required_rules_and_restrictions>

[Optional, agent-specific rules and links to common ones using `ACQUIRE FROM KB` commands]

</required_rules_and_restrictions>

<best_practices>

[Optional, KEEP THIS VERY SHORT. best practices to follow. do NOT repeat]

</best_practices>

<pitfalls>

[Optional section, KEEP THIS VERY SHORT. do NOT repeat, provide unexpected mistakes, edge cases, caveats, unusual, errors, gotchas, traps, non-obvious patterns or issues to take into account or avoid, do not write obvious ones, do not repeat/rephrase]

</pitfalls>

<skills_available>

[List skills that this agent can use or delegate to]

- USE SKILL [skill-folder-name]

</skills_available>

<validation_and_quality_checks>

[Optional, KEEP THIS VERY SHORT. define validation steps and quality criteria, do NOT repeat/rephrase the prompt: prompt tells what to do, while validation provides proof it was done correctly without restating]

</validation_and_quality_checks>

<output_template>

[Define what the agent produces, provide template of the output if possible]

</output_template>

<examples>

[Optional]

<example_1_scenario_name>

**Input:**
```
[example input]
```

**Expected Output:**
```
[example output]
```

</example_1_scenario_name>

</examples>

</[the_agent_name]>
