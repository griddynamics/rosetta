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

Document each contradiction using the **C-N entry template** in [references/entry-templates-and-document-skeleton.md](references/entry-templates-and-document-skeleton.md#contradiction-entry-template-referenced-from-identify_contradictions-step-2) — load on demand when writing entries. Required fields: Type / Source 1 / Source 2 / Impact / Needs Clarification.

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

Document each gap using the **G-N entry template** in [references/entry-templates-and-document-skeleton.md](references/entry-templates-and-document-skeleton.md#gap-entry-template-referenced-from-identify_gaps-step-3) — load on demand. Required fields: Type / Context / Missing Information / Impact / Suggested Question.

</identify_gaps>

<identify_ambiguities>

**Ambiguity**: Vague or unclear statements that could be interpreted multiple ways.

Look for:
- Vague terms: "fast", "soon", "many", "few", "approximately"
- Undefined roles: "admin" without definition
- Unclear workflows: "system processes request" (how?)
- Undefined acronyms or terms

Document each ambiguity using the **A-N entry template** in [references/entry-templates-and-document-skeleton.md](references/entry-templates-and-document-skeleton.md#ambiguity-entry-template-referenced-from-identify_ambiguities-step-4) — load on demand. Required fields: Source (with citation) / Vague Statement (verbatim quote) / Possible Interpretations (≥2) / Clarification Needed.

</identify_ambiguities>

<cross_reference_sources>

Compare all sources against each other:
- Information present in one source but not others
- Overlapping information with different level of detail
- Consistent information (positive finding)

Document using the **Cross-Reference Findings template** in [references/entry-templates-and-document-skeleton.md](references/entry-templates-and-document-skeleton.md#cross-reference-findings-template-referenced-from-cross_reference_sources-step-5) — load on demand. Required subsections (≥2 sources): Only-in-A / Only-in-B / Overlapping-but-different-detail. Single-source case: see `<failure_handling>` (skip-with-note).

</cross_reference_sources>

<risk_assessment>

Categorize all findings:

- **High Risk** (Blocks implementation): Cannot proceed without resolution
- **Medium Risk** (Impacts quality): Can proceed but quality/correctness affected
- **Low Risk** (Minor clarification): Nice to have, won't block

</risk_assessment>

<output_format>

The skill produces a single analysis document. **Full skeleton + every-section-required rule** in [references/entry-templates-and-document-skeleton.md](references/entry-templates-and-document-skeleton.md#output-document-skeleton-referenced-from-output_format-step-6) — load on demand when assembling. Risk-tier scheme follows `<safety_boundaries>` rule 3 (three tiers, no fourth). **Zero-issues rule:** the document is still produced even when no findings exist — `No issues found` in each finding section.

</output_format>

<analysis_guidelines>

Authoring guidance for each finding entry. Prohibitions live in `<safety_boundaries>` — not restated here.

- **Be Specific.** Bad: "Some details missing". Good: "User authentication method not specified (OAuth, SAML, basic auth?)".
- **Quote Sources.** Verbatim quote + field/section/page citation in every entry.
- **Assess Impact.** State why the issue matters; link to a concrete downstream blocker.
- **Avoid Assumptions.** Document what's explicitly missing; do not infer requirements not stated.

</analysis_guidelines>

<pitfalls>
- Over-analyzing minor details at the expense of critical blockers
- Skipping cross-reference between sources (legitimately skip-with-note only when there is exactly one source — see `<failure_handling>`)
- Not producing a document when no issues found
</pitfalls>

<safety_boundaries>

This skill is **analysis-only**. The three rules below are the authoritative source — every other block defers to this section.

1. **Do NOT act on findings.** Do not propose code edits, modify sources, call other skills to "fix" gaps, or ask the user directly to resolve items. The parent workflow owns follow-up. If a finding implies downstream work, surface it as a finding and stop.
2. **Output is PUBLIC by default.** It may be tracked, shared with reviewers, or fed to downstream prompts. If a source contains credentials, tokens, API keys, passwords, signed URLs, private keys, or PII (real names / emails / phone numbers / account IDs / payment data), **redact before quoting** using placeholders like `<redacted: bearer token>`, `<redacted: customer email>`, `<redacted: PII>` and flag the redaction in the finding. Do not infer redacted content.
3. **Risk-tier discipline.** The three-tier scheme in `<risk_assessment>` (High / Medium / Low) is the single source of truth. Do not introduce Critical/Urgent/Blocker as a fourth tier. Every finding receives exactly one tier.

</safety_boundaries>

<failure_handling>

- **Input missing** (`raw-data.md` or whatever the parent workflow points at does not exist): stop, report `gap-and-contradiction-analysis: required input missing — <path>` to the parent workflow, do not proceed and do not fabricate an analysis.
- **Input unreadable** (binary / corrupted / parse error): stop, report the parse error with the file path, do not guess at content.
- **Input empty** (file exists but no source data inside): treat as missing — stop and report.
- **Single-source case** (prerequisites name "at least one source"; exactly one source is present): proceed with contradictions / gaps / ambiguities sections **within that single source**, but **skip the `<cross_reference_sources>` step**. Record in the Cross-Reference Analysis section: `Skipped — only one source available (<source name>); no cross-reference possible.` Do NOT fabricate comparisons against absent sources.
- **Source loads partially** (e.g., Confluence MCP truncated a page, TestRail returned without custom fields): record the partial-load fact in the Analysis Metadata section, mark affected findings with a `Partial source: <what was missing>` note, and proceed. Do not silently treat a partial load as complete.
- **All sources empty / no content to analyze**: produce the output document with "No content available" in every finding section and an Executive Summary stating "Cannot analyze — sources empty or unloaded." Do not return a confident "no issues found" verdict from empty input.

</failure_handling>

<validation_checklist>

Before declaring this skill complete, all of the following must hold:

- **Sources loaded:** every source listed in `<prerequisites>` (or in the parent workflow's input path) was actually opened and read — not summarized from memory; the Sources field of the output document enumerates them.
- **All four finding sections written:** Contradictions, Gaps, Ambiguities, Cross-Reference Analysis are each present with real findings OR an explicit "None found" / "Skipped — only one source" line. No section is left as a placeholder or `TBD`.
- **Every finding quotes exact source text:** each C-N, G-N, A-N entry includes a verbatim quote with field/section/page citation. No paraphrased "the source said X" claims without the quote.
- **Every finding has a single risk tier from `<risk_assessment>`:** High, Medium, or Low — not Critical, not multi-tier, not blank.
- **Executive Summary counts match the body:** the Contradictions count equals the number of C-N entries in section 1; same for Gaps (G-N) and Ambiguities (A-N). If they don't match, fix the count before emitting.
- **Sensitive content redacted per `<safety_boundaries>`:** the document was scanned for credentials/tokens/PII; any such content is replaced with `<redacted: ...>` placeholders and noted in the relevant finding.
- **No fabricated cross-references:** if only one source was available, the Cross-Reference Analysis section says so explicitly rather than inventing comparisons.

</validation_checklist>

</gap-and-contradiction-analysis>
