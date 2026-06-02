---
name: requirements-synthesis
description: Synthesize data from multiple sources (Jira, Confluence, user answers, analysis) into a structured requirements document with user stories, functional/non-functional requirements, constraints, and traceability.
tags: ["requirements", "synthesis", "analysis"]
baseSchema: docs/schemas/skill.md
---

<requirements-synthesis>

<role>Requirements synthesis specialist — transforms collected multi-source data into structured requirements</role>

<when_to_use_skill>
Use when raw data has been collected from multiple sources (Jira, Confluence, TestRail, user answers) and needs to be synthesized into a single structured requirements document. Not for full requirements lifecycle management — for that, use `requirements-authoring`.
</when_to_use_skill>

<prerequisites>
- Collected raw data from at least one source
- Analysis of gaps/contradictions (if performed)
- User answers to clarification questions (if collected)
</prerequisites>

<process>

Each step names the schema block it uses, so the agent loads one block at a time rather than holding all eight schemas in working memory at once.

1. Load all source data (raw-data files, analysis output, user answers if present). Surface gaps per `<failure_handling>`.
2. Resolve conflicts per `<source_priority>`. Apply `<failure_handling>` branches for single-source / missing-answers / intra-source-contradiction cases.
3. Generate user stories per `<user_stories>` schema.
4. Generate functional requirements per `<functional_requirements>` schema.
5. Generate non-functional requirements per `<non_functional_requirements>` schema.
6. Document constraints, dependencies, out-of-scope per `<constraints_and_dependencies>` schema.
7. Document assumptions and risks per `<assumptions_and_risks>` schema.
8. Build traceability matrix per `<traceability_matrix>` schema.
9. Assemble requirements document per `<output_format>`.
10. Run `<validation_checklist>` — fix any failing item before declaring complete.

</process>

<source_priority>

When sources conflict, resolve using this priority order:
1. **User answers** — highest authority (explicit human decisions)
2. **Primary source** (Jira ticket, TestRail case) — direct requirement source
3. **Supporting docs** (Confluence pages) — contextual information
4. **Analysis insights** — derived from gap/contradiction analysis

If unresolved, document as assumption with impact-if-wrong.

</source_priority>

<user_stories>

Format: As-a / I-want / So-that. Each story must be independently valuable.

```markdown
### US-[N]: [Title]
**As a** [role/persona]
**I want** [capability/goal]
**So that** [business value/benefit]

**Priority**: [P0 Critical / P1 High / P2 Medium / P3 Low]
**Source**: [Reference to source]

**Acceptance Criteria**:
- [ ] AC1: [Specific, testable criterion]
- [ ] AC2: [Specific, testable criterion]
- [ ] AC3: [Specific, testable criterion]

**Notes**: [Additional context, assumptions, or constraints]
```

Guidelines:
- Avoid technical implementation details — focus on user/business value
- Acceptance criteria must use "must" not "should"
- Cover happy path, unhappy path, and boundary conditions
- Each AC must be independently testable

Example:
```markdown
### US-1: User Login
**As a** registered user
**I want** to log in with email and password
**So that** I can access my personalized dashboard

**Priority**: P0 Critical
**Source**: Jira PROJ-123 description

**Acceptance Criteria**:
- [ ] AC1: User enters valid email and password → redirected to dashboard
- [ ] AC2: User enters invalid credentials → error message shown
- [ ] AC3: User locked out after 5 failed attempts → must reset password
```

</user_stories>

<functional_requirements>

Specific system capabilities. Use active voice, present tense.

```markdown
### FR-[N]: [Title]
**Description**: [What the system must do]
**Priority**: [P0 / P1 / P2 / P3]
**Source**: [Reference]

**Details**:
- [Specific behavior 1]
- [Specific behavior 2]

**Related User Stories**: US-[N], US-[M]
**Assumptions** (if any): [From unresolved issues]
```

**Coverage guidance:** include FRs from every capability class actually present in the project's scope (auth, data management, business logic, integrations, reporting, notifications, etc. — only those that apply). Do not pad with FRs for capability classes the sources don't mention.

</functional_requirements>

<non_functional_requirements>

Quality attributes with measurable criteria. Every NFR must have a threshold.

```markdown
### NFR-[N]: [Category] - [Title]
**Category**: Performance / Security / Scalability / Usability / Reliability / Maintainability
**Description**: [Specific requirement]
**Measurement**: [How to verify — with threshold]
**Priority**: [P0 / P1 / P2 / P3]
**Source**: [Reference or "Industry Standard"]
```

**Threshold rule:** every NFR MUST include a concrete numeric or categorical threshold in `Measurement` (e.g., `p95 < 200ms`, `WCAG 2.1 AA`, `uptime ≥ 99.9%`, `1000 concurrent users`). NFRs without a verifiable threshold are gaps, not requirements — record them in `<assumptions_and_risks>` with the missing-threshold flag instead.

**Coverage guidance:** for each category (Performance / Security / Scalability / Usability / Reliability / Maintainability), include an NFR only if the source data or user answers actually specify a constraint in that category. Do not invent NFRs to look thorough.

</non_functional_requirements>

<constraints_and_dependencies>

**Constraints** — limitations that must be worked within:
```markdown
### C-[N]: [Title]
**Type**: Technical / Business / Legal / Resource / Time
**Description**: [What cannot be changed]
**Impact**: [How this affects implementation]
**Source**: [Reference]
```

**Dependencies** — external factors required for success:
```markdown
### D-[N]: [Title]
**Type**: System / Team / Data / Service / Infrastructure
**Description**: [What is needed]
**Owner**: [Who provides this]
**Status**: Available / In Progress / Not Started
**Risk**: [Impact if unavailable]
```

</constraints_and_dependencies>

<assumptions_and_risks>

**Assumptions** — from unresolved questions or missing info:
```markdown
### A-[N]: [Assumption]
**Based On**: [Unresolved question or missing info]
**Assumption**: [What we're assuming]
**Impact if Wrong**: [Consequences]
**Validation Plan**: [How to verify later]
```

**Risks**:
```markdown
### R-[N]: [Risk Title]
**Probability**: High / Medium / Low
**Impact**: High / Medium / Low
**Description**: [What could go wrong]
**Mitigation**: [How to reduce or handle]
```

</assumptions_and_risks>

<traceability_matrix>

Link every requirement back to its source and forward to test scenarios:

```markdown
| Requirement ID | Source | User Story | Test Scenario |
|----------------|--------|------------|---------------|
| FR-1 | Jira DESC | US-1 | [placeholder for test phase] |
| NFR-1 | User Answer Q5 | - | [placeholder for test phase] |
```

</traceability_matrix>

<output_format>

```markdown
# Requirements Document - [Title]

**Generated**: [DateTime]
**Status**: DRAFT

---

## Document Control
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Author] | Initial generation |

---

## Executive Summary
**Description**: [2-3 sentence overview]
**Scope Summary**: [Key capabilities]
**Sources**: [List of sources used]

---

## 1. User Stories
[US-N entries]

## 2. Functional Requirements
[FR-N entries]

## 3. Non-Functional Requirements
[NFR-N entries]

## 4. Constraints
[C-N entries]

## 5. Dependencies
[D-N entries]

## 6. Out of Scope
[Explicit exclusions with rationale]

## 7. Assumptions
[A-N entries]

## 8. Risks
[R-N entries]

## 9. Traceability Matrix
[Table linking requirements → sources → stories → tests]

## 10. Glossary
[Technical terms, acronyms, domain-specific language]
```

</output_format>

<quality_guidelines>

**SMART criteria for every requirement**:
- **Specific**: Clearly defined, no ambiguity
- **Measurable**: Can verify if met
- **Achievable**: Technically feasible
- **Relevant**: Supports business goals
- **Testable**: Can write test cases for it

**Language rules**:
- Use active voice, present tense
- Use "must" for mandatory, "should" for preferred, "may" for optional
- Avoid vague adjectives ("fast", "user-friendly", "secure")
- One behavior per requirement
- Quantify every threshold

**Priority levels**:
- P0 Critical: Must have for MVP, blocks launch
- P1 High: Should have, significant value
- P2 Medium: Nice to have, adds value
- P3 Low: Future consideration

</quality_guidelines>

<pitfalls>
- Don't copy Jira/Confluence verbatim — synthesize and structure into proper requirements
- Don't use technical implementation details in user stories — focus on user/business value
- Acceptance criteria must be testable and objective, not subjective
- Each user story must be independently valuable
- Don't skip traceability — every requirement must link to a source
- Document all assumptions from unresolved questions with impact-if-wrong
- Padding FRs or NFRs by category to look thorough — only include what the sources actually specify
- Emitting NFRs without thresholds — they're gaps, not requirements; record under assumptions/risks instead
- Inventing comparisons across sources when only one source exists — see `<failure_handling>` single-source branch
</pitfalls>

<failure_handling>

- **Zero supporting docs** (only the primary source present, no Confluence / docs / additional context): proceed with synthesis from the primary source alone. Record in the Executive Summary: `Sources: <primary only> — no supporting documentation available`. Tag every assumption derived solely from the primary source with `Confidence: Single-source` so reviewers know it lacks cross-validation. Do NOT fabricate supporting content.
- **No user answers collected** (Phase 3 was skipped, no `answers.md`, or `answers.md` is empty): proceed with synthesis from the available sources. For every gap that *would have been* resolved by a user answer, create an `A-N` assumption entry per `<assumptions_and_risks>` with `Based On: missing user clarification (Phase 3 skipped or empty)` and a clear `Validation Plan` for later. Do NOT proceed silently — explicitly mark each missing-answer-driven assumption.
- **Intra-source contradiction** (Jira ticket contradicts itself, or one Confluence page contradicts another section of the same page): record both quotes as a contradiction entry, do NOT auto-resolve by recency / position / paragraph order. Surface as an `A-N` assumption with `Impact if Wrong: <both branches>` and require parent-workflow attention before treating the requirement as final.
- **Primary source missing** (no Jira ticket, no TestRail case, no direct user description — nothing to synthesize from): stop, report `requirements-synthesis: no primary source provided — cannot generate requirements from empty input`, do NOT emit a document with placeholder requirements.
- **Unresolved cross-source conflict after `<source_priority>` applied** (priority ladder did not break the tie because both sources are at the same priority tier and disagree): record as `A-N` assumption per the existing source_priority rule, AND list under the Risks section with `Probability: High` to ensure reviewer attention.

</failure_handling>

<validation_checklist>

Run as process step 10 before declaring the document complete. All items must hold:

- **Every requirement has a Source field populated** — no FR/NFR/US/C/D entry with `Source: [Reference]` placeholder unfilled.
- **Every NFR has a concrete Measurement threshold** — numeric (latency, RPS, percentile) or categorical (WCAG level, compliance standard). NFRs without thresholds were moved to `<assumptions_and_risks>` per the threshold rule.
- **No vague adjectives in any requirement body** — `fast`, `user-friendly`, `secure`, `scalable`, `robust`, `intuitive` etc. are forbidden; each must be quantified or removed. Re-grep the assembled document before emitting.
- **Traceability matrix is complete** — every `FR-N` / `NFR-N` / `US-N` from sections 1-3 appears as a row; Source column populated; Test Scenario column either populated or marked `[placeholder for test phase]`.
- **Every Assumption has Impact-if-Wrong and Validation Plan** — no `A-N` entry with those fields blank.
- **Every Risk has Probability + Impact + Mitigation** — no `R-N` entry with any of those fields blank.
- **Executive Summary lists every source actually consulted** — and explicitly marks single-source / no-user-answers / intra-source-contradiction states when they apply per `<failure_handling>`.
- **No fabricated content** — every requirement traces to a quoted or paraphrased item in a source; padding requirements to look thorough is forbidden.
- **One behavior per requirement** — composite "must do A AND B" requirements are split into separate entries.

</validation_checklist>

</requirements-synthesis>
