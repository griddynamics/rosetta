---
name: qa-knowledge
description: "Rosetta — QA/AQA test-automation conventions: failure taxonomies, redaction scope, authoring & correction discipline, and the artifact skeletons each phase emits."
license: Apache-2.0
tags: ["qa", "aqa", "skills"]
baseSchema: docs/schemas/skill.md
---

<qa_knowledge>

<when_to_use_skill>

Activate inside any QA or AQA flow phase that authors, analyzes, or corrects tests and needs the QA/AQA-domain conventions general skills don't own — failure taxonomies, redaction scope, assertion/coverage discipline, selector & page-object rules, and the artifact skeletons each phase emits. This is the HOW layer; WHERE artifacts live is owned by `qa-structure`.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- This skill carries only QA/AQA-specific conventions; generic collection, analysis, authoring, triage, and redaction mechanics are owned by the phase's other loaded skills and are not restated here.
- Load only what the current step needs: artifact skeletons are assets, ACQUIRE'd at point of use; flow-specific conventions are references — see `<resources>`.
- Shared discipline (both flows): the proposed-change approval template, the test-implementation record, and redaction scope are single assets/references reused by QA and AQA alike — the calling phase supplies only flow-specific parameters (change-type enum, root-cause reference, loop target, state-file path).

</core_concepts>

<resources>

- asset `qa-knowledge/assets/proposed-change-template.md` — shared QA/AQA correction approval block (presented before any write)
- asset `qa-knowledge/assets/api-analysis-template.md` — QA api-analysis per-endpoint contract entry + Analysis Summary metrics
- asset `qa-knowledge/assets/test-spec-template.md` — QA test-specs skeleton (GWT ATC scenarios, file mapping, utilities)
- asset `qa-knowledge/assets/qa-test-impl-record.md` — QA Phase 5 hand-off summary fields
- asset `qa-knowledge/assets/execution-report-template.md` — QA execution-report skeleton
- asset `qa-knowledge/assets/gap-finding-templates.md` — QA gap-analysis G/C/A finding-entry forms
- asset `qa-knowledge/assets/aqa-plan-template.md` — AQA test-plan skeleton (Test Case Info, Feature Context, Access/Cross-Reference notes)
- asset `qa-knowledge/assets/code-analysis-report-template.md` — AQA code-analysis 9-section report + test-location rule
- asset `qa-knowledge/assets/aqa-clarification-templates.md` — AQA Phase 2 gap entry, questions message, clarification section (typed Explicit Assertions)
- asset `qa-knowledge/assets/aqa-test-impl-record.md` — AQA Phase 6 Test Implementation record
- asset `qa-knowledge/assets/failure-analysis-template.md` — AQA failure-analysis skeleton
- asset `qa-knowledge/assets/page-source-capture-instructions.md` — verbatim user-facing page-source capture message
- reference `qa-knowledge/references/redaction-scope.md` — shared QA/AQA redaction scope + pre-emit re-scan list
- reference `qa-knowledge/references/qa-failure-taxonomy.md` — QA backend-API failure taxonomy
- reference `qa-knowledge/references/aqa-failure-taxonomy.md` — AQA UI/E2E failure taxonomy

</resources>

</qa_knowledge>
