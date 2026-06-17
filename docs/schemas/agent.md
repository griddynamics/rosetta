---
# Core Identity (Required) — keep these live, replace the <...> value
name: "<agent name; MUST match the file name without extension>"
description: "<what it does + when/how to use; dense keywords; MUST be < ~15 tokens>. <Full subagent|Lightweight subagent>"
# alwaysApply — keep false; true injects this into EVERY context (bloat); set true ONLY with explicit user approval [boolean] [Cursor]
alwaysApply: false

# Model Configuration (Required) — stronger/high-reasoning models for thinking, cheaper ones for execution
# model — use the FULL current model id; NEVER an alias (opus/sonnet) or a stale id: an executor on older data can't resolve aliases or newer ids and will spawn the wrong model [string] [Cursor, OpenCode, Claude Code]
model: "<FULL current model id, e.g. claude-opus-4-8>"
# temperature — response randomness (Optional — uncomment to enable) [float] [OpenCode]
# temperature: 0.7
# [Latest models: Anthropic (claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5); OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high, gpt-5.4-medium, gpt-5.4-high, gpt-5.5-high); Google (gemini-3.1-pro-preview, gemini-3-flash-preview); Z.ai (glm-5)]
# [Families: large/smart/slow {opus, high, pro} · medium/workhorse {sonnet, medium, glm-5, kimi-k2.5, minimax-m2.5} · small/fast {haiku, glm-4.7, flash, mini, low}]

# Mode (Optional — uncomment to enable)
# mode — agent type [string] [OpenCode] [ex: primary, subagent]
# mode: "subagent"

# Tools Configuration (Optional — uncomment the line for your target platform; DANGEROUS, limit only if you know exactly)
# tools — enabled tools as a comma-separated string [string] [Claude Code] [ex: "Read, Grep, Glob"]
# tools: "Read, Grep, Glob"
# tools — enabled tools as an object [object] [OpenCode] [ex: {write: false, edit: false, bash: false}]
# tools: {write: false, edit: false, bash: false}
# disallowedTools — tools to deny [array] [Claude Code] [ex: ["bash", "write"]]
# disallowedTools: ["bash", "write"]

# Permission Configuration (Optional — uncomment to enable)
# permission — access control for agent actions [object] [OpenCode] [ex: {edit: deny}]
# permission: {edit: deny}
# permissionMode — permission behavior [string] [Claude Code] [ex: default, acceptEdits, dontAsk, bypassPermissions, plan]
# permissionMode: "default"
# readonly — true = subagent runs with restricted write permissions [boolean] [Cursor]
# readonly: false

# Execution Behavior (Optional — uncomment to enable)
# is_background — true = subagent runs in the background [boolean] [Cursor]
# is_background: false
# steps — max agentic iterations [int] [OpenCode]
# steps: 10
# disable — true = agent is disabled [boolean] [OpenCode]
# disable: false
# hidden — true = hidden from @ autocomplete menu [boolean] [OpenCode]
# hidden: false

# Content & Extensions (Optional — uncomment to enable)
# skills — skills loaded into agent context at startup [array] [Claude Code] [ex: ["skill1", "skill2"]]
# skills: ["skill1", "skill2"]
# hooks — lifecycle hooks for the subagent [object] [Claude Code] [ex: {onStart: "...", onComplete: "..."}]
# hooks: {}
# prompt — custom system-prompt file [string] [OpenCode] [ex: file:./prompts/code-review.txt]
# prompt: "file:./prompts/code-review.txt"

# Knowledge Base Tags — shared tag bundles related artifacts; publisher auto-adds parent-folder + file-name tags; remove if empty [array] [ex: ["tag-1", "tag-2"]]
tags: []

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
