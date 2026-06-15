---
name: [Workflow Name, must match file name without extension]
description: ["Rosetta" + Brief description of WHEN and HOW to use this workflow and WHAT it does]

# Knowledge Base Tags (remove if empty, use the same tag to bundle, publisher will automatically add tags of parent folder names and file name with extension, and file name parts split by dash)
tags: ["one", "second"]

# do not remove baseSchema!
baseSchema: docs/schemas/workflow.md
---

[MAIN INTENTION: workflows defined here should be reusable and adaptable, the file must be small and short, skills already define how things work! Be concise! Save tokens! Recommend skills, but do not limit, add hook to add any currently available and useful]

[ONLY FOR TEMPLATE EXECUTOR: imperative bullet points, shorter lines, distinguish references to repository files vs instructions; skill/subagent names will be in context already, so just reference it. the rest of instruction folder files: rules/templates/workflows/assets/subfolders of skill/etc must be ACQUIRE'd / SEARCH'd / LIST'd to be used]

[Latest Models: Anthropic (claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5), OpenAI (gpt-5.3-codex-medium, gpt-5.3-codex-high, gpt-5.4-medium, gpt-5.4-high, gpt-5.5-high), Google (gemini-3.1-pro-preview, gemini-3-flash-preview), Z.ai (glm-5).]

[Model families: large (smart and slow) {opus, high, pro}, medium (workhorse) {sonnet, medium, glm-5, kimi-k2.5, minimax-m2.5}, small (fast, not smart) {haiku, glm-4.7, flash, mini, low} ]

<[the_workflow_name]>

<description_and_purpose>

[KEEP THIS VERY SHORT. What this flow does and its purpose in the overall process. Define a problem and retrospectively introspectively validation proof that this prompt actually solves the problem.]

</description_and_purpose>

<workflow_phases>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed

[Orchestrator may not have clear picture, instruct it to trust the system, skills define that, and it should NOT try to execute those itself]
[Tell how phases and steps are executed: sequentially or parallel]

<[phase_name] phase="N" [dimension]="[value]" subagent="[subagent name]" role="[subagent role with specialization to assume, brilliant and short]" subagent_required_model="[comma separate list of models]" [optional: must-be-subagent]>

[add attribute must-be-subagent for phases where fresh eyes are critical: reviewers/validator/etc.]

1. [High-level brief description, the phase itself should be a separate file if requires multiple steps to be executed]
2. [Briefly inputs, outputs, responsibilities contract]
3. [Required|Recommended] skills: [comma separated list of skills]
4. Update `agents/[workflow]-state.md` [required]
5. HITL get approval [optional, when it is needed]

[THE FOLLOWING SECTION IS OPTIONAL]
[ADDITIONALLY, IF WORKFLOW IS LARGE - USE SEPARATE PHASE TEMPLATE]
<[step_name] step="N.Y" [dimension]="[value]">
[IF NEEDED ADD ADDITIONAL ATTRIBUTES IF STEP IS LARGE AND SUBAGENT IS REQUIRED: subagent="<subagent name>" role="<subagent role with specialization to assume, brilliant and short>" subagent_required_model="<comma separate list of models extracted from subagent frontmatter itself, plus normalize claude-* to canonical list above, example claude-opus-4.8-high to claude-opus-4-8>" ]

1. [Actions to be taken]

</[step_name]>

</[phase_name]>

</workflow_phases>

<references>

[Optional, Any other references]

- [Type of object referenced] [Reference] [Description, optional]

</references>

<best_practices>

[Optional, KEEP THIS VERY SHORT. best practices to follow]

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

</[the_workflow_name]>
