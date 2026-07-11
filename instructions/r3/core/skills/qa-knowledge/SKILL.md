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
- USE SKILL `qa-structure` for QA paths / identifiers / state at point of use.

</dependencies>

<core_concepts>

- Load only what the current task needs; artifact skeletons are assets, conventions/catalogs are references -- READ SKILL FILE at point of use (see `<resources>`).
- Per-value honesty: every concrete value traces to a loaded source, a user clarification, or an explicit `[ASSUMED: ...]` / `gap: ...` marker -- no confident fabrication.
- Coverage is total: every input requirement / case / failure maps to ≥1 emitted item OR an explicit excluded/gap entry -- no silent drops.
- Redaction: scan every emitted artifact and redact credentials/tokens/PII/credentialed-URLs before writing → USE SKILL `sensitive-data`.
- Invocation: an owning phase supplies bindings (paths, IDs, workflow-state path) and deferred decisions. Standalone (no phase) -- ask the user for each and surface outputs to them; never write an assumed workflow-state path. "Ask the phase" in a reference = ask the user; never stall on a decision that cannot arrive.

</core_concepts>

<mode_selection>

Pick exactly one mode by deliverable (multi-phase → run the earliest, stop; the next phase re-invokes); read its reference via `<resources>`. No clean match → name the closest mode and confirm, never silently pick. (Plain unit/integration tests are skill `testing`, not a mode here.)

- code → test-arch map / API contract → **code_analysis** (analysis, no tests; via prereq skill `reverse-engineering`)
- collected sources → one requirements doc → **synthesis** (redact before quoting)
- find gaps/contradictions, no fixing → **gap_analysis** (analysis-only: surface each finding and STOP)
- design test **cases/specs** incl. TMS, **not runnable** → **scenario_design**
- write **runnable** QA tests (UI / API / selectors) from a plan/specs → **implementation_modes**
- categorize run-report failures, no fixing → **test_execution_triage** (read-only)
- propose fixes for failing QA tests + gain explicit approval to apply → **correction** (HITL-gated: present → approve → apply; via `coding` / `debugging`)

</mode_selection>

<resources>

Router -- READ SKILL FILE for the one your current step needs (point-of-use, never all at once):

| When you need to… | Command |
|---|---|
| present a correction for approval (API-QA **or** UI-QA) (`<correction>` mode) | READ SKILL FILE `assets/proposed-change-template.md` |
| run the explicit-approval gate for a correction or spec/plan approval (`<correction>` mode) | READ SKILL FILE `assets/approval-gate.md` |
| emit the QA api-analysis artifact | READ SKILL FILE `assets/api-analysis-template.md` |
| emit QA test specs (Given-When-Then `ATC-NNN`) | READ SKILL FILE `assets/test-spec-template.md` |
| record the API-QA test-implementation | READ SKILL FILE `assets/api-qa-test-impl-record.md` |
| emit the API-QA execution report | READ SKILL FILE `assets/failure-report-template.md` |
| record QA gap-analysis findings (G/C/A) | READ SKILL FILE `assets/gap-finding-templates.md` |
| build the UI-QA test plan | READ SKILL FILE `assets/ui-qa-plan-template.md` |
| emit the UI-QA code-analysis report | READ SKILL FILE `assets/code-analysis-report-template.md` |
| run UI-QA clarification (gap entry / questions / typed assertions) | READ SKILL FILE `assets/ui-qa-clarification-templates.md` |
| record the UI-QA test-implementation | READ SKILL FILE `assets/ui-qa-test-impl-record.md` |
| emit the UI-QA failure analysis | READ SKILL FILE `assets/failure-report-template.md` |
| send the page-source capture message to the user | READ SKILL FILE `assets/page-source-capture-instructions.md` |
| classify a QA backend-API failure | READ SKILL FILE `references/api-qa-failure-taxonomy.md` |
| classify an UI-QA UI/E2E failure | READ SKILL FILE `references/ui-qa-failure-taxonomy.md` |
| synthesize collected sources into a requirements document (`<synthesis>` mode) | READ SKILL FILE `references/synthesis-catalogs.md` |
| run QA gap-analysis detection (`<gap_analysis>` mode) | READ SKILL FILE `references/gap-analysis-catalogs.md` |
| design Given-When-Then API specs -- taxonomy + ATC template (`<scenario_design>` mode) | READ SKILL FILE `references/gwt-spec.md` |
| format test cases for the configured TMS (scenario_design vendor binding) | READ SKILL FILE `references/<vendor>-format.md` (`<vendor>` from project config; TestRail shipped → `testrail-format.md`) |
| export a case set to the configured TMS (vendor binding + destructive-write gate) | READ SKILL FILE `references/<vendor>-export.md` (`<vendor>` from project config; TestRail shipped → `testrail-export.md`) |
| fork a TMS format/export binding to another vendor | READ SKILL FILE `references/vendor-fork-guide.md` |
| implement UI / API / selector tests -- code + selector tables + templates (`<implementation_modes>` mode) | READ SKILL FILE `references/implementation-examples.md` |
| analyze test-automation architecture or extract API contracts (`<code_analysis>` mode, via reverse-engineering) | READ SKILL FILE `references/analysis-modes.md` |
| triage automated-test execution failures (`<test_execution_triage>` mode) | READ SKILL FILE `references/test-execution-triage.md` |

</resources>

<validation_checklist>

Per active mode, before emitting:

- code_analysis: (API-contract) every target endpoint has an entry OR a flagged gap, each with source citations + a Notes/Discrepancies field (`None.` if reconciled); (test-arch) every optional input marked `available` / `not available -- <impact>`; read-only.
- synthesis: every requirement carries a Source; conflicts resolved via the source-priority ladder or flagged as an assumption; thresholdless NFRs flagged.
- gap_analysis: each finding has a verbatim quote + citation + impact + exactly one risk tier; analysis-only (no fixes/questions); a clean analysis still emits the artifact.
- scenario_design: total coverage (every case/requirement → ≥1 ATC/case or an excluded/gap entry); per-value honesty holds; auth-protected endpoints have ≥1 auth-failure scenario; vendor export passed the destructive-write gate.
- implementation_modes: every plan assertion / ATC implemented OR recorded as uncovered/gap (no silent drop); page objects only (no raw selectors); lint/format clean on touched files.
- test_execution_triage: every failure has exactly one taxonomy category and exactly one evidence label; `Unknown` states the missing capture; cross-failure Patterns present when ≥2 failures share a cause; read-only.
- correction: each proposed change presented before any write; explicit approval obtained through the approval gate (no inferred approval); lint/format clean after each applied change; on reject or retry-cap, stop and report (no silent apply).

</validation_checklist>

<anti_patterns>

Flag/refuse these before proceeding:

- Redacting from memory instead of running the `sensitive-data` pre-emit re-scan grep gate -- or emitting when the scan could not run (**fail-closed**: stop, never emit unscanned).
- Writing an artifact from memory instead of using READ SKILL FILE for its skeleton/template first.
- Silent ATC / assertion drop -- every ATC (QA) or typed assertion (UI-QA) is implemented **or** recorded (Gap / Uncovered), never dropped.
- Collapsing multiple ATCs / assertions into one bullet -- one per bullet.
- Inventing an artifact's shape the skill owns instead of using READ SKILL FILE for the asset.
- Restating a taxonomy or template inline instead of pointing to its reference/asset (DRY).

</anti_patterns>

</qa_knowledge>
