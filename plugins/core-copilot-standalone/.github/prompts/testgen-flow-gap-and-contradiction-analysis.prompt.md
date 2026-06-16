---
name: testgen-flow-gap-and-contradiction-analysis
description: "Phase 2 Gap & Contradiction Analysis of testgen-flow"
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Test Generation Phase 2: Gap & Contradiction Analysis

## Prerequisites

- Phase 0 MUST be complete
- Phase 1 MUST be complete
- `agents/testgen/{TICKET-KEY}/raw-data.md` exists and populated
- `agents/testgen/{TICKET-KEY}/testgen-state.md` shows Phase 1 complete

## Objective

Analyze Jira ticket and Confluence documentation to identify contradictions, gaps, ambiguities, and inconsistencies that need clarification.

## Requirements

### Step 1: Load Raw Data

Read `agents/testgen/{TICKET-KEY}/raw-data.md` completely.

Extract key sections:
- Jira description and acceptance criteria
- Jira labels, components, priority
- Each Confluence page content
- Comments from both sources

### Step 2: Identify Contradictions

**Contradiction**: Same concept with different/conflicting values or logic.

**Analyze for**:

**Value Mismatches**:
- Priority: Jira says "High", Confluence says "Low priority"
- Scope: Jira describes feature X, Confluence describes feature Y
- Timeline: Jira has sprint N, Confluence mentions different sprint
- Owner: Different assignees or teams mentioned

**Logic Conflicts**:
- Performance vs Detail: "Must be fast" AND "Must show detailed calculations"
- Security vs Usability: "Must be open to all" AND "Must be secured"
- Scope: "Minimal MVP" vs "Rich feature set"

**Requirement Conflicts**:
- Jira: "Users can delete records"
- Confluence: "Records are immutable"

**Document each contradiction**:
```markdown
### C1: [Brief Title]
**Type**: Value Mismatch / Logic Conflict / Requirement Conflict
**Source 1**: Jira - [Field/Section] - "[Quote]"
**Source 2**: Confluence - [Page Title] - "[Quote]"
**Impact**: [Why this matters]
**Needs Clarification**: [Specific question]
```

### Step 3: Identify Gaps

**Gap**: Missing information required for implementation.

**Analyze for**:

**Functional Gaps**:
- User actions not defined (what happens when user clicks X?)
- Edge cases not specified (empty lists, null values, max limits)
- Error handling not described
- Integration points not documented

**Non-Functional Gaps**:
- Performance requirements missing (response time, throughput)
- Security requirements unclear (authentication, authorization)
- Scalability not specified (concurrent users, data volume)
- Compliance requirements missing (GDPR, accessibility)

**Data Gaps**:
- Data formats not specified (JSON, XML, CSV)
- Data validation rules missing (required fields, formats)
- Data sources unclear (which database, which API)

**Business Logic Gaps**:
- Calculation methods not explained
- Business rules incomplete
- Workflow steps missing

**Dependency Gaps**:
- External systems not listed
- API endpoints not documented
- Third-party services not specified

**Document each gap**:
```markdown
### G1: [Brief Title]
**Type**: Functional / Non-Functional / Data / Business Logic / Dependency
**Context**: [Where this is needed]
**Missing Information**: [What's not specified]
**Impact**: [Why implementation blocked without this]
**Suggested Question**: [How to ask for this information]
```

### Step 4: Identify Ambiguities

**Ambiguity**: Vague or unclear statements that could be interpreted multiple ways.

**Look for**:
- Vague terms: "fast", "soon", "many", "few", "approximately"
- Undefined roles: "admin" without definition
- Unclear workflows: "system processes request" (how?)
- Undefined acronyms or terms

**Document each ambiguity**:
```markdown
### A1: [Brief Title]
**Source**: Jira / Confluence [Page]
**Vague Statement**: "[Quote]"
**Possible Interpretations**:
  1. [Interpretation 1]
  2. [Interpretation 2]
**Clarification Needed**: [Specific question]
```

### Step 5: Cross-Reference Analysis

Compare Jira and Confluence for:
- Information present in Jira but not Confluence
- Information present in Confluence but not Jira
- Overlapping but different level of detail

**Document**:
```markdown
### Cross-Reference Findings

**Only in Jira**:
- [Item 1]
- [Item 2]

**Only in Confluence**:
- [Item 1]
- [Item 2]

**Overlapping but Different Detail**:
- [Topic]: Jira has [X], Confluence has [Y detail level]
```

### Step 6: Create Analysis Document

**File**: `agents/testgen/{TICKET-KEY}/analysis.md`

**Format**:
```markdown
# Test Generation Analysis - [TICKET-KEY]

**Analyzed**: [DateTime]
**Phase**: 2 - Gap & Contradiction Analysis
**Sources**: Jira [TICKET-KEY] + [N] Confluence pages

---

## Executive Summary

- **Total Issues Found**: [Count]
- **Contradictions**: [Count]
- **Gaps**: [Count]
- **Ambiguities**: [Count]
- **Severity**: [Critical / High / Medium / Low]

**Recommendation**: [Can proceed with clarifications / Needs major rework / etc.]

---

## 1. Contradictions

[None found OR list each contradiction using format from Step 2]

### C1: [Title]
[Details]

### C2: [Title]
[Details]

---

## 2. Gaps

[None found OR list each gap using format from Step 3]

### G1: [Title]
[Details]

### G2: [Title]
[Details]

---

## 3. Ambiguities

[None found OR list each ambiguity using format from Step 4]

### A1: [Title]
[Details]

### A2: [Title]
[Details]

---

## 4. Cross-Reference Analysis

[Cross-reference findings from Step 5]

---

## 5. Positive Findings

**Well-Documented Areas**:
- [Area 1]: Clear and complete
- [Area 2]: Consistent across sources

**Strengths**:
- [Strength 1]
- [Strength 2]

---

## 6. Risk Assessment

**High Risk** (Blocks implementation):
- [Issue ID]: [Why blocking]

**Medium Risk** (Impacts quality):
- [Issue ID]: [Impact]

**Low Risk** (Minor clarification):
- [Issue ID]: [Minor impact]

---

## 7. Next Steps

1. Generate clarification questions (Phase 3)
2. Total questions expected: [Estimate based on issues found]
3. Recommended: Review with [Stakeholder role] before proceeding

---

## Analysis Metadata

- **Jira Fields Analyzed**: [List key fields]
- **Confluence Pages Analyzed**: [Count and titles]
- **Analysis Duration**: [Time spent]
- **Automated Checks**: [Any automated validation performed]
- **Manual Review**: [Areas requiring human judgment]
```

### Step 7: Update State File

Update `agents/testgen/{TICKET-KEY}/testgen-state.md`:

```markdown
## Phase Completion Status

- [x] Phase 1: Data Collection - Completed [Date]
- [x] Phase 2: Gap Analysis - Completed [DateTime]
- [ ] Phase 3: Question Generation - Not Started
- [ ] Phase 4: Requirements Generation - Not Started
- [ ] Phase 5: Test Scenarios - Not Started

## Metrics

- Jira Fields Extracted: [Count]
- Confluence Pages Analyzed: [Count]
- Contradictions Found: [Count]
- Gaps Identified: [Count]
- Ambiguities Found: [Count]
[...]

## Phase Details

[...]

### Phase 2: Gap & Contradiction Analysis
- **Completed**: [DateTime]
- **Files Created**: analysis.md
- **Contradictions**: [Count]
- **Gaps**: [Count]
- **Ambiguities**: [Count]
- **Risk Level**: [Critical/High/Medium/Low]
- **Notes**: [Summary of findings]
```

## Validation

Before completing Phase 2, verify:
- ✅ `analysis.md` created
- ✅ At least 1 issue identified OR explicit "No issues found" statement
- ✅ Each issue has clear type, source quotes, and suggested question
- ✅ Risk assessment completed
- ✅ State file updated with Phase 2 complete
- ✅ Metrics updated in state file

## Tools Used

- `read_file()` - Read agents/testgen/{TICKET-KEY}/raw-data.md
- `write()` - Create agents/testgen/{TICKET-KEY}/analysis.md, update agents/testgen/{TICKET-KEY}/testgen-state.md
- (Optional) `mcp_sequential_thinking()` - For complex analysis

## Analysis Guidelines

**Be Specific**:
- ❌ "Some details missing"
- ✅ "User authentication method not specified (OAuth, SAML, basic auth?)"

**Quote Sources**:
- Always include exact quotes from Jira/Confluence
- Cite field names or page sections

**Assess Impact**:
- Explain why each issue matters
- Link to implementation blockers

**Avoid Assumptions**:
- Don't guess answers
- Document what's explicitly missing
- Don't infer requirements not stated

**Prioritize**:
- Critical: Blocks implementation entirely
- High: Significant quality impact
- Medium: Affects implementation approach
- Low: Minor clarification

## Common Patterns

**Typical Contradictions**:
- Jira priority vs Confluence urgency
- Jira scope vs Confluence detailed spec
- Jira assignee vs Confluence owner

**Typical Gaps**:
- Error handling not specified
- Edge cases not covered
- Non-functional requirements missing
- Integration details incomplete

**Typical Ambiguities**:
- "Fast response" (how fast?)
- "Secure" (what security level?)
- "User-friendly" (measured how?)

## Next Phase

After Phase 2 completion:
1. Tell user: "Phase 2 complete. Found [X] contradictions, [Y] gaps, [Z] ambiguities."
2. Show high-risk issues requiring urgent clarification
3. Ask: "Ready to proceed to Phase 3 (Question Generation)?"
4. Wait for confirmation
5. Load Phase 3: ACQUIRE testgen-phase3-md FROM KB

## Notes

- If NO issues found, still create analysis.md with "No issues found" sections
- Focus on implementation-blocking issues first
- Balance thoroughness with practicality (don't over-analyze minor details)
- Use sequential-thinking MCP for complex requirement interactions if needed

