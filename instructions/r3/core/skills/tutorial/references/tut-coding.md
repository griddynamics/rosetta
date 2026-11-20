<sim_script flow="coding-flow">

<stop id="1" phase="intake" waits_on="the request they type">

Narrate: nothing yet — the session opens on their line.
Emit: nothing.
Stop: ask for the exact one line they'd send to start this task on this repo.
Defect: none — their own words are the artifact under review here.

- Good: calls `/coding-flow` by name and describes the task in plain words; names the area of the repo if they know it.
- Good: leaves sizing, phases, and artifacts to the flow instead of pre-arranging them.
- Wrong: sends the task with no flow named — a flow sometimes kicks in, not reliably, and the reply looks much the same either way; they lose the gates they installed Rosetta for.
- Wrong: writes the solution into the request — design then has nothing to weigh, and the flow rubber-stamps their guess.
- Carry: their words are the intent every later phase is checked against; quote them back at each stop.

</stop>

<stop id="2" phase="discovery" waits_on="their answers">

Narrate: prerequisites, then discovery — a `discoverer` runs over context, affected areas, dependencies, and does not stop until fully clear.
Emit: discovery notes inline — the real modules this task touches, their real dependencies, and 4-6 questions only they can answer: who owns this data, whether the old path stays, which limits are non-negotiable.
Stop: their answers.
Defect: phrase one question so the obvious short answer leaves the ambiguity intact; a thin answer enters the notes verbatim as an assumption.

- Good: answers what they know now and says plainly which ones they'll check and come back on.
- Good: corrects a wrong assumption in the notes while nothing is written yet.
- Good: reads the analysis-before-code delay as the phase working, not as stalling.
- Wrong: hands it back with "use your best judgment" — the question doesn't disappear, it becomes a guess, and design and plan get built on the guess.
- Wrong: "stop analyzing, just write it" — skips the phases the gates depend on, and they end up approving code nobody grounded.
- Wrong: guesses an answer to sound decisive — a confident wrong answer costs more here than "I don't know yet".
- Carry: every unanswered question appears in the next artifact as a labelled assumption and stays visible until they kill it.

</stop>

<stop id="3" phase="user_review_design" waits_on="the design approval sentence">

Narrate: an `architect` discovers the affected code, then designs three high-level options with pros and cons and picks one.
Emit: the three options against their real modules, a few lines each, the recommendation, and the assumptions carried out of discovery.
Stop: `Yes, I reviewed the design` or `Approve, the design was reviewed` — quote it and wait for it.
Defect: let the recommended option lean on the thin discovery answer, or reach into a module they never mentioned.

- Good: reads all three options, not just the recommendation — the tradeoff lives in the alternatives.
- Good: kills the assumption or answers it now; this is the last cheap moment to do it.
- Good: types the approval sentence in full when they mean it.
- Wrong: "looks good" or a thumbs-up — that is review, not approval, and the flow keeps waiting.
- Wrong: approves with the extra module still in scope — approval covers exactly what's on the page, and that page becomes the specs.
- Carry: approved scope freezes here; anything beyond it in the plan is scope creep they can now name.

</stop>

<stop id="4" phase="user_review_plan" waits_on="the plan approval sentence">

Narrate: an `architect` splits specs (WHAT) from plan (HOW) into the `FEATURE PLAN folder`; on medium and large a `reviewer` inspects both against the request first.
Emit: specs and plan trimmed to essentials — task sequence, real files touched, test intent — plus the reviewer's findings.
Stop: `Yes, I reviewed the plan` or `Approve, the plan and specs were reviewed`.
Defect: one plan item outside the approved design — a refactor, a dependency bump, a "while we're in there".

- Good: checks the plan against the design they approved and names the extra item instead of letting it ride.
- Good: checks the file list against what they know of the repo; wrong-module mistakes are cheapest to catch here.
- Good: treats reviewer findings as recommendations that can themselves be wrong, not as a verdict.
- Wrong: approves because the reviewer already did — the reviewer isn't the implementer, and neither of them owns their codebase.
- Wrong: asks the agent whether the extra item is in scope; scope is theirs to decide.
- Carry: the approved plan is the contract the diff gets checked against — not their memory of it.

</stop>

<stop id="5" phase="user_review_impl" waits_on="the implementation approval sentence">

Narrate: an `engineer` implements the approved plan with the build passing, a `reviewer` inspects the diff against the specs, and on medium and large a `validator` runs it and reports whether it actually works.
Emit: the change summary — real files, what each does — plus review and validation findings, one gap left open.
Stop: `Yes, I approve the implementation`.
Defect: a file in the diff no approved plan item asked for, or validation that reports build and tests green while the feature itself was never exercised.

- Good: reads the diff against the plan and spots the file nobody approved.
- Good: separates "build is green" from "it works" — asks what was actually exercised and what evidence exists.
- Good: interrupts mid-run on seeing the wrong module scroll by, rather than waiting for this gate; the gate would catch it, but only after the work is done twice.
- Wrong: approves on tests passing — tests passing is not works.
- Wrong: leaves the open gap for the agent to close later; approving closes it silently.
- Carry: what they approve here is what the tests get written against next.

</stop>

<stop id="6" phase="tests and final validation" waits_on="their read of the report">

Narrate: an `engineer` writes and runs the tests, a `reviewer` checks coverage, scenarios, and mocking, a `validator` closes with dependency-by-dependency checks and manual QA.
Emit: the test list against their real modules, the coverage claim, and the final validation report.
Stop: ask what they'd check before calling this done. Note that no gate of their own stands between implementation approval and tests — so a wrong approval upstream lands here as tests pinning the wrong behavior.
Defect: one test asserting its own mock — passing, and proving nothing.

- Good: reads the test list as spec coverage rather than a count, and names the scenario that's missing.
- Good: points at what was mocked away and says which part they'd want exercised for real.
- Wrong: accepts the coverage number as the answer; the flow's own bar is that it ultimately works.
- Carry: recap on this one — gates held, gates waved through, weakest move.

</stop>

</sim_script>
