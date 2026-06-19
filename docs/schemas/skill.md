---
# Core Identity (Required) — keep these live, replace the <...> value
name: "<skill name; MUST equal the parent folder name of SKILL.md; lowercase-hyphenated>"
description: "GENERIC form: To <verb> <what it does + when/why; dense keywords>. CRITICAL/guardrail form: 'Rosetta CRITICAL MUST skill. MUST activate when <condition>'. Budget: all skills share ~1K tokens — keep ≤ ~25 tokens and dense; over-long is ignored the same as terse, keyword-dense descriptions trigger best"
# alwaysApply — keep false; true injects this into EVERY context (bloat); set true ONLY with explicit user approval [boolean] [Cursor]
alwaysApply: false

# Licensing & Compatibility (Optional — uncomment a line to enable)
# license — license name or bundled-file reference [string] [Cursor, OpenCode]
# license: "Apache-2.0"
# compatibility — environment requirements: system packages, network, etc. [string] [Cursor, OpenCode]
# compatibility: "Requires docker and kubectl"
# dependencies — software packages the skill needs [string] [Claude Code]
# dependencies: "python>=3.8, pandas>=1.5.0"

# Invocation & Discovery — disable-model-invocation and user-invocable are REQUIRED: always set explicitly, even when equal to the default
# disable-model-invocation — true = runs only when explicitly invoked via /name, never auto-applied by context [boolean] [Cursor, Claude Code]
disable-model-invocation: false
# user-invocable — false = hidden from the / menu (background knowledge users shouldn't call directly) [boolean] [Claude Code]
user-invocable: true
# argument-hint — autocomplete hint for expected args; ONLY include when user-invocable: true, REMOVE when user-invocable: false (Optional — uncomment to enable) [string] [Claude Code]
# argument-hint: "issue-number | filename"

# Tools & Model Configuration (Optional — uncomment a line to enable)
# allowed-tools — tools usable without a permission prompt while active; DANGEROUS, keep only if you know exactly [string] [Claude Code]
# allowed-tools: "Bash(git diff:*)"
# model — use the FULL current model id; NEVER an alias (opus/sonnet) or a stale id: an executor on older data can't resolve aliases or newer ids and will run the wrong model [string] [Claude Code]
# model: "claude-opus-4-8"
# [Latest models: Anthropic (claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5); OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high, gpt-5.4-medium, gpt-5.4-high, gpt-5.5-high); Google (gemini-3.1-pro-preview, gemini-3-flash-preview); Z.ai (glm-5)]
# [Families: large/smart/slow {opus, high, pro} · medium/workhorse {sonnet, medium, glm-5, kimi-k2.5, minimax-m2.5} · small/fast {haiku, glm-4.7, flash, mini, low}]

# Execution Context (Optional — uncomment a line to enable)
# context — set to 'fork' to run in a forked subagent context [string] [Claude Code]
# context: "fork"
# agent — subagent type to use when context is 'fork' [string] [Claude Code]
# agent: "code-reviewer"

# Other (Optional — uncomment a line to enable)
# hooks — hooks scoped to this skill's lifecycle (see Hooks in skills/agents for format) [object] [Claude Code]
# hooks: {}

# Knowledge Base Tags — shared tag bundles related artifacts; publisher auto-adds parent-folder + file-name tags; remove if empty [array] [ex: ["tag-1", "tag-2"]]
tags: []

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
