<sample_task_set flow="aqa-flow">

<sample_task id="1" ties="reaching for aqa-flow">

Scenario: your team wants the checkout page covered by automated browser tests. You're new to Rosetta and don't know what any of the flows are called.
Task: type the one line you'd send.

Rubric:
- Good if: calls `/aqa-flow` and describes the need in plain words — knowing the flow names is not a prerequisite.
- Good if: expects it to route once, to a UI flow, and then get out of the way; the flow it picks owns everything after.
- Wrong/missing if: goes hunting for the exact flow name first, or guesses one — a wrong guess sends you into the flow that writes the wrong artifacts.
- Wrong/missing if: reaches for `/coding-flow` because tests are code; test automation has its own flows.

</sample_task>

<sample_task id="2" ties="calling the flow explicitly">

Scenario: the new discount rules need tests. You don't know which flow that is, so you send the task on its own and expect the right flow to kick in by itself.
Task: say what that costs you, and what you send instead.

Rubric:
- Good if: sends `/aqa-flow` with the same plain description — naming it is what guarantees a flow runs at all.
- Good if: names the cost — unprompted, the agent may just write tests its own way, and you lose the phases, gates, and artifacts you installed Rosetta for.
- Wrong/missing if: relies on it being picked up automatically; that happens sometimes, not reliably, and the reply looks much the same either way.

</sample_task>

</sample_task_set>
