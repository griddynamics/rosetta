---
name: work-breakdown
description: Mode method for breaking approved work into a human work breakdown structure with EARS requirements.
---

<work_breakdown>

<contract>

Input: readiness-cleared work, with its confirmed answers, its `BA-nn` / `TA-nn` findings, and the verbatim contracts validation settled. Missing that input -> establish readiness first; do not break down an unvalidated story.

Output: FEATURE PLAN folder artifacts only — `wbs.md`, functional requirements, an assumption and unknown register. Never writes to the issue tracker.

</contract>

<request_size_scaling>

The WBS is always required. Size scales its depth, never its existence.

| | SMALL | MEDIUM | LARGE |
|---|---|---|---|
| Reasoning | brief | 8D full | 8D full |
| Requirements | inline AC | inline AC | formal EARS FRs |
| WBS fields | core | core + risk | all |
| Persistence | FEATURE PLAN folder `wbs.md` | same | same + register |
| HITL gates | one before execution | one before execution | per major decision |
| Templates | none | none | READ SKILL FILE `assets/work-breakdown-templates.md` |

</request_size_scaling>

<process>

1. USE SKILL `reasoning`
2. Derive functional requirements: inline acceptance criteria at SMALL and MEDIUM, formal EARS FRs at LARGE
3. Draft the technical WBS per `<wbs_contract>`
4. Enrich each step with prerequisites, consequences, and watch-fors
5. Close gaps and consistency issues
6. Integrate mistake-proofing controls into acceptance criteria
7. Finalize dependency sequence and approval gates

</process>

<wbs_contract>

- Preserve original user intent without speculative scope
- Keep chronology valid across top-level and child steps
- Define WHAT, WHEN, SHAPE, WHERE per step
- Never name a person or an agent. Name the skills the step needs
- Make every step independently completable as one unit
- Include fields: title, description, shape, skills, estimate, AC, NFR, requirement, priority, predecessors, findings closed
- Declare each step's shape. The people doing this work use AI coding agents, so surface and difficulty scale differently:
  - **wide and shallow** — large surface, low judgement per touch. Mechanical, repetitive, AI-amplified. Sized by surface; state the surface
  - **deep and narrow** — small surface, high judgement. One hard decision, one place. Sized by the thinking, not the typing
  - A step that is both wide and deep is not a step. Split it by shape first
- Estimate every step. The team estimates, so estimates belong in the WBS
- Target 2-4 hours of team effort per step, AI assistance included. Above 4 -> split
- Below 2 hours and disjoint from every neighbour -> it stays its own step. Never merge unrelated work to reach the band
- Trace each step to the findings and confirmed answers it consumes
- Include discovery, design, implementation, tests, docs, review, git, and HITL steps
- Persist critical assumptions and unknowns in `wbs.md`
- Stop and escalate when critical unknowns block safe breakdown

</wbs_contract>

<enforce>

- Apply meta-sequence per WBS step
- Follow meta-sequence: What, When, Shape, Where, Why, How
- What: scope and deliverable in description
- When: ordering in predecessors and priority
- Shape: wide and shallow, or deep and narrow, plus the skills needed — never a person, never an agent
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

## Functional Requirements

- [FR-AREA-0001] [EARS at LARGE: WHEN/IF/WHILE/WHERE ... THEN the system SHALL ...; acceptance criteria otherwise]

## Assumptions and Unknowns

- [critical/high assumption or unknown]

## 1. [Top-Level Step Name]

### 1.1 [Step Name]

**Priority**: [P0|P1|P2|P3]
**Predecessors**: [None|1.1, 1.2]
**Shape**: [wide-shallow, with the surface | deep-narrow, with the decision]
**Skills**: [capabilities needed]
**Estimate**: [2-4h of team effort, AI assistance included; or the actual figure with why it stands alone]
**Where**: [files/folders/services/modules]
**Description**: [what will be done]
**AC**:
- [measurable acceptance criterion]
**NFR**:
- [performance/security/reliability constraint]
**Requirement**:
- [FR-AREA-0001, or the acceptance criterion it satisfies]
**Closes**:
- [BA-nn, TA-nn — findings this step resolves]
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

### [Review and Git]
- [branch]
- [commit]
- [code review]
- [push]
- [PR]
```

</template>

<validation_checklist>

- `wbs.md` exists and holds the assumptions and unknowns, not the conversation
- No step exceeds 4 hours; every step under 2 states why it stands alone
- No two disjoint items were merged to reach the estimate band
- Every step declares a shape and exactly one outcome; none is both wide and deep
- Every step traces to a requirement, and to the findings it closes
- Predecessor graph is acyclic, and no step is unreachable
- Each acceptance criterion is checkable by someone other than its author
- Testing, documentation, and review exist as steps, not as intentions
- Nothing in the WBS is absent from the source intent

</validation_checklist>

<best_practices>

- Keep one step one outcome, one shape
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
- Steps that are both wide and deep, so nobody can size them
- Merging unrelated small items to hit the estimate band
- Breaking down a story that never passed readiness

</pitfalls>

<resources>

- agent `planner`
- skill `reasoning`

</resources>

<templates applies="LARGE">

- READ SKILL FILE `assets/work-breakdown-templates.md`

</templates>

</work_breakdown>
