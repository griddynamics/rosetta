---
name: ui-qa-failure-taxonomy
description: UI-QA (UI/E2E) failure taxonomy — exhaustive, mutually-exclusive categories for test-execution triage.
---

<ui-qa-failure-taxonomy>

UI-QA UI/E2E failure taxonomy. Assign **exactly one** category per failure (exhaustive + mutually exclusive; pick the most-proximate cause):

1. **Selector / Locator** — element not found, selector incorrect, element-not-visible
2. **Timing / Visibility** — timeouts, race conditions, animation not settled, wait too short
3. **Assertion failure** — expected vs actual mismatch (status / content / count / attribute)
4. **Setup / Data** — preconditions / fixtures / test data / session not established
5. **Application bug** — defect in the app under test
6. **Test code** — logic error, wrong helper API, missing await/async
7. **Unknown** — failure occurred but no usable evidence (explicit catch-all)

Selector/Locator entries MUST analyze the captured page source under `plans/ui-qa-<test-name>-page-sources/`. If that directory is missing, do not silently skip — tag the entry `Unknown — page sources not available; would need the selector-identification phase re-run`.

</ui-qa-failure-taxonomy>
