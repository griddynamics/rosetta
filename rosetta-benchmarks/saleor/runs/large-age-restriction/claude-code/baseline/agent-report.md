# Agent report

## Experiment info

| | |
|---|---|
| Task | Age-restricted products: staff set a minimum age on a product, customers get a birthday, too-young / unverifiable customers can't buy. Later extended: age label everywhere, 4 UI gaps, shop-timezone date comparison, birthday privacy + audit log. |
| Method | Claude Code CLI. Plan mode first (2 read-only Explore subagents: backend; dashboard + storefront), plan approved, then implementation in the main session. Follow-up instructions handled one by one. |
| Runner | Claude Code (CLI, macOS), tests run inside the `saleor-benchmark-saleor-1` container, JS tools run on the host |
| Model | Sonnet 5.5 (`claude-sonnet-5-5`) |
| Start | Not recorded. First container command was at about 07:29 UTC (about 09:29 CEST); exploration began a few minutes earlier. |
| End | 2026-10-23 10:01 UTC (12:01 CEST), when the diffs were generated |
| Repositories changed | `saleor`, `saleor-dashboard`, `react-storefront` (nothing committed; `git add -N .` was run only to produce the diffs) |
| Diffs | `saleor.diff` (40 files, +2561/-11), `saleor-dashboard.diff` (36 files, +826/-18), `react-storefront.diff` (35 files, +388/-17) |

## Actions

| Action | Done? | Evidence |
|---|---|---|
| Explored the code / planned | yes | 2 Explore subagents, plan file `envs/baseline/claude/plans/pasted-content-id-9da6-some-of-partitioned-anchor.md`, plan approved via ExitPlanMode |
| Wrote code | yes | the three `.diff` files in this folder |
| Created database migrations | yes | `account/0106_age_restriction`, `product/0211_age_restriction`, `account/0107_birthday_audit_log`, created with `manage.py makemigrations` |
| Wrote tests | yes | backend: `core/utils/tests/test_age.py`, `graphql/checkout/tests/mutations/test_checkout_age_restriction.py`, `graphql/product/tests/mutations/test_product_minimum_age.py`, `graphql/account/tests/mutations/account/test_account_birthday.py`, `.../staff/test_customer_birthday.py`, `graphql/account/tests/test_birthday_privacy.py`; dashboard: `CustomerInfo.test.tsx`, `customers/utils/birthday.test.ts` plus additions to 4 existing test files; storefront: `age-restriction.test.ts`, `cart-add-line-result.test.ts`, `birthday.test.ts`, `sale-label.test.ts` |
| Ran tests | yes | backend `pytest saleor --reuse-db -n 8` inside the container; dashboard `pnpm test:quiet` and targeted `pnpm exec jest`; storefront `pnpm test:run` |
| Ran tests multiple times | yes | backend: targeted runs after each change, a broad run, then two full-suite runs (18437 passed / 7 failed, then 18476 passed / 6 failed); dashboard full jest run 3 times; storefront vitest run 4 times |
| Ran tests in a different order | no | I did not deliberately shuffle. xdist (`-n 8`) distributes tests differently each run, which is how the order-dependent failures below showed up, but I did not run random-order or reversed-order checks. |
| Compared against the untouched code | yes | `git stash -u`, ran `test_tasks.py` and one benchmark test, `git stash pop`. `test_tasks.py` failures also happen without my changes. |
| Reviewed the code | no | No separate review pass (no `/code-review`, no second reviewer). Problems were found only by tests, type checks and lint (for example the misplaced dashboard schema patch, the extra query in checkout benchmarks, the missing birthday check in registration). |
| Ran linters and type checks | yes | backend `ruff check`, `ruff format --check`, `mypy` on changed modules, `makemigrations --check`; dashboard `pnpm check-types`, eslint, prettier; storefront `tsc --noEmit`, eslint (with the local API URL), `data:lock:check`, `lint:design-tokens` |
| Regenerated generated files | yes | backend `poe build-schema`; dashboard `pnpm generate` and `pnpm extract-messages`; storefront graphql-codegen (main and checkout) |
| Updated documentation | yes | `saleor/CHANGELOG.md`, `saleor-dashboard/.changeset/age-restricted-products.md`, GraphQL descriptions in `schema.graphql`, `react-storefront/data-layer.lock.md` |
| Started the application | no | The storefront (:3000), dashboard (:9000) and the API container were already running. I did not start or restart anything. I ran `manage.py migrate` against the running API database after you reported the missing column. |
| Checked the API | yes | `curl localhost:8000/graphql/` returning `minimumAge`; storefront HTML checks with `curl` for `/`, `/products`, a product page and `/cart` (HTTP 200, "18+" label found on the product and listing pages while Apple Juice was temporarily set to 18) |
| Took a screenshot of the final result | no | No browser or screenshot tool was used. UI behaviour was checked only through rendered HTML, unit tests and type checks. |
| Cleaned up leftovers | partly | Done: removed `schema-*.orig` files in the dashboard, removed the temporary `schema.graphql` copy in the storefront, reset the temporary Apple Juice `minimum_age` back to null, popped both stashes (stash list is empty). Not done: scratch files in the session scratchpad, `/tmp/files.txt`, `/tmp/x`, and log files in `/tmp` inside the container. |

## Notable events and caveats

- I ran `git stash` by mistake once in `saleor` and popped it immediately. Nothing was lost; the later `git stash -u` baseline comparison was deliberate and also popped.
- The local API database was missing the migrations at first (tests use a separate database). Fixed by migrating the running database; migration `0107` was applied the same way.
- Known failing tests, not caused by this work: `saleor/checkout/tests/test_tasks.py::test_automatic_checkout_completion_*` (log-count assertions; they fail on the untouched code too and the failing set changes between runs). `test_allow_writer_in_context_replica` failed once in a parallel run and passed on its own.
- After the last mypy fix I re-ran only the privacy tests (30 passed), not the full backend suite again.
- Not run: storefront e2e (Playwright), dashboard Storybook tests, storefront `pnpm verify` (`docs:check` fails because `skills/` scripts are missing from the repo, unrelated).
- Open points reported to the user: no UI/API to read the audit log and no retention rule; nothing done for encryption at rest or backups.
