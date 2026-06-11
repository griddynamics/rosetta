# Requirements Authoring — Catalogs, Schemas & Templates

Loaded on demand from `requirements-authoring/SKILL.md` when actively drafting. SKILL.md keeps every authoring **rule and method** inline; this file holds the reference-grade catalogs, schemas, and verbatim templates filled in at write time. MUST-SHOULD-MAY / priority conventions are owned by SKILL.md — not restated here.

---

## Requirement unit template (`<req>`)

```xml
<req id="FR-AREA-0001" type="FR" level="System" ticketId="JIRA-0000" classification="business|technical">
  <title>...</title>
  <statement>...</statement>
  <rationale>...</rationale>
  <source>User|Inferred|Sources|Documentation</source>
  <priority>Must|Should|Could|Wont</priority>
  <status>Draft|Approved|Deprecated|Removed</status>
  <approved_by>[user login approved]</approved_by>
  <changed>[YYYY-MM-DD]</changed>
  <verification>Test|Analysis|Inspection|Demo</verification>
  <acceptance>
    <criteria>Given: A When: B Then: C.</criteria>
    <criteria>Given: X When: Y Then: Z.</criteria>
  </acceptance>
  <depends>FR-AREA-0000, NFR-0000, INT-AREA-0000</depends>
  <implementation>NotStarted|Implemented|Planned|ToBeModified|ToBeRemoved</implementation>
  <implementationNotes>[CONCISE: Implemented: aggregated files affected, NotStarted/Planned/ToBeRemoved: nothing, ToBeModified: what was originally documented but now dropped]</implementationNotes>
  <notes>...</notes>
</req>
```

## EARS pattern catalog (functional requirement statements)

- `<ubiq><S> shall <R>.</ubiq>`
- `<event>When <T>, <S> shall <R>.</event>`
- `<state>While <X>, <S> shall <R>.</state>`
- `<optional>Where <O>, <S> shall <R>.</optional>`
- `<unwanted>If <F>, <S> shall <M>.</unwanted>`

## Acceptance criteria & verification

- Acceptance: Given/When/Then — `Given:<G> When:<W> Then:<T>.` Independently testable; cover happy / unhappy / boundary / error.
- Verification methods: prefer **Test**; **Analysis** for proofs; **Inspection** for artifacts; **Demo** for behaviors.

## Requirements graph

- Proactively offer to generate a graph of requirements; suggest perspectives.
- Load all requirements, build the graph, render with Graphviz.

## Requirement schema fields

Require: id, type, level, title, statement, rationale, source, priority, status, acceptance criteria, verification method. Optional: dependencies, risks, notes, links.

## ID conventions

Stable, unique, never reused or renumbered: `FR-[AREA]-####` (FRs), `NFR-####` (NFRs), `INT-[AREA]-####` (interfaces), `DATA-[AREA]-####` (data).

## Filesystem & information architecture

- Write only under the REQUIREMENTS folder; never edit outside it; keep folder structure stable; add files when needed; use relative markdown links.
- Keep `REQUIREMENTS/INDEX.md` current — one md header per file `# file path: short description` (ToC when grepped). `REQUIREMENTS/CHANGES.md` is the change log.
- Keep each concern in its own file/section: context, scope, glossary, assumptions, constraints, FRs, NFRs, interfaces, data, traceability, decisions, questions.
- Each file defines one area abbreviation and uses grep-friendly headers. All non-index/non-changelog documents are target-state only — never write change explanations. User input may be provided only for understanding.

## Refactoring

Keep files under 300 lines — refactor above that, splitting by capability or quality into new files; update links and indexes after a split; preserve stable requirement IDs.

---

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
