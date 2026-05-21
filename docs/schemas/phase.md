---
# Core Identity (Required)
name: [Workflow-Phase Name, must match file name without extension]
description: [Brief description of WHEN and HOW to use this phase and WHAT it does]

# Knowledge Base Tags (remove if empty, use the same tag to bundle, publisher will automatically add tags of parent folder names and file name with extension, and file name parts split by dash)
tags: ["one", "second"]

# do not remove baseSchema!
baseSchema: docs/schemas/phase.md
---
[MAIN INTENTION: workflow phases defined here should be reusable and adaptable, the file must be small and short, skills already define how things work! Be concise! Save tokens!]

[ONLY FOR TEMPLATE EXECUTOR: imperative bullet points, shorter lines, distinguish references to repository files vs instructions; skill/subagent names will be in context already, so just reference it. the rest of instruction folder files: rules/templates/workflows/assets/subfolders of skill/etc must be ACQUIRE'd / SEARCH'd / LIST'd to be used]

[Latest Models: Anthropic (claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5), OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high, gpt-5.4-medium, gpt-5.4-high, gpt-5.5-high), Google (gemini-3.1-pro-preview, gemini-3-flash-preview), Z.ai (glm-5).]

[Model families: large (smart and slow) {opus, high, pro}, medium (workhorse) {sonnet, medium, glm-5, kimi-k2.5, minimax-m2.5}, small (fast, not smart) {haiku, glm-4.7, flash, mini, low} ]

<[workflow]-[phase_name]>

<description_and_purpose>

[KEEP THIS VERY SHORT. What this phase of workflow does and its purpose in the overall process, define a problem and retrospectively introspectively validation proof that this prompt actually solves the problem]

</description_and_purpose>

<workflow_context>

[KEEP THIS VERY SHORT, Define this phase context of the overall workflow]

</workflow_context>

<phase_steps>

1. [5-9 word or less step definition]
2. [5-9 word or less step definition]

</phase_steps>

<[step_name] step="N.Y" [dimension]="[value]">
[IF NEEDED ADD ADDITIONAL ATTRIBUTES IF STEP IS LARGE AND SUBAGENT IS REQUIRED: subagent="<subagent name>" role="<subagent role with specialization to assume, brilliant and short>" subagent_recommended_model="<comma separate list of models>" ]

1. [Actions to be taken]

</[step_name]>

<best_practices>

[Optional, KEEP THIS VERY SHORT, best practices to follow]

</best_practices>

<validation_checklist>

[Optional, KEEP THIS VERY SHORT, do NOT repeat the rest of the prompt, it must not just restate the same: prompt tells what to do, instead it should be proof-oriented — observable evidence that the output is correct, proof that work was done correctly]

- Checkpoint 1
- Checkpoint 2
...

</validation_checklist>

<pitfalls>

[Optional, KEEP THIS VERY SHORT, do NOT repeat, provide unexpected mistakes, edge cases, caveats, unusual, errors, gotchas, traps, non-obvious patterns or issues to take into account or avoid]

</pitfalls>

</[workflow]-[phase_name]>
