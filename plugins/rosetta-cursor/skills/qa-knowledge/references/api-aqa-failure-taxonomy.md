# API-AQA failure-taxonomy

Exhaustive, mutually-exclusive categories for backend-QA test-execution triage.

<api-aqa-failure-taxonomy>

Assign **exactly one** category per failure (the most-proximate cause):

1. **Connection / Environment**: base URL unreachable, TLS, wrong environment, infrastructure down
2. **Authentication**: missing/expired token, wrong credentials, auth header not sent
3. **Request**: wrong path/method/params/body shape vs the API contract
4. **Response Assertion**: expected vs actual mismatch (status / body / schema / field value)
5. **Test Data**: fixtures, preconditions, or data factories not established
6. **Timing / Race Condition**: retry/poll timeout, async ordering, eventual-consistency window
7. **Application Bug**: defect in the API under test (not the test)
8. **Unknown**: failure occurred but no usable evidence (explicit catch-all)

When the cause is undeterminable from evidence, tag `Unknown` -- never force-fit.

</api-aqa-failure-taxonomy>
