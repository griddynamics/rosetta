<sample_task_set flow="ui-aqa-flow">

<sample_task id="1" ties="giving it the UI it cannot see">

Scenario: the cases cover a new checkout screen. This repo holds the UI tests; the frontend is a separate repo you don't work in.
Task: say what you put in place first, then type the request you'd send.

Rubric:
- Good if: clones the frontend read-only into `refsrc/`, then calls `/ui-aqa-flow` naming that path — selectors come from the real components.
- Good if: with no frontend to give, expects to be asked for page source and to save it as a file where it asks, captured from the logged-in page under test.
- Wrong/missing if: describes the elements in chat ("the blue Pay button"); a description yields no selector, and the run stalls waiting for the page.

</sample_task>

<sample_task id="2" ties="diagnosing an element it reports as missing">

Scenario: you asked for tests on the promo-code field. It reports the field absent from the page and stops, offering options: point it at the real page, get the UI built, a marked pending spec, or abort. You're fairly sure the field shipped last sprint.
Task: say what you do before picking any of those options.

Rubric:
- Good if: asks which page and state it actually looked at — "absent" covers only the HTML it got, and that capture was probably yours to make.
- Good if: checks the usual causes before believing it: not logged in, wrong environment, flag off, or the field sits behind a step the capture never reached.
- Good if: verifies outside the chat — opens the page yourself, or asks whoever shipped the field; an agent's "not found" is a lead to check, never a fact to trust.
- Wrong/missing if: takes "absent" as proof and aborts, or parks a pending spec for a field that already works.

</sample_task>

</sample_task_set>
