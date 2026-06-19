---
name: qa-knowledge
description: "Rosetta — QA/UI-QA test-automation conventions: failure taxonomies, redaction scope, authoring & correction discipline, and the artifact skeletons each phase emits."
license: Apache-2.0
tags: ["qa", "aqa", "skills"]
baseSchema: docs/schemas/skill.md
---

<qa_knowledge>

<when_to_use_skill>

Activate inside any QA or UI-QA flow phase that authors, analyzes, or corrects tests and needs the QA/UI-QA-domain conventions general skills don't own — failure taxonomies, redaction scope, assertion/coverage discipline, selector & page-object rules, and the artifact skeletons each phase emits. This is the HOW layer; WHERE artifacts live is owned by `qa-structure`.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- This skill carries only QA/UI-QA-specific conventions; generic collection, analysis, authoring, triage, and redaction mechanics are owned by the phase's other loaded skills and are not restated here.
- Load only what the current step needs: artifact skeletons are assets, ACQUIRE'd at point of use; flow-specific conventions are references — see `<resources>`.
- Shared discipline (both flows): the proposed-change approval template (`proposed-change-template.md`) and redaction scope (`redaction-scope.md`) are single assets/references reused by QA and UI-QA alike — for the approval template the calling phase supplies only flow-specific parameters (change-type enum, root-cause reference, loop target, state-file path). The test-implementation record is **flow-specific**, NOT shared: two separate assets — `api-qa-test-impl-record.md` (QA, API hand-off) and `ui-qa-test-impl-record.md` (UI-QA, UI hand-off), per `<resources>`.

</core_concepts>

<resources>

Router — ACQUIRE the one your current step needs (point-of-use, never all at once):

| When a phase needs to… | ACQUIRE |
|---|---|
| present a correction for approval (QA **or** UI-QA) | `qa-knowledge/assets/proposed-change-template.md` |
| run the explicit-approval gate (closed token list / loose-phrasing rejection / max-retry / partial approval) for a correction or spec/plan approval | `qa-knowledge/assets/approval-gate.md` |
| emit the QA api-analysis artifact | `qa-knowledge/assets/api-analysis-template.md` |
| emit QA test specs (Given-When-Then `ATC-NNN`) | `qa-knowledge/assets/test-spec-template.md` |
| record the QA test-implementation hand-off | `qa-knowledge/assets/api-qa-test-impl-record.md` |
| emit the QA execution report | `qa-knowledge/assets/execution-report-template.md` |
| record QA gap-analysis findings (G/C/A) | `qa-knowledge/assets/gap-finding-templates.md` |
| build the UI-QA test plan (Phase 1) | `qa-knowledge/assets/ui-qa-plan-template.md` |
| emit the UI-QA code-analysis report | `qa-knowledge/assets/code-analysis-report-template.md` |
| run UI-QA Phase-2 clarification (gap entry / questions / typed assertions) | `qa-knowledge/assets/ui-qa-clarification-templates.md` |
| record the UI-QA test-implementation | `qa-knowledge/assets/ui-qa-test-impl-record.md` |
| emit the UI-QA failure analysis | `qa-knowledge/assets/failure-analysis-template.md` |
| send the page-source capture message to the user | `qa-knowledge/assets/page-source-capture-instructions.md` |
| redact before writing **any** tracked artifact (both flows) | `qa-knowledge/references/redaction-scope.md` |
| classify a QA backend-API failure | `qa-knowledge/references/api-qa-failure-taxonomy.md` |
| classify an UI-QA UI/E2E failure | `qa-knowledge/references/ui-qa-failure-taxonomy.md` |

</resources>

<anti_patterns>

Flag/refuse these before proceeding:

- Redacting "from memory" instead of running the `redaction-scope` grep list as the pre-emit gate — and emitting anyway when that ACQUIRE failed (the gate is **fail-closed**: stop, never emit unscanned).
- A subagent writing an artifact from memory instead of ACQUIRE-ing its skeleton/template first.
- Silent ATC / assertion drop — every ATC (QA) or typed assertion (UI-QA) is implemented **or** recorded (Gap / Uncovered), never dropped.
- Collapsing multiple ATCs / assertions into one bullet — one per bullet.
- Inventing an artifact's shape the skill owns instead of ACQUIRE-ing the asset.
- Restating a taxonomy or template inline instead of pointing to its reference/asset (DRY).

</anti_patterns>

</qa_knowledge>
