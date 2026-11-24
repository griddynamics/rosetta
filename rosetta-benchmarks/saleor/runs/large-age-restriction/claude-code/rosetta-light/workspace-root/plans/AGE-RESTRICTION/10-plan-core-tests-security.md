# 10 — Core security, privacy-leak and visibility tests (Phase C)
Depends on: 02, 03, 06. Parallel with 07, 08, 09, 12–20. Spec: `S§13` TC-SEC-01..08, TC-SEC-10, TC-SEC-11, TC-V-01, TC-V-02, A12 export leak test; `S§7`, `S§11`.

## Do
1. Privacy matrix: anonymous (`accountRegister{user{birthday isAgeEligible}}`, public queries), `MANAGE_ORDERS` staff on `order.user`/`checkout.user`/`CustomerEvent.user`, `MANAGE_USERS` staff (flag value, birthday null, exactly one `BIRTHDAY_READ` per customer per request incl. alias + `order.user`), `MANAGE_USERS`+`MANAGE_STAFF` non-superuser, app with `MANAGE_USERS`+`IMPERSONATE_USER` (null; `customerUpdate{birthday}` denied; impersonated `accountUpdate{birthday}` denied) (TC-SEC-01..06).
2. Writes by non-superuser staff on `customerCreate/Update/BulkUpdate` ⇒ `PERMISSION_DENIED`, value unchanged, no event (TC-SEC-05).
3. Webhooks: `CUSTOMER_CREATED/UPDATED`, `STAFF_UPDATED` subscription payloads querying `user{birthday isAgeEligible}` triggered by a superuser ⇒ null; legacy `generate_customer_payload` has no `birthday` key (TC-SEC-07).
4. Search/schema: `customers(search:"2000")` finds nothing by birthday; introspection of the in-process schema: `birthday` only in the allowed inputs and `User`, in no filter/sort/where input (TC-SEC-08).
5. Audit shape + counts: superuser reads other customer ⇒ event, owner reads self ⇒ none, `parameters == {"customer_id": U.pk, "actor_user_id": id}` (TC-SEC-10). `isSuperuser` matrix (TC-SEC-11).
6. Visibility (REQ-VIS): anon, `minor`, `no_bday` see the restricted product in `products`, `products(search:)`, `product(slug)`, `category/collection.products`, `products(where:)`; dashboard-scope staff sees it with `isAgeRestricted` true (TC-V-01, TC-V-02).
7. A12: assert no export path (`csv/`) serializes `birthday` (product/gift card/voucher exporters' field lists and headers).

## Subagents
- `rosetta-light:engineer` — write tests; long-running.
- `rosetta-light:executor` — run on `DB_s10` (`-n 3`); short-term.

## Notes
- New files only, names per PLAN §6 row 10; reuse 06 fixtures.
- Subscription tests need the webhook subscription machinery (`graphql/webhook/subscription_payload.py` sets `request.app`); trigger through the existing test helpers for subscription payload generation, do not hand-build payload dicts.
- Leak assertions must also run the field via every route (`me`, `user`, `customers`, `staffUsers`, `order.user`, `checkout.user`, `CustomerEvent.user`, federation `_entities` if available) — failing one route = real defect, report to 02.
- Never assert by `str(response)` containing a date: use the typed field values; do not write birthdays to disk.

## Done when
- Each TC id above has a named passing test; `-n0` and `-n 3` green on `DB_s10`; list of routes covered recorded in `10-handoff.md`.

## Checklist
- [ ] STD-ALL  [ ] STD-T
- [ ] `S§7` matrix: every requestor row × `birthday`/`isAgeEligible`/`isSuperuser`/write
- [ ] D7 leak coverage: GraphQL routes, subscriptions, legacy payloads, search, export, schema
- [ ] Event counts asserted per request, not per field
- [ ] Security checked: I-1, E-1, S-3, T-1 each has a failing-if-regressed test
