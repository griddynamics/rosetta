---
# Core Identity (Required)
name: [Skill Name, must match parent folder name where SKILL.md file is in]
description: ["Rosetta" + Brief description of WHEN and WHY to use this skill.]

# Licensing & Compatibility (Optional, remove if not needed)
license: [License name or reference to bundled license file] [string] [Cursor, OpenCode] [ex: MIT]
compatibility: [Environment requirements (system packages, network access, etc.)] [string] [Cursor, OpenCode] [ex: 'Requires docker and kubectl']
dependencies: [Software packages required by your Skill] [string] [Claude Code] [ex: python>=3.8, pandas>=1.5.0]

# Invocation & Discovery (Optional, remove if not needed)
disable-model-invocation: [When true, the skill is only included when explicitly invoked via /skill-name. The agent will not automatically apply it based on context] [boolean] [Cursor, Claude Code] 
user-invocable: [Set to false to hide from the / menu. Use for background knowledge users shouldn't invoke directly. Default: true] [boolean] [Claude Code] [ex: false]
argument-hint: [Hint shown during autocomplete to indicate expected arguments] [string] [Claude Code] [ex: issue-number, filename]

# Tools & Model Configuration (Optional)
allowed-tools: [Tools Claude can use without asking permission when this skill is active, dangerous, only keep it when you know exactly] [string] [Claude Code] [ex: Bash(git diff:*)]
model: [Model to use when this skill is active] [string] [Claude Code] [ex: claude-3.5-sonnet]

[Latest Models: Anthropic (claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5), OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high, gpt-5.4-medium, gpt-5.4-high, gpt-5.5-high), Google (gemini-3.1-pro-preview, gemini-3-flash-preview), Z.ai (glm-5).]

[Model families: large (smart and slow) {opus, high, pro}, medium (workhorse) {sonnet, medium, glm-5, kimi-k2.5, minimax-m2.5}, small (fast, not smart) {haiku, glm-4.7, flash, mini, low} ]

# Execution Context (Optional, remove if not needed)
context: [Set to 'fork' to run in a forked subagent context] [string] [Claude Code]
agent: [Which subagent type to use when context is set to 'fork'] [string] [Claude Code] [ex: code-reviewer]

# Other (Optional, remove if not needed)
hooks: [Hooks scoped to this skill's lifecycle. See Hooks in skills and agents for configuration format] [object] [Claude Code]

# Knowledge Base Tags (remove if empty, use the same tag to bundle, publisher will automatically add tags of parent folder names and file name with extension, and file name parts split by dash)
tags: ["one", "second"]

# do not remove baseSchema!
baseSchema: docs/schemas/skill.md
---

[ONLY FOR TEMPLATE EXECUTOR: imperative bullet points, shorter lines, distinguish references to repository files vs instructions; skill/subagent names will be in context already, so just reference it. the rest of instruction folder files: rules/templates/workflows/assets/subfolders of skill/etc must be ACQUIRE'd / SEARCH'd / LIST'd to be used]

<[the_skill_name]>

<role>

[Optional, Define role with specialization of the agent executing this skill, use expressive language, seniority, brilliant and short]

</role>

<when_to_use_skill>

[KEEP THIS VERY SHORT. Define a problem and retrospectively introspectively validation proof that this prompt actually solves the problem, explain the scenarios, conditions, or situations where this skill should be used]

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed

[Optional, KEEP THIS VERY SHORT, Describe the fundamental concepts, principles, definitions and explanations required to properly execute the skill]

</core_concepts>

<process>

[Optional, KEEP THIS VERY SHORT, Every line is an ACTION (imperative verb) or a GATE (condition), No explaining what the agent already knows how to do, Define contracts/structures ONCE, DRY, No vague qualifiers, No patronizing, No tautology, No filler words]

</process>


<validation_checklist>

[Optional, KEEP THIS VERY SHORT, do NOT repeat the rest of the prompt, it must not just restate the same: prompt tells what to do, instead it should be proof-oriented — observable evidence that the output is correct, proof that work was done correctly]

- Checkpoint 1
- Checkpoint 2
...

</validation_checklist>

<best_practices>

[Optional, KEEP THIS VERY SHORT, do NOT repeat, List recommended practices, tips, and guidelines for effectively using this skill]

- Practice 1
- Practice 2
...

</best_practices>

<pitfalls>

[Optional section, KEEP THIS VERY SHORT, do NOT repeat, provide unexpected mistakes, edge cases, caveats, unusual, errors, gotchas, traps, non-obvious patterns or issues to take into account or avoid]

</pitfalls>

<resources>

[Optional, List helpful resources, references, or related materials, do not duplicate]

- [Type of object referenced] [Reference] [Description, optional]
...

</resources>

<templates>

[Optional, Define what this skill produces and provide templates or examples of the output format]

- [Reference]

</templates>

</[the_skill_name]>
