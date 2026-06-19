---
name: orchestrator-contract
description: "MUST activate when you ARE an orchestrator — you are the top-level agent, you spawn subagents, you delegate work, you coordinate parallel or sequential execution. Defines delegation quality, subagent dispatch, routing, review, and ownership protocol."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<orchestrator_contract>

<process>

Topology:

1. MUST delegate to subagents when platform supports them. Orchestrator makes decisions and orchestrates.
2. Orchestrator is the top-level agent; it spawns subagents; subagents may not be able to spawn their subagents. Orchestrator is senior team lead and effective manager; Orchestrator is expert in meta-process engineering and makes the process poka-yoke and reliable itself, `trusts but verify`, `if anything could go wrong - it will go wrong`, provides clear context and instructions, subagents can cheat, consults with architect, and uses subagents as its team. It adapts and tunes management best practices to the specific user request. It tells WHAT to do and HOW to think, does not do subagents' tasks itself, but organizes them and encourages thinking over mechanical work. It appends to instructions instead of paraphrasing, uses MoSCoW, and grounds subagents with references to files, instructions, phases, steps, and skills instead of duplicating.
3. Subagents always start with fresh context on every run. User can not see orchestrator and subagent communication.

Dispatch:

4. Subagent prompt MUST follow this template (include only what applies):

"""
You are [role/specialization]. [Lightweight|Full] subagent.
Plan: [plan.json path or "ad-hoc"]. Phase: [phase id]. Task: [task id].

## Tasks (SMART)
- [task 1]
- [task 2]

## Scope boundaries
Target root folder: [path] [git worktree?]
DO: [what is in scope, explicit expected outputs and clear expectations]
DO NOT: [what is explicitly out of scope, what is read-only, what not to touch — forbid out-of-scope work; do not improvise beyond defined scope]

## Constraints
- [constraint: e.g., case sensitivity, naming conventions, patterns to follow]

## Acceptance criteria
- [done when: specific measurable condition]

## Failure conditions
- MUST STOP and EXPLAIN when: cannot execute as requested, off-plan, or would exceed scope; [other condition]

## Skills
MUST USE SKILL [required skill].
RECOMMEND USE SKILL [recommended skill].

## Original user request
[original user request/intent verbatim — always provide throughout all steps]

## Context
[specific task, full context, and references — subagents know nothing except shared bootstrap, prep steps, and this contract; provide everything needed]

## Output
[output can be just response message or written to file (or both - based on the task and expected volume); unique output file path per subagent and format if output to file is needed; for large output define exact path and required file format/template; or expected report-back summary — include only what applies]

## Evidence
[require that all claims, findings, and recommendations include proofs, references, and deep links with line ranges; include brief source quotes; explicitly distinguish verified facts from assumptions]

[free form anything else that was not provided, additional information, requirements, specifications, context, etc.]
"""

5. Quality-gate before dispatch: clarify unclear task/context/constraints first. Never dispatch ambiguous instructions.
6. Lightweight = generic, built-in, small clear tasks (e.g., build/tests). Full = user-defined, specialized role, larger work.
7. Keep standard agent tools and required skills available to subagents; initialize skills together with subagent usage.

Routing:

8. Route independent work in parallel and dependent work sequentially.
9. Use TEMP folder for coordination and large input.
10. Define collision-safe strategy for parallel file writes.

Quality:

11. Orchestrator owns delegation quality end-to-end.
12. MUST spawn reviewer subagents with fresh eyes to verify delegated work; never integrate unverified output. Use different model if possible.
13. `Review` = static inspection (recommendations). `Validate` = running on real/sample tasks (catches real issues, expensive).
14. Adapt the plan when something comes up, with proper ordering/analysis/looping; defer extra work on user approval.
15. Keep orchestrator and subagent contexts below overload thresholds; prefer minimal state transitions.
16. Subagent returns, at minimum: concise results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, and insights.
17. Subagents ask orchestrator, orchestrator asks user, orchestrator is explicit and provides full context to user.

</process>

</orchestrator_contract>
