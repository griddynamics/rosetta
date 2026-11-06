---
layout: docs
title: AQA (Router)
permalink: /docs/aqa-flow/
---

# AQA Flow (Router)

## TL;DR

`/aqa-flow` is the original automated-QA entry point, kept for backward compatibility. It no longer runs phases itself: it classifies your request and dispatches to exactly one of the specialized flows, asking you which one applies when the request does not make it clear.

- **[UI AQA Flow](/rosetta/docs/ui-aqa-flow/)** (`/ui-aqa-flow`) — UI / end-to-end test automation: page objects, selectors, browser tests.
- **[API AQA Flow](/rosetta/docs/api-aqa-flow/)** (`/api-aqa-flow`) — backend API test automation: endpoint contracts, Given-When-Then specs, request/response tests.
- **[Test Case Generation](/rosetta/docs/testgen-flow/)** (`/testgen-flow`) — requirements and TestRail-ready test cases from a ticket, no test code.

Prefer invoking the specific flow directly — the router exists so existing habits and older instructions keep working.

## How It Routes

| Your request is about… | Routed to |
|---|---|
| Browser/UI/E2E automation — pages, selectors, Playwright/Cypress/Selenium, page objects | `ui-aqa-flow` |
| Backend API automation — endpoints, Swagger/OpenAPI, request/response assertions | `api-aqa-flow` |
| Generating test cases or requirements from Jira/Confluence, exporting to a TMS | `testgen-flow` |
| Mixed (e.g. UI and API together) | The router names the split and proposes running the flows sequentially — you pick the order |
| Unclear | The router asks you which flow applies — it never guesses, because the flows write different artifact sets |

The target flow owns everything downstream: phases, state files, artifacts, and HITL gates.

## Example

```text
/aqa-flow Create QA automation for the checkout flow
```

The router recognizes a UI scenario and dispatches to `ui-aqa-flow` with your original request.

## Source Files

- [aqa-flow.md](https://github.com/griddynamics/rosetta/blob/main/instructions/r3/core/workflows/aqa-flow.md)
