<sample_task_set flow="api-aqa-flow">

<sample_task id="1" ties="giving it the backend code it cannot see">

Scenario: you're the QA on a payments team. The refund test cases sit in your test management tool, this repo holds only the API tests, and the service implementing those endpoints is a separate repo you don't work in.
Task: say what you put in place first, then type the request you'd send.

Rubric:
- Good if: clones the backend read-only into `refsrc/`, then calls `/api-aqa-flow` naming that path.
- Good if: points at the actual cases — suite, section, or case IDs — and expects the run to work from the code as the contract, since there's no spec to fall back on.
- Wrong/missing if: pastes the backend repo URL or just names the service; the agent reads this workspace and nothing outside it, so the backend stays unread and the endpoint contracts get guessed.

</sample_task>

<sample_task id="2" ties="handing back execution results">

Scenario: the tests are written and it stops, asking for execution results. You reply "ran them, all green except a couple of flaky ones".
Task: say what it actually needs, and what your summary costs.

Rubric:
- Good if: pastes the runner output or gives the path to the report; the gate won't take your word for the result.
- Good if: reads the stop as the gate working, not a stall — the run is yours to do.
- Wrong/missing if: paraphrases the failures; the analysis is built from real error messages and status codes, so a summary buys a guessed root cause and a fix on the wrong line.
- Wrong/missing if: lets those fixes land without approving them; comments aren't approval.

</sample_task>

</sample_task_set>
