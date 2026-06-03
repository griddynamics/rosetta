# Requirements Synthesis — Output Schemas

The six per-requirement schemas used by `requirements-synthesis`. Loaded on demand by process steps 3–8: each step names the schema it uses, so the agent reads only the active block rather than holding all six in working memory at once.

The base `SKILL.md` keeps the document-level `<output_format>` wrapper, `<source_priority>`, `<failure_handling>`, `<validation_checklist>`, and the synthesis-specific `<quality_guidelines>`. SMART / priority / language conventions live in the `requirements-authoring` skill — do not restate them here.

---

## user-stories

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

Guidelines (synthesis-specific):
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

---

## functional-requirements

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

Example:

```markdown
### FR-1: Password Validation
**Description**: The system MUST enforce password strength rules at registration and password change.
**Priority**: P0 Critical
**Source**: Jira PROJ-123 acceptance criteria + Confluence "Security Policy v3.2"

**Details**:
- Minimum length: 12 characters
- Must contain ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 symbol from `!@#$%^&*`
- Reject the last 5 passwords used by the same account
- Reject the top-1000 most-common passwords (e.g., `Password123!`)

**Related User Stories**: US-1
**Assumptions** (if any): None — all rules confirmed via user answer Q3
```

**Coverage guidance:** include FRs from every capability class actually present in the project's scope (auth, data management, business logic, integrations, reporting, notifications, etc. — only those that apply). Do not pad with FRs for capability classes the sources don't mention.

---

## non-functional-requirements

Quality attributes with measurable criteria. Every NFR must have a threshold.

```markdown
### NFR-[N]: [Category] - [Title]
**Category**: Performance / Security / Scalability / Usability / Reliability / Maintainability
**Description**: [Specific requirement]
**Measurement**: [How to verify — with threshold]
**Priority**: [P0 / P1 / P2 / P3]
**Source**: [Reference or "Industry Standard"]
```

Example:

```markdown
### NFR-1: Performance - API Response Time
**Category**: Performance
**Description**: All authenticated API endpoints under `/api/v1/` MUST respond within an upper-bounded latency under nominal load.
**Measurement**: p95 < 200ms, p99 < 500ms, measured at the load balancer over a 5-minute window at 1000 concurrent users
**Priority**: P0 Critical
**Source**: User Answer Q5 + NFR baseline from Confluence "SLO catalog"
```

**Threshold rule:** every NFR MUST include a concrete numeric or categorical threshold in `Measurement` (e.g., `p95 < 200ms`, `WCAG 2.1 AA`, `uptime ≥ 99.9%`, `1000 concurrent users`). NFRs without a verifiable threshold are gaps, not requirements — record them in `assumptions-and-risks` with the missing-threshold flag instead.

**Coverage guidance:** for each category, include an NFR only if the source data or user answers actually specify a constraint in that category. Do not invent NFRs to look thorough.

---

## constraints-and-dependencies

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

---

## assumptions-and-risks

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

---

## traceability-matrix

Link every requirement back to its source and forward to test scenarios:

```markdown
| Requirement ID | Source | User Story | Test Scenario |
|----------------|--------|------------|---------------|
| FR-1 | Jira DESC | US-1 | [placeholder for test phase] |
| NFR-1 | User Answer Q5 | - | [placeholder for test phase] |
```
