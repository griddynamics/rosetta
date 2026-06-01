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

1. Load all source data
2. Resolve conflicts using source priority
3. Generate user stories
4. Generate functional requirements
5. Generate non-functional requirements
6. Document constraints, dependencies, out-of-scope
7. Document assumptions and risks
8. Build traceability matrix
9. Assemble requirements document

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

Categories to cover:
- **User Management**: authentication, authorization, profiles
- **Data Management**: CRUD operations, validation rules
- **Business Logic**: calculations, workflows, rules
- **Integrations**: external systems, APIs
- **Reporting**: data export, dashboards
- **Notifications**: email, in-app, SMS

Example:
```markdown
### FR-1: Password Validation
**Description**: System must validate passwords meet security criteria
**Priority**: P0 Critical
**Source**: Confluence - Security Policy page

**Details**:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character

**Related User Stories**: US-1
```

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

Categories and what to specify:

- **Performance**: response time (p95), throughput (rps), resource usage
- **Security**: auth method, authorization model, encryption, audit logging, compliance
- **Scalability**: concurrent users, data volume, transaction volume
- **Usability**: accessibility (WCAG level), mobile responsiveness, browser support
- **Reliability**: uptime (e.g. 99.9%), error handling, backup/recovery
- **Maintainability**: code quality standards, monitoring, deployment frequency

Example:
```markdown
### NFR-1: Performance - API Response Time
**Category**: Performance
**Description**: All API endpoints must respond within 200ms for 95th percentile under normal load
**Measurement**: Monitor p95 latency with 1000 concurrent users
**Priority**: P1 High
**Source**: User Answer Q5
```

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
</pitfalls>

</requirements-synthesis>
