<sample_task_set flow="coding-flow">

<sample_task id="1" ties="the phases before implementation">

Scenario: you asked for a mid-sized feature — a few files, one new endpoint. Minutes in, nothing is written yet: the agent is reading the codebase, then sketching architecture options. It looks like it's stalling on the wrong thing.
Task: say whether that's the flow misbehaving, and what you do.

Rubric:
- Good if: recognizes it as expected — discovery and design run before any code, so the implementation lands in your codebase's context instead of guessing at it.
- Good if: uses the time to answer its questions and correct wrong assumptions while nothing is written yet.
- Wrong/missing if: interrupts with "stop analyzing, just write it" — that skips the phases the gates depend on, and you approve code no one grounded.
- Wrong/missing if: reads silence as being stuck; the phase is working, and its output comes to you for review.

</sample_task>

<sample_task id="2" ties="answering the questions discovery asks">

Scenario: during discovery the agent asks you four things — which service owns this data, whether the old endpoint stays, and two more you'd have to go look up. You're busy, so "use your best judgment" is tempting.
Task: say how you answer, and what "you decide" would cost you.

Rubric:
- Good if: answers what you know now and says plainly which ones you'll check and come back on.
- Good if: sees that an unanswered question doesn't disappear — it becomes a guess, and the guess is what the design and the plan get built on.
- Wrong/missing if: hands the whole thing back with "you decide"; the agent can read the code, but not your team's intentions.
- Wrong/missing if: guesses an answer to sound decisive — a confident wrong answer is worse here than "I don't know yet".

</sample_task>

<sample_task id="3" ties="stopping a run in progress">

Scenario: implementation is running and going well, until you notice the files scrolling by belong to the old copy of the checkout module. Two services have near-identical names, and it picked the wrong one — an honest misread, and it's several files in.
Task: say what you do right now.

Rubric:
- Good if: stops it there and names the right module — you were watching, and that's what watching is for.
- Good if: expects it to pick up from the correction rather than starting the whole flow again; the plan still holds, the target was wrong.
- Wrong/missing if: lets it finish because interrupting feels rude — every extra file is one more to unpick.
- Wrong/missing if: waits for the next gate to catch it; the gate would, but only after the work is done twice.

</sample_task>

</sample_task_set>
