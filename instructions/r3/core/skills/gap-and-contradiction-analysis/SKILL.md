---
name: gap-and-contradiction-analysis
description: Analyze collected data from multiple sources to identify contradictions, gaps, ambiguities, and inconsistencies. Produces categorized findings with risk assessment.
tags: ["analysis", "requirements"]
baseSchema: docs/schemas/skill.md
---

<gap-and-contradiction-analysis>

<role>Requirements gap and contradiction analyst</role>

<when_to_use_skill>
Analyze data collected from multiple sources (Jira, Confluence, TestRail, etc.) to find contradictions, gaps, ambiguities, and inconsistencies before downstream work (requirements generation, test design, implementation). Produces a structured analysis document with categorized findings and risk assessment.
</when_to_use_skill>

<prerequisites>
- Collected raw data from at least one source (e.g. `raw-data.md`)
- Sources clearly identified (Jira ticket, Confluence pages, TestRail cases, etc.)
</prerequisites>

<process>

1. Load all collected data completely
2. Identify contradictions
3. Identify gaps
4. Identify ambiguities
5. Cross-reference sources
6. Assess risk and produce findings

</process>

<identify_contradictions>

**Contradiction**: Same concept with different/conflicting values or logic.

Analyze for:

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
- Source A: "Users can delete records"
- Source B: "Records are immutable"

Document each contradiction:
```markdown
### C1: [Brief Title]
**Type**: Value Mismatch / Logic Conflict / Requirement Conflict
**Source 1**: [Source] - [Field/Section] - "[Quote]"
**Source 2**: [Source] - [Field/Section] - "[Quote]"
**Impact**: [Why this matters]
**Needs Clarification**: [Specific question]
```

</identify_contradictions>

<identify_gaps>

**Gap**: Missing information required for implementation.

Analyze for:

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

Document each gap:
```markdown
### G1: [Brief Title]
**Type**: Functional / Non-Functional / Data / Business Logic / Dependency
**Context**: [Where this is needed]
**Missing Information**: [What's not specified]
**Impact**: [Why implementation blocked without this]
**Suggested Question**: [How to ask for this information]
```

</identify_gaps>

<identify_ambiguities>

**Ambiguity**: Vague or unclear statements that could be interpreted multiple ways.

Look for:
- Vague terms: "fast", "soon", "many", "few", "approximately"
- Undefined roles: "admin" without definition
- Unclear workflows: "system processes request" (how?)
- Undefined acronyms or terms

Document each ambiguity:
```markdown
### A1: [Brief Title]
**Source**: [Source] - [Section/Page]
**Vague Statement**: "[Quote]"
**Possible Interpretations**:
  1. [Interpretation 1]
  2. [Interpretation 2]
**Clarification Needed**: [Specific question]
```

</identify_ambiguities>

<cross_reference_sources>

Compare all sources against each other:
- Information present in one source but not others
- Overlapping information with different level of detail
- Consistent information (positive finding)

Document:
```markdown
### Cross-Reference Findings

**Only in [Source A]**:
- [Item 1]
- [Item 2]

**Only in [Source B]**:
- [Item 1]
- [Item 2]

**Overlapping but Different Detail**:
- [Topic]: [Source A] has [X], [Source B] has [Y detail level]
```

</cross_reference_sources>

<risk_assessment>

Categorize all findings:

- **High Risk** (Blocks implementation): Cannot proceed without resolution
- **Medium Risk** (Impacts quality): Can proceed but quality/correctness affected
- **Low Risk** (Minor clarification): Nice to have, won't block

</risk_assessment>

<output_format>

```markdown
# Analysis - [Title]

**Analyzed**: [DateTime]
**Sources**: [List of sources analyzed]

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

[None found OR list each using C[N] format]

---

## 2. Gaps

[None found OR list each using G[N] format]

---

## 3. Ambiguities

[None found OR list each using A[N] format]

---

## 4. Cross-Reference Analysis

[Findings from cross-reference]

---

## 5. Positive Findings

**Well-Documented Areas**:
- [Area]: Clear and complete

**Strengths**:
- [Strength]

---

## 6. Risk Assessment

**High Risk** (Blocks implementation):
- [Issue ID]: [Why blocking]

**Medium Risk** (Impacts quality):
- [Issue ID]: [Impact]

**Low Risk** (Minor clarification):
- [Issue ID]: [Minor impact]

---

## Analysis Metadata

- **Sources Analyzed**: [List]
- **Analysis Duration**: [Time]
```

If NO issues found, still produce document with "No issues found" in each section.

</output_format>

<analysis_guidelines>

**Be Specific**:
- Bad: "Some details missing"
- Good: "User authentication method not specified (OAuth, SAML, basic auth?)"

**Quote Sources**: Always include exact quotes; cite field names or page sections.

**Assess Impact**: Explain why each issue matters; link to implementation blockers.

**Avoid Assumptions**: Don't guess answers; document what's explicitly missing; don't infer requirements not stated.

**Prioritize**:
- Critical: Blocks implementation entirely
- High: Significant quality impact
- Medium: Affects implementation approach
- Low: Minor clarification

</analysis_guidelines>

<common_patterns>

**Typical Contradictions**:
- Priority/urgency mismatches across sources
- Scope described differently in ticket vs documentation
- Owner/assignee conflicts

**Typical Gaps**:
- Error handling not specified
- Edge cases not covered
- Non-functional requirements missing
- Integration details incomplete

**Typical Ambiguities**:
- "Fast response" (how fast?)
- "Secure" (what security level?)
- "User-friendly" (measured how?)

</common_patterns>

<pitfalls>
- Being too vague in findings — always quote exact source text
- Guessing answers instead of documenting unknowns
- Over-analyzing minor details at the expense of critical blockers
- Skipping cross-reference between sources
- Not producing a document when no issues found
</pitfalls>

</gap-and-contradiction-analysis>
