---
name: gap-finding-templates
description: QA gap-analysis finding-entry forms — G[N] gaps, C[N] contradictions, A[N] ambiguities.
---

<gap-finding-templates>

Finding-entry shapes for `analysis.md` (one per finding). Quote source text verbatim; redact credentials/PII in any quoted line before writing (scope per `qa-knowledge/references/redaction-scope.md`; the gap_analysis mode applies the redaction skill).

```markdown
### G[N]: [Brief Title]
**Type**: Endpoint / Request / Response / Auth / Test Data / Edge Case
**Context**: [Which test step or endpoint]
**Missing Information**: [What is not specified]
**Impact**: [Why automation is blocked or degraded]
**Suggested Question**: [How to ask for this]

### C[N]: [Brief Title]
**Source 1**: [Test Case / Swagger / Docs] — "[Quote]"
**Source 2**: [Test Case / Swagger / Docs] — "[Quote]"
**Impact**: [Why this matters for test automation]
**Needs Clarification**: [Specific question]

### A[N]: [Brief Title]
**Source**: [Test Case / Docs / Swagger]
**Vague Statement**: "[Quote]"
**Possible Interpretations**: 1. [...] 2. [...]
**Clarification Needed**: [Specific question]
```

</gap-finding-templates>
