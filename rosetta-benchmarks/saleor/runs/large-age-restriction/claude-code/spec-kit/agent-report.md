# Agent report

## Experiment info

| Field | Value |
|---|---|
| Task | Age-restricted products: staff set a minimum age on a product, customers get a birthday field, customers who are too young (or have no birthday, or are guests) cannot buy those products. Follow-ups in the same session: birthday visible only to owner and superusers, audit events for birthday changes and reads, age label across the storefront, check of recommendation emails, age worked out in a shop time zone (`SHOP_TIME_ZONE`). |
| Method | Spec Kit: `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge`, `/speckit-implement` again, then individual follow-up requests. Four sub-agents were used for the dashboard, storefront profile/errors, storefront catalog labels, storefront cart/checkout/order labels. |
| Runner | Claude Code CLI (agent loop with Bash/Edit/Agent tools) |
| Model | claude-sonnet-5-5 |
| Start time | About 14:30 Europe/Helsinki (approx. 11:3x UTC). Not recorded exactly; the earliest timestamp I can point to is the first backend test log at 11:38:13 UTC. |
| End time | 20:46 Europe/Helsinki (`date` when this report was written) |

## Output files

- `saleor.diff` (35 files, +1970/-5), `saleor-dashboard.diff` (41 files, +852/-13), `react-storefront.diff` (49 files, +1006/-154), each from `git add -N .` then `git diff speckit-v1` in that repo.
- Nothing was committed. `git add -N .` marks new files as intent-to-add in each repo's index.
- Not in the diffs: `~/saleor-benchmark/specs/` and `~/saleor-benchmark/.specify/` (the workspace root is not a git repo), and git-ignored generated files (GraphQL codegen output).

## Actions

| Action | Done | Evidence |
|---|---|---|
| Wrote spec, plan and task list | yes | `specs/001-product-minimum-age/{spec,plan,research,data-model,quickstart,tasks}.md`, `contracts/graphql-schema.md`, checklist `checklists/requirements.md`; converge appended T035-T039 |
| Wrote code | yes | Backend: model fields + migrations `product/0211`, `account/0106`, `account/0107`, checkout age check (`checkout_cleaner.py`), GraphQL fields/inputs, `shop_time_zone.py`. Dashboard and storefront changes. See the three `.diff` files |
| Reviewed the code | partial | Informal only: read `git status`/diffs of the agents' work, found and merged a duplicated helper, found a bug via test failures. No formal review (`/code-review`, `/simplify`) was run |
| Wrote tests | yes | Backend: `checkout/tests/test_checkout_age_restriction.py`, `graphql/checkout/tests/mutations/test_checkout_age_restriction.py`, `graphql/account/tests/mutations/test_user_birthday.py`, `graphql/product/tests/mutations/test_product_minimum_age.py`, `core/tests/test_shop_time_zone.py`. Dashboard and storefront: new/updated `*.test.ts(x)` listed in the diffs |
| Ran tests | yes | Backend `python -m pytest` in the `saleor-benchmark-saleor-1` container; `npx jest` (dashboard); `npx vitest run` (storefront) |
| Ran tests multiple times | yes | Backend new tests re-run after each fix (e.g. 2 failures, fixed, then 35 passed); wide suites run several times (4213, 4895, 3336, 4329 passed). Dashboard full jest ran three times: first run had 2 flaky failures, the two re-runs had 6160 passed. Storefront vitest ran after every change (807 to 819 tests) |
| Ran tests in a different order | no | Default `-n auto` parallel run only; no randomised or reversed ordering was run |
| Mutation-checked a test | yes | Temporarily put the UTC date back in the age check; 3 shop-time-zone tests failed, then restored the fix (3 failed, 29 passed) |
| Ran linters and type checks | yes | `ruff check/format`, `mypy` (backend, "no issues found"); `tsc --noEmit` (storefront, dashboard), `pnpm run check-types:src` (dashboard, strict), eslint, prettier, `pnpm data:lock:check`, `lint:graphql-variants`, `knip` |
| Checked pre-existing failures | yes | Storefront `core:lock:check` and `docs:check` fail identically with changes stashed; `knip` output compared to unmodified code |
| Cleaned up leftovers | partial | Done: deleted the 3 throwaway customers and test checkouts from the dev DB, reset test products' minimum age to null, removed temporary `schema.graphql` copies, removed scratch scripts from the API container. Not done: scratch files remain in the macOS `/tmp` (`knip-*.txt`, `page.html`, `co.html`, `cid.txt`, `cl.py`, `cleaner.bak`) and in the session scratchpad |
| Updated documentation | yes | `saleor/CHANGELOG.md` (age restriction, birthday visibility, audit events, `SHOP_TIME_ZONE`), spec Assumptions, `tasks.md` checkboxes, dashboard changeset `.changeset/quiet-owls-age.md`. No README or docs-folder changes |
| Started the application | no | The API (:8000), storefront (:3000) and dashboard (:9000) were already running. I did not start them. The API container auto-reloaded my code |
| Changed the running environment | yes | Applied migrations `product.0211`, `account.0106`, `account.0107` to the dev database (the API errored on product queries without them) |
| Checked the API | yes | Walkthrough script against `localhost:8000/graphql/`: minimum-age set/clear/invalid, guest/no birthday/one day short/exactly 18 at `checkoutCreate`, `checkoutLinesAdd`, profile birthday set/clear/future/visibility. Output in the session: all as specified. `checkoutComplete` stopped earlier at shipping validation for that product (covered by automated tests instead) |
| Checked pages in the running storefront | partial | `curl` of rendered HTML: product page and product list showed "Age 18+", checkout page showed "Age 21+". Not confirmed live: search page, cart drawer, order confirmation, account order page |
| Took a screenshot of the final result | no | No browser or screenshot tool was used; checks were `curl` and API calls |
| Ran browser/e2e tests | no | Playwright / dashboard e2e not run |
| Asked the user a question | yes | Two multiple-choice questions: where to store audit records (user chose `CustomerEvent`), and how to define the shop time zone (user first chose per-channel, then changed to `SHOP_TIME_ZONE`) |

## Known gaps and caveats

- No formal code review and no browser verification of the dashboard or storefront UI.
- Non-English translations (7 locales) were written by the model and not reviewed by a native speaker.
- The age check is not applied on `checkoutLinesUpdate`, draft orders or staff-created orders (it is re-checked at completion).
- Recommendation/marketing emails: nothing in the three repos sends product recommendations, so no exclusion was implemented. External apps cannot currently read `birthday` or the legacy product webhook's minimum age.
- `SHOP_TIME_ZONE` is one time zone for the whole shop, not per channel.
- Storefront "birthday required" message in checkout has no profile link (plain-text error area).
