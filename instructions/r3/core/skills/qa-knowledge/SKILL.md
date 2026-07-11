---
name: qa-knowledge
description: "To run QA engineering — requirements/gap analysis, scenario & spec design, test implementation, failure triage — over the QA knowledge base."
license: Apache-2.0
disable-model-invocation: false
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<qa_knowledge>

<role>

QA-engineering skill. Runs the QA flow -- code analysis, requirements synthesis, gap analysis, scenario/spec design, QA test implementation, failure triage -- over the QA knowledge base (failure taxonomies, catalogs, artifact skeletons) it owns. Emits into the provided artifact contract; never invents its shape or path.

</role>

<when_to_use_skill>

Use for QA-engineering work on backend-API or UI/E2E tests: synthesizing collected sources into requirements, analyzing gaps/contradictions, designing test scenarios / specs / TMS cases, implementing QA tests (UI / API / selectors) from a plan or approved specs, triaging execution failures, or recovering test-automation architecture / API contracts. Also supplies the QA conventions and artifact skeletons these tasks emit. Plain unit/integration test writing is skill `testing`, not this flow. TestRail/Jira/Confluence are canonical examples, adapt to the current case.

</when_to_use_skill>

<dependencies>

- **MUST USE SKILL `reverse-engineering`** for the `code_analysis` mode (test-automation architecture analysis, API-contract extraction).
- USE SKILL `coding` for repo conventions; `debugging` for failing tests; `sensitive-data` for redaction (canonical authority).
- ACQUIRE QA paths / identifiers / state from `qa-structure` at point of use.

</dependencies>

<core_concepts>

- Load only what the current task needs; artifact skeletons are assets, conventions/catalogs are references -- ACQUIRE FROM KB at point of use (see `<resources>`).
- Per-value honesty: every concrete value traces to a loaded source, a user clarification, or an explicit `[ASSUMED: ...]` / `gap: ...` marker -- no confident fabrication.
- Coverage is total: every input requirement / case / failure maps to ≥1 emitted item OR an explicit excluded/gap entry -- no silent drops.
- Redaction: scan every emitted artifact and redact credentials/tokens/PII/credentialed-URLs before writing → USE SKILL `sensitive-data`.

</core_concepts>

<mode_selection>

Pick exactly one mode by deliverable (multi-phase → run the earliest, stop; the next phase re-invokes); ACQUIRE its reference from `<resources>`. No clean match → name the closest mode and confirm, never silently pick. (Plain unit/integration tests are skill `testing`, not a mode here.)

- code → test-arch map / API contract → **code_analysis** (analysis, no tests; via prereq skill `reverse-engineering`)
- collected sources → one requirements doc → **synthesis** (redact before quoting)
- find gaps/contradictions, no fixing → **gap_analysis** (analysis-only: surface each finding and STOP)
- design test **cases/specs** incl. TMS, **not runnable** → **scenario_design**
- write **runnable** QA tests (UI / API / selectors) from a plan/specs → **implementation_modes**
- categorize run-report failures, no fixing → **test_execution_triage** (read-only)

</mode_selection>

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
| synthesize collected sources into a requirements document (`<synthesis>` mode) | `qa-knowledge/references/synthesis-catalogs.md` |
| run QA gap-analysis detection (`<gap_analysis>` mode) | `qa-knowledge/references/gap-analysis-catalogs.md` |
| design Given-When-Then API specs -- taxonomy + ATC template (`<scenario_design>` mode) | `qa-knowledge/references/gwt-spec.md` |
| format test cases for TestRail (scenario_design vendor binding) | `qa-knowledge/references/testrail-format.md` |
| export a case set to TestRail (vendor binding + destructive-write gate) | `qa-knowledge/references/testrail-export.md` |
| fork a TMS format/export binding to another vendor | `qa-knowledge/references/vendor-fork-guide.md` |
| implement UI / API / selector tests -- code + selector tables + templates (`<implementation_modes>` mode) | `qa-knowledge/references/implementation-examples.md` |
| analyze test-automation architecture or extract API contracts (`<code_analysis>` mode, via reverse-engineering) | `qa-knowledge/references/analysis-modes.md` |
| triage automated-test execution failures (`<test_execution_triage>` mode) | `qa-knowledge/references/test-execution-triage.md` |

</resources>

<validation_checklist>

Per active mode, before emitting:

- code_analysis: (API-contract) every target endpoint has an entry OR a flagged gap, each with source citations + a Notes/Discrepancies field (`None.` if reconciled); (test-arch) every optional input marked `available` / `not available -- <impact>`; read-only.
- synthesis: every requirement carries a Source; conflicts resolved via the source-priority ladder or flagged as an assumption; thresholdless NFRs flagged.
- gap_analysis: each finding has a verbatim quote + citation + impact + exactly one risk tier; analysis-only (no fixes/questions); a clean analysis still emits the artifact.
- scenario_design: total coverage (every case/requirement → ≥1 ATC/case or an excluded/gap entry); per-value honesty holds; auth-protected endpoints have ≥1 auth-failure scenario; vendor export passed the destructive-write gate.
- implementation_modes: every plan assertion / ATC implemented OR recorded as uncovered/gap (no silent drop); page objects only (no raw selectors); lint/format clean on touched files.
- test_execution_triage: every failure has exactly one taxonomy category and exactly one evidence label; `Unknown` states the missing capture; cross-failure Patterns present when ≥2 failures share a cause; read-only.

</validation_checklist>

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
