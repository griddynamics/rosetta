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

The assembled document has **front-matter (Document Control + Executive Summary) + 10 numbered sections in order** (the phase contract — single source of truth shared with `references/output-schemas.md` "Document wrapper" + `testgen-flow-requirements-document-generation.md` `<create_requirements_document>` Canonical section list):

- **Front-matter:** Document Control · Executive Summary.
- **Numbered sections 1–10:** 1. User Stories (US-N) — 2. Functional Requirements (FR-N) — 3. Non-Functional Requirements (NFR-N) — 4. Constraints (C-N) — 5. Dependencies (D-N) — 6. Out of Scope — 7. Assumptions (A-N) — 8. Risks (R-N) — 9. Traceability Matrix — 10. Glossary.

`<validation_checklist>` traceability greps target the **numbered** sections (e.g. "sections 1-3" = US / FR / NFR); front-matter is not in the numbering.

Verbatim document wrapper (skeleton + field shapes + Executive Summary template) lives in [references/output-schemas.md "Document wrapper"](references/output-schemas.md#document-wrapper-referenced-from-skillmd-output_format) — load on demand at process step 9 when assembling.

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

Only **genuinely additive** failure modes (rules already enforced by `<quality_guidelines>` / `<safety_boundaries>` / `<failure_handling>` / `<validation_checklist>` are NOT restated):

- **Verbatim Jira/Confluence copy-paste** — synthesis means re-shaping source content into the per-requirement schema (`requirements-authoring` MUST/SHOULD/MAY voice, structural normalization), not paraphrase-via-quoting. The validation_checklist's no-fabrication grep is the inverse direction; this rule covers the other end.
- **Technical implementation details in user stories** — `As a/I want/So that` is user-value framing, not architectural design. Implementation language (database, endpoint, payload) belongs in FR/NFR, not US.
- **Acceptance criteria that are subjective** — "easy to use", "feels fast", "intuitive". AC must be observable and testable; if the source provides only subjective language, derive a measurable proxy or surface the gap.
- **User stories that are not independently valuable** — a story that only makes sense alongside another belongs in one combined story OR as an FR. INVEST's independence dimension; no other section enforces it.

</pitfalls>

<failure_handling>

- **Zero supporting docs** (only the primary source present, no Confluence / docs / additional context): proceed with synthesis from the primary source alone. Record in the Executive Summary: `Sources: <primary only> — no supporting documentation available`. Tag every assumption derived solely from the primary source with `Confidence: Single-source` so reviewers know it lacks cross-validation. Do NOT fabricate supporting content.
- **No user answers collected** (Phase 3 was skipped, no `answers.md`, or `answers.md` is empty): proceed with synthesis from the available sources. For every gap that *would have been* resolved by a user answer, create an `A-N` assumption entry per the assumptions-and-risks schema with `Based On: missing user clarification (Phase 3 skipped or empty)` and a clear `Validation Plan` for later. Do NOT proceed silently — explicitly mark each missing-answer-driven assumption.
- **Intra-source contradiction** (Jira ticket contradicts itself, or one Confluence page contradicts another section of the same page): record both quotes as a contradiction entry, do NOT auto-resolve by recency / position / paragraph order. Surface as an `A-N` assumption with `Impact if Wrong: <both branches>` and require parent-workflow attention before treating the requirement as final.
- **Primary source missing** (no Jira ticket, no TestRail case, no direct user description — nothing to synthesize from): stop, report `requirements-synthesis: no primary source provided — cannot generate requirements from empty input`, do NOT emit a document with placeholder requirements.
- **Unresolved cross-source conflict after `<source_priority>` applied** (priority ladder did not break the tie because both sources are at the same priority tier and disagree): record as `A-N` assumption per the existing source_priority rule, AND list under the Risks section with `Probability: High` to ensure reviewer attention.
- **Source contains credentials / PII**: redact before quoting per `<safety_boundaries>` (canonical target list + patterns); document the redaction in the requirement's source citation. Do NOT defer redaction.

</failure_handling>

<validation_checklist>

**Grep-proof layer only** — synthesis rules live in `<quality_guidelines>` (source provenance / NFR threshold / coverage / one-behavior-per-requirement / single-source confidence); redaction targets + patterns in `<safety_boundaries>`. Items below are per-document greps; no rule is restated here.

- **Source-field grep** per `<quality_guidelines>` source-provenance rule: no FR/NFR/US/C/D entry with `Source: [Reference]` placeholder unfilled.
- **NFR threshold grep** per `<quality_guidelines>` threshold rule: every NFR `Measurement` field has a numeric or categorical value; thresholdless NFRs moved to `assumptions-and-risks`.
- **Vague-adjective grep:** re-grep for `fast`, `user-friendly`, `secure`, `scalable`, `robust`, `intuitive` in requirement bodies — must be quantified or removed.
- **Traceability completeness grep:** every `FR-N`/`NFR-N`/`US-N` from sections 1–3 has a row; Source populated; Test Scenario populated or `[placeholder for test phase]`.
- **Assumption fields grep:** every `A-N` has Impact-if-Wrong + Validation Plan.
- **Risk fields grep:** every `R-N` has Probability + Impact + Mitigation.
- **Executive Summary source list grep** per `<failure_handling>`: every source actually consulted listed; single-source / no-user-answers / intra-source-contradiction state markers present when applicable.
- **One-behavior-per-requirement grep** per `<quality_guidelines>`: composite `... AND ...` requirements are split.
- **Redaction re-scan** per `<safety_boundaries>` target list + pattern set (`Bearer `, `password:`, `api_key=`, JWT shape, `BEGIN PRIVATE KEY`, PII shapes) — single source of truth in `<safety_boundaries>`; not restated here.

</validation_checklist>

</requirements-synthesis>
