# 04 — Core enforcement: checkout side, rows #1–#9 (Phase B)
Depends on: 01, G1. Parallel with 02, 03, 05, 06. Spec: `S§5` rows 1–9, `S§4` R5/R6, `S§3` sequence diagram, `S§10`, `S§11` S-2/T-2/T-3/I-2/I-4, `S§2` NFR-1.

## Do
1. Line-time UX guards (customer evaluated per `S§5`): `checkoutLinesAdd` `clean_input`, `checkoutLinesUpdate` (only input lines with quantity > 0 on restricted products), `checkoutCreate` `clean_checkout_lines`, `checkoutCreateFromOrder` `clean_order_lines` (restricted lines excluded with `unavailableVariants[].code`).
2. Completion authority in `checkout/complete_checkout.py`: one shared call to `validate_age_restriction` after `assign_checkout_user`, inside the existing `select_for_update` tx, in the transaction flow (`create_order_from_checkout`, mapped in `complete_checkout_with_transaction`) and the legacy payment flow (before `complete_checkout_pre_payment_part`/`_process_payment`).
3. Map `AgeRestrictionError` per surface: `CheckoutErrorCode` LR/BR/UA (`field="lines"`, `variants` = restricted variant global ids); `order_create_from_checkout` → `OrderCreateFromCheckoutErrorCode` LR/NE.
4. Rows #8 (auto-completion task) and #9 (Stripe webhook) inherit via `complete_checkout`; change nothing in `checkout/tasks.py` / `payment/gateways/stripe/webhooks.py` unless the log path needs it (confirm logs print only generic text).
5. Fix existing tests in `graphql/checkout/tests`, `checkout/tests` broken by the change (existing files only).

## Subagents
- `rosetta-light:engineer` — implement; long-running.
- `rosetta-light:executor` — run `saleor/graphql/checkout saleor/checkout` suites on `DB_s04` (`-n 3`); short-term.

## Notes
- R6: evaluate `checkout_info.checkout.user` (stored), NOT `checkout_info.user` — `assign_checkout_user` (`complete_checkout.py:1704`) only sets the latter. Guest + adult-account email must yield LR; logged-in requestor completing a user-less checkout also LR. Do not change `assign_checkout_user` behaviour.
- SC-5: `complete_checkout(site_settings=None)` falls back to the process-cached `Site.objects.get_current().settings` (`:806,1118,1408`); tasks/webhook never pass settings. For the age check: use request-fresh settings when the caller passed them, otherwise read `SiteSettings` fresh — only when at least one restricted line exists. Zero extra queries for unrestricted carts (NFR-1; asserted in 09).
- Restricted-line detection reuses already loaded `CheckoutLineInfo.product`; no new line/product fetch.
- Legacy flow must raise before any payment call; completion failure after funds authorised follows existing release paths (A7, do not extend).
- Error `params` carry only `variants`; `AgeRestrictionError.__str__` is generic (`checkout/tasks.py:297` logs `str(error)`; semgrep rule: no exception objects in logger `extra`).
- `order_create_from_checkout.py` lives under `graphql/checkout/mutations/` (not `graphql/order/`).
- Removal must always work: `quantity=0`/line delete never blocked.

## Done when
- Targeted in-test smoke (not committed; real tests in 09): guest/no-birthday/minor/adult each hit LR/BR/UA/pass on `checkoutLinesAdd` and `checkoutComplete` (both flows).
- Existing checkout suites: no new failures vs baseline; query counts of `checkoutLinesAdd`/`checkoutComplete` benchmarks unchanged for unrestricted carts (spot check with `--django-db-bench`).

## Checklist
- [ ] STD-ALL  [ ] STD-C
- [ ] Rows #1–#9 each have a code path; #8/#9 verified by reading, not edited
- [ ] Placement: after assign, inside tx, before payment
- [ ] R6 verified with email-matching guest
- [ ] No PII in messages/params/logs
- [ ] Edge cases: mixed restricted + unrestricted lines (only restricted ids in `variants`), empty lines, removal
- [ ] Security checked: S-2, T-2, T-3 walked
