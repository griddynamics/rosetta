# 11 — Core closeout · handoff (2026-10-23)

**Done:** CHANGELOG `# 3.24.0` section; `agents/IMPLEMENTATION.md` workstream entry; short docs touch-ups (`docs/CONTEXT.md` glossary + rule, `docs/COMMERCE-CONTEXT.md` checkout rule, `docs/ARCHITECTURE.md` two agent gotchas). Source fix: voucher usage release on age failure in the transaction flow (`checkout/complete_checkout.py`, S11-D1). New test file `checkout/tests/test_create_order_voucher_age_restriction.py` (2 tests). No commits.

**Fix:** `create_order_from_checkout` ran the age check inside its `transaction.atomic()` block. Raising rolls the block back, which also undoes the voucher release. Red before the fix: `VoucherCode.used` 0 → 1 after an underage completion. Now the block sits in a `try`; `except AgeRestrictionError` calls `_complete_checkout_fail_handler(voucher_code, voucher)` after the rollback and re-raises. Re-indent only, no extra queries. Control test: an eligible customer still consumes usage and gets the `VoucherCustomer` row.

**Evidence:**
- Full suite `pytest -m "not e2e" -n 8` (`saleor_s11`): 18482 passed, 1 skipped, 0 failed (552.7 s). S00 baseline 18161 / 1 skipped → +321 = new tests (06 75, 08 53, 09 60, 10 114, 03 17, 11 2). No failures, no flakes.
- Query bench (`benchmark` dirs, -n0): 56 passed (S00 50 + 6 new). django-queries diff: 46 rows equal, 2 new TC-P-01 rows (complete checkout 200, customer complete 213, equal to base rows), 1 changed: `delete staff members` 51 → 52. Captured the extra statement: `UPDATE account_customerevent SET user_id = NULL WHERE … type IN (birthday_*)` per delete batch (S§9.1 "+1 UPDATE per batch"). Expected, not a regression.
- Coverage: `age_restriction.py` 100 % (67/67), `deletion.py` 100 % (7/7). `complete_checkout.py` changed lines 56/58 = 96.6 % over checkout, payment, order and Stripe suites (4717 passed); the 2 misses are pre-existing GiftCardNotApplicable re-raises.
- Gates: ruff check saleor ✓, ruff format --check saleor ✓ (4428 files), mypy 39 changed non-test files ✓, makemigrations --check ✓, schema diff empty ✓, deptry ✓, `uv.lock`/`pyproject.toml` untouched ✓.
- Semgrep (manual, `.semgrep/`): no exception object in logger `extra`; no `requests` calls; no AddIndex/RunPython; no `get_app_config`; no `Site.objects.get_current()` for age settings (SC-5).

**Decisions:**
- A1 release line: `# 3.24.0` added above `# 3.23.0`. Repo is 3.23.41; the 3.23.0 section lists already-shipped 3.23 features; the file has no patch sections; the API is additive minor (`Added in Saleor 3.24.`). Convention not written down in repo; confirm at release.
- Release placed after the rolled-back block, not by moving the check before the increment (that would add line queries on voucher carts, NFR-1).
- InsufficientStock on the same path has the same gap (mocked InsufficientStock: `used` 0 → 1). Not changed, see S11-O1.

**Blockers:** none. **Residual / not run locally:** GraphQL Inspector, changelog enforcer, migrations-compat (`PYTEST_DB_URL` job), semgrep binary (manual review only), e2e (excluded).
**Next:** dashboard 13, 15; then 21–23. G3 footprint: `DROP DATABASE test_saleor_s11` and `_gw0..7`.
