# Subagent-Delegation Prompt Template

<subagent_dispatch_rules>

1. Subagents = your team: fresh context per run, can't spawn their own, CAN cheat, CANNOT see the user, user CANNOT see your subagent channel. So trust-but-verify, assume Murphy's law, poka-yoke the process.
2. Orchestrator executes the plan by dispatching a fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review. Reviewer = fresh eyes, different model when possible; never integrate unverified output. Review = static inspection ≠ Validate = run on real.
3. Tell WHAT + HOW-to-think; reward reasoning, not mechanical work. APPEND to instructions, never paraphrase/duplicate; ground via refs + MoSCoW.
4. Quality-gate before dispatch: ambiguous → clarify first; never dispatch unclear instructions.
5. Independent → parallel; dependent → sequential. Collision-safe writes for parallel work; TEMP folder for coordination + large I/O.
6. Enforce focus: off-plan → the subagent STOPS and reports back, never continues.
7. You own delegation quality end-to-end. Spawn a fresh-eyes reviewer (different model) before integrating; never integrate unverified output.
8. Escalate: subagent → you → user; always explicit, full context.
9. Demand subagents surface their assumptions for approval before acting — no silent assuming.

</subagent_dispatch_rules>

<subagent_delegation_template_usage>

Template in `<subagent_delegation_prompt_template>` = constructor. Orchestrator assembles one self-contained prompt per delegated task. Subagent receives ONLY this prompt — everything it doesn't get, it will hallucinate.

Assembly decisions:
1. What (`### What should be done`) — carries objective only; bounded → SMART tasks; phased/progressive → plan ref + phase id (upsert first)
2. Weight — how much can go wrong if subagent guesses? Self-evident → lightweight (few skills, minimal context); surface area/integration → full (project context, constraints, todo tasks)
3. Context — what does subagent need to not guess? USE SKILL `load-project-context` by default · direct file refs when you know them · patterns when must match style
4. Dispatch self-test — fresh agent with only bootstrap + this prompt knows: what to do, what NOT to do, "done" condition, when to stop? Gap → not ready

Examples:
- "Run tests, report failures" → SMART + lightweight. Task IS the spec.
- "Review PR for security gaps" → SMART + lightweight + review skill. Bounded, focused.
- "Implement validation layer per spec" → SMART + full. Needs project context, coding patterns.
- "Build payment module from arch spec" → plan ref + full. Multi-step, own phases, progressive.

</subagent_delegation_template_usage>

<subagent_delegation_prompt_template compact="NEVER" summarize="AS-IS">

```
You are [role]. [Lightweight | Full] subagent.

## What should be done
[## Tasks (SMART)
- [task] | Plan: [abs path to plan.json]. Phase: [id].]

## How should be done
[USE built-in todo tasks tool. | USE OPERATION_MANAGER. Split steps via todo tasks.]

## Prerequisites 
FULLY READ `bootstrap-alwayson.md` 

## Scope
Root: [path] [git worktree?]
DO: [in scope + explicit expected outputs]
DO NOT: [out of scope / read-only / untouchable — no improvising beyond scope]

## Constraints
- [e.g. case sensitivity, naming, patterns to follow]

## Acceptance
- [done when: measurable condition]

## Failure → MUST STOP + explain + report
- [cannot execute as specified | off-plan | would exceed scope | other condition]

## Skills
MUST USE SKILL `subagent-contract`, [operation-manager]
RECOMMEND USE SKILL [recommended skill].

## Original user request
[verbatim — carry through every step]

## Context
[USE SKILL `load-project-context` — safe default; omit only for self-contained tasks]
[+ direct file refs · patterns — give all it needs]

## Output
Message: [define content + format — consistent, unambiguous, complete, so you can verify it]
Files: [optional; high volume → unique path per subagent + format/template]
MUST return: results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, insights.

## Evidence
[claims/findings/recommendations → proofs: deep links w/ line ranges + brief quotes; facts ≠ assumptions]

[free-form: anything else not covered]
```

</subagent_delegation_prompt_template>