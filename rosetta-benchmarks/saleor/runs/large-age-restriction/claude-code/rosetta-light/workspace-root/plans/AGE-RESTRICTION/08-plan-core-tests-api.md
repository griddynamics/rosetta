# 08 — Core API tests: account, product, shop, audit changes (Phase C)
Depends on: 02, 03, 06. Parallel with 07, 09, 10, 12–20. Spec: `S§13` TC-H-05..08, TC-E-09, TC-E-10, TC-B-10, TC-P-02, TC-SEC-10 (change half), `S§9`.

## Do
1. `accountUpdate`/`accountRegister` birthday: store, `me.birthday`, one `BIRTHDAY_CHANGED` (actor = self), clear (`null`), unchanged value ⇒ no event (TC-H-05).
2. Superuser `customerCreate`/`customerUpdate`/`customerBulkUpdate` birthday: stored, actor = superuser, no event when unchanged, per-row events in bulk (TC-H-06).
3. `shopSettingsUpdate` (21 + `Europe/Warsaw`; bounds 1 and 120; 0, 121, `Mars/Base` ⇒ `ShopError INVALID`, field names) and the next completion-side read of it via domain call (TC-H-07, TC-B-10, TC-E-09).
4. `productUpdate`/`productCreate`/`productBulkCreate{isAgeRestricted}` and anonymous `product{isAgeRestricted}` (TC-H-08); permission `MANAGE_PRODUCTS` required.
5. Birthday validation: future date, shop-today boundary, today−120y boundary ⇒ `AccountError INVALID` field `birthday`, message generic (TC-E-10).
6. Event shape: `parameters == {"customer_id","actor_user_id"}` exactly, `message` null, `user` = subject.
7. TC-P-02 benchmark in `graphql/account/tests/benchmark/test_*birthday*.py`: `customers(first:100){isAgeEligible}` ≤ same query without the field + 2 queries; assert ≤1 audit INSERT.

## Subagents
- `rosetta-light:engineer` — write tests; long-running.
- `rosetta-light:executor` — run on `DB_s08` (`-n 3`, benchmark `-n0`); short-term.

## Notes
- New files only, names per PLAN §6 row 08. Use fixtures from 06 (`06-handoff.md`); do not redefine.
- Writer guard raises in tests: audit writes happen under `allow_writer()`; tests must not wrap production code in `allow_writer()` to make it pass.
- Use `freezegun` for "shop today" cases; zone-dependent cases need explicit `time_zone` on the site settings fixture.
- A failing assertion that points at a production defect is a Cross-scope request to 02/03, not a test tweak.
- Tests must not print or snapshot birthday values into files.

## Done when
- Every listed TC id maps to ≥1 passing named test; `-n0` and `-n 3` runs green on `DB_s08`; benchmark assertion passes with the recorded numbers in `08-handoff.md`.

## Checklist
- [ ] STD-ALL  [ ] STD-T
- [ ] TC-H-05..08, TC-E-09, TC-E-10, TC-B-10, TC-P-02 covered by id
- [ ] Negative paths: unchanged value, clear, wrong type, missing permission
- [ ] Event payload exactness asserted
- [ ] Integration coverage of changed lines in `graphql/account`, `graphql/shop`, product input > 85 %
