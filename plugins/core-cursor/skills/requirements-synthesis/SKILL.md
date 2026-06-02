---
name: requirements-synthesis
description: Synthesize data from multiple sources (Jira, Confluence, user answers, analysis) into a structured requirements document with user stories, functional/non-functional requirements, constraints, and traceability.
tags: ["requirements", "synthesis", "analysis"]
baseSchema: docs/schemas/skill.md
---

<requirements-synthesis>

<role>Requirements synthesis specialist — transforms collected multi-source data into structured requirements</role>

<when_to_use_skill>
Use when raw data has been collected from multiple sources (Jira, Confluence, TestRail, user answers) and needs to be synthesized into a single structured requirements document. Not for full requirements lifecycle management — for that, use `requirements-authoring`.
</when_to_use_skill>

<prerequisites>
- Collected raw data from at least one source
- Analysis of gaps/contradictions (if performed)
- User answers to clarification questions (if collected)
</prerequisites>

<process>

The six per-requirement schemas live in [references/output-schemas.md](references/output-schemas.md). Each step below names the schema section to load; the agent reads only the active section rather than holding all six schemas in working memory at once.

1. Load all source data (raw-data files, analysis output, user answers if present). Surface gaps per `<failure_handling>`.
2. Resolve conflicts per `<source_priority>`. Apply `<failure_handling>` branches for single-source / missing-answers / intra-source-contradiction cases.
3. Generate user stories per the **user-stories** schema in [references/output-schemas.md](references/output-schemas.md#user-stories).
4. Generate functional requirements per the **functional-requirements** schema in [references/output-schemas.md](references/output-schemas.md#functional-requirements).
5. Generate non-functional requirements per the **non-functional-requirements** schema in [references/output-schemas.md](references/output-schemas.md#non-functional-requirements).
6. Document constraints, dependencies, out-of-scope per the **constraints-and-dependencies** schema in [references/output-schemas.md](references/output-schemas.md#constraints-and-dependencies).
7. Document assumptions and risks per the **assumptions-and-risks** schema in [references/output-schemas.md](references/output-schemas.md#assumptions-and-risks).
8. Build traceability matrix per the **traceability-matrix** schema in [references/output-schemas.md](references/output-schemas.md#traceability-matrix).
9. Assemble requirements document per `<output_format>`.
10. Run `<validation_checklist>` — fix any failing item before declaring complete.

Apply `<safety_boundaries>` redaction continuously whenever quoting or paraphrasing source content into the document.

</process>

<source_priority>

When sources conflict, resolve using this priority order:
1. **User answers** — highest authority (explicit human decisions)
2. **Primary source** (Jira ticket, TestRail case) — direct requirement source
3. **Supporting docs** (Confluence pages) — contextual information
4. **Analysis insights** — derived from gap/contradiction analysis

If unresolved, document as assumption with impact-if-wrong.

</source_priority>

<output_format>

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
[US-N entries — schema in references/output-schemas.md#user-stories]

## 2. Functional Requirements
[FR-N entries — schema in references/output-schemas.md#functional-requirements]

## 3. Non-Functional Requirements
[NFR-N entries — schema in references/output-schemas.md#non-functional-requirements]

## 4. Constraints
[C-N entries — schema in references/output-schemas.md#constraints-and-dependencies]

## 5. Dependencies
[D-N entries — schema in references/output-schemas.md#constraints-and-dependencies]

## 6. Out of Scope
[Explicit exclusions with rationale]

## 7. Assumptions
[A-N entries — schema in references/output-schemas.md#assumptions-and-risks]

## 8. Risks
[R-N entries — schema in references/output-schemas.md#assumptions-and-risks]

## 9. Traceability Matrix
[Table linking requirements → sources → stories → tests — schema in references/output-schemas.md#traceability-matrix]

## 10. Glossary
[Technical terms, acronyms, domain-specific language]
```

</output_format>

<quality_guidelines>

Synthesis-specific quality rules only. **General requirement-authoring conventions — SMART criteria, MUST/SHOULD/MAY language rules, P0-P3 priority taxonomy — live in the `requirements-authoring` skill.** Apply that skill for the shared conventions; do not restate them here.

Synthesis-specific rules:

- **Source provenance:** every requirement carries an explicit `Source` field pointing to a source row, ticket, page section, or user-answer index — synthesis with absent provenance is fabrication.
- **NFR threshold rule:** every NFR includes a verifiable threshold; NFRs without thresholds are moved to `assumptions-and-risks` with a missing-threshold flag (see references/output-schemas.md#non-functional-requirements).
- **Coverage discipline:** do not pad requirements by category to look thorough — include only what the sources actually specify. Empty categories stay empty.
- **One behavior per requirement:** composite "must do A AND B" requirements are split into separate entries at synthesis time, not deferred to authoring.
- **Single-source confidence flag:** when only the primary source was available (no Confluence / supporting docs), every derived assumption carries `Confidence: Single-source` per `<failure_handling>`.

</quality_guidelines>

<safety_boundaries>

The requirements document is a **DRAFT, version-tracked, downstream-fed artifact** — treat the output as **PUBLIC by default**.

- **Redact sensitive values before quoting source content.** Targets: credentials, tokens, API keys, passwords, JWTs, private keys, service-account JSON, signed/credentialed URLs (`https://user:pass@…`, presigned links), and PII (real names, emails, phone numbers, payment data, account/customer IDs, government IDs). Replace with shape-preserving placeholders: `<redacted: credential>`, `<redacted: signed URL>`, `<redacted: customer email>`, `<redacted: PII>`, or synthetic values (`test.user@example.com`, `+1-555-0100`).
- **Flag every redaction inline** with a one-line note next to the citation: `Source: Jira PROJ-123 — Bearer token redacted; see env var API_TOKEN`.
- **Structural content is safe** — endpoint paths, HTTP methods, status codes, field names, schema shapes, feature names. Redaction targets sensitive **values**, not the structural spec.
- **Never infer redacted content.** Do not guess what a value "probably is" or reconstruct credentials from partial source data.
- **Re-scan at step 10** — `<validation_checklist>` enforces a re-grep for credential-shaped (`Bearer `, `password:`, `api_key=`, JWT shape, `BEGIN PRIVATE KEY`) and PII-shaped patterns before emit.

</safety_boundaries>

<pitfalls>
- Don't copy Jira/Confluence verbatim — synthesize and structure into proper requirements
- Don't use technical implementation details in user stories — focus on user/business value
- Acceptance criteria must be testable and objective, not subjective
- Each user story must be independently valuable
- Don't skip traceability — every requirement must link to a source
- Document all assumptions from unresolved questions with impact-if-wrong
- Padding FRs or NFRs by category to look thorough — only include what the sources actually specify
- Emitting NFRs without thresholds — they're gaps, not requirements; record under assumptions/risks instead
- Inventing comparisons across sources when only one source exists — see `<failure_handling>` single-source branch
- Copying credentials / tokens / PII verbatim from source content into the document — apply `<safety_boundaries>` redaction
- Restating SMART / priority / language conventions here — those belong to `requirements-authoring`; this skill defers to it
</pitfalls>

<failure_handling>

- **Zero supporting docs** (only the primary source present, no Confluence / docs / additional context): proceed with synthesis from the primary source alone. Record in the Executive Summary: `Sources: <primary only> — no supporting documentation available`. Tag every assumption derived solely from the primary source with `Confidence: Single-source` so reviewers know it lacks cross-validation. Do NOT fabricate supporting content.
- **No user answers collected** (Phase 3 was skipped, no `answers.md`, or `answers.md` is empty): proceed with synthesis from the available sources. For every gap that *would have been* resolved by a user answer, create an `A-N` assumption entry per the assumptions-and-risks schema with `Based On: missing user clarification (Phase 3 skipped or empty)` and a clear `Validation Plan` for later. Do NOT proceed silently — explicitly mark each missing-answer-driven assumption.
- **Intra-source contradiction** (Jira ticket contradicts itself, or one Confluence page contradicts another section of the same page): record both quotes as a contradiction entry, do NOT auto-resolve by recency / position / paragraph order. Surface as an `A-N` assumption with `Impact if Wrong: <both branches>` and require parent-workflow attention before treating the requirement as final.
- **Primary source missing** (no Jira ticket, no TestRail case, no direct user description — nothing to synthesize from): stop, report `requirements-synthesis: no primary source provided — cannot generate requirements from empty input`, do NOT emit a document with placeholder requirements.
- **Unresolved cross-source conflict after `<source_priority>` applied** (priority ladder did not break the tie because both sources are at the same priority tier and disagree): record as `A-N` assumption per the existing source_priority rule, AND list under the Risks section with `Probability: High` to ensure reviewer attention.
- **Source contains credentials / PII** (any redaction-trigger pattern per `<safety_boundaries>`): redact before quoting; do NOT defer redaction to a later phase or copy verbatim "for completeness". Document the redaction in the requirement's source citation.

</failure_handling>

<validation_checklist>

Run as process step 10 before declaring the document complete. All items must hold:

- **Every requirement has a Source field populated** — no FR/NFR/US/C/D entry with `Source: [Reference]` placeholder unfilled.
- **Every NFR has a concrete Measurement threshold** — numeric (latency, RPS, percentile) or categorical (WCAG level, compliance standard). NFRs without thresholds were moved to assumptions-and-risks per the threshold rule.
- **No vague adjectives in any requirement body** — `fast`, `user-friendly`, `secure`, `scalable`, `robust`, `intuitive` etc. are forbidden; each must be quantified or removed. Re-grep the assembled document before emitting.
- **Traceability matrix is complete** — every `FR-N` / `NFR-N` / `US-N` from sections 1-3 appears as a row; Source column populated; Test Scenario column either populated or marked `[placeholder for test phase]`.
- **Every Assumption has Impact-if-Wrong and Validation Plan** — no `A-N` entry with those fields blank.
- **Every Risk has Probability + Impact + Mitigation** — no `R-N` entry with any of those fields blank.
- **Executive Summary lists every source actually consulted** — and explicitly marks single-source / no-user-answers / intra-source-contradiction states when they apply per `<failure_handling>`.
- **No fabricated content** — every requirement traces to a quoted or paraphrased item in a source; padding requirements to look thorough is forbidden.
- **One behavior per requirement** — composite "must do A AND B" requirements are split into separate entries.
- **Redaction re-scan ran** per `<safety_boundaries>` — assembled document was grepped for credential-shaped patterns (`Bearer `, `password:`, `api_key=`, JWT shapes, `BEGIN PRIVATE KEY`) and PII-shaped patterns; any hit was redacted with the redaction note attached.

</validation_checklist>

</requirements-synthesis>
