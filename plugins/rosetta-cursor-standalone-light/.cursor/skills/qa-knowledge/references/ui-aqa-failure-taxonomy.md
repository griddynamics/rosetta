# UI-AQA failure taxonomy

Exhaustive, mutually-exclusive categories for UI/E2E-QA test-execution triage.

<ui-aqa-failure-taxonomy>

Assign **exactly one** category per failure (the most-proximate cause):

1. **Selector / Locator**: element not found, selector incorrect, element-not-visible
2. **Timing / Visibility**: timeouts, race conditions, animation not settled, wait too short
3. **Assertion failure**: expected vs actual mismatch (status / content / count / attribute)
4. **Setup / Data**: preconditions / fixtures / test data / session not established
5. **Application bug**: defect in the app under test
6. **Test code**: logic error, wrong helper API, missing await/async
7. **Unknown**: failure occurred but no usable evidence (explicit catch-all)

Selector/Locator entries MUST analyze the captured page source under `plans/ui-aqa-<test-name>/page-sources/`. If that directory is missing, tag `Unknown: page sources not available; needs the selector-identification phase re-run` -- never silently skip.

</ui-aqa-failure-taxonomy>
