---
# Core Identity (Required)
name: [Skill Name, must match parent folder name where SKILL.md file is in]
description: [Brief description of WHEN and HOW to use this skill and WHAT it does]

# Licensing & Compatibility (Optional)
license: [License name or reference to bundled license file] [string] [Cursor, OpenCode] [ex: MIT]
compatibility: [Environment requirements (system packages, network access, etc.)] [string] [Cursor, OpenCode] [ex: 'Requires docker and kubectl']
dependencies: [Software packages required by your Skill] [string] [Claude Code] [ex: python>=3.8, pandas>=1.5.0]

# Invocation & Discovery (Optional)
disable-model-invocation: [When true, the skill is only included when explicitly invoked via /skill-name. The agent will not automatically apply it based on context] [boolean] [Cursor, Claude Code] 
user-invocable: [Set to false to hide from the / menu. Use for background knowledge users shouldn't invoke directly. Default: true] [boolean] [Claude Code] [ex: false]
argument-hint: [Hint shown during autocomplete to indicate expected arguments] [string] [Claude Code] [ex: issue-number, filename]

# Tools & Model Configuration (Optional)
allowed-tools: [Tools Claude can use without asking permission when this skill is active, dangerous, only keep it when you know exactly] [string] [Claude Code] [ex: Bash(git diff:*)]
model: claude sonnet 4.6

[Latest Models: Anthropic (claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5), OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high), Google (gemini-3.1-pro-preview, gemini-3-flash-preview), Z.ai (glm-5).]

# Execution Context (Optional)
context: [Set to 'fork' to run in a forked subagent context] [string] [Claude Code]
agent: [Which subagent type to use when context is set to 'fork'] [string] [Claude Code] [ex: code-reviewer]

# Other (Optional)
hooks: [Hooks scoped to this skill's lifecycle. See Hooks in skills and agents for configuration format] [object] [Claude Code] 
metadata: [Arbitrary key-value mapping for additional metadata, do not add tags here] [object] [Cursor, OpenCode] [ex: {version: "1.0", author: "Rosetta team"}]

# Knowledge Base Tags (use the same tag to bundle, publisher will automatically add tags of parent folder names and file name with extension, and file name parts split by dash)
tags: ["one", "second"]

# do not remove baseSchema!ß
baseSchema: docs/schemas/skill.md
---

<[skill_name]>

<role>
[Define role with specialization of the agent executing this skill]
</role>

<prerequisites>
- Rosetta prep steps completed
</prerequisites>

<instructions>
MUST ACQUIRE `skills/<skill-name>/SKILL.md` FROM KB and FULLY EXECUTE
</instructions>

</[skill_name]>
