<schema_based_authoring scope="always apply">

For any prompt you always follow best practices and enforce core principles. Even if it is simple.
AI Agents based on the user request and those prompts will select a subagent, skill, and workflow to execute. 
User is not in direct control the most of the time, so you can only indirectly control that with the prompt content itself.

Naming convention is defined in folder structure.

Templates:

- `docs/schemas/skill.md`
- `docs/schemas/workflow.md`
- `docs/schemas/phase.md`
- `docs/schemas/rule.md`
- `docs/schemas/agent.md`
- `docs/schemas/template.md`
- `docs/schemas/generic.md`

Using templates:

- Read respective schema
- Do not execute, use it as reference template
- Fill in the template following all best-practices and enforcing rules
- Add cross-references: up and down using prompt type and internal file names with extensions in backticks (without path!)
- Do not duplicate definitions, each file serves its own purpose
- Enclose any internal name references in backticks
- MUST choose schema per artifact file by target type
- MAY produce multiple artifact types when requested
- MUST keep each artifact file schema-pure
- MUST NOT copy sections across schema families inside one file
- MUST keep consistency only within the current prompt family set solving one task
- MUST NOT optimize for consistency with unrelated prompt families
- MUST not reuse or mirror coding-agents-prompt-authoring as scaffolding or template
- Reuse patterns only from the current family set when intent is preserved
- Identify new target structure, ideas, and patterns that fit best to the requested prompt
- Skills, Subagents, Rules, Templates should be possible to use as-is, without enforcing workflows
- AI agents execute all those Skills, Subagents, Rules, Templates, Workflows, Generic Prompts. There is no control over that, except by proper content of those prompts themselves

Note:

- Root-level `tags` is for KB publishing (file/path tags are automatically added on publishing, keep field even if empty, do not define tags on your own).

</schema_based_authoring>

<skill_authoring schema="docs/schemas/skill.md">

- Reusable knowledge/instructions loaded into agents on demand
- Skill folder contents is internal implementation of the skill (and it will change eventually)
- Skill references its content using file paths relatively to the skill folder

</skill_authoring>

<workflow_and_command_authoring workflow-schema="docs/schemas/workflow.md" workflow-phase-schema="docs/schemas/phase.md">

- Ensure preparation steps as prerequisite
- Small workflows are just defined in the one file
- Large workflows contain phase definitions in separate files
- Workflows must define subagents with role/specialization for each phase
- Commands trigger workflows or skills
- Each phase is intended to be ran by at least one independent subagent
- Workflows must adapt to the SIZE and COMPLEXITY of the user request
- Workflows used as templates, multiple workflows COULD be combined
- Usually we have prep steps (prerequisite), discovery (required, local files and context), research (optional, external knowledge via tools and MCPs), questioning (required, but may have no questions), planning (required, but may be lightweight), specifications (different for each workflow, may be lightweight), execution (required), and self-validation (required)
- EXTREMELY IMPORTANT to prevent AI coding agents to not proceed fully autonomously while user trying to catch it to stop, but instead to proactively work with the user

</workflow_and_command_authoring>

<rule_authoring schema="docs/schemas/rule.md">

- Since rules are global make sure to use non-conflicting language, as it may affect ANY OTHER prompt

</rule_authoring>

<agent_and_subagent_authoring schema="docs/schemas/agent.md">

- Ensure preparation steps as prerequisite
- Define explicitly inputs and outputs
- Subagents are local parallel threads, not external servers
- Subagents start with fresh context — include all references
- Subagents are executors using multiple skills and invoked as defined by workflows
- All those parties contracts should be coherent but not exact
- Distinguish and tailor for lightweight and full subagents:
  - Lightweight: extremely small and simple, minimal context, simple and shallow tasks, optionally invokes Rosetta, assumes roles based on the input, short living, entire task, input/output/context is all defined as the subagent input. System prompt is minimal. Examples: project builder, package installer, test runner, log analyzer, etc. Idea is to make it work with verbose tools to execute small actions and to summarize result to prevent full subagents context from overflowing with noise.
  - Full: assumes the role from the input, defines Rosetta prep steps as a prerequisite, and relies on that context. Longer running vs lightweight. Deep tasks. Inputs/Outputs are defined. Context is discovered in addition to the input. System prompt is comprehensive. Subagents must not be specialized, subagent definition should be small, instead orchestrator will provide specialization, skills matter most.
- Instruct as a MUST that subagent MUST STOP, EXPLAIN THE REASONS, and LET PARENT agent or user to make decision if subagent cannot execute work as requested or according to original intent. It is much simpler this way.

</agent_and_subagent_authoring>

<template_authoring schema="docs/schemas/template.md">

- Reference by file name with extension only external artifacts, do not deep link
- Use `{{PLACEHOLDER}}` or `[PLACEHOLDER]` for contextual values and instructions
- Templates are filled by AI, not by user
- Simpler templates are better
- Add hooks for AI to add additional content
- Prefer XML with explicit tags (`<added>...</added>` instead of `<item type="added">...</item>`)
- XML > JSON > TOML/YAML

</template_authoring>

<generic_prompt_authoring schema="docs/schemas/generic.md">

- Scale formality of the prompt to the task complexity

</generic_prompt_authoring>
