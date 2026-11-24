<sim_script flow="aqa-flow">

`aqa-flow` is a router: it classifies once, routes to exactly one of `ui-aqa-flow`, `api-aqa-flow`, `testgen-flow`, and does no phase work itself. These stops end at the route; the target flow's script takes over from its own first stop after the request.

<stop id="1" phase="routing" gate="request" applies="ALL" waits_on="the request they type">

Narrate: nothing yet — the session opens on their line.
Emit: nothing.
Stop: ask for the exact line they would send to get this testing task done on this repo.
Defect: none — their own words are the artifact under review here.

- Good: calls `/aqa-flow` and describes the need in plain words — knowing the three flow names is not a prerequisite.
- Good: names the signals the router reads — browser, page, selectors for UI; endpoints, OpenAPI, request/response for API; ticket-to-test-cases or TMS export without code for testgen.
- Good: already knows the target and calls it directly — `/ui-aqa-flow`, `/api-aqa-flow`, `/testgen-flow` skip the router.
- Wrong: reaches for `/coding-flow` because tests are code — test automation has its own flows, phases, and artifacts.
- Wrong: sends the task with no command — a plain request runs the lean path, none of the AQA gates stop for them.
- Carry: their request goes to the target flow verbatim; vague words here become a guessed route or a question at stop 2.

</stop>

<stop id="2" phase="routing" gate="selection" applies="request is unclear (no reliable signal) or mixed (e.g. UI and API)" waits_on="their choice of flow or order">

Narrate: the router classifies the request and finds no reliable signal, or finds two.
Emit: unclear → the three options with a one-line description each; mixed → the named split and a proposal to run the flows one after another, order theirs to pick.
Stop: their pick.
Defect: describe one option so it overlaps the other (e.g. testgen sounding like it writes test code), so a hasty pick lands in the wrong flow.

- Good: picks by the artifact they want — test cases and requirements (testgen), browser tests (UI), API tests (API).
- Good: on a mixed request, picks an order with a reason — e.g. test cases first, then automation built on them.
- Wrong: "you decide" — the router is told not to guess here because the flows write different artifact sets; a wrong route means artifacts in the wrong shape.
- Wrong: asks for both at once in one run — the router routes exactly once; the second flow is a second run.
- Carry: the chosen flow owns everything downstream; continue with that flow's script and its gates.

</stop>

</sim_script>
