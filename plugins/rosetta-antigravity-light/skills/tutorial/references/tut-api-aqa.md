<sim_script flow="api-aqa-flow">

<stop id="1" phase="project_config_loading" gate="request" applies="ALL" waits_on="the request they type">

Narrate: nothing — the session opens on their line.
Emit: nothing.
Stop: the exact line they'd send. Accepted per `api-aqa-flow-project-config-loading.md`: a TMS case ID, an Issue Tracker ticket, or a direct endpoint description; Swagger/OpenAPI URL or path, Wiki links, backend source are optional.
Defect: none — their words are the artifact.

- Good: calls `/api-aqa-flow` by name, points at the real cases, adds any contract source unasked.
- Wrong: no flow or test case reference — no session identifier, the flow stops to ask (`api-aqa-flow-project-config-loading.md` failure handling).
- Wrong: pastes a real credential — never repeat it, tell them to rotate it; the flow only needs the env var name.
- Carry: case reference and contract source seed config, raw data, spec analysis.

</stop>

<stop id="2" phase="project_config_loading" gate="answers" applies="if the project config does not already exist" waits_on="their answers to the config interview">

Narrate: a `discoverer` parses the request, resolves TMS / Wiki / Issue Tracker providers from `gain.json` and the request, derives the session identifier, checks for project config.
Emit: interview on missing keys only — docs location, Swagger/OpenAPI spec, test case source, test auth.
Stop: their answers in chat (`api-aqa-flow-project-config-loading.md`: at most 2 rounds, one follow-up naming exactly the missing fields). Before auth: mechanism and env var name only, never a real value. Config exists → no stop.
Defect: the interview asks the auth mechanism, not the credential source; setup guesses the env var.

- Good: answers in mechanism and source ("bearer token from the auth endpoint, client secret in `API_CLIENT_SECRET`"), says what does not exist, names backend code when the spec is missing or stale.
- Wrong: pastes a real password or token — never repeat it, tell them to rotate it.
- Wrong: leaves a required field blank — the phase stops, no TBD fallback, unless they explicitly opt into discovery.
- Carry: answers become `api-aqa-project-config.md`, steering Phases 1-2.

</stop>

<stop id="3" phase="api_spec_analysis" gate="answers" applies="if no Swagger/OpenAPI, spec file, or backend route source is found" waits_on="endpoint details or a source location">

Narrate: a `discoverer` collects test cases, Wiki docs, test patterns (Phase 1, `raw-data.md`), then seeks a contract source in order: config Swagger URL, Swagger/OpenAPI in backend source, backend routes (`api-aqa-flow-api-spec-analysis.md`).
Emit: per endpoint, what was and wasn't found; ask for details.
Stop: endpoint details or any source (Swagger/OpenAPI URL, spec file, backend routes), per `api-aqa-flow-api-spec-analysis.md` step 2.1. Source found → no stop; Phase 2 writes `api-analysis.md`.
Defect: a Phase 1 test case cites an endpoint the code or spec names differently.

- Good: supplies any source or the details; unknowns stay `TBD`, analysis flagged partial (`api-aqa-flow-api-spec-analysis.md`).
- Wrong: "just guess the payloads" — the flow forbids assumed endpoints, payloads, auth, response schemas.
- Wrong: ignores the mismatch — the wrong path reaches contract and specs.
- Carry: Spec Source and partial flag in `api-analysis.md` feed gap analysis.

</stop>

<stop id="4" phase="gap_and_requirements_clarification" gate="answers" applies="ALL" waits_on="answers to the Critical / Important / Optional questions">

Narrate: an `architect` cross-references cases, docs, API analysis into gaps, contradictions, ambiguities.
Emit: questions grouped Critical / Important / Optional, each citing its source, on their real cases.
Stop: all answers (`api-aqa-flow-gap-and-requirements-clarification.md`). Unknowns by priority: Critical → BLOCKING ASSUMPTION, Phase 3 stays open; Important → ASSUMPTION; Optional → SKIPPED; out of scope → DEFERRED.
Defect: a Critical question where a vague answer leaves status code or error body unclear.

- Good: answers what they know, marks the rest unknown or out of scope, corrects a misread case while only `analysis.md` is at stake.
- Wrong: skips a Critical question — BLOCKING ASSUMPTION; Phase 4 waits for an answer or explicit approval to proceed.
- Wrong: guesses an expected response — it enters specs as fact.
- Carry: answers and open assumptions flow into `test-specs.md`.

</stop>

<stop id="5" phase="test_case_specification" gate="approval" applies="ALL" waits_on="the exact approval token">

Narrate: an `architect` writes Given-When-Then specs from raw data, API analysis, clarifications.
Emit: spec summary (scenarios, priorities, endpoints) and 2-3 real `ATC-NNN` scenarios with exact request values, response assertions, file mapping.
Stop: one of `approved` / `approve` / `yes` (case-insensitive), scoped to the specs shown (`api-aqa-flow-test-case-specification.md`). Comments, questions, suggestions, partial review are review.
Defect: a scenario untraceable to raw data or analysis, or asserting a status code the analysis never documented.

- Good: checks scenarios incl. error and auth cases; has the untraceable one removed, then approves with a listed token.
- Wrong: "looks good" or comments — review; keep waiting.
- Wrong: approves with the untraceable scenario — Phase 5 implements it; it fails or asserts a guess.
- Carry: approved specs are the Phase 5 contract; rejected → Phase 3, repeated rejection escalated.

</stop>

<stop id="6" phase="test_implementation" gate="evidence" applies="ALL" waits_on="actual execution results (output, report path, or pass/fail)">

Narrate: an `engineer` implements approved specs with shared utilities (auth helper, data factory, response validator), extends existing helpers, lints touched files; does not run tests.
Emit: hand-off summary (framework, files, ATC to test mapping, assumptions, gaps, lint status) and the exact test command.
Stop: they run it and bring results — output, a report path, or pass/fail (`api-aqa-flow-test-implementation.md`). "Done", "skip", "go to Phase 6" → refuse, citing the gate. Simulated tests never ran: accept results labelled `simulated:` in those forms, or offer to generate a plausible set. Warn: pass/fail alone starves triage of root causes.
Defect: an assumed value (`[ASSUMED: ...]`) the specs never settled.

- Good: reads gaps and assumptions first; returns `simulated:` results with failure messages and status codes.
- Wrong: "ran it, mostly green" — not evidence; confirmation does not advance the flow.
- Wrong: paraphrases failures — triage loses messages and status codes.
- Carry: results feed Phase 6; assumptions surface as failures to explain.

</stop>

<stop id="7" phase="execution_and_report_analysis" gate="report" applies="ALL" waits_on="nothing; coaching stop (not a flow gate)">

Narrate: an `engineer` triages read-only: per failure an id, API-failure category, root cause, evidence label (`api-aqa-flow-execution-and-report-analysis.md`).
Emit: `execution-report.md` — summary, failures by category, 2-3 of their failures with `ERR-N`, root cause, `Confirmed` / `Assumption` / `Unknown`, patterns, recommendations. Report location unknown and not in `agents/user-instructions/` → ask and wait.
Stop: coaching only — ask which failure they'd trust least and why. Refuse "just fix it now": Phase 6 is read-only (same file). Exception: entries unlabelled after two validation cycles → the flow asks once how to label them (step 6.2); that ask is an `answers` stop.
Defect: a root cause labelled `Confirmed` on evidence supporting only an assumption.

- Good: checks labels against output, challenges the overconfident one, asks for more output on `Unknown`.
- Wrong: skips to fixes — Phase 7 maps each change to a confirmed root cause; wrong label, wrong fix.
- Carry: Phase 7 proposes changes against `ERR-N` entries.

</stop>

<stop id="8" phase="test_corrections" gate="approval" applies="if the execution report has failure entries" waits_on="the exact approval token">

Narrate: an `engineer` proposes one change per fix, before/after, citing its `ERR-N`; nothing written yet.
Emit: 2-3 changes to their real test files: change type, root-cause reference, before/after.
Stop: one of `approved` / `approve` / `yes` (case-insensitive), scoped to the named changes (`api-aqa-flow-test-correction.md`). Partial approval covers only the changes named. Comments, questions are review.
Defect: a change editing a product file, or weakening an assertion instead of fixing the cause.

- Good: names the exact changes they approve, pushes back on the weakened assertion, spots the out-of-scope file (only test and shared test-utility files; other writes refused).
- Wrong: blanket "yes" unread — every change lands, the bad one too.
- Wrong: "fix whatever you think" — names no changes; keep waiting.
- Carry: approved changes apply one by one with lint; re-run, new failures return to Phase 6.

</stop>

</sim_script>
