<sim_script flow="api-aqa-flow">

<stop id="1" phase="project_config_loading" gate="request" applies="ALL" waits_on="the request they type">

Narrate: nothing yet — the session opens on their line.
Emit: nothing.
Stop: ask for the exact line they'd send to start API test automation. Accepted per `api-aqa-flow-project-config-loading.md`: a TMS case ID, an Issue Tracker ticket, or a direct description of the endpoint; Swagger/OpenAPI URL or path, Wiki links, backend source locations are optional extras.
Defect: none — their own words are the artifact under review here.

- Good: calls `/api-aqa-flow` by name and points at the real cases (case ID, ticket, or a plain description of the endpoint).
- Good: adds whatever contract source they have — Swagger/OpenAPI URL or path, docs, backend code location — without being asked.
- Wrong: no flow named or no test case reference — the flow cannot derive its session identifier and stops to ask (`api-aqa-flow-project-config-loading.md` failure handling).
- Wrong: pastes credentials into the request — they get redacted at intake and the run asks for the env var name instead.
- Carry: the case reference and any contract source named here seed config, raw data, and the spec analysis.

</stop>

<stop id="2" phase="project_config_loading" gate="answers" applies="if the project config does not already exist" waits_on="their answers to the config interview">

Narrate: a `discoverer` parses the request, resolves TMS / Wiki / Issue Tracker providers from `gain.json` and the request, derives the session identifier, and looks for an existing project config.
Emit: a short interview trimmed to the still-missing keys only — where documentation lives, whether a Swagger/OpenAPI spec exists, where test cases come from, how tests authenticate.
Stop: their answers in chat (`api-aqa-flow-project-config-loading.md`: at most 2 rounds, one follow-up naming exactly the missing fields). Config already exists → this stop does not run.
Defect: ask auth in a way that invites a literal secret in the answer.

- Good: answers in terms of mechanism and source ("token from the auth endpoint, credentials in env vars") and says plainly what does not exist, e.g. no Swagger.
- Good: names the backend code location when the spec is missing or stale.
- Wrong: pastes a real password or token — it is redacted and they are asked for the env var name anyway.
- Wrong: leaves a required field blank — the phase stops instead of falling back to TBD, unless they explicitly opt into discovery.
- Carry: the answers become `api-aqa-project-config.md`; they decide what Phases 1-2 search.

</stop>

<stop id="3" phase="api_spec_analysis" gate="answers" applies="if no Swagger/OpenAPI, spec file, or backend route source is found" waits_on="endpoint details or a source location">

Narrate: a `discoverer` collects the test cases, any Wiki docs, and existing test patterns (Phase 1, `raw-data.md`), then looks for a contract source in order: Swagger URL from config, Swagger/OpenAPI in backend source, route definitions in backend source (`api-aqa-flow-api-spec-analysis.md`).
Emit: what was found and what was not, per target endpoint, and a request for endpoint details.
Stop: endpoint details or a source location, per `api-aqa-flow-api-spec-analysis.md` step 2.1. Any source form is enough: Swagger/OpenAPI URL, spec file, or backend source with routes. A source is found → no stop; Phase 2 produces `api-analysis.md` and the run moves on.
Defect: the Phase 1 test case cites an endpoint the real code or spec names differently.

- Good: supplies whichever source exists — a spec URL, a file path, or the backend code location — or the endpoint details themselves.
- Good: says plainly what they do not know; unknown fields stay `TBD` and the analysis is flagged partial (`api-aqa-flow-api-spec-analysis.md`).
- Wrong: "just guess the payloads" — the flow forbids assumed endpoints, payloads, auth, and response schemas.
- Wrong: ignores the mismatched endpoint — the contract entry then cites the wrong path and the specs inherit it.
- Carry: Spec Source and any partial flag in `api-analysis.md` feed the gap analysis.

</stop>

<stop id="4" phase="gap_and_requirements_clarification" gate="answers" applies="ALL" waits_on="answers to the Critical / Important / Optional questions">

Narrate: an `architect` cross-references test cases, docs, and API analysis into gaps, contradictions, and ambiguities.
Emit: prioritized questions grouped Critical / Important / Optional, each citing the source it came from, in the learner's real test cases and endpoints.
Stop: all answers (`api-aqa-flow-gap-and-requirements-clarification.md`). Unknowns are handled by priority: Critical → BLOCKING ASSUMPTION and Phase 3 stays open; Important → ASSUMPTION; Optional → SKIPPED; out of scope → DEFERRED.
Defect: one Critical question phrased so a vague answer leaves the status code or error body unclear.

- Good: answers what they know and marks the rest as unknown or out of scope instead of guessing.
- Good: corrects a wrong reading of a test case while only `analysis.md` is at stake.
- Wrong: skips a Critical question — it stays a BLOCKING ASSUMPTION and Phase 4 cannot start until they answer or explicitly approve proceeding on it.
- Wrong: guesses an expected response to sound decisive — it enters the specs as a fact.
- Carry: answers and open assumptions flow into `test-specs.md` and show up again as assumptions.

</stop>

<stop id="5" phase="test_case_specification" gate="approval" applies="ALL" waits_on="the exact approval token">

Narrate: an `architect` converts the cases into Given-When-Then specs from the raw data, API analysis, and clarifications.
Emit: the spec summary (total scenarios, priority breakdown, endpoints covered) and 2-3 real `ATC-NNN` scenarios with exact request values, response assertions, and the file mapping.
Stop: one of `approved` / `approve` / `yes` (case-insensitive), scoped to the specs shown — per `api-aqa-flow-test-case-specification.md`. Comments, questions, suggestions, and partial review are review, not approval.
Defect: one scenario with no source in raw data or analysis, or an assertion on a status code the API analysis never documented.

- Good: reads the scenarios against their own knowledge of the endpoint; checks the error and auth cases are there.
- Good: asks for the untraceable scenario to be removed, then approves with a listed token.
- Wrong: "looks good" or a list of comments — still review; the flow keeps waiting.
- Wrong: approves with the untraceable scenario in — Phase 5 implements it, and it fails or asserts a guess.
- Carry: approved specs are the contract for Phase 5; a rejected set goes back to Phase 3 and repeated rejection is escalated.

</stop>

<stop id="6" phase="test_implementation" gate="evidence" applies="ALL" waits_on="actual execution results (output, report path, or pass/fail)">

Narrate: an `engineer` implements the approved specs with shared utilities (auth helper, data factory, response validator), extends existing helpers, and runs lint on touched files. It does not run the tests.
Emit: the hand-off summary (framework, files, ATC to test mapping, assumptions, gaps, lint status) and the exact test command for their project.
Stop: they run the command and bring results. Accepted per `api-aqa-flow-test-implementation.md`: output, a report path, or a pass/fail result. "Done", "skip", or "go to Phase 6" is refused with a citation of the gate. Say a pass/fail alone leaves triage little to work with: failures need real output or a report to find root causes.
Defect: one assumed value (marked `[ASSUMED: ...]`) in a test the specs never settled.

- Good: runs the command and returns real output or the report path; says so when they cannot run it.
- Good: reads the hand-off summary for gaps and assumptions before running.
- Wrong: "ran it, mostly green" — not evidence; the flow does not advance on confirmation.
- Wrong: paraphrases failures — the analysis then has no messages or status codes to work from.
- Carry: the results feed Phase 6 triage; any assumption shows up there as a failure to explain.

</stop>

<stop id="7" phase="execution_and_report_analysis" gate="report" applies="ALL" waits_on="nothing; coaching stop (not a flow gate)">

Narrate: an `engineer` triages the results read-only: each failure gets an id, one API-failure category, a root cause, and an evidence label (`api-aqa-flow-execution-and-report-analysis.md`).
Emit: `execution-report.md` content — summary, failures by category, 2-3 failure entries from their results with `ERR-N`, root cause, and `Confirmed` / `Assumption` / `Unknown`, then patterns and recommendations. Report location unknown and not in `agents/user-instructions/` → ask for it instead and wait.
Stop: coaching only — ask which failure they would trust least and why. Refuse "just fix it now": Phase 6 is read-only (same file). Exception: entries still unlabelled after two validation cycles → the flow asks once how to label them (step 6.2); that ask is an `answers` stop.
Defect: one root cause labelled `Confirmed` on evidence that supports only an assumption.

- Good: checks the evidence label against the output they ran, and challenges the overconfident one.
- Good: asks for more output where a root cause is `Unknown` instead of accepting it.
- Wrong: skips to fixes — Phase 7 maps every change to a confirmed root cause, so a wrong label means a fix on the wrong line.
- Carry: the `ERR-N` entries are what Phase 7 proposes changes against.

</stop>

<stop id="8" phase="test_corrections" gate="approval" applies="if the execution report has failure entries" waits_on="the exact approval token">

Narrate: an `engineer` prepares one proposed change per fix with before/after code, each citing its `ERR-N` entry; nothing is written yet.
Emit: 2-3 proposed changes against their real test files, each with change type, root-cause reference, and before/after.
Stop: one of `approved` / `approve` / `yes` (case-insensitive), scoped to the named changes — per `api-aqa-flow-test-correction.md`. Partial approval applies only to the changes named. Comments and questions are review.
Defect: one change that edits a product file, or a test change that weakens an assertion instead of fixing the cause.

- Good: names exactly which changes they approve; pushes back on the weakened assertion.
- Good: notices the out-of-scope file; only test and shared test-utility files are in scope, writes outside are refused.
- Wrong: blanket "yes" without reading — every proposed change lands, including the bad one.
- Wrong: "fix whatever you think" — not approval of named changes; the flow keeps waiting.
- Carry: approved changes are applied one by one with lint; they re-run the tests, and new failures return to Phase 6.

</stop>

</sim_script>
