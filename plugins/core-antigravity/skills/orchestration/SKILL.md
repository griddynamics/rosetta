---
name: orchestration
description: "To delegate, prompt and manage subagents. MUST activate to spawn subagent with a quality prompt, unless trivial."
---

<orchestration>

<context>

Prerequisites: USE SKILL `hitl`, `load-project-context`

1. MUST use available subagents.
2. Manage subagents as senior team lead; own orchestration end-to-end. Subagents = your team: fresh context each run, CAN cheat, CANNOT see user; user CANNOT see orchestrator<->subagent channel → trust-but-verify, assume Murphy's law, poka-yoke the process. Adapt management best practices to the specific request. Tell WHAT + HOW-to-think; encourage thinking over mechanical work; never do subagents' tasks yourself — organize them. APPEND to instructions, never paraphrase/duplicate; ground via refs (files/instructions/phases/steps/skills) + MoSCoW; consult advisor/subagent on high-impact/ambiguous/architectural decisions.
3. Subagent output = input, not truth: judge/reconfirm/fill gaps; spawn focused follow-ups; merge into one grounded result — never blind-accept/discard.
4. request size != subagent task size · completion != goal achievement · quality + completeness = yours, the HOW = subagents' · intermediate artifacts (plans, subagent reports, TEMP) = means, not deliverables.
5. Proactively use available skills, tools, MCPs — incorporate in plan.
6. Integrate checklists: generate overall end-to-end checklist (like DoD), actualize in planning/discovery, make final reviewer & validator to ultimately honestly check it.
7. If supported, identify and use long-running (as dedicated area engineer, for follow ups, maintain context) vs one-shot subagents (throw-away fresh reviews).

</context>

<request_sizing>

- <200 LOC expected and =1 area → SMALL → hold it yourself on todo-task ledger; subagents for fresh-eye review.
- <2000 LOC expected and ≤3 areas → MEDIUM → keep todo-task ledger; build + manage a subagent team — no longer a worker.
- >2000 LOC expected or >3 areas → LARGE → orchestrator context will be overloaded, so it must delegate everything to subagents, todo tasks must be at a higher level and help orchestrator itself. MUST APPLY SKILL FILE `assets/o-team-manager.md`. Report how you will organize and orchestrate that work.

Roughly 5 files to change/write likely means small; 20 files - medium; 40+ files - large; 

If requested directly `use session-level EXECUTION_CONTROLLER` then (plan ⊃ phases ⊃ steps ⊃ tasks) and APPLY SKILL FILE `assets/o-session-execution-controller.md`.

Complexity may shift one band; re-size as reality changes — discovery, surprises, clarification, target already done.

Request sizing point is to keep all agents/subagents context under 250K tokens (reads and tool outputs here are major contributors). Once above 200K the price is doubled.

Optimize for efficient execution reasonably especially if result or impact or effect will be the same. It is not about skipping, it is about organizing and adapting.

</request_sizing>

<model_and_efforts_tiers>

Above strategist: Fable, GPT Astra (you do not use! very large knowledge base)
Strategist: Opus 5.5, GPT 6.1 Sol, Gemini 4 Argon (large knowledge base)
Tactician: Sonnet 5.5, GPT 5.6 Terra, Grok 4.7, Gemini 3.8 Flash (medium knowledge)
Implementer: Haiku 5.5, GPT 6 Luna, Gemini 3.8 Flash, Composer 2.5 (small knowledge)

Reasoning Efforts:

1. low - answers almost directly of the knowledge and context
2. medium - allows to think about the given task and understand if unclear
3. high - allows to make thoughtful decisions
4. xhigh - allows to think deeply (gemini models)

Exceptions:
1. gpt-6-luna-xhigh becomes tactician, while `high` and below is implementer
2. haiku-5.5-low and gpt-6-luna-low can only summarize, search and similar easy activities 
3. gemini-3.8-flash-high tactician, while medium - implementer
4. Model generations are smarter vs previous (with one reasoning step higher): gpt-6-luna-xhigh = gpt-5.6-terra-high = gpt-5.5-medium

</model_and_efforts_tiers>

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
10. Keep subagent and follow up with "Honestly what was done and what could be done better?"

Plan mode:

11. Execute all read/analyze/query work yourself now; the presented system plan file carries everything else — record `MUST USE SKILL <name>` entries (workflow, skills), incorporate plan + specs, define the implementation workflow — mini-loops, phases, steps, subagent + model per step — in MoSCoW, same directive language you were given.

</process>

<subagent_prompt_template output-reformat="expand into proper md sections">

Syntax: `<x>` fill · `{a|b}` pick one · `[..]` optional · `*` always include.

```
You are <role/specialization>. {Lightweight|Full} subagent.
Tasks*: <list>
Scope*: root <path> [git worktree] · DO <in-scope + expected outputs> · DO NOT <out-of-scope · read-only · untouchable — no improvising beyond scope>
[Constraints: <naming · patterns · case sensitivity>]
References: <list of <action:read/write/search> <resource>>
Checklist*: <ACs · NFRs · FRs · open-ended · Severity-based · Unlimited by item count · Domain Specific · Tasks Specific>
Skills*: MUST USE SKILL `subagent-directives`[, `load-project-context`, <required>] · [RECOMMEND USE SKILL <skill>]
Original request*: <verbatim + agreed clarifications — carry through every step>
Context*: <all it needs — refs · files · decisions; subagent starts with ONLY `bootstrap-alwayson.md` + this prompt>
Output specs*: message <content + format — unambiguous, so orchestrator can verify> · [files: <high volume → unique path per subagent + format>] · MUST return: results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, insights
Evidence specs*: <proofs you demand back — per claim: deep links + line ranges + brief quotes; facts != assumptions; add what honestly was not done entirely or partially>
[Process Requirements: <require processing one-by-one, small-set-by-small-set, group-by-group, ordering, do not reading ALL source files at once, etc.>]
[<free-form: anything not covered>]
```

Orchestrator decides: include `load-project-context` only when needed — omit for self-contained tasks or exact-file prompts.

</subagent_prompt_template>

</orchestration>
