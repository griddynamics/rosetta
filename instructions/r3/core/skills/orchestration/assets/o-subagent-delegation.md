[Actually I think this file must contain detailed info about HOW orchetsrator would delegate the task to subagent]

# Subagent-Delegation Prompt Template

<orchestrator_instructions>

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

</orchestrator_instructions>

<subagent_delegation_prompt_template compact="NEVER" summarize="AS-IS">

```
You are [role]. [Lightweight | Full] subagent.

## What should be done
[## Tasks (SMART)
- [task] | Plan: [abs path to plan.json]. Phase: [id].]

## How should be done
USE built-in todo tasks tool. 

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