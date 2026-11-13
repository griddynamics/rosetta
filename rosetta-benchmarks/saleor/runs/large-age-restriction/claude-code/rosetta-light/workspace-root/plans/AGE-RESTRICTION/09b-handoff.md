# 09b — Age-restriction refund on post-capture completion failure · handoff (2026-10-23)

**Done:** closes the cross-scope row 09 (Stripe legacy webhook, S§5 #9). When the age check fails at completion on the legacy payment flow, the payment is now refunded or voided through the existing fail handler. Transaction flow reviewed, no change (see Decisions).

**Root cause:** `complete_checkout_with_payment` ran `_validate_checkout_age_restriction` before any payment call and, on `AgeRestrictionError`, called `_complete_checkout_fail_handler(checkout_info, manager)` with no payment. That clears the completing flag but never refunds or voids. The Stripe webhook had already captured funds, so the payment stayed captured with no order. Pre-payment `ValidationError`s in `complete_checkout_pre_payment_part` pass `payment=checkout.get_last_active_payment()` to the same handler; the age branch did not.

**Change (2 files, working tree, not committed):**
- `saleor/saleor/checkout/complete_checkout.py` (~L1918-1929): the age-failure branch passes `payment=checkout.get_last_active_payment()`. Query runs only on the failure path, so happy-path query counts are unchanged. Generic error mapping unchanged.
- `saleor/saleor/payment/gateways/stripe/tests/test_webhooks_age_restriction.py`: the two blocked-webhook tests now assert `gateway.refund` called once with the payment and the channel slug; the SC-5 test patches refund (blocked first delivery). Docstrings updated. `from unittest.mock import patch` added.

**Evidence:**
- Stripe age file: 3 passed on the fixed code (`-n0`, `--reuse-db`, DB `saleor_s09b`). Baseline before change: 3 passed.
- Mutant (old branch restored): 3 failed (`…blocked_and_refunded` x2, `…minimum_age_lowered_between_deliveries`). Fix re-applied.
- Suites `saleor/checkout saleor/payment/gateways/stripe saleor/graphql/checkout` `-n 3`: 1947 passed, 0 failed (exit 0).
- `ruff check` clean, `ruff format --check` clean, `mypy` on both changed files: no issues.

**Decisions:**
- S09b-D1 (deviation, recorded in `HANDOFF.md`): reused `_complete_checkout_fail_handler(payment=…)`; no new refund machinery.
- Transaction flow (`create_order_from_checkout`, #5 and automatic task on transaction checkouts): not changed. The age check runs outside the `try`, and there is no payment object to refund. InsufficientStock on the same path also leaves funds on the checkout transaction, so this matches the existing mechanism.
- transactionProcess (#11): the age guard runs in `validate_checkout` before the PSP charge, so no capture happens on an age failure at that point. Only a rule change between #11 and completion reaches the transaction-flow case above.
- Not changed, observation for parent: the transaction-flow age failure does not release the voucher usage incremented earlier in `create_order_from_checkout`, while InsufficientStock does. Same class as the session 04 observation. Fix would be to move the age check inside that `try` with an `AgeRestrictionError` branch calling the handler with `voucher_code`/`voucher`. Not done to keep the change minimal; needs a parent decision.

**Blockers:** none.

**Next:** G3 drop `test_saleor_s09b` and `_gw0..2`; decide on the transaction-flow voucher observation.
