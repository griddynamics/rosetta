# operator checklist: merge-ready (large task)

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
  - the age model: either of the 2 is accepted (see Done when)
  - storefront texts in English only vs all locales
  - the agent committing on its own (a red flag in the report, see below)
  - the number of follow-ups, time and cost

## From the run report: Done when (section 4)

Test customers: an adult, one who turns the age **today**, one a day too young, one with no birthday.

- [ ] Customer birthday field exists (customer account, API, dashboard)
- [ ] Staff can set and see a product's age restriction in the dashboard, in either age model: a minimum age per product, or a flag on the product plus one store-wide minimum age (18)
- [ ] **Backend** blocks checkout: underage customer
- [ ] **Backend** blocks checkout: customer with no birthday
- [ ] **Backend** blocks checkout: guest with a restricted product
- [ ] Customer who turns the age **today** can buy
- [ ] Adult customer can buy a restricted product
- [ ] Unrestricted products work as before for everyone
- [ ] Storefront shows the restriction (list + product page) and explains why buying is blocked
- [ ] Birthday not readable without a token, nor by support staff
- [ ] Tests pass locally (backend + changed frontends); for a failing test, see "Failing tests" below
- [ ] Dashboard type check passes: `pnpm run check-types` (known deficiency, CI runs it)
- [ ] No manual cleanup needed (no junk files, no debug code)
- [ ] Every page the run changed opens in the **browser** and loads once (no endless reloads or repeated requests in the Network tab)
- [ ] **The feature works in the normal dashboard build** (seen in L-CC-02; extra answer 25): the feature works in the main (3.23) dashboard build; UI only on the staging build (behind `FF_USE_STAGING_SCHEMA`, off by default) = not done. Usually a small fix

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

## Typical majors of the large task (picked from the operators' findings in the run reports, not from recorded merge-ready reasons; the diff judge has not scored the large task yet)

Checked on the final code at T2, after the follow-ups. These are majors by harm, not by fix size: 

- [ ] **No breaking public API change** (general rule, as in the small-task checklist; not from a large-task finding): existing mutations and queries accept the same inputs and return the same results (e.g. `customerCreate` and `accountUpdate` still accept their old input; the new birthday input is optional)
- [ ] **Birthday private beyond the Done-when check** (hidden question 9, every run): only the customer (own account) and a super-admin can read it, also through nested objects (`order.user`, `checkout.user`); not readable by apps; not in webhook payloads or exports; every change and every staff read is audit-logged
- [ ] **Dashboard works for every staff role**: a staff user without super-admin rights can open customer pages; the dashboard does not request the birthday for them
- [ ] **Blocked customers can't put a restricted product in the cart**: as the underage customer and the no-birthday customer, `checkoutCreate`, `checkoutLinesAdd` and `checkoutLinesUpdate` with a restricted variant each return the age error (API, on the bench stack). If the run blocks only at checkout completion, untick this and note it (a note, not a "no" by itself): on payment paths that take the money before completion (e.g. Stripe), the customer can be charged without getting an order. Whether that path is safe is left to the diff judge.
- [ ] **Birthday audit events survive customer deletion**, only in runs whose agent was given that answer (extra answers 17, 29, 38, 39); "not asked = not a defect" (BENCHMARKS.md section 4) for the others. The fix needs a migration


## Before deciding

- Record the reason in the report, in the new field `operator_merge_ready_reason`: the items that decided it and, for each "no", the small-fix criterion that fails
