<sim_script flow="ui-aqa-flow">

<stop id="1" phase="intake" gate="request" applies="ALL" waits_on="the request they type">

Narrate: nothing yet; the session opens on their line.
Emit: nothing.
Stop: the exact line they'd send to start UI test automation here. Accepted: a Test Management System case handle or URL, or a direct test description; a Wiki page is optional (`ui-aqa-flow-data-collection.md`).
Defect: none; their own words are the artifact under review.

- Good: calls `/ui-aqa-flow` with the TMS case handle or URL, or the scenario in plain words, plus any Wiki page.
- Good: says where the frontend code is; Phase 4 reads it before asking for page source.
- Wrong: neither case nor description; Phase 1 STOPs and asks, inventing no slug or placeholder.
- Wrong: selectors from memory; the flow says NO ASSUMPTIONS on selectors, flows, data.
- Carry: their request is the intent every later phase is checked against; quote it back at each stop.

</stop>

<stop id="2" phase="data_collection" gate="answers" applies="ALL" waits_on="the run-folder slug confirmation">

Narrate: a `discoverer` (UI-AQA data collector) resolves TMS and Wiki from `gain.json`, their names or URLs, and integrations.
Emit: the proposed slug, from the case title or their description, to confirm before the folder is created; the test plan follows confirmation, at the next stop.
Stop: confirmation or another slug (`ui-aqa-flow-data-collection.md`, step 1.1). The slug is never fabricated.
Defect: a slug broader than the case, e.g. the whole screen, not the one scenario.

- Good: confirms or renames the slug to fit exactly one scenario.
- Good: for a missing source (no `gain.json`, no Wiki), supplies the handle or continues without it; the gap is recorded.
- Wrong: waves the slug through unread; every run path (plan, code analysis, failure analysis) uses it.
- Carry: the confirmed slug names the run folder from here on.

</stop>

<stop id="3" phase="requirements_clarification" gate="answers" applies="ALL" waits_on="their answers to the clarifying questions">

Narrate: Phase 1 finishes: the collector cross-references sources into `plans/ui-aqa-<test-name>/test-plan.md`; show its essentials in 3-5 lines. An `architect` (test requirements analyst) runs gap analysis (steps clarity, result measurability, test data, edge cases, success criteria) and derives typed assertions where measurable.
Emit: the gaps in their real plan as a batch of questions, each with any derived assertion (Presence, State, Content, Behavioral).
Stop: their answers; all are needed before Phase 3 (`ui-aqa-flow-requirements-clarification.md`, step 2.3).
Defect: one Content assertion written as "contains" where the case implies an exact value (e.g. confirmation text).

- Good: answers or plainly declines each question; declined Critical ones go under Open Questions, not guessed.
- Good: corrects "contains" to an exact assertion while it is only text.
- Wrong: "use your best judgment" or blank Critical questions; re-asked once, then recorded as declined.
- Wrong: declines half the Critical questions or won't engage; the phase escalates or blocks.
- Carry: answers and assertions go into `### Explicit Assertions`; Phase 6 implements each or lists it as Uncovered.

</stop>

<stop id="4" phase="selector_identification" gate="evidence" applies="only if frontend code is unavailable or selectors are not found" waits_on="page source files the learner saved, named in chat">

Narrate: Phase 3 (a `discoverer`) mapped architecture, page objects and test patterns into `code-analysis.md`. An `engineer` (selector identification specialist) searched frontend source first, read-only; selectors are still missing.
Emit: Interaction Map and Selector Availability (found, missing, unresolvable) on their real page objects, then the request for page source as files, not chat (`ui-aqa-flow-selector-identification.md`, step 4.2). Capture instructions from the `qa-knowledge` skill go as written, no paraphrase.
Stop: "captured" with the file names, or one file name with "more coming" (step 4.2, item 3). They name files; nothing is read or saved.
Defect: the files cover only the landing page; missing selectors sit behind a later step.

- Good: names every page the test touches, later steps included, and each capture's state.
- Good: names files only; the real flow scans captures before any read.
- Wrong: describes the element in chat ("the blue Pay button"); not a selector source, the phase keeps waiting.
- Wrong: skips the capture; no selector is guessed. A wrong filename or format gets one correction request.
- Carry: captured pages feed Selector Management Part A, Phase 5 page objects, Phase 7 selector-failure triage.

</stop>

<stop id="5" phase="selector_identification" gate="selection" applies="if feasibility fails" waits_on="their choice among the four options">

Narrate: page source was captured, but the core interactions are UNRESOLVABLE: the target elements are absent from it. Per the Blocking infeasibility HARD-STOP in `ui-aqa-flow.md`: no invented selectors, no default `fixme` spec, no Phase 5.
Emit: which element is missing from which capture, then the four options: point at the real feature/URL, author the missing UI as a separate approved task, a clearly-marked pending/`fixme` spec, abort.
Stop: their explicit choice. "Skip clarification" does not authorize it (`ui-aqa-flow.md`).
Defect: the capture predates the step revealing the field; "absent" describes the capture, not the product.

- Good: asks which page and state the capture shows, and checks the product themselves, before picking.
- Good: picks the real feature or URL when it exists, and recaptures.
- Wrong: takes "absent" as fact, aborts or parks a `fixme` spec for a working feature.
- Wrong: tells the agent to go on with likely selectors; the HARD-STOP blocks exactly that.
- Carry: the choice decides whether Phase 4 repeats with a new capture or the run ends.

</stop>

<stop id="6" phase="test_implementation" gate="evidence" applies="ALL" waits_on="actual test execution results (output, report path, or pass/fail)">

Narrate: Phase 5 (an `engineer`) wrote selectors into the real page objects. Phase 6 (an `engineer`, test automation engineer) wrote the test with page-object methods only, lint clean, plus the Test Implementation record.
Emit: test file, page objects used, assertions implemented vs total, the Uncovered Assertions entry, lint status, the exact execution command.
Stop: they run the test themselves; only actual results count: output, a report path, or pass/fail (`ui-aqa-flow-test-implementation.md`, `<stop_for_execution>`). "Skip" and "go to Phase 7" are refused, citing that rule. The test was only simulated: accept results labelled `simulated:` in one of those forms, or offer to generate a plausible set.
Defect: one Uncovered Assertion with a thin reason ("covered manually"), no real disposition.

- Good: returns results in an accepted form, labelled `simulated:`; pass/fail alone counts.
- Good: asks why the Uncovered Assertion was not implemented.
- Wrong: "assume it passes, move to Phase 7"; refused, nothing ran to analyze.
- Wrong: asks the agent to run it; the phase never executes tests.
- Carry: Phase 7 triages failures into `failure-analysis.md` as F-N entries, Evidence Confirmed, Assumption or Unknown; it asks for the report only if not under `agents/user-instructions/`. 0 failures → Phase 8 is `N/A — no corrections`.

</stop>

<stop id="7" phase="test_corrections" gate="approval" applies="if the executed run had failures" waits_on="approval of the named changes">

Narrate: Phase 7 (an `engineer`, test failure analyst) gave each failure a root cause, evidence label, recommendation. Phase 8 (an `engineer`, test correction engineer) proposed one change per fix, mapped to its root cause; nothing written yet.
Emit: proposed-change blocks for their real failures: failure id, change type (`selector-update`, `wait-strategy`, `assertion-fix`, `data-setup` or `other`), before and after code, files limited to tests and, for a selector fix, page objects.
Stop: one of `approved`, `approve`, `yes` (case-insensitive), scoped to the named changes (`ui-aqa-flow-test-correction.md`, `<present_for_approval>`). Comments, questions, suggestions, partial review are not approval.
Defect: one `assertion-fix` loosens an exact check to pass, tied to a root cause labelled Assumption.

- Good: checks each block against its failure entry and evidence label; flags the loosened one.
- Good: approves only the changes they checked, by name; partial approval covers those alone.
- Wrong: "looks good" or "can you check the second one?"; review, the flow keeps waiting.
- Wrong: blanket `yes` over the weakened assertion; green test, unverified requirement.
- Carry: approved changes apply one at a time, lint-checked; they re-run the test. Still failing or fully rejected → Phase 7. Close with the recap: gates held, waved through, weakest move.

</stop>

</sim_script>
