---
# Core Identity (Required)
name: "[Skill Name, must match parent folder name where SKILL.md file is in]"
description: "[Brief description of WHEN and HOW to use this skill and WHAT it does]"

# Licensing & Compatibility (Optional)
# license — [License name or reference to bundled license file] [string] [Cursor, OpenCode] [ex: MIT]
license: "[License name or reference to bundled license file]"
# compatibility — [Environment requirements (system packages, network access, etc.)] [string] [Cursor, OpenCode] [ex: 'Requires docker and kubectl']
compatibility: "[Environment requirements (system packages, network access, etc.)]"
# dependencies — [Software packages required by your Skill] [string] [Claude Code] [ex: python>=3.8, pandas>=1.5.0]
dependencies: "[Software packages required by your Skill]"

# Invocation & Discovery (Optional)
# disable-model-invocation — [When true, the skill is only included when explicitly invoked via /skill-name. The agent will not automatically apply it based on context] [boolean] [Cursor, Claude Code]
disable-model-invocation: "[When true, the skill is only included when explicitly invoked via /skill-name. The agent will not automatically apply it based on context]"
# user-invocable — [Set to false to hide from the / menu. Use for background knowledge users shouldn't invoke directly. Default: true] [boolean] [Claude Code] [ex: false]
user-invocable: "[Set to false to hide from the / menu. Use for background knowledge users shouldn't invoke directly. Default: true]"
# argument-hint — [Hint shown during autocomplete to indicate expected arguments] [string] [Claude Code] [ex: issue-number, filename]
argument-hint: "[Hint shown during autocomplete to indicate expected arguments]"

# Tools & Model Configuration (Optional)
# allowed-tools — [Tools Claude can use without asking permission when this skill is active, dangerous, only keep it when you know exactly] [string] [Claude Code] [ex: Bash(git diff:*)]
allowed-tools: "[Tools Claude can use without asking permission when this skill is active, dangerous, only keep it when you know exactly]"
# model — [Model to use when this skill is active] [string] [Claude Code] [ex: claude-3.5-sonnet]
model: "[Model to use when this skill is active]"

# [Latest Models: Anthropic (claude-opus-4-8, claude-sonnet-5, claude-haiku-4-5), OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high, gpt-5.4-medium, gpt-5.5-high), Google (gemini-3.1-pro-preview, gemini-3-flash-preview), Z.ai (glm-5).]

# Execution Context (Optional)
# context — [Set to 'fork' to run in a forked subagent context] [string] [Claude Code]
context: "[Set to 'fork' to run in a forked subagent context]"
# agent — [Which subagent type to use when context is set to 'fork'] [string] [Claude Code] [ex: code-reviewer]
agent: "[Which subagent type to use when context is set to 'fork']"

# Other (Optional)
# hooks — [Hooks scoped to this skill's lifecycle. See Hooks in skills and agents for configuration format] [object] [Claude Code]
hooks: "[Hooks scoped to this skill's lifecycle. See Hooks in skills and agents for configuration format]"
# metadata — [Arbitrary key-value mapping for additional metadata, do not add tags here] [object] [Cursor, OpenCode] [ex: {version: "1.0", author: "Rosetta team"}]
metadata: "[Arbitrary key-value mapping for additional metadata, do not add tags here]"

# Knowledge Base Tags (use the same tag to bundle, publisher will automatically add tags of parent folder names and file name with extension, and file name parts split by dash)
tags: ["one", "second"]

# do not remove baseSchema!
baseSchema: docs/schemas/skill.md
---

<[skill_name]>

<role>
[Define role with specialization of the agent executing this skill]
</role>

<prerequisites>
- All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed
</prerequisites>

<instructions>
MUST ACQUIRE `skills/<skill-name>/SKILL.md` FROM KB and FULLY EXECUTE
</instructions>

</[skill_name]>
