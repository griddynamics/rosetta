# operator checklist: merge-ready (small task)

If you check everything below, your run should be merge-ready. Some items left unchecked for minor reasons don't lead to 'not merge-ready', just state in the report why they are unchecked:

Merge-ready = can be merged after a normal review, without rework.

- **Rework** = any fix that is not a small fix.
- **Small fix** = meets all four: no design decision needed (the task, an answer or a repo pattern already says what to do); stays within one repo; adds no new file, type, API field, setting or migration; changes no behavior that API clients or other repos rely on.
- An unchecked item whose fix is **rework** = **not merge-ready**. An unchecked item whose fix is a **small fix** = leave a note, not a "no".

## What is judged

- 'Score' and 'merge-ready' judge the **final code at T2**, not the way to it. Follow-ups, time and cost are measured separately.
- "Yes" goes with score 4–5. Score 3 ("notable gaps" left in the final code) = "no".
- Many follow-ups but everything works at the end = 4–5 / yes.
- **Not a reason for "no"**:
  - storefront texts in English only vs all locales
  - the agent committing on its own (a red flag in the report, see below)
  - the number of follow-ups, time and cost

## From the run report: Done when (section 4)

- [ ] Staff can **set** the field in the dashboard and it is saved
- [ ] Staff can **edit** and **clear** it
- [ ] Stored in the backend, readable through the public API
- [ ] Storefront shows it when set
- [ ] Storefront shows nothing extra when empty
- [ ] Existing products open and work as before
- [ ] Tests pass locally (backend + changed frontends); for a failing test, see "Failing tests" below
- [ ] Dashboard type check passes: `pnpm run check-types` (known deficiency, CI runs it)
- [ ] No manual cleanup needed (no junk files, no debug code)
- [ ] Every page the run changed opens in the **browser** and loads once (no endless reloads or repeated requests in the Network tab)
- [ ] **The feature works in the normal dashboard build** (asked in S-CC-06 and S-CP-06; extra answer 25): the feature works in the main (3.23) dashboard build; UI only on the staging build (behind `FF_USE_STAGING_SCHEMA`, off by default) = not done. Usually a small fix

### Failing tests

Rerun the failing test once.

- **Not the run's fault** (note it; no effect on merge-ready): it passes on rerun, it also fails on `baseline-v1`, or it is a timeout in a file the run did not touch.
- **The run's fault**: it fails every time and only with the run's changes. Then `tests_pass` = no → "no".

## From the run report (section 5):

- [ ] Logic enforced in the backend, not only in the UI
- [ ] Migration present and applies on a clean DB
- [ ] GraphQL schema and dashboard codegen updated
- [ ] No tests skipped, deleted, weakened or marked `xfail`
- [ ] Agent ran the tests it wrote
- [ ] No unrelated files changed or refactored
- [ ] No new dependency without need
- [ ] Agent did not say "done" while something was clearly broken (a problem found in the operator's own check after T1 and fixed by a follow-up counts only as a follow-up)
- [ ] Nothing committed or pushed. If the agent committed or pushed on its own, tick the red flag in the report; it is not a "no" by itself. "No" only if the code itself needs rework.

## Added from the diff judge (majors that mean rework)

- [ ] **No breaking public API change**: existing mutations accept the same input types (e.g. `productTranslate` still takes `TranslationInput!`)
- [ ] **No missing UI surface that needs a new screen, dialog or API to add**. Note: a missing option in an existing UI list when the backend supports it (e.g. the field in the CSV export dialog) is a small fix
- [ ] **No edits to files the repo marks off-limits** (e.g. the storefront core mapper and `ProductView` contract are unchanged; the new field goes through the extension hook `mapProductExtensions`)
- [ ] **No stale data customers see that staff cannot fix** (e.g. after clearing the base value, the storefront no longer shows its translation)

## Before deciding

- Record the reason in the report, in the new field `operator_merge_ready_reason`: the items that decided it and, for each "no", the small-fix criterion that fails
