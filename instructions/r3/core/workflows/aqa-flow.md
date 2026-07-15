---
name: aqa-flow
description: "Router workflow for test automation: routes to ui-aqa-flow, api-aqa-flow, or testgen-flow. Kept for backward compatibility."
alwaysApply: false
tags: ["workflow"]
user-invocable: true
baseSchema: docs/schemas/workflow.md
---

<aqa_flow>

<description_and_purpose>

Backward-compatible entry point for test-automation requests. The former monolithic AQA workflow was split into three specialized flows; this router classifies the request and dispatches to exactly one of them. It performs no phase work itself.

</description_and_purpose>

<routing>

Classify the user's request and route (invoke the target flow with the user's original request verbatim):

| Request is about… | Route |
|---|---|
| UI / browser / E2E test automation — page objects, selectors, UI test implementation or correction | USE FLOW `ui-aqa-flow.md` |
| Backend API test automation — API contracts, Swagger/OpenAPI, request/response tests, API test implementation or correction | USE FLOW `api-aqa-flow.md` |
| Generating test cases / requirements from tickets and docs (Jira/Confluence), exporting cases to a TMS — no test code | USE FLOW `testgen-flow.md` |

- **Signals:** UI — browser, page, selector, Playwright/Cypress/Selenium, E2E, frontend; API — endpoint, Swagger/OpenAPI, REST, request/response, backend tests; testgen — requirements analysis, test-case design from a ticket, TestRail export without automation.
- **Mixed request** (e.g. both UI and API automation): name the split, propose running the flows sequentially, and let the user pick the order.
- **Unclear request** (no reliable signal): ASK the user which flow applies — present the three options with a one-line description each. Do NOT guess; the flows write different artifact sets.
- Route exactly once; the target flow owns everything downstream (phases, state, HITL gates).

</routing>

</aqa_flow>
