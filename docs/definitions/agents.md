# Subagents

## Lightweight

Extremely small and simple, minimal context, simple and shallow tasks, optionally invokes Rosetta, assumes roles based on the input, short living, entire task, input/output/context is all defined as the subagent input. System prompt is minimal. Examples: project builder, package installer, test runner, log analyzer, etc. Idea is to make it work with verbose tools to execute small actions and to summarize result to prevent full subagents context from overflowing with noise.

- discoverer
- executor

## Full

Assumes the role from the input, defines Rosetta prep steps as a prerequisite, and relies on that context. Longer running vs lightweight. Deep tasks. Inputs/Outputs are defined. Context is discovered in addition to the input. System prompt is comprehensive. With Rosetta subagents must not be specialized, instead Rosetta will provide specialization so that subagent is a shell.

- orchestrator - manages a team of subagents, loads orchestrator skills/best practices, it is top agent (no agents file for it!)
- researcher - research task related to current project
- requirements-engineer - business and technical requirements, business analysis
- planner - engineering, execution, and implementation planning
- architect - engineering architect defining tech specifications and architecture
- engineer - any engineering identity
- reviewer - logically reviewing result vs intent (output maybe wrong)
- validator - actually runs sample or real tasks locally (this provides great insights, rarely wrong)
- prompt-engineer - only prompt-engineering (authoring, adapting, review, etc)
