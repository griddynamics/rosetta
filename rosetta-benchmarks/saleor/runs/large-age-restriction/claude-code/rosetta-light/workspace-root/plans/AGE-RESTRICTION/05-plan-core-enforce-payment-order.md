# 05 — Core enforcement: transactions + staff orders, rows #10–#14 (Phase B)
Depends on: 01, G1. Parallel with 02, 03, 04, 06. Spec: `S§5` rows 10–14 and the no-customer-drafts note, `S§4` R5/R7, `S§10`, `S§16` A6, `S§2` NFR-3.

## Do
1. `transactionInitialize` / `transactionProcess` (checkout source only): extend each `validate_checkout` static method (`transaction_initialize.py:229`, `transaction_process.py:231`) with the restricted-line check using one query `checkout.lines.filter(variant__product__is_age_restricted=True)` (variant ids), customer = `checkout.user` (R6); codes `TransactionInitializeErrorCode`/`TransactionProcessErrorCode` LR/BR/UA, `field="lines"`, `variants`.
2. `orderLinesCreate` (draft + editable unconfirmed orders) after `validate_variants`; `draftOrderComplete` after `validate_draft_order` and before status change/`update_user_fields`; `draftOrderCreate` `clean_lines` with the cleaned `user`. Customer = `resolve_order_customer(order)` (R7); `validate_age_restriction(..., allow_anonymous=True)`; error `OrderErrorCode.AGE_RESTRICTION_NOT_ELIGIBLE`, `field="lines"`, `variants`.
3. Fix existing tests in `graphql/payment/tests`, `graphql/order/tests`, `order/tests`, `payment/tests` broken by the change (existing files only).

## Subagents
- `rosetta-light:engineer` — implement; long-running.
- `rosetta-light:executor` — run `saleor/graphql/payment saleor/graphql/order` suites on `DB_s05` (large; `-n 3`); short-term.

## Notes
- The checks sit in `validate_checkout`, which today only does the completion-lock check; keep the lock check first and its error unchanged. Both methods live in separate files, keep the shared query helper next to them in `graphql/payment/mutations/transaction/` (do not create a new cross-package dependency).
- Settings source: GraphQL request-fresh site (`get_site_promise`/`info.context`), not `Site.objects.get_current()` (SC-5).
- No-customer drafts are ACCEPTED (C3/D4): `resolve_order_customer(order) is None` ⇒ pass at #12–#14 and complete at `draftOrderComplete`. A linked customer without birthday/underage ⇒ NE (generic message, BR/UA collapsed: I-2).
- R7 mirrors `DraftOrderComplete.update_user_fields` (`draft_order_complete.py:73`): `order.user`, else `User` by `order.user_email` with the SAME lookup (A6: it does not filter `is_active` — verify and mirror, do not "fix").
- NFR-3: no new per-line queries (`lines__variant__product` prefetched); at most +1 query (email lookup only when `order.user` null and `user_email` set).
- Transactions on order sources (not checkout) are untouched.
- `orderConfirm`, `draftOrderUpdate`, `orderLineUpdate` are deliberately NOT checked (`S§5` note).

## Done when
- In-test smoke (not committed; real tests in 09): draft with no customer + restricted line completes; draft linked to no-birthday customer gets NE; `transactionInitialize` on a guest checkout with an adult's email gets LR.
- Existing payment/order suites: no new failures vs baseline.

## Checklist
- [ ] STD-ALL  [ ] STD-C
- [ ] #10–#14 each implemented at the hook named in `S§5`
- [ ] Lock-check behaviour unchanged
- [ ] `allow_anonymous=True` only on staff/order surfaces, never on checkout paths
- [ ] Generic `NOT_ELIGIBLE` message, no leakage of BR vs UA
- [ ] Edge cases: unconfirmed order editing, `user_email` matching a minor, customer unlinked afterwards
