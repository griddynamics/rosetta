# 21r — Core review remediation · handoff (2026-10-23)

**Done:** all 4 Major and 15 Minor findings are addressed except the items below, which are skipped with a reason; all 8 Nits are fixed, documented or skipped with a reason. Per-finding status: `21-review.md` "Remediation status (21r)" and HANDOFF "Review findings" rows `21 M-1`…`21 N-9`. No commits. Footprint: DB `test_saleor_s21r` and `test_saleor_s21r_gw0..2` (`--reuse-db`), drop at G3.

**Fixed (code/tests):**
- M-1 `checkout_lines_add.py` `clean_input`: validation set built by variant id (was `zip(variants, lines)`). 4 new tests, 3 red before the fix (add zero-quantity forced duplicate; update with plain variant first; removal control). Checkout lines file: 22 passed after the fix.
- M-3 TC-P-01 asserts exact counts (guest complete 200, customer complete 213, the S00 bench rows; lines add guest 83, customer 86 pinned). Bench plugin on the current code reproduces 200 / 213 / 103 (`test_add_checkout_lines`).
- M-4 claim corrected: `customers(first:100)` 5 → 6 queries with `isAgeEligible` (+1 audit INSERT). The baseline already loads site and settings, so the review's +3 was wrong. Budget test kept, docstring updated; no optimisation.
- m-4/m-5 `deletion.py` comment and docstring (RK-1 re-verify, lock vs pyproject pin, RK-4 note).
- m-6 `get_shop_today` rejects naive `now` (test). m-7 Pago_Pago eligibility row. m-8 test renamed, documented as guard. m-9 exact flag values + minor test. m-10 DB existence checks in 4 files. m-11 fixed `ADULT_BIRTHDAY` replaces clock helper (freeze at 12:00 broke fixtures). m-14 `Site.objects.clear_cache()` after `shopSettingsUpdate` + test (red without the line). m-16 `CustomerEvent.user` resolves requestor via `get_user_or_app_from_context`; apps get PermissionDenied (test; route matrix comment updated).
- N-2 shared `NOT_ELIGIBLE_MESSAGE`. N-7 stale pyc removed. N-8 cached tz set.

**Documented (spec / CHANGELOG):** M-2 orderBulkCreate exempt (spec §5 bullet, CHANGELOG 3.24.0, test `test_order_bulk_create_age_restricted_line_imported_without_age_check`). m-3 anonymous-only register (S§7, A14; test exists). m-12 TC-B-10/B-11 rows. N-1 spec §9. N-9 spec A6 (pre-existing `is_active`).

**Skipped (reason):** m-1 gift lines (spec silent; product decision needed; completion still blocks). m-2 draft check outside lock (fix needs `select_for_update` in two mutations with a shared lock order; open). m-13 diff shape only. m-15 accepted (S03-D1). N-3 not a duplicate. N-4 schema description change (avoided; reopens G2 and client locks). N-5 ID never defined. N-6 optional, semgrep not runnable.

**Gates (after fixes):** ruff check on 20 changed files: pass; ruff format --check: 20 already formatted. mypy on 7 changed source files: no issues. Schema gate: `get_graphql_schema` vs `schema.graphql`: 0 diff lines (no schema change). `makemigrations --check`: no changes.

**Suites** (`pytest saleor/checkout saleor/account saleor/graphql/checkout saleor/graphql/account saleor/graphql/order saleor/graphql/payment saleor/payment saleor/graphql/shop -n 3 --reuse-db`): 6800 passed, 2 failed (run 1, 419 s); same 6800 / 2 on rerun (354 s).

**Open failure (not shown to be caused by the remediation):** `saleor/graphql/shop/tests/queries/test_shop.py::test_query_available_payment_gateways` and `…_specified_currency_USD`. The assertion finds an extra gateway `mirumee.payments.dummy_credit_card` (`DEFAULT_ACTIVE = False`). Evidence: both pass alone and for the whole file at `-n0`; the failure is deterministic under `-n 3` (2 runs); it persists with all 40 new untracked test files excluded (6527 passed, same 2 failed); no `PluginConfiguration` row is left in the worker DBs; none of the changed files touch plugin state. The leaking test is not identified. Likely a pre-existing in-process plugin state leak that depends on xdist distribution (the S11 full run at `-n 8` passed). Next step: bisect the worker order (`--dist loadfile`, or `-p xdist` with a fixed order) to name the leaker. Not fixed here.

**Not verified / observations:** restricted `checkoutLinesAdd` costs about +2 to +3 queries over an unrestricted add for the same customer (one run: 88 vs 85); not investigated, NFR-1 is about unrestricted carts. Other sessions' sourceless `test_tmp_*.pyc` remain under `saleor/` (gitignored). CI-only checks not run: GraphQL Inspector, semgrep, migrations-compat, full `-m "not e2e"` suite.
