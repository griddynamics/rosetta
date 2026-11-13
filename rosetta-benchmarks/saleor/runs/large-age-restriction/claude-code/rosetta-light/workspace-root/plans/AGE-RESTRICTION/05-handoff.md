# 05 — Core enforcement: transactions + staff orders (#10–#14) · handoff (2026-10-23)

**Done:** #10 `transactionInitialize` and #11 `transactionProcess` (checkout source) check restricted lines in `validate_checkout` after the unchanged lock check. #12 `orderLinesCreate`, #13 `draftOrderComplete`, #14 `draftOrderCreate` (with lines) check with `allow_anonymous=True`. Six files, all in §6 row 05: `graphql/payment/mutations/transaction/{utils,transaction_initialize,transaction_process}.py`, `graphql/order/mutations/{draft_order_create,order_lines_create,draft_order_complete}.py`.

**Evidence:**
- Smoke (17 temp tests, not committed; copies in `<scratchpad>/s05/test_s05_age_smoke_tmp.py` x2): guest LR, linked BR, linked UA, adult passes, adult email on guest checkout still LR (R6), site settings re-read between calls (SC-5), unrestricted checkout does not load site settings, `TransactionProcess.validate_checkout` LR; draft no customer completes, linked no-birthday NE with variants, `user_email` minor NE, adult `user_email` completes, customer unlinked afterwards completes, unconfirmed orderLinesCreate NE, no customer passes, draftOrderCreate linked NE, no customer passes. All 17 pass.
- Regression on `saleor_s05`: `pytest saleor/graphql/payment saleor/graphql/order saleor/order saleor/payment -n 3` = 3972 passed, 0 failed (268.6 s). No existing test edits were needed.
- `ruff format --check` and `ruff check` clean (14 files). `mypy` clean (6 files). `makemigrations --check --dry-run`: no changes (the consistency-history check was skipped because DB `saleor_s05` does not exist).
- `uv.lock`, `pyproject.toml`, `schema.graphql` untouched.

**Decisions:**
- Checkout helper `validate_checkout_age_restriction(checkout, info, code_enum)` lives in `transaction/utils.py`. It runs one restricted-lines query (`select_related` product) on every checkout transaction call. It loads site settings through `get_site_promise(info.context)` only when a restricted line exists.
- Order helpers `get_variants_with_products` and `validate_order_age_restriction` live in `draft_order_create.py`, which the other two order files import. Create paths cost one variant+product query. `draftOrderComplete` prefetches `lines__variant__product` and reuses it, so no per-line queries (NFR-3).
- `validate_checkout` gained an `info` parameter (callers are in the same file only). `clean_lines` gained `info` (only caller is in the same file).
- `error_code_enum` is typed `Any` because graphene enums are loosely typed for mypy.

**Deviations / cross-scope:**
- `TransactionInitializeError` and `TransactionProcessError` (`graphql/core/types/common.py:779,786`) do not declare `variants`. The LR/BR/UA errors therefore return `field="lines"` and the code, but not the restricted variant ids that S§5 specifies. Fix: add a `variants` field to both types. That is an additive schema change, so it needs G2. Logged in HANDOFF Cross-scope requests; no owner is assigned in §6.

**Blockers:** none for session 05.
**Next:** 07 (schema regen after G2 review, which should include the `variants` addition above); 09 writes the real TC tests for #10–#14.
