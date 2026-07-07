# Requirements Authoring — Synthesis schemas (`<synthesis>` mode)

Loaded on demand by the `requirements-authoring` `<synthesis>` mode. The general authoring catalogs (unit template, EARS, schema fields, ID/filesystem/refactoring conventions) live inline in `SKILL.md`; this reference holds ONLY the synthesis-document output schemas.

# Synthesis output schemas (`<synthesis>` mode)

Six per-requirement schemas + the document wrapper. Loaded on demand by `<synthesis>` steps: read only the active schema rather than holding all six in working memory.

## user-stories

As-a / I-want / So-that; each story independently valuable.

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

**Notes**: [Additional context, assumptions, or constraints]
```

Synthesis guidelines: no implementation detail (user/business value only); AC uses "must"; cover happy/unhappy/boundary; each AC independently testable.

## functional-requirements

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

Coverage: include FRs only from capability classes the sources actually mention (auth, data management, business logic, integrations, reporting, notifications, admin/config, search, file handling). Do not pad.

## non-functional-requirements

```markdown
### NFR-[N]: [Category] - [Title]
**Category**: Performance / Security / Scalability / Usability / Reliability / Maintainability
**Description**: [Specific requirement]
**Measurement**: [How to verify — with threshold]
**Priority**: [P0 / P1 / P2 / P3]
**Source**: [Reference or "Industry Standard"]
```

Threshold rule: every NFR MUST include a concrete numeric or categorical threshold in `Measurement` (`p95 < 200ms`, `WCAG 2.1 AA`, `uptime ≥ 99.9%`). NFRs without a verifiable threshold move to `assumptions-and-risks` with a missing-threshold flag. Coverage: include an NFR per category only if a constraint is actually specified.

## constraints-and-dependencies

```markdown
### C-[N]: [Title]
**Type**: Technical / Business / Legal / Resource / Time
**Description**: [What cannot be changed]
**Impact**: [How this affects implementation]
**Source**: [Reference]
```

```markdown
### D-[N]: [Title]
**Type**: System / Team / Data / Service / Infrastructure
**Description**: [What is needed]
**Owner**: [Who provides this]
**Status**: Available / In Progress / Not Started
**Risk**: [Impact if unavailable]
```

## assumptions-and-risks

```markdown
### A-[N]: [Assumption]
**Based On**: [Unresolved question or missing info]
**Assumption**: [What we're assuming]
**Impact if Wrong**: [Consequences]
**Validation Plan**: [How to verify later]
```

```markdown
### R-[N]: [Risk Title]
**Probability**: High / Medium / Low
**Impact**: High / Medium / Low
**Description**: [What could go wrong]
**Mitigation**: [How to reduce or handle]
```

## traceability-matrix

```markdown
| Requirement ID | Source | User Story | Test Scenario |
|----------------|--------|------------|---------------|
| FR-1 | Jira DESC | US-1 | [placeholder for test phase] |
| NFR-1 | User Answer Q5 | - | [placeholder for test phase] |
```

## Document wrapper (synthesis output)

Front-matter (Document Control + Executive Summary) + 10 numbered sections in order. Validation greps target the numbered sections; front-matter is not numbered.

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
## 2. Functional Requirements
## 3. Non-Functional Requirements
## 4. Constraints
## 5. Dependencies
## 6. Out of Scope
## 7. Assumptions
## 8. Risks
## 9. Traceability Matrix
## 10. Glossary
```

## Synthesis source-priority ladder

When sources conflict, resolve in order: (1) **User answers** (highest — explicit human decisions); (2) **Primary source** (Jira ticket, TestRail case); (3) **Supporting docs** (Confluence); (4) **Analysis insights** (derived from gap/contradiction analysis). If unresolved, document as an assumption with impact-if-wrong (and list under Risks with Probability: High when both sides are at the same priority tier).
