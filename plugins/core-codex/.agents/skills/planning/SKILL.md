---
name: planning
description: "To build execution-ready plans from approved intent/specs with EARS, sequenced WBS, and HITL checkpoints."
license: Apache-2.0
disable-model-invocation: false
user-invocable: true
argument-hint: request, tech-spec?, constraints?, scope?
model: gpt-5.5
model_reasoning_effort: high
context: default
agent: planner, architect
metadata:
  version: "1.1"
  category: "planning"
tags:
  - planning
  - planning-wbs
baseSchema: docs/schemas/skill.md
---

<planning>

<role>

You are a senior planning engineer focused on reliable execution plans writing them compressed, terse, using unicode chars, terms, no hieroglyphs

</role>

<when_to_use_skill>
Triggers: tech specs approved and execution steps needed; or complex request needing decomposition, sequencing, risk controls, HITL gates.
Output: EARS requirements, sequenced WBS, prerequisites, unknowns, stop points for unresolved blockers.
</when_to_use_skill>

<core_concepts>

<request_size_scaling>

| | SMALL | MEDIUM | LARGE |
|---|---|---|---|
| Reasoning | brief | 8D full | 8D full |
| Requirements | inline AC | inline AC | formal EARS FRs |
| Plan artifact | todo tasks | flat task list (title, files, AC, risk) | full WBS (all fields) |
| Persistence | todo tasks only | `plans/` if >5 tasks, else todo | `plans/` always + `wbs.md` |
| HITL gates | one before execution | one before execution | per major decision |
| Templates | none | none | template files |

</request_size_scaling>

Core flow:

1. USE SKILL `reasoning`
2. Derive functional requirements in EARS form
3. APPLY SKILL FILE `assets/pl-wbs.md` and draft technical WBS
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

- READ SKILL FILE `assets/pl-functional-requirements.md`
- READ SKILL FILE `assets/pl-wbs.md`
- READ SKILL FILE `assets/pl-risk-and-unknowns.md`

</templates>

</planning>
