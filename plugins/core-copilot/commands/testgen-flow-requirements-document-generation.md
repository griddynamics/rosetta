---
name: testgen-flow-requirements-document-generation
description: "Phase 4 Requirements Document of testgen-flow"
alwaysApply: false
user-invocable: false
baseSchema: docs/schemas/phase.md
---

# Test Generation Phase 4: Requirements Document Generation

## Prerequisites

- Phase 0 MUST be complete
- Phase 1 MUST be complete
- Phase 2 MUST be complete
- Phase 3 MUST be complete with user answers
- `agents/testgen/{TICKET-KEY}/answers.md` exists with validated answers
- `agents/testgen/{TICKET-KEY}/testgen-state.md` shows Phase 3 complete

## Objective

Generate comprehensive, structured requirements document by synthesizing Jira data, Confluence documentation, and user answers to clarification questions.

## Requirements

### Step 1: Load All Source Data

Read all previous phase outputs:
- `agents/testgen/{TICKET-KEY}/raw-data.md` - Jira + Confluence
- `agents/testgen/{TICKET-KEY}/analysis.md` - Identified issues
- `agents/testgen/{TICKET-KEY}/answers.md` - User clarifications

### Step 2: Synthesize Information

Combine information from all sources:

**Priority Order**:
1. User answers (Phase 3) - highest authority
2. Jira ticket - primary source
3. Confluence docs - supporting context
4. Analysis insights - gap filling

**Resolution Strategy**:
- If contradiction resolved: Use user answer
- If gap filled: Use user answer
- If ambiguity clarified: Use user answer
- If unresolved: Document as assumption with flag

### Step 3: Generate User Stories

Extract or create user stories from combined sources.

**Format**: Given/When/Then or As-a/I-want/So-that

**User Story Template**:
```markdown
### US-[N]: [Title]
**As a** [role/persona]  
**I want** [capability/goal]  
**So that** [business value/benefit]

**Priority**: [P0 Critical / P1 High / P2 Medium / P3 Low]
**Source**: [Jira/Confluence/User Answer to Q[N]]

**Acceptance Criteria**:
- [ ] AC1: [Specific, testable criterion]
- [ ] AC2: [Specific, testable criterion]
- [ ] AC3: [Specific, testable criterion]

**Definition of Done**:
- [ ] Code complete and reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Documentation updated
- [ ] Deployed to test environment
- [ ] Acceptance criteria verified

**Notes**:
[Any additional context, assumptions, or constraints]
```

**Guidelines**:
- Each US should be independently valuable
- Acceptance criteria must be specific and testable
- Avoid technical implementation details in US
- Focus on user/business value

### Step 4: Generate Functional Requirements

List specific functional capabilities.

**Format**:
```markdown
### FR-[N]: [Title]
**Description**: [What the system must do]
**Priority**: [P0 / P1 / P2 / P3]
**Source**: [Reference]

**Details**:
- [Specific behavior 1]
- [Specific behavior 2]
- [Specific behavior 3]

**Related User Stories**: US-[N], US-[M]

**Assumptions** (if any):
- [Assumption 1 - if unresolved issue]
```

**Categories to Cover**:
- User Management (authentication, authorization, profiles)
- Data Management (CRUD operations, validation)
- Business Logic (calculations, workflows, rules)
- Integrations (external systems, APIs)
- Reporting (data export, dashboards)
- Notifications (email, in-app, SMS)

### Step 5: Generate Non-Functional Requirements

Specify quality attributes and constraints.

**Format**:
```markdown
### NFR-[N]: [Category] - [Title]
**Category**: Performance / Security / Scalability / Usability / Reliability / Maintainability
**Description**: [Specific requirement]
**Measurement**: [How to verify]
**Priority**: [P0 / P1 / P2 / P3]

**Acceptance Criteria**:
- [Measurable criterion with threshold]

**Source**: [Reference or "Industry Standard"]
```

**Categories**:

**Performance**:
- Response time (page load, API calls)
- Throughput (requests per second)
- Resource usage (CPU, memory, disk)

**Security**:
- Authentication method
- Authorization model (RBAC, ABAC)
- Data encryption (at rest, in transit)
- Audit logging
- Compliance (GDPR, HIPAA, SOC2)

**Scalability**:
- Concurrent users
- Data volume
- Transaction volume
- Geographic distribution

**Usability**:
- Accessibility (WCAG level)
- Mobile responsiveness
- Browser support
- Language/localization

**Reliability**:
- Uptime/availability (99.9%)
- Error handling
- Data backup/recovery
- Disaster recovery

**Maintainability**:
- Code quality standards
- Documentation requirements
- Monitoring/observability
- Deployment frequency

### Step 6: Document Constraints & Dependencies

**Constraints** - Limitations that must be worked within:
```markdown
### C-[N]: [Constraint Title]
**Type**: Technical / Business / Legal / Resource / Time
**Description**: [What cannot be changed]
**Impact**: [How this affects implementation]
**Source**: [Reference]
```

**Dependencies** - External factors required for success:
```markdown
### D-[N]: [Dependency Title]
**Type**: System / Team / Data / Service / Infrastructure
**Description**: [What is needed]
**Owner**: [Who/what provides this]
**Status**: [Available / In Progress / Not Started]
**Risk**: [Impact if unavailable]
```

### Step 7: Define Out of Scope

Explicitly list what is NOT included:
```markdown
## Out of Scope

The following are explicitly NOT part of this requirement:
- [Item 1]: [Why out of scope]
- [Item 2]: [Why out of scope]
- [Item 3]: [Why out of scope]

**Future Considerations**:
- [Feature for future phase]
- [Enhancement for later]
```

### Step 8: Document Assumptions & Risks

**Assumptions** (from unresolved questions):
```markdown
### A-[N]: [Assumption]
**Based On**: [Unresolved Q[N] or missing info]
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

### Step 9: Create Requirements Document

**File**: `agents/testgen/{TICKET-KEY}/requirements.md`

**Format**:
```markdown
# Requirements Document - [TICKET-KEY]

**Generated**: [DateTime]
**Phase**: 4 - Requirements Generation
**Jira Ticket**: [KEY] - [Summary]
**Status**: DRAFT / REVIEW / APPROVED

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | AI Agent | Initial generation from Jira + Confluence + User input |

---

## Executive Summary

**Project**: [Project Name]
**Ticket**: [KEY]
**Description**: [2-3 sentence overview]

**Scope Summary**:
- [Key capability 1]
- [Key capability 2]
- [Key capability 3]

**Sources**:
- Jira: [TICKET-KEY]
- Confluence: [N] pages
- User Clarifications: [N] questions answered

---

## 1. User Stories

[List all user stories from Step 3]

### US-1: [Title]
[Full user story]

### US-2: [Title]
[Full user story]

---

## 2. Functional Requirements

[List all functional requirements from Step 4]

### FR-1: [Title]
[Full requirement]

### FR-2: [Title]
[Full requirement]

---

## 3. Non-Functional Requirements

[List all NFRs from Step 5]

### NFR-1: [Category] - [Title]
[Full requirement]

### NFR-2: [Category] - [Title]
[Full requirement]

---

## 4. Constraints

[List all constraints from Step 6]

### C-1: [Title]
[Full constraint]

---

## 5. Dependencies

[List all dependencies from Step 6]

### D-1: [Title]
[Full dependency]

---

## 6. Out of Scope

[From Step 7]

---

## 7. Assumptions

[List all assumptions from Step 8]

### A-1: [Assumption]
[Full details]

---

## 8. Risks

[List all risks from Step 8]

### R-1: [Risk]
[Full details]

---

## 9. Traceability Matrix

| Requirement ID | Source | User Story | Test Scenario |
|----------------|--------|------------|---------------|
| FR-1 | Jira DESC | US-1 | To be generated (Phase 5) |
| FR-2 | Confluence Page 1 | US-2 | To be generated (Phase 5) |
| NFR-1 | User Answer Q5 | - | To be generated (Phase 5) |

---

## 10. Glossary

[Define technical terms, acronyms, domain-specific language]

**Term** | **Definition** | **Source**
---------|----------------|------------
[Term 1] | [Definition] | [Source]
[Term 2] | [Definition] | [Source]

---

## 11. Appendices

### Appendix A: Source Documents
- Jira: [Full URL]
- Confluence Pages: [List with URLs]

### Appendix B: Analysis Summary
- Contradictions Resolved: [Count]
- Gaps Filled: [Count]
- Ambiguities Clarified: [Count]

### Appendix C: Change Log
[Track future updates to this document]

---

## Next Steps

1. Review this requirements document
2. Approve for implementation
3. Generate test scenarios (Phase 5)
4. Begin development based on user stories
```

### Step 10: Update State File

Update `agents/testgen/{TICKET-KEY}/testgen-state.md`:

```markdown
## Phase Completion Status

- [x] Phase 1: Data Collection - Completed [Date]
- [x] Phase 2: Gap Analysis - Completed [Date]
- [x] Phase 3: Question Generation - Completed [Date]
- [x] Phase 4: Requirements Generation - Completed [DateTime]
- [ ] Phase 5: Test Scenarios - Not Started

## Metrics

[...]
- User Stories Created: [Count]
- Functional Requirements: [Count]
- Non-Functional Requirements: [Count]
- Constraints: [Count]
- Dependencies: [Count]
- Assumptions: [Count]
- Risks: [Count]
[...]

## Phase Details

[...]

### Phase 4: Requirements Document Generation
- **Completed**: [DateTime]
- **Files Created**: requirements.md
- **User Stories**: [Count]
- **Functional Reqs**: [Count]
- **Non-Functional Reqs**: [Count]
- **Document Status**: DRAFT
- **Notes**: Ready for review and Phase 5
```

## Validation

Before completing Phase 4, verify:
- ✅ `requirements.md` created
- ✅ At least 1 user story defined
- ✅ At least 3 functional requirements
- ✅ At least 2 non-functional requirements
- ✅ All user answers incorporated
- ✅ Unresolved items documented as assumptions
- ✅ Traceability matrix present
- ✅ State file updated with Phase 4 complete

## Tools Used

- `read_file()` - Read raw-data.md, analysis.md, answers.md
- `write()` - Create requirements.md, update testgen-state.md

## Requirements Quality Guidelines

**SMART Criteria**:
- **Specific**: Clearly defined, no ambiguity
- **Measurable**: Can verify if met
- **Achievable**: Technically feasible
- **Relevant**: Supports business goals
- **Testable**: Can write test cases

**Acceptance Criteria Rules**:
- Use active voice
- One behavior per criterion
- Avoid "should" or "might" - use "must"
- Include both positive and negative cases

**Priority Guidelines**:
- P0: Must have for MVP, blocks launch
- P1: Should have, significant value
- P2: Nice to have, adds value
- P3: Future consideration

## Common Patterns

**User Story Examples**:
```
US-1: User Login
As a registered user
I want to log in with email and password
So that I can access my personalized dashboard

AC1: User enters valid email and password → redirected to dashboard
AC2: User enters invalid credentials → error message shown
AC3: User locked out after 5 failed attempts → must reset password
```

**Functional Requirement Examples**:
```
FR-1: Password Validation
System must validate passwords meet these criteria:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character
```

**Non-Functional Requirement Examples**:
```
NFR-1: Performance - API Response Time
All API endpoints must respond within 200ms for 95% of requests under normal load (1000 concurrent users).
Measurement: Monitor p95 latency in production.
```

## Next Phase

After Phase 4 completion:
1. Tell user: "Phase 4 complete. Generated requirements document with [X] user stories, [Y] functional requirements, [Z] non-functional requirements."
2. Show document location: `agents/testgen/{TICKET-KEY}/requirements.md`
3. Ask: "Please review the requirements document. Ready to proceed to Phase 5 (Test Scenario Generation)?"
4. Wait for confirmation
5. Load Phase 5: APPLY PHASE testgen-flow-test-case-generation.md

## Notes

- Requirements document is the PRIMARY deliverable for development
- Should be committed to version control
- Can be attached to Jira ticket
- May need stakeholder review/approval before implementation
- Keep it updated as requirements evolve

