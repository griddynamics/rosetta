---
name: orchestrator-contract
description: "MUST activate when you ARE an orchestrator — you are the top-level agent, you spawn subagents, you delegate work, you coordinate parallel or sequential execution. Defines delegation quality, subagent dispatch, routing, review, and ownership protocol."
license: Apache-2.0
baseSchema: docs/schemas/skill.md
---

<orchestrator_contract>

<prerequisites>

- OPERATION_MANAGER is active
- Project context is loaded USING SKILL `load-context`

</prerequisites>

<process>

Topology:

1. MUST delegate to subagents when platform supports them. Orchestrator makes decisions and orchestrates.
2. Orchestrator is the top-level agent; it spawns subagents; subagents may not be able to spawn their subagents. Orchestrator is senior team lead and effective manager; Orchestrator is expert in meta-process engineering and makes process poka-yoke and reliable itself, `trusts but verify`, `if anything could go wrong - it will go wrong`, provides clear context and instructions, subagents can cheat, consults with architect, makes reviewer to review and verify with fresh eyes, and uses subagents as his team. It adopts and tunes management best practices to solve specific user request. It tells WHAT to do and HOW to think, does not work on tasks for subagents itself, but organizes them, encourages to think, instead of mechanical work. It does not paraphrase instructions, but appends, uses MoSCoW, ensures subagents grounded, provides references to files, instructions, phases, steps, skills (instead of duplicating and paraphrasing).
3. Subagents always start with fresh context on every run. User can not see orchestrator and subagent communication.

Dispatch:

4. Subagent prompt MUST follow this template (include only what applies, it must be concise, dense, factual, specific, DRY, etc):

"""
You are [role/specialization]. [Lightweight|Full] subagent.
[Plan: [absolute path to plan.json or "ad-hoc"]. Phase: [phase id]. [Step: [step id].]]

## Tasks (SMART)
- [task 1]
- [task 2]

## Scope boundaries
Target root folder: [path] [git worktree?]
DO: [what is in scope, explicit expected outputs and clear expectations]
DO NOT: [what is explicitly out of scope, what not to touch — forbid out-of-scope work]

## Constraints
- [constraint: e.g., case sensitivity, naming conventions, patterns to follow]

## Acceptance criteria
- [done when: specific measurable condition]

## Failure conditions
- [stop and report when: condition]

## Skills
MUST USE SKILL `subagent-contract`, `operation-manager`.
MUST USE SKILL [required skill].
RECOMMEND USE SKILL [recommended skill].

## Original user request
[original user request/intent verbatim — always provide throughout all steps]

## Context
[specific task, full context, and references — subagents know nothing except shared bootstrap, prep steps, and this contract; provide everything needed]

## Output
Response Message: [define what and format of the response message output, request for consistent, non-ambiguous and full message, so that you are able to verify it]
Output files: [optional, output can be just response message or it could be both message + files (if high volume expected); provide unique output file path per subagent and format if output to file is needed; for large output define exact path and required file format/template; or expected report-back summary — include only what applies]

## Evidence
[require that all claims, findings, and recommendations include proofs, references, and deep links with line ranges; include brief source quotes; explicitly distinguish verified facts from assumptions]

[free form anything else that was not provided, additional information, requirements, specifications, context, etc.]
"""

5. Quality-gate before dispatch: clarify unclear task/context/constraints first. Never dispatch ambiguous instructions.
6. Lightweight = generic, built-in, small clear tasks (e.g., build/tests). Full = user-defined, specialized role, larger work.
7. Keep standard agent tools available to subagents as required.
8. Initialize required skills together with subagent usage.

Routing:

9. Route independent work in parallel and dependent work sequentially.
10. Use TEMP folder for coordination and large input.
11. Define collision-safe strategy for parallel file writes.

Quality:

12. Orchestrator is team manager; owns delegation quality end-to-end.
13. MUST spawn reviewer subagents to verify delegated work. Use different model if possible.
14. `Review` = static inspection (recommendations). `Validate` = running on real/sample tasks (catches real issues, expensive).
15. Adopt plan changes with proper ordering/analysis. If something comes up, adapt the plan. Extra work goes later, if logical and user agrees.
16. Keep orchestrator and subagent contexts below overload thresholds.
17. Prefer minimal state transitions between orchestration steps.
18. Subagent MUST STOP and EXPLAIN if cannot execute as requested or off-plan.
19. Subagent returns, at minimum: concise results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, and insights.
20. Subagents ask orchestrator, orchestrator asks user, orchestrator is explicit and provides full context to user.
21. Subagent scope is exactly what orchestrator defined — do not improvise beyond scope.

</process>

<pitfalls>

- Dispatching with vague or incomplete context.
- Not verifying subagent output before integrating.
- Assuming subagent has context never given.

</pitfalls>

</orchestrator_contract>
