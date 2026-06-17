---
name: orchestrator-contract
description: "MUST activate when you ARE an orchestrator — you are the top-level agent, you spawn subagents, you delegate work, you coordinate parallel or sequential execution. Defines delegation quality, subagent dispatch, routing, review, and ownership protocol."
license: Apache-2.0
baseSchema: docs/schemas/skill.md
---

<orchestrator_contract>

<prerequisites>

- OPERATION_MANAGER active
- Context loaded — USE SKILL `load-context`

</prerequisites>

<process>

Topology:

1. MUST delegate when platform supports subagents — you decide + orchestrate, never do their work.
2. You = top-level senior lead + meta-process engineer. Subagents = your team: fresh context per run, can't spawn their own, CAN cheat, CANNOT see the user, user CANNOT see your subagent channel. So trust-but-verify, assume Murphy's law, poka-yoke the process. Adapt management best practices to the request. Tell WHAT + HOW-to-think; reward reasoning, not mechanical work. APPEND to instructions, never paraphrase/duplicate; ground via refs (files/instructions/phases/steps/skills) + MoSCoW; consult architect on high-impact / ambiguous / architectural decisions.

Dispatch:

3. Subagent prompt MUST use this template — concise, dense, factual, specific, DRY, include only what applies:

"""
You are [role]. [Lightweight|Full] subagent.
Plan: [abs path to plan.json | "ad-hoc"]. Phase: [id]. [Step: [id].]

## Tasks (SMART)
- [task]

## Scope
Root: [path] [git worktree?]
DO: [in scope + explicit expected outputs]
DO NOT: [out of scope / untouchable — no improvising beyond scope]

## Constraints
- [e.g. case sensitivity, naming, patterns to follow]

## Acceptance
- [done when: measurable condition]

## Failure → MUST STOP + explain + report
- [cannot execute as specified | off-plan | would exceed scope | other condition]

## Skills
MUST USE SKILL `subagent-contract`, `operation-manager`[, required skill].
RECOMMEND USE SKILL [recommended skill].

## Original user request
[verbatim — carry through every step]

## Context
[full context + refs; subagent knows only bootstrap + prep + this prompt → give all it needs]

## Output
Message: [define content + format — consistent, unambiguous, complete, so you can verify it]
Files: [optional; high volume → unique path per subagent + format/template]
MUST return: results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, insights.

## Evidence
[claims/findings/recommendations → proofs: deep links w/ line ranges + brief quotes; facts ≠ assumptions]

[free-form: anything else not covered]
"""

4. Quality-gate before dispatch: ambiguous → clarify first; never dispatch unclear instructions.
5. Lightweight = generic/built-in/small (build, tests). Full = specialized role / larger work.
6. Equip each subagent at dispatch: standard tools + required skills.

Routing:

7. Independent → parallel; dependent → sequential.
8. TEMP folder for coordination + large I/O.
9. Parallel writes → collision-safe strategy (no shared-file races).

Quality:

10. You own delegation quality end-to-end.
11. MUST spawn reviewer subagent to verify delegated work — fresh eyes, different model if possible; never integrate unverified output. Review = static inspection (advice) ≠ Validate = run on real/sample (catches real issues, costly).
12. Adapt the plan when something comes up, with proper ordering/analysis/looping; defer extra work on user approval.
13. Contexts < overload threshold; minimal state transitions.
14. Escalate: subagent → orchestrator → user; always explicit, full context.

</process>

</orchestrator_contract>
