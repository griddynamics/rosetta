# 09 — Core enforcement tests · handoff (2026-10-23)

**Done:** 8 new test files, 60 tests (new files only; no source, schema, fixture or other-session file touched; not committed). Covers S§5 #1–#14, TC-H-01..04, TC-E-01..08, TC-E-11, TC-B-08, TC-B-11, TC-P-01, SC-5, NFR-1. Files under `saleor/saleor/`: `graphql/checkout/tests/mutations/test_checkout_age_restriction_lines.py` (15) and `test_checkout_complete_age_restriction.py` (14), `…/mutations/test_order_create_from_checkout_age_restriction.py` (6), `graphql/payment/tests/mutations/test_transaction_age_restriction.py` (6), `graphql/order/tests/mutations/test_order_age_restriction.py` (9), `checkout/tests/test_checkout_complete_age_restriction.py` (5), `payment/gateways/stripe/tests/test_webhooks_age_restriction.py` (3), `graphql/checkout/tests/benchmark/test_checkout_age_restriction_query_counts.py` (2).

**Evidence:**
- `-n0` 60 passed (33 s); `-n 3` 60 passed. DB `saleor_s09` (`test_saleor_s09`, `_gw0..2`, `--reuse-db`). ruff check and format --check clean.
- TC-P-01 (`django-queries diff` vs S00 bench json): all checkout mutation rows equal (complete checkout 200=200, customer complete 213=213, add lines 103=103, update lines 98=98). New named tests: guest 200, customer 213. Duplicate-statement column differs ±2 on 2 rows vs session 04 (query counts unchanged).
- Mutants (in-memory scratch plugin, nothing in repo): 6/6 killed. M1 no completion check (T-2) → 23 fail. M2 requestor instead of stored user (S-2) → 5 fail. M3 cached site fallback (SC-5) → 3 fail. M4 allow_anonymous at checkout → 7. M5 SiteSettings read when unrestricted (NFR-1) → 2. M6 generic error mapping → 16.
- Changed executable lines of `checkout/complete_checkout.py`: 17/17 covered (100 %).

**Decisions:**
- Injected restricted lines are created before the product flag flips, bypassing the line guard (T-2 shape).
- #10/#11 selections omit `variants` (S05-D1). SC-5 completion/task/webhook tests use fixed birthdays under `freeze_time("2026-10-23 23:00 UTC")`; freezing at 12:00 broke funded fixtures.

**Observation for parent (decision, no source edit):** Stripe legacy path (#9): when the age check fails after Stripe captured funds, `_finalize_checkout` logs at info and leaves the payment captured with no order and no refund (`saleor/payment/gateways/stripe/webhooks.py:211-225`). Spec A7 says existing refund paths apply. Logged in HANDOFF cross-scope.

**Blockers:** none. **Not re-run:** existing suites (no source change; 04/05 green). TC-H-02 legacy unrestricted payment flow relies on existing `test_checkout_complete_with_payment.py`.

**Next:** 10 (parallel) and 11. G3: `DROP DATABASE test_saleor_s09` and `_gw0..2`.
