---
# Core Identity (Required)
name: "[Agent Name, must match file name without extension]"
description: "[Brief description of WHEN and HOW to use this agent and WHAT it does]"

# Mode (Optional)
# mode — [Defines agent type] [string] [OpenCode] [ex: primary, subagent]
mode: "[Defines agent type]"

# Model Configuration (Optional)
# model — [Specifies which LLM model to use, any thinking/reasoning must be done with stronger models and high reasoning efforts, while execution with cheaper] [string] [Cursor, OpenCode, Claude Code] [ex: claude-5-sonnet]
model: "[Specifies which LLM model to use, any thinking/reasoning must be done with stronger models and high reasoning efforts, while execution with cheaper]"
# temperature — [Controls response randomness] [float] [OpenCode] [ex: 0.7]
temperature: "[Controls response randomness]"

# [Latest Models: Anthropic (claude-opus-4-8, claude-sonnet-5, claude-haiku-4-5), OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high, gpt-5.4-medium, gpt-5.5-high, gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna), Google (gemini-3.1-pro-preview, gemini-3.5-flash), Cursor (grok-4.5, composer-2.5), Z.ai (glm-5).]

# Tools Configuration (Optional)
# tools — [Array specifying which tools are enabled, dangerous, only limit if it is a must and you know exactly in advance, otherwise remove completely] [array] [Claude Code] [ex: ["read", "grep"]]
# tools — [Object specifying which tools are enabled, dangerous, only limit if it is a must and you know exactly in advance, otherwise remove completely] [object] [OpenCode] [ex: {write: false, edit: false, bash: false}]
# disallowedTools — [Array specifying which tools to deny] [array] [Claude Code] [ex: ["bash", "write"]]
disallowedTools: "[Array specifying which tools to deny]"

# Permission Configuration (Optional)
# permission — [Access control agent actions] [object] [OpenCode] [ex: {edit: deny}]
permission: "[Access control agent actions]"
# permissionMode — [Permission behavior] [string] [Claude Code] [ex: default, acceptEdits, dontAsk, bypassPermissions, plan]
permissionMode: "[Permission behavior]"
# readonly — [If true, the subagent runs with restricted write permissions] [boolean] [Cursor]
readonly: "[If true, the subagent runs with restricted write permissions]"

# Execution Behavior (Optional)
# is_background — [If true, the subagent runs in the background] [boolean] [Cursor]
is_background: "[If true, the subagent runs in the background]"
# steps — [Maximum number of agentic iterations] [int] [OpenCode] [ex: 10]
steps: "[Maximum number of agentic iterations]"
# disable — [If true, the agent will be disabled] [boolean] [OpenCode]
disable: "[If true, the agent will be disabled]"
# hidden — [If true, hidden from @ autocomplete menu] [boolean] [OpenCode]
hidden: "[If true, hidden from @ autocomplete menu]"

# Content & Extensions (Optional)
# skills — [Array with skills to load into agent context at startup] [array] [Claude Code] [ex: ["skill1", "skill2"]]
skills: "[Array with skills to load into agent context at startup]"
# hooks — [Lifecycle hooks the subagent] [object] [Claude Code] [ex: {onStart: "Initialize environment", onComplete: "Clean up resources"}]
hooks: "[Lifecycle hooks the subagent]"
# prompt — [Specifies a custom system prompt file] [string] [OpenCode] [ex: file:./prompts/code-review.txt]
prompt: "[Specifies a custom system prompt file]"

# Knowledge Base Tags (use the same tag to bundle, publisher will automatically add tags of parent folder names and file name with extension, and file name parts split by dash)
tags: ["one", "second"]

# do not remove baseSchema!
baseSchema: docs/schemas/agent.md
--- 

<[agent_name] agentType="subagent">

<role>
[Define role with specialization to assume, use expressive language, seniority, brilliant and short]
</role>

<prerequisites>
- All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed
</prerequisites>

<instructions>
MUST ACQUIRE `agents/<agent-name>.md` FROM KB and FULLY EXECUTE
</instructions>

</[agent_name]>
