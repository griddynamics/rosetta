<sim_script flow="ui-aqa-flow">

<stop id="1" phase="intake" gate="request" applies="ALL" waits_on="the request they type">

Narrate: nothing yet; the session opens on their line.
Emit: nothing.
Stop: ask for the exact line they'd send to start UI test automation on this repo. The flow accepts a Test Management System case handle or URL, or a direct test description (`ui-aqa-flow-data-collection.md`); a Wiki page is optional.
Defect: none; their own words are the artifact under review.

- Good: calls `/ui-aqa-flow` by name and gives either the TMS case handle or URL, or the scenario in plain words; adds the Wiki page if one exists.
- Good: says where the frontend code is if they have it; Phase 4 reads it before asking for page source.
- Wrong: gives neither a case nor a description; Phase 1 must STOP and ask, and will not invent a slug or placeholder.
- Wrong: describes elements or selectors from memory; the flow says NO ASSUMPTIONS on selectors, flows, data.
- Carry: their request is the intent every later phase is checked against; quote it back at each stop.

</stop>

<stop id="2" phase="data_collection" gate="answers" applies="ALL" waits_on="the run-folder slug confirmation">

Narrate: a `discoverer` (UI-AQA data collector) resolves the TMS and Wiki from `gain.json`, their explicit names or URLs, and available integrations, then cross-references the sources into `plans/ui-aqa-<test-name>/test-plan.md`.
Emit: the proposed slug, derived from the case title or their description, with a request to confirm it before the folder is created. The test plan (case info, feature context, access and truncation notes, cross-reference notes) comes after confirmation, narrated at the next stop.
Stop: their confirmation or another slug (`ui-aqa-flow-data-collection.md`, step 1.1). The slug is never fabricated.
Defect: propose a slug broader than the one case, for example the whole screen instead of the single scenario.

- Good: confirms or renames the slug to match exactly one scenario.
- Good: if a source was unavailable (no `gain.json`, no Wiki), supplies the missing handle or confirms continuing without it; the gap stays recorded.
- Wrong: waves the slug through without reading it; every path in the run (plan, code analysis, failure analysis) is named after it.
- Carry: the confirmed slug names the run folder at every later stop.

</stop>

<stop id="3" phase="requirements_clarification" gate="answers" applies="ALL" waits_on="their answers to the clarifying questions">

Narrate: Phase 1 finishes on the confirmed slug: the collector cross-references the sources into `plans/ui-aqa-<test-name>/test-plan.md` — show its essentials in 3-5 lines. An `architect` (test requirements analyst) runs gap analysis on the plan across steps clarity, result measurability, test data, edge cases and success criteria, and derives typed assertions where a measurable form exists.
Emit: the gaps from their real test plan as a batch of questions, each with its derived assertion where one exists (Presence, State, Content, Behavioral), per `ui-aqa-flow-requirements-clarification.md`.
Stop: their answers. The flow waits for all of them before Phase 3 (`ui-aqa-flow-requirements-clarification.md`, step 2.3).
Defect: one derived Content assertion written as "contains" where the case implies an exact value, such as exact confirmation text.

- Good: answers each question, or says plainly it is declined; declined Critical questions are recorded under Open Questions rather than guessed.
- Good: corrects the "contains" assertion into an exact one while it is only text.
- Wrong: "use your best judgment" or leaving Critical questions blank; the flow re-asks once for unanswered Critical ones, then records them as declined.
- Wrong: declining half of the Critical questions or refusing to engage; the phase escalates or blocks and does not move to Phase 3.
- Carry: answers and assertions go into `### Explicit Assertions`; Phase 6 must implement each one or list it under Uncovered Assertions.

</stop>

<stop id="4" phase="selector_identification" gate="evidence" applies="only if frontend code is unavailable or selectors are not found" waits_on="page source files the learner saved, named in chat">

Narrate: Phase 3 (a `discoverer`) mapped the repo's architecture, page objects and test patterns into `code-analysis.md`. An `engineer` (selector identification specialist) then searches the frontend source first, read-only, and still has selectors missing.
Emit: the Interaction Map and Selector Availability (found, missing, unresolvable) against their real page objects, then the request for page source files. The capture instructions come from the `qa-knowledge` skill and are sent as written, so do not paraphrase them. Page source is requested as files, not chat (`ui-aqa-flow-selector-identification.md`, step 4.2).
Stop: "captured" with the file names, or one file name with "more coming" (step 4.2, item 3). The learner types what they would send; nothing is saved.
Defect: the filename list covers only the landing page, while the selectors still missing sit behind a later step of the flow.

- Good: names every page the test touches, including later steps, and the state each was captured in.
- Good: accepts that the agent scans and redacts the files before reading them; that is its step, not theirs.
- Wrong: describes the element in chat ("the blue Pay button"); a description is not a selector source, and the phase keeps waiting for files.
- Wrong: skips the capture; the agent will not guess selectors, and a wrong filename or format gets one correction request before analysis.
- Carry: captured pages feed Part A of Selector Management, then page objects in Phase 5, then Phase 7 triage of selector failures.

</stop>

<stop id="5" phase="selector_identification" gate="selection" applies="if feasibility fails" waits_on="their choice among the four options">

Narrate: page source was captured, but the engineer finds the core interactions UNRESOLVABLE because the target elements are absent from it. Per the Blocking infeasibility HARD-STOP in `ui-aqa-flow.md`, it will not invent selectors, will not default to a `fixme` spec, and will not advance to Phase 5.
Emit: which element is missing, from which captured page, then the four options: point at the real feature/URL, author the missing UI as a separate approved task, a clearly-marked pending/`fixme` spec, abort.
Stop: their explicit choice. "Skip clarification" does not authorize this call (`ui-aqa-flow.md`).
Defect: the page source was captured in the wrong page state (for example before the step that reveals the field), so "absent" describes the capture, not the product.

- Good: asks which page and state the capture shows before picking, and checks the product themselves, not through the agent.
- Good: picks the real feature or URL when the feature exists, and recaptures.
- Wrong: takes "absent" as fact and aborts or parks a `fixme` spec for a feature that works.
- Wrong: tells the agent to carry on with likely selectors; the HARD-STOP exists for exactly that.
- Carry: the option chosen decides whether Phase 4 repeats with a new capture or the run ends here.

</stop>

<stop id="6" phase="test_implementation" gate="evidence" applies="ALL" waits_on="actual test execution results (output, report path, or pass/fail)">

Narrate: Phase 5 (an `engineer`) wrote the identified selectors into the real page objects. Phase 6 (an `engineer`, test automation engineer) authored the test using page-object methods only, kept lint clean, and wrote the Test Implementation record.
Emit: the test file path, the page objects used, assertions implemented against total, the Uncovered Assertions entry, lint status, and the exact execution command for their framework.
Stop: the flow stops for the user to run the test themselves. Only actual results count: output, a report path, or pass/fail (`ui-aqa-flow-test-implementation.md`, `<stop_for_execution>`). "Skip" and "go to Phase 7" are refused with citation of that rule.
Defect: one assertion under Uncovered Assertions with a thin reason such as "covered manually", and no real disposition.

- Good: runs the test and returns the output or the report path; pass/fail alone is accepted if that is what they have.
- Good: questions the Uncovered Assertions entry and asks why it was not implemented.
- Wrong: "assume it passes, move to Phase 7"; refused. With nothing real run there is nothing to analyze.
- Wrong: asks the agent to run the test; the phase never executes it.
- Carry: results go to Phase 7: the agent triages failures into `failure-analysis.md` with F-N entries and an Evidence label of Confirmed, Assumption or Unknown. It asks for the report only if it is not under `agents/user-instructions/`. With 0 failures, Phase 8 is `N/A — no corrections`.

</stop>

<stop id="7" phase="test_corrections" gate="approval" applies="if the executed run had failures" waits_on="approval of the named changes">

Narrate: Phase 7 (an `engineer`, test failure analyst) classified each failure with a root cause, evidence label and recommendation. Phase 8 (an `engineer`, test correction engineer) prepared one proposed change per fix, mapped to its root cause. Nothing is written yet.
Emit: the proposed-change blocks against their real failures: failure id, change type (`selector-update`, `wait-strategy`, `assertion-fix`, `data-setup` or `other`), before and after code, files limited to tests and, for a selector fix, page objects.
Stop: one of `approved`, `approve`, `yes` (case-insensitive), scoped to the named changes (`ui-aqa-flow-test-correction.md`, `<present_for_approval>`). Comments, questions, suggestions and partial review are not approval.
Defect: one `assertion-fix` loosens an exact check to a weaker one so the test passes, tied to a root cause labelled Assumption.

- Good: reads each block against its failure entry and its evidence label, and names the loosened assertion.
- Good: approves only the changes they checked, by name; partial approval applies to those alone.
- Wrong: "looks good" or "can you check the second one?"; that is review, and the flow keeps waiting.
- Wrong: blanket `yes` over the weakened assertion; the test goes green and the requirement stays unverified.
- Carry: approved changes are applied one at a time with lint checks; they re-run the test. If it still fails, back to Phase 7; a full rejection returns to Phase 7 too. Close with the recap: gates held, gates waved through, weakest move.

</stop>

</sim_script>
