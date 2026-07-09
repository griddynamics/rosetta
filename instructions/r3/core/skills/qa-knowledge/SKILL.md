---
name: qa-knowledge
description: "To supply the QA-domain conventions: failure taxonomies, authoring & correction discipline, and artifact skeletons."
license: Apache-2.0
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<qa_knowledge>

<when_to_use_skill>

Use when authoring, analyzing, or correcting backend-API or UI/E2E tests and needing QA conventions: failure taxonomies, assertion & coverage discipline, selector & page-object rules, and the artifact skeletons these tasks emit. TestRail/Jira/Confluence are used as canonical examples, adapt to current case.

</when_to_use_skill>

<core_concepts>

- Load only what the current task needs;
- artifact skeletons are assets, ACQUIRE FROM KB at point of use;
- conventions are references -- see `<resources>`.

</core_concepts>

<resources>

Router -- ACQUIRE FROM KB the one your current step needs (point-of-use, never all at once):

| When you need to… | ACQUIRE ... FROM KB |
|---|---|
| present a correction for approval (API-QA **or** UI-QA) | `qa-knowledge/assets/proposed-change-template.md` |
| run the explicit-approval gate for a correction or spec/plan approval | `qa-knowledge/assets/approval-gate.md` |
| emit the QA api-analysis artifact | `qa-knowledge/assets/api-analysis-template.md` |
| emit QA test specs (Given-When-Then `ATC-NNN`) | `qa-knowledge/assets/test-spec-template.md` |
| record the API-QA test-implementation | `qa-knowledge/assets/api-qa-test-impl-record.md` |
| emit the API-QA execution report | `qa-knowledge/assets/failure-report-template.md` |
| record QA gap-analysis findings (G/C/A) | `qa-knowledge/assets/gap-finding-templates.md` |
| build the UI-QA test plan | `qa-knowledge/assets/ui-qa-plan-template.md` |
| emit the UI-QA code-analysis report | `qa-knowledge/assets/code-analysis-report-template.md` |
| run UI-QA clarification (gap entry / questions / typed assertions) | `qa-knowledge/assets/ui-qa-clarification-templates.md` |
| record the UI-QA test-implementation | `qa-knowledge/assets/ui-qa-test-impl-record.md` |
| emit the UI-QA failure analysis | `qa-knowledge/assets/failure-report-template.md` |
| send the page-source capture message to the user | `qa-knowledge/assets/page-source-capture-instructions.md` |
| classify a QA backend-API failure | `qa-knowledge/references/api-qa-failure-taxonomy.md` |
| classify an UI-QA UI/E2E failure | `qa-knowledge/references/ui-qa-failure-taxonomy.md` |

</resources>

<anti_patterns>

Flag/refuse these before proceeding:

- Redacting from memory instead of running the `sensitive-data` pre-emit re-scan grep gate -- or emitting when the scan could not run (**fail-closed**: stop, never emit unscanned).
- Writing an artifact from memory instead of ACQUIRE-ing its skeleton/template first.
- Silent ATC / assertion drop -- every ATC (QA) or typed assertion (UI-QA) is implemented **or** recorded (Gap / Uncovered), never dropped.
- Collapsing multiple ATCs / assertions into one bullet -- one per bullet.
- Inventing an artifact's shape the skill owns instead of ACQUIRE-ing the asset.
- Restating a taxonomy or template inline instead of pointing to its reference/asset (DRY).

</anti_patterns>

</qa_knowledge>
