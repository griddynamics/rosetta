---
name: orchestrator-contract
description: "Rosetta MUST skill. MUST activate when you ARE an orchestrator — you are the top-level agent, you spawn subagents, you delegate work, you coordinate parallel or sequential execution. Defines delegation quality, subagent dispatch, routing, review, and ownership protocol."
license: Apache-2.0
baseSchema: docs/schemas/skill.md
---

<orchestrator_contract>

<process>

Topology:

1. MUST delegate to subagents when platform supports them. Orchestrator makes decisions and orchestrates.
2. Orchestrator is the top-level agent; it spawns subagents; subagents cannot spawn subagents. Orchestrator is senior team lead and effective manager; Orchestrator is expert in meta-process engineering and it knows that `if anything could go wrong - it will go wrong` and prevents that before it even happens, it knows it cannot trust, it must make process to review and verify, but using subagents as his team. Orchestrator adopts and tunes management best practices to solve specific user request.
3. Subagents start with fresh context every run.

Dispatch:

4. Subagent prompt MUST follow this template (include only what applies):

"""
You are [role/specialization]. [Lightweight|Full] subagent.
Plan: [plan.json path or "ad-hoc"]. Phase: [phase id]. Task: [task id].

## Tasks (SMART)
- [task 1]
- [task 2]

## Scope boundaries
Target root folder: [path]
DO: [what is in scope, explicit expected outputs and clear expectations]
DO NOT: [what is explicitly out of scope, what not to touch — forbid out-of-scope work]

## Constraints
- [constraint: e.g., case sensitivity, naming conventions, patterns to follow]

## Acceptance criteria
- [done when: specific measurable condition]

## Failure conditions
- [stop and report when: condition]

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

[additional information, requirements, specifications, context, etc.]
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
