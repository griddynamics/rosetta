# QA gap-finding templates

QA gap-analysis finding-entry forms -- G[N] gaps, C[N] contradictions, A[N] ambiguities.

<gap-finding-templates>

Finding-entry shapes for the gap-analysis artifact (one per finding). Redact credentials/PII in any quoted line before writing (→ `sensitive-data`); for the full per-finding authoring discipline (verbatim quotes, citation, concrete impact) READ SKILL FILE `references/gap-analysis-catalogs.md`.

**Classify each finding into exactly one type:** **G (Gap)** -- information is absent entirely · **C (Contradiction)** -- two sources state conflicting facts · **A (Ambiguity)** -- one source uses language with ≥2 valid interpretations. When a finding fits more than one type, file under the **most actionable** (C > A > G) and add a cross-reference in its `Impact` / `Needs Clarification` field.

**Source vocabulary** (for `Source` / `Source 1|2` fields): one of `Test Case`, `Swagger/OpenAPI`, `Docs`, `User Instructions`.

**Done when** every finding has a unique sequential index (`G1…`/`C1…`/`A1…`), each `[Quote]` holds verbatim source text, no `[placeholder]` remains, and `Impact` is non-blank.

```markdown
### G[N]: [Brief Title]
**Type**: Endpoint / Request / Response / Auth / Test Data / Edge Case
**Context**: [Which test step or endpoint]
**Missing Information**: [What is not specified]
**Impact**: [Why automation is blocked or degraded]
**Suggested Question**: [How to ask for this]

### C[N]: [Brief Title]
**Source 1**: [Test Case / Swagger / Docs] -- "[Quote]"
**Source 2**: [Test Case / Swagger / Docs] -- "[Quote]"
**Impact**: [Why this matters for test automation]
**Needs Clarification**: [Specific question]

### A[N]: [Brief Title]
**Source**: [Test Case / Docs / Swagger]
**Vague Statement**: "[Quote]"
**Possible Interpretations**: 1. [...] 2. [...]
**Clarification Needed**: [Specific question]
```

**Worked examples** (one per type, QA-domain):

```markdown
### G1: Order-status enum not specified
**Type**: Response
**Context**: GET /api/v1/orders/{id} -- `status` field
**Missing Information**: the set of valid `status` values is not listed in Swagger or the test case
**Impact**: cannot assert status transitions; negative tests for invalid status are unauthorable
**Suggested Question**: What are the allowed `order.status` values and their transitions?

### C1: Conflicting success status code
**Source 1**: Swagger/OpenAPI -- "POST /orders returns 201"
**Source 2**: Test Case TC-42 -- "expect 200 on create"
**Impact**: the happy-path status assertion would be wrong against one of the sources
**Needs Clarification**: Is order-create success 200 or 201?

### A1: "appropriate timeout" undefined
**Source**: Docs
**Vague Statement**: "the request should fail after an appropriate timeout"
**Possible Interpretations**: 1. client-side 30s abort  2. server 504 after the gateway limit
**Clarification Needed**: What exact timeout value/behavior should the test assert?
```

</gap-finding-templates>
