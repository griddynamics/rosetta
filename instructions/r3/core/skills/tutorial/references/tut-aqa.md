<module_aqa>

<what_its_for>

`aqa-flow` is a router, not a worker: it classifies a test-automation request and dispatches once to exactly one of `ui-aqa-flow` (browser/E2E), `api-aqa-flow` (backend API tests), or `testgen-flow` (test-case generation from tickets, no code). It performs no phase work itself.

</what_its_for>

<checkpoint id="1" phase-tie="routing table">

Scenario: a user asks to "automate our checkout page test in Playwright."
Task: say which flow this routes to and why, citing the signal that decided it.

Rubric:
- Good if: routes to `ui-aqa-flow` — signals: browser, page, Playwright, E2E.
- Good if: notes the router invokes the target flow with the user's request verbatim, and that flow now owns all phases/state/HITL downstream.
- Wrong/missing if: picks `api-aqa-flow` (wrong signal class) or thinks `aqa-flow` itself writes page objects (it does no phase work).
- Wrong/missing if: forgets this is described as a router "kept for backward compatibility" — a direct `/ui-aqa-flow` call is equally valid.

</checkpoint>

<checkpoint id="2" phase-tie="mixed/unclear request handling">

Scenario: a user asks to "cover our /orders endpoint AND the orders UI page with tests."
Task: describe how the router should handle this, without picking one flow and dropping the other.

Rubric:
- Good if: names this a mixed request — name the split (UI vs. API), propose running both flows sequentially, let the user pick order.
- Good if: does not silently guess and drop the other half.
- Wrong/missing if: force-picks one flow only, or merges both into a single made-up "ui-and-api-flow" that doesn't exist.
- Wrong/missing if: doesn't recognize this differs from the "unclear request" case (no signal at all), which instead asks the user to choose among the three with one-line descriptions.

</checkpoint>

<checkpoint id="3" phase-tie="testgen boundary">

Scenario: a user says "turn these 5 Jira tickets into test cases in TestRail, no automation code needed yet."
Task: name the target flow and one reason it's not `ui-aqa-flow`/`api-aqa-flow`.

Rubric:
- Good if: routes to `testgen-flow` — signals: requirements analysis, test-case design from a ticket, TestRail export without automation.
- Good if: distinguishes "generates test cases/requirements, exports to TMS" from "writes test automation code."
- Wrong/missing if: routes to `ui-aqa-flow`/`api-aqa-flow` because "tests" was mentioned — those own automation code, not case generation.
- Wrong/missing if: assumes route happens more than once — routing happens exactly once, the target flow owns everything after.

</checkpoint>

</module_aqa>
