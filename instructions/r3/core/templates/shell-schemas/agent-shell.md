---
# Core Identity (Required)
name: [Agent Name, must match file name without extension]
description: [Brief description of WHEN and HOW to use this agent and WHAT it does]

# Mode (Optional)
mode: [Defines agent type] [string] [OpenCode] [ex: primary, subagent]

# Model Configuration (Optional)
model: [Specifies which LLM model to use, any thinking/reasoning must be done with stronger models and high reasoning efforts, while execution with cheaper] [string] [Cursor, OpenCode, Claude Code] [ex: claude-4.6-sonnet]
temperature: [Controls response randomness] [float] [OpenCode] [ex: 0.7]

[Latest Models: Anthropic (claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5), OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high), Google (gemini-3.1-pro-preview, gemini-3-flash-preview), Z.ai (glm-5).]

# Tools Configuration (Optional)
tools: [Array specifying which tools are enabled, dangerous, only limit if it is a must and you know exactly in advance, otherwise remove completely] [array] [Claude Code] [ex: ["read", "grep"]]
tools: [Object specifying which tools are enabled, dangerous, only limit if it is a must and you know exactly in advance, otherwise remove completely] [object] [OpenCode] [ex: {write: false, edit: false, bash: false}]
disallowedTools: [Array specifying which tools to deny] [array] [Claude Code] [ex: ["bash", "write"]]

# Permission Configuration (Optional)
permission: [Access control agent actions] [object] [OpenCode] [ex: {edit: deny}]
permissionMode: [Permission behavior] [string] [Claude Code] [ex: default, acceptEdits, dontAsk, bypassPermissions, plan]
readonly: [If true, the subagent runs with restricted write permissions] [boolean] [Cursor] 

# Execution Behavior (Optional)
is_background: [If true, the subagent runs in the background] [boolean] [Cursor] 
steps: [Maximum number of agentic iterations] [int] [OpenCode] [ex: 10]
disable: [If true, the agent will be disabled] [boolean] [OpenCode] 
hidden: [If true, hidden from @ autocomplete menu] [boolean] [OpenCode] 

# Content & Extensions (Optional)
skills: [Array with skills to load into agent context at startup] [array] [Claude Code] [ex: ["skill1", "skill2"]]
hooks: [Lifecycle hooks the subagent] [object] [Claude Code] [ex: {onStart: "Initialize environment", onComplete: "Clean up resources"}]
prompt: [Specifies a custom system prompt file] [string] [OpenCode] [ex: file:./prompts/code-review.txt]

# Knowledge Base Tags (use the same tag to bundle, publisher will automatically add tags of parent folder names and file name with extension, and file name parts split by dash)
tags: ["one", "second"]

# do not remove baseSchema!ß
baseSchema: docs/schemas/agent.md
--- 

<[agent_name] agentType="subagent">

<role>
[Define role with specialization to assume, use expressive language, seniority, brilliant and short]
</role>

<prerequisites>
- Rosetta prep steps completed
</prerequisites>

<instructions>
MUST ACQUIRE `agents/<agent-name>.md` FROM KB and FULLY EXECUTE
</instructions>

</[agent_name]>
