---
name: api-qa-failure-taxonomy
description: QA (backend API) failure taxonomy — exhaustive, mutually-exclusive categories for test-execution triage.
---

<api-qa-failure-taxonomy>

QA backend-API failure taxonomy. Assign **exactly one** category per failure (exhaustive + mutually exclusive; pick the most-proximate cause):

1. **Connection / Environment** — base URL unreachable, TLS, wrong environment, infrastructure down
2. **Authentication** — missing/expired token, wrong credentials, auth header not sent
3. **Request** — wrong path/method/params/body shape vs the API contract
4. **Response Assertion** — expected vs actual mismatch (status / body / schema / field value)
5. **Test Data** — fixtures, preconditions, or data factories not established
6. **Timing / Race Condition** — retry/poll timeout, async ordering, eventual-consistency window
7. **Application Bug** — defect in the API under test (not the test)
8. **Unknown** — failure occurred but no usable evidence (explicit catch-all)

When the most-proximate cause cannot be determined from available evidence, tag the failure `Unknown` — do not silently force-fit it into a substantive category.

</api-qa-failure-taxonomy>
