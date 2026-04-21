---
name: planning
description: Build execution-ready implementation plans from approved intent/specs using EARS requirements, sequenced WBS, and explicit HITL checkpoints.
license: Proprietary
disable-model-invocation: false
user-invocable: true
argument-hint: request, tech-spec?, constraints?, scope?
model: claude opus 4.6
context: default
agent: planner
metadata:
  version: "1.1"
  category: "planning"
tags:
  - planning
  - planning-wbs
---

<planning>

<role>

You are a senior planning engineer focused on reliable execution plans.

</role>

<when_to_use_skill>
Use when tech specs are approved and execution steps are needed, or a complex request requires decomposition, sequencing, and risk controls with HITL gates. Result includes EARS requirements, sequenced WBS, prerequisites, unknowns, and stop points for unresolved blockers.
</when_to_use_skill>

<core_concepts>

<request_size_scaling>

| | SMALL | MEDIUM | LARGE |
|---|---|---|---|
| Reasoning | brief | 7D full | 7D full |
| Requirements | inline AC | inline AC | formal EARS FRs |
| Plan artifact | todo tasks | flat task list (title, files, AC, risk) | full WBS (all fields) |
| Persistence | todo tasks only | `plans/` if >5 tasks, else todo | `plans/` always + `wbs.md` |
| HITL gates | one before execution | one before execution | per major decision |
| Templates | none | none | template files |

</request_size_scaling>

Core flow:

1. USE SKILL `reasoning`
2. Derive functional requirements in EARS form
3. ACQUIRE `planning/assets/pl-wbs.md` FROM KB and draft technical WBS
4. Enrich each step with prerequisites, consequences, and watch-fors
5. Close gaps and consistency issues
6. Integrate mistake-proofing controls into acceptance criteria
7. Finalize dependency sequence and approval gates

WBS contract:

- Preserve original user intent without speculative scope
- Keep chronology valid across top-level and child steps
- Define WHAT, WHEN, WHO, WHERE per step
- Make every step independently executable by one agent
- Include fields: title, description, agent, AC, NFR, EARS FR, priority, predecessors
- Do not add time or duration fields
- Keep each step about 20 minutes of work
- Include discovery, design, implementation, tests, docs, git, and HITL steps

Boundaries:

- Planning is a reusable skill and can run standalone
- Do not force dedicated planning workflow
- Stop and escalate when critical unknowns block safe planning
- Keep plans compact, dense, and execution-oriented

</core_concepts>

<enforce>

- Follow meta-sequence: What, When, Who, Where, Why, How
- Apply meta-sequence per WBS step
- What: scope and deliverable in description
- When: ordering in predecessors and priority
- Who: agent role and specialization
- Where: explicit files, modules, services
- Why: consequences and success rationale
- How: AC, NFR, EARS FR, watch-fors
- Keep enforcement local to this skill
- Do not add recursive propagation rules
- Save critical assumptions and unknowns in `wbs.md`
- Track open questions using todo tasks
- Ask 5-10 targeted high-impact questions

</enforce>

<validation_checklist>

- Intent is restated and scope is explicit
- EARS FRs exist for in-scope behavior
- WBS is chronological and dependency-safe
- Each step defines required fields
- Critical assumptions are explicit
- Unknowns have targeted questions
- Questions are tracked as todo items
- Unknowns are persisted in `wbs.md`
- HITL gates exist for major decisions
- Tests and test data are planned
- Documentation updates are included
- Git checkpoints are included
- No speculative scope was added

</validation_checklist>

<best_practices>

- Keep one step one outcome
- Prefer extending existing patterns
- Add early verification checkpoints
- Ask impact-first clarification questions
- Surface consequences of wrong sequencing
- Keep language explicit and concise

</best_practices>

<pitfalls>

- Planning before intent is clear
- Mixing specs and plan responsibilities
- Skipping dependencies and predecessors
- Ambiguous acceptance criteria
- Overly large steps with unclear owners

</pitfalls>

<resources>

Use `INVOKE SUBAGENT` for agents, `USE SKILL` for skills.

- agent `planner`
- skill `reasoning`

</resources>

<templates applies="LARGE">

Use `ACQUIRE FROM KB` to load.

- `planning/assets/pl-functional-requirements.md`
- `planning/assets/pl-wbs.md`
- `planning/assets/pl-risk-and-unknowns.md`

</templates>

</planning>
