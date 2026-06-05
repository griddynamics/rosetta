# Finding Entry Templates + Output Document Skeleton — gap-and-contradiction-analysis

Loaded on demand from SKILL.md when the agent is actively writing finding entries or assembling the analysis document. The base SKILL.md keeps the process steps, the four finding-type taxonomies (what to look for), the GATEs, `<safety_boundaries>`, `<failure_handling>`, and `<validation_checklist>` — the decision-time content. This file holds the verbatim markdown templates that are filled in at write time.

---

## Contradiction Entry Template (referenced from `<identify_contradictions>` step 2)

```markdown
### C1: [Brief Title]
**Type**: Value Mismatch / Logic Conflict / Requirement Conflict
**Source 1**: [Source] - [Field/Section] - "[Quote]"
**Source 2**: [Source] - [Field/Section] - "[Quote]"
**Impact**: [Why this matters]
**Needs Clarification**: [Specific question]
```

Required fields: Type (one of the three SKILL.md `<identify_contradictions>` categories), Source 1 + Source 2 (each with field/section + verbatim quote), Impact, Needs Clarification. Numbering: `C1`, `C2`, … contiguous; the Executive Summary's Contradictions count = the highest C-N index.

---

## Gap Entry Template (referenced from `<identify_gaps>` step 3)

```markdown
### G1: [Brief Title]
**Type**: Functional / Non-Functional / Data / Business Logic / Dependency
**Context**: [Where this is needed]
**Missing Information**: [What's not specified]
**Impact**: [Why implementation blocked without this]
**Suggested Question**: [How to ask for this information]
```

Required fields: Type (one of the five SKILL.md `<identify_gaps>` categories), Context, Missing Information, Impact, Suggested Question. Numbering: `G1`, `G2`, … contiguous; the Executive Summary's Gaps count = the highest G-N index.

---

## Ambiguity Entry Template (referenced from `<identify_ambiguities>` step 4)

```markdown
### A1: [Brief Title]
**Source**: [Source] - [Section/Page]
**Vague Statement**: "[Quote]"
**Possible Interpretations**:
  1. [Interpretation 1]
  2. [Interpretation 2]
**Clarification Needed**: [Specific question]
```

Required fields: Source (with section/page citation), Vague Statement (verbatim quote), Possible Interpretations (≥2 distinct readings), Clarification Needed. Numbering: `A1`, `A2`, … contiguous; the Executive Summary's Ambiguities count = the highest A-N index.

---

## Cross-Reference Findings Template (referenced from `<cross_reference_sources>` step 5)

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

Three subsections required when ≥2 sources are present: Only-in-A items, Only-in-B items, Overlapping-but-different-detail items. **Single-source case:** per `<failure_handling>`, replace this section with `Skipped — only one source available (<source name>); no cross-reference possible.` — do NOT fabricate Source B comparisons.

---

## Output Document Skeleton (referenced from `<output_format>` step 6)

The full analysis document the skill produces. All 10 sections are required; empty sections use `None found` (or the failure-handling-specific phrasing) — never silently omitted.

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
- **Severity**: [High / Medium / Low] — matches the parent SKILL.md `<safety_boundaries>` rule 3 three-tier scheme (no fourth Critical/Urgent/Blocker tier)

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

[Findings from cross-reference, OR `Skipped — only one source available (<source name>); no cross-reference possible.` per `<failure_handling>` single-source rule]

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

<!-- end-of-gap-and-contradiction-analysis -->
```

**Anchor emission rule:** The literal HTML comment `<!-- end-of-gap-and-contradiction-analysis -->` MUST be the last line of the file (no trailing newlines after it, no other content after it). This is the public append-anchor declared by `<output_format>`; downstream phases append further sections by inserting **before** this marker (then re-emitting the marker as the last line) OR by treating it as the splice point. The marker is part of the skill's stable public contract; do NOT rename it or change its placement when revising the skeleton above.

If NO issues found, still produce the document with "No issues found" in each finding section per `<failure_handling>` discipline (the document must exist even on a clean analysis so downstream phases have a verifiable artifact).
