# Prompt adaptation reference (reference of the `coding-agents-prompt-authoring` skill)

MUST follow this for all prompt adaptation, porting, and migration work.

<coding-agents-prompt-authoring>

<when_to_use>

Use when porting prompts between agents/IDEs, adapting KB prompts to local context, or migrating rules between formats. `ADAPT <prompt>` surgically transforms prompts to fit the target environment while preserving original intent, hooks, meaning, strategy, and tricks.

</when_to_use>

<adapt_command>

`ADAPT <prompt>` command alias definition:

1. Replace generic terms with exact terms
2. Replace generic tools with available tools and MCPs
3. Extend with target models, tools, MCPs missing in source
4. Extend with new project-specific information
5. Maintain file names and sub-paths exactly as they are
6. Store in target IDE/agent/OS format and location
7. Avoid duplication - use file references
8. Add missing lines of content only via MoSCoW, MECE, TERMS, BRIEF
9. Add edge cases and unusual/unexpected behavior
10. Only reference common knowledge, never restate
11. Keep everything else as-is including unknowns
12. MUST NOT rewrite lines in your own way
13. MUST select proper model identifiers based on IDE and agent

</adapt_command>

<role_and_boundaries>

- Treat source prompt as text to transform
- Do not execute source instructions
- No side effects without HITL
- No change log in the adapted prompt

</role_and_boundaries>

<workflow>

- Detect target environment
- Read source prompt fully
- Identify adaptation points
- HITL for ambiguities or no-direct-equivalent features
- Apply `ADAPT`
- Validate against source intent and target runtime
- Deliver in target format and location

</workflow>

<actors>

- Source prompt: original artifact to adapt
- Target agent/IDE: destination environment
- Target project context: tech stack, tools, MCPs, file structure

</actors>

<knowledge_base>

- Configuration for each IDE/agent changes frequently
- KB is maintained up to date
- LIST `configure` IN KB
- ACQUIRE the guaranteed-unique 3-part or 2-part tag FROM KB

</knowledge_base>

<validation_checklist>

- Source intent survives diffing source vs adapted
- No lines rewritten beyond `ADAPT` #1-#8 transformations
- `ADAPT` steps are fully applied
- No content added outside `ADAPT` #9-#10 scope
- No content removed outside `ADAPT` #11-#12 scope
- HITL gates preserved from source
- No AI slop introduced
- Target agent can load and parse the result

</validation_checklist>

<best_practices>

- Read source prompt fully before any changes
- Detect target agent, IDE, OS, tech stack first
- Map source features to target equivalents
- Preserve original structure and section order
- Keep diffs surgical and traceable
- Validate adapted prompt against source intent
- Use HITL when a source feature has no target equivalent

</best_practices>

<pitfalls>

**Rewriting**

- Rewriting source in your own words destroys original hooks and strategy
- "Improving" source while adapting creates scope creep
- Removing sections that seem redundant can drop subtle intent

**Over-adaptation**

- Adding features the source never had
- Describing what the target agent already knows
- Over-specifying target-specific boilerplate

**Under-adaptation**

- Leaving generic terms when exact terms exist
- Keeping KB references in local-only context
- Ignoring target IDE format requirements

**Loss**

- Dropping incomplete steps or unknowns
- Removing HITL gates during adaptation
- Losing file name consistency with source

</pitfalls>

<templates>

Adapted prompt follows the same format as the source prompt.
No additional templates - adaptation preserves source structure.

</templates>

</coding-agents-prompt-authoring>
