<sim_script flow="coding-flow">

Sizing decides the stops: discovery only when the request is unclear. SMALL folds the plan gate into the design gate, and opens the implementation gate after tests, combined with final validation: narrate tests, emit stop 6's test list inside stop 5's artifact, wait for stop 5's sentence, skip stop 6.

Lightweight `coding-flow` (one `solution_design` architect pass, `user_review_design` as the only gate): stop 2 becomes the architect's questions inside `solution_design`, applied only when it asks any; stop 3 carries architecture notes, specs, plan and review findings with stop 4's checks; stop 5 is not a gate — its checks move into stop 6, whose coaching point becomes "no gate of theirs stands after design approval".

<stop id="1" phase="intake" gate="request" applies="ALL" waits_on="the request they type">

Narrate: nothing yet — the session opens on their line.
Emit: nothing.
Stop: ask for the exact line they would send to start this task on this repo.
Defect: none — their own words are the artifact under review here.

- Good: calls `/coding-flow` by name and describes the task in plain words; names the area of the repo if they know it.
- Good: leaves sizing, phases, and artifacts to the flow instead of pre-arranging them.
- Wrong: sends the task with no command — a plain request runs the lean path, not this flow, so none of its gates stop for them; `/rosetta` would classify and pick a flow, `/coding-flow` runs this one directly.
- Wrong: writes the solution into the request — design then has nothing to weigh, and the flow rubber-stamps their guess.
- Carry: their words are the intent every later phase is checked against; quote them back at each stop.

</stop>

<stop id="2" phase="discovery" gate="answers" applies="request is non-specific, unclear, ambiguous, or has gaps" waits_on="their answers">

Narrate: prerequisites, then discovery — a `discoverer` (SMALL: the orchestrator inline) gathers context, affected areas, dependencies, constraints, and does not stop until fully clear.
Emit: discovery notes inline — the real modules this task touches, their real dependencies, and 4-6 questions only they can answer: who owns this data, whether the old path stays, which limits are non-negotiable.
Stop: their answers.
Defect: phrase one question so the obvious short answer leaves the ambiguity intact; a thin answer enters the notes verbatim as an assumption.

- Good: answers what they know now and says plainly which ones they will check and come back on.
- Good: corrects a wrong assumption in the notes while nothing is written yet.
- Wrong: "use your best judgment" — the question does not disappear, it becomes a guess, and design and plan get built on it.
- Wrong: "stop analyzing, just write it" — skips the phases the gates depend on; they end up approving code nobody grounded.
- Wrong: guesses an answer to sound decisive — a confident wrong answer costs more here than "I don't know yet".
- Carry: every unanswered question appears in the next artifact as a labelled assumption and stays visible until they kill it.

</stop>

<stop id="3" phase="user_review_design" gate="approval" applies="ALL; SMALL: combined with user_review_plan" waits_on="the design approval sentence">

Narrate: an `architect` discovers the affected code, designs three high-level options with pros and cons, and picks one. SMALL: specs and plan follow as a message for the same checkpoint.
Emit: TLDR, the recommended solution first against their real modules, then the two alternatives, the assumptions carried out of discovery, plus every other item the flow's gate lists that exists at this point (SMALL: specs and plan).
Stop: `Yes, I reviewed the design` or `Approve, the design was reviewed` (`coding-flow.md`, user_review_design) — quote it and wait for it. SMALL: the same reply must also cover the plan.
Defect: let the recommended option lean on the thin discovery answer, or reach into a module they never mentioned.

- Good: reads the alternatives, not just the recommendation — the tradeoff lives there.
- Good: kills the assumption or answers it now; this is the last cheap moment to do it.
- Good: types the approval sentence in full when they mean it.
- Wrong: "looks good" or a thumbs-up — that is review, not approval, and the flow keeps waiting.
- Wrong: approves with the extra module still in scope — approval covers exactly what is on the page, and that page becomes the specs.
- Carry: approved scope freezes here; anything beyond it in the plan is scope creep they can now name.

</stop>

<stop id="4" phase="user_review_plan" gate="approval" applies="MEDIUM,LARGE" waits_on="the plan approval sentence">

Narrate: an `architect` splits specs (WHAT) from plan (HOW) into the `FEATURE PLAN folder`; a `reviewer` inspects both against the request and discovery notes first.
Emit: specs and plan trimmed to essentials — task sequence, real files touched, test intent — plus the reviewer's findings.
Stop: `Yes, I reviewed the plan` or `Approve, the plan and specs were reviewed` (`coding-flow.md`, user_review_plan).
Defect: one plan item outside the approved design — a refactor, a dependency bump, a "while we're in there".

- Good: checks the plan against the design they approved and names the extra item instead of letting it ride.
- Good: checks the file list against what they know of the repo; wrong-module mistakes are cheapest to catch here.
- Good: treats reviewer findings as recommendations that can themselves be wrong, not as a verdict.
- Wrong: approves because the reviewer already did — the reviewer is not the implementer, and neither owns their codebase.
- Wrong: asks the agent whether the extra item is in scope; scope is theirs to decide.
- Carry: the approved plan is the contract the diff gets checked against — not their memory of it.

</stop>

<stop id="5" phase="user_review_impl" gate="approval" applies="ALL; SMALL: after tests, combined with final validation" waits_on="the implementation approval sentence">

Narrate: an `engineer` implements the approved plan with the build passing, a `reviewer` inspects the diff against the specs; MEDIUM and LARGE add a `validator` that runs it and reports whether it actually works, SMALL gets that check from the reviewer.
Emit: the change summary — real files, what each does — plus review and validation findings, one gap left open.
Stop: `Yes, I approve the implementation` (`coding-flow.md`, user_review_impl).
Defect: a file in the diff no approved plan item asked for, or validation that reports build green while the feature itself was never exercised.

- Good: reads the diff against the plan and spots the file nobody approved.
- Good: separates "build is green" from "it works" — asks what was actually exercised and what evidence exists.
- Good: interrupts mid-run on seeing the wrong module scroll by, rather than waiting for this gate; the gate would catch it, but only after the work is done twice.
- Wrong: approves on a green build — green is not works.
- Wrong: leaves the open gap for the agent to close later; approving closes it silently.
- Carry: what they approve here is what the tests get written against next.

</stop>

<stop id="6" phase="tests and final_validation" gate="report" applies="MEDIUM,LARGE; SMALL: folded into stop 5" waits_on="their read of the report">

Narrate: an `engineer` writes and runs the tests; on MEDIUM and LARGE a `reviewer` checks coverage, scenarios, and mocking, and a `validator` closes with dependency-by-dependency checks and manual QA.
Emit: the test list against their real modules, the coverage claim, and the final validation report.
Stop: coaching stop, not a flow gate — ask what they would check before calling this done. No gate of theirs stands between implementation approval and tests, so a wrong approval upstream lands here as tests pinning the wrong behavior.
Defect: one test asserting its own mock — passing, and proving nothing.

- Good: reads the test list as spec coverage rather than a count, and names the missing scenario.
- Good: points at what was mocked away and says which part they want exercised for real.
- Wrong: accepts the coverage number as the answer; the flow's own bar is that it actually works.
- Carry: recap on this one — gates held, gates waved through, weakest move.

</stop>

</sim_script>
