---
name: work-breakdown
description: Mode method for breaking approved work into a human work breakdown structure with EARS requirements.
---

<work_breakdown>

<contract>

Input: approved, readiness-cleared work. Output: FEATURE PLAN folder artifacts only — EARS functional requirements, a chronological WBS, an assumption and unknown register. Never writes to the issue tracker.

</contract>

<request_size_scaling>

| | SMALL | MEDIUM | LARGE |
|---|---|---|---|
| Reasoning | brief | 8D full | 8D full |
| Requirements | inline AC | inline AC | formal EARS FRs |
| Plan artifact | todo tasks | flat task list (title, files, AC, risk) | full WBS (all fields) |
| Persistence | todo tasks only | FEATURE PLAN folder if >5 tasks, else todo | FEATURE PLAN folder always + `wbs.md` |
| HITL gates | one before execution | one before execution | per major decision |
| Templates | none | none | READ SKILL FILE `assets/work-breakdown-templates.md` |

</request_size_scaling>

<process>

1. USE SKILL `reasoning`
2. Derive functional requirements in EARS form
3. Draft the technical WBS per `<wbs_contract>`
4. Enrich each step with prerequisites, consequences, and watch-fors
5. Close gaps and consistency issues
6. Integrate mistake-proofing controls into acceptance criteria
7. Finalize dependency sequence and approval gates

</process>

<wbs_contract>

- Preserve original user intent without speculative scope
- Keep chronology valid across top-level and child steps
- Define WHAT, WHEN, WHO, WHERE per step
- Make every step independently executable by one agent
- Include fields: title, description, agent, AC, NFR, EARS FR, priority, predecessors
- Do not add time or duration fields
- Keep each step about 20 minutes of work
- Include discovery, design, implementation, tests, docs, git, and HITL steps
- Persist critical assumptions and unknowns in `wbs.md`
- Stop and escalate when critical unknowns block safe breakdown

</wbs_contract>

<enforce>

- Follow meta-sequence: What, When, Who, Where, Why, How
- Apply meta-sequence per WBS step
- What: scope and deliverable in description
- When: ordering in predecessors and priority
- Who: agent role and specialization
- Where: explicit files, modules, services
- Why: consequences and success rationale
- How: AC, NFR, EARS FR, watch-fors
- Keep enforcement local to this mode
- Do not add recursive propagation rules
- Track open questions using todo tasks
- Ask 5-10 targeted high-impact questions

</enforce>

<template>

```md
# WBS: [Feature Name]

## Original Intent

- Requested outcome: [single sentence]
- In-scope: [explicit list]
- Out-of-scope: [explicit list]

## Functional Requirements (EARS)

- [FR-AREA-0001] [WHEN/IF/WHILE/WHERE ... THEN the system SHALL ...]

## Assumptions and Unknowns

- [critical/high assumption or unknown]

## 1. [Top-Level Step Name]

### 1.1 [Step Name]

**Priority**: [P0|P1|P2|P3]
**Predecessors**: [None|1.1, 1.2]
**Agent**: [role with specialization]
**Where**: [files/folders/services/modules]
**Description**: [what will be done]
**AC**:
- [measurable acceptance criterion]
**NFR**:
- [performance/security/reliability constraint]
**EARS FR**:
- [FR-AREA-0001]
**Prerequisites**:
- [required precondition]
**Consequences**:
- [if step is wrong or skipped]
**Watch For**:
- [common failure or risk]
**HITL**:
- [required approval or "None"]

## [Testing]

### [Scenario Design]
- [scenario set]

### [Test Data]
- [input datasets and edge cases]

### [Automation / Local Validation]
- [test execution strategy]

## [Documentation and Git]

### [Docs Update]
- [files to update]

### [Git Checkpoints]
- [branch]
- [commit]
- [push]
- [PR]
```

</template>

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

- Breaking down before intent is clear
- Mixing specs and breakdown responsibilities
- Skipping dependencies and predecessors
- Ambiguous acceptance criteria
- Overly large steps with unclear owners

</pitfalls>

<resources>

- agent `planner`
- skill `reasoning`

</resources>

<templates applies="LARGE">

- READ SKILL FILE `assets/work-breakdown-templates.md`

</templates>

</work_breakdown>
