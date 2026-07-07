---
name: qa-knowledge
description: "To supply the QA-domain conventions API-QA and UI-QA phases need: failure taxonomies, redaction scope, authoring & correction discipline, and the artifact skeletons each phase emits."
license: Apache-2.0
tags: ["qa", "api-qa", "ui-qa", "skills"]
baseSchema: docs/schemas/skill.md
---

<qa_knowledge>

<when_to_use_skill>

Use when authoring, analyzing, or correcting automated backend-API or UI/E2E tests and you need QA-domain conventions: failure taxonomies, redaction scope, assertion & coverage discipline, selector & page-object rules, and the artifact skeletons these tasks emit.

</when_to_use_skill>

<core_concepts>

- Load only what the current task needs: artifact skeletons are assets, ACQUIRE'd at point of use; conventions are references — see `<resources>`.
- The proposed-change approval template (`proposed-change-template.md`) and redaction scope (`redaction-scope.md`) apply to both backend-API and UI/E2E test work; the test-implementation record does not — use `api-qa-test-impl-record.md` for backend-API hand-off and `ui-qa-test-impl-record.md` for UI hand-off (per `<resources>`).

</core_concepts>

<resources>

Router — ACQUIRE the one your current step needs (point-of-use, never all at once):

| When you need to… | ACQUIRE |
|---|---|
| present a correction for approval (API-QA **or** UI-QA) | `qa-knowledge/assets/proposed-change-template.md` |
| run the explicit-approval gate (closed token list / loose-phrasing rejection / max-retry / partial approval) for a correction or spec/plan approval | `qa-knowledge/assets/approval-gate.md` |
| emit the QA api-analysis artifact | `qa-knowledge/assets/api-analysis-template.md` |
| emit QA test specs (Given-When-Then `ATC-NNN`) | `qa-knowledge/assets/test-spec-template.md` |
| record the QA test-implementation hand-off | `qa-knowledge/assets/api-qa-test-impl-record.md` |
| emit the QA execution report | `qa-knowledge/assets/execution-report-template.md` |
| record QA gap-analysis findings (G/C/A) | `qa-knowledge/assets/gap-finding-templates.md` |
| build the UI-QA test plan | `qa-knowledge/assets/ui-qa-plan-template.md` |
| emit the UI-QA code-analysis report | `qa-knowledge/assets/code-analysis-report-template.md` |
| run UI-QA clarification (gap entry / questions / typed assertions) | `qa-knowledge/assets/ui-qa-clarification-templates.md` |
| record the UI-QA test-implementation | `qa-knowledge/assets/ui-qa-test-impl-record.md` |
| emit the UI-QA failure analysis | `qa-knowledge/assets/failure-analysis-template.md` |
| send the page-source capture message to the user | `qa-knowledge/assets/page-source-capture-instructions.md` |
| redact before writing **any** tracked artifact | `qa-knowledge/references/redaction-scope.md` |
| classify a QA backend-API failure | `qa-knowledge/references/api-qa-failure-taxonomy.md` |
| classify an UI-QA UI/E2E failure | `qa-knowledge/references/ui-qa-failure-taxonomy.md` |

</resources>

<anti_patterns>

Flag/refuse these before proceeding:

- Redacting "from memory" instead of running the `redaction-scope` grep list as the pre-emit gate — and emitting anyway when that ACQUIRE failed (the gate is **fail-closed**: stop, never emit unscanned).
- Writing an artifact from memory instead of ACQUIRE-ing its skeleton/template first.
- Silent ATC / assertion drop — every ATC (QA) or typed assertion (UI-QA) is implemented **or** recorded (Gap / Uncovered), never dropped.
- Collapsing multiple ATCs / assertions into one bullet — one per bullet.
- Inventing an artifact's shape the skill owns instead of ACQUIRE-ing the asset.
- Restating a taxonomy or template inline instead of pointing to its reference/asset (DRY).

</anti_patterns>

</qa_knowledge>
