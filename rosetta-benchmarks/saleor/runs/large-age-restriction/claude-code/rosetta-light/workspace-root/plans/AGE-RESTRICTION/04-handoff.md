# 04 — Core enforcement: checkout side (#1–#9) · handoff (2026-10-23)

**Done:** line-time guards (#1 `checkoutLinesAdd`, #2 `checkoutLinesUpdate` via shared `clean_input`, #3 `checkoutCreate`, #4 `checkoutCreateFromOrder`); completion authority (#5 transaction flow, #6 legacy flow, #7 `orderCreateFromCheckout` via #5; #8/#9 inherit, not edited); error mapping per surface; existing transaction-flow assertions updated. Working tree only, no commit.

**Evidence:**
- Smoke (temporary, not committed; copies in `<scratchpad>/s04/test_tmp_s04_age_smoke_{domain,graphql}.py`): 8 domain + 8 GraphQL cases pass. Covers guest LR, guest with adult account email LR (R6), stored user BR/UA/adult pass, unrestricted pass, fresh settings after min-age change (SC-5), legacy flow raises before payment and clears `completing_started_at`, lines add/update/create per requestor type, mixed lines report only restricted ids, minor removal allowed.
- Regression `saleor/checkout/tests` + `saleor/graphql/checkout/tests` `-n 3`: 1788 passed, 3 failed. The 3 were exact-kwarg assertions on `complete_checkout_with_transaction` (new `site_settings` kwarg). Updated in `checkout/tests/test_checkout_complete.py` (56 pass).
- Query counts `saleor/graphql/checkout/tests/benchmark` vs session 00 `bench-base.json`: every checkout row equal (add lines 103→103, update lines 98→98, complete checkout 200→200, customer complete 213→213). 34 passed.
- ruff check + format clean on changed files; mypy clean (7 source files); `makemigrations --check --dry-run`: no changes; `schema.graphql`, `uv.lock`, `pyproject.toml` untouched.
- Logs: `checkout/tasks.py:297` and `stripe/webhooks.py` log `str(error)`; messages are generic and params carry only variant ids, so no change needed (plan Do §4 confirmed).

**Decisions:**
- Mapper `prepare_age_restriction_checkout_validation_error` and message maps live in `graphql/checkout/utils.py` beside the insufficient-stock mapper that `complete_checkout.py` already imports.
- Restricted detection at line time uses `select_related("product")` in the variant query (`get_nodes_or_error(qs=…)`). Query count unchanged; no per-variant product fetch.
- Completion: `create_order_from_checkout` raises the domain `AgeRestrictionError`, and each caller maps it (transaction flow → `CheckoutErrorCode`, order mutation → `OrderCreateFromCheckoutErrorCode` LR/NE). Legacy flow maps inline after calling `_complete_checkout_fail_handler`.
- SC-5: `site_settings` passed by the caller is used as is. Otherwise `SiteSettings.objects.get(site_id=settings.SITE_ID)`, read only when a restricted line exists.
- `checkoutCreateFromOrder` and `orderCreateFromCheckout`: `Prefetch("variant", select_related product)` added, zero extra queries.

**Blockers / notes:**
- Pytest collection was blocked for a while by session 02's `graphql/account/bulk_mutations/customer_bulk_update.py` (wrong relative import `...core.exceptions`). It cleared by the time of the regression run. Not edited by 04.
- Observation (pre-existing pattern, not fixed): in `create_order_from_checkout`, the voucher usage increment is committed in its own earlier block, so an age failure on a voucher checkout leaves usage incremented (same as NO_LINES today). Flag for G3 review.
- Repo CLAUDE.md asks for tests with every change. The plan puts real tests in session 09; this session delivers the smoke tests above as evidence only.

**Next:** 09 owns the real checkout enforcement tests (TC-E-*, TC-H-03, TC-E-11, TC-P-01). 05 owns transaction/order mutations.
