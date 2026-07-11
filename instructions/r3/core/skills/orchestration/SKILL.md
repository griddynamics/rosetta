---
name: orchestration
description: "To delegate, prompt and manage subagents. MUST activate to spawn subagent with a quality prompt."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<orchestration>

<context>

Prerequisites: USE SKILL `hitl`, `load-project-context`

1. MUST use available subagents.
2. Manage subagents as senior team lead; own orchestration end-to-end. Subagents = your team: fresh context each run, CAN cheat, CANNOT see user; user CANNOT see orchestrator<->subagent channel → trust-but-verify, assume Murphy's law, poka-yoke the process. Adapt management best practices to the specific request. Tell WHAT + HOW-to-think; encourage thinking over mechanical work; never do subagents' tasks yourself — organize them. APPEND to instructions, never paraphrase/duplicate; ground via refs (files/instructions/phases/steps/skills) + MoSCoW; consult advisor/subagent on high-impact/ambiguous/architectural decisions.
3. Subagent output = input, not truth: judge/reconfirm/fill gaps; spawn focused follow-ups; merge into one grounded result — never blind-accept/discard.
4. request size != subagent task size · completion != goal achievement · quality + completeness = yours, the HOW = subagents' · intermediate artifacts (plans, subagent reports, TEMP) = means, not deliverables.
5. Proactively use available skills, tools, MCPs — incorporate in plan.

</context>

<request_sizing>

- ~1-2 files, one area → SMALL → hold it yourself on todo-task ledger; subagents for fresh-eye review.
- ~up to 10 files, one area → MEDIUM → keep todo-task ledger; build + manage a subagent team — no longer a worker. MUST APPLY SKILL FILE `assets/o-team-manager.md`.
- 10+ files or several areas → LARGE → session-level EXECUTION_CONTROLLER (plan ⊃ phases ⊃ steps ⊃ tasks) — execution control, not "planning". MUST APPLY SKILL FILE `assets/o-session-execution-controller.md`.

Complexity may shift one band; re-size as reality changes — discovery, surprises, clarification, target already done.

</request_sizing>

<process>

Dispatch:

1. Subagent prompt MUST use `<subagent_prompt_template>` — terse, factual, specific, DRY.
2. Ambiguous → clarify before dispatch.
3. Lightweight = small clear self-contained task (build, tests) — few skills, no project context. Full = specialized role / larger task — project context + role skills.

Routing:

4. Parallelize collision-free; make collision-safe: own fileset, git worktree, return-diff-only.
5. TEMP folder for coordination + large I/O.

Quality:

6. Drive all work through mini-loops: small `produce → check` cycles, orchestrator-gated — loop or accept. Check = fresh eyes: separate subagent, different model if possible; never self-review. Compose per piece: {implement · design · tests → run} → review (spec first, code quality second) · complete → validate · produce → refute (adversarial) · author → user annotates. Validate incrementally + at flow end — close flow with a validation task.
7. Adapt plan as things surface — reorder, re-analyze, loop. Keep steps explicit, actionable.
8. Same files/area → same subagent (reuses loaded context, no re-reads); independent logical tasks · separate areas → separate subagents.
9. Escalate: subagent → orchestrator → user, carrying full context.

Plan mode:

10. Execute all read/analyze/query work yourself now; the presented system plan file carries everything else — record `MUST USE SKILL <name>` entries (workflow, skills), incorporate plan + specs, define the implementation workflow — mini-loops, phases, steps, subagent + model per step — in MoSCoW, same directive language you were given.

</process>

<subagent_prompt_template output-reformat="expand into proper md sections">

Syntax: `<x>` fill · `{a|b}` pick one · `[..]` optional · `*` always include.

```
You are <role/specialization>. {Lightweight|Full} subagent.
Tasks (S.M.A.R.T.)*: <list>
Scope*: root <path> [git worktree] · DO <in-scope + expected outputs> · DO NOT <out-of-scope · read-only · untouchable — no improvising beyond scope>
[Constraints: <naming · patterns · case sensitivity>]
Checklist*: <ACs · NFRs · FRs · open-ended>
Skills*: MUST USE SKILL `subagent-directives`[, `load-project-context`, <required>] · [RECOMMEND USE SKILL <skill>]
Original request*: <verbatim + agreed clarifications — carry through every step>
Context*: <all it needs — refs · files · decisions; subagent starts with ONLY `bootstrap-alwayson.md` + this prompt>
Output specs*: message <content + format — unambiguous, so orchestrator can verify> · [files: <high volume → unique path per subagent + format>] · MUST return: results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, insights
Evidence specs*: <proofs you demand back — per claim: deep links + line ranges + brief quotes; facts != assumptions>
[<free-form: anything not covered>]
```

Orchestrator decides: include `load-project-context` only when needed — omit for self-contained tasks or exact-file prompts.

</subagent_prompt_template>

</orchestration>
