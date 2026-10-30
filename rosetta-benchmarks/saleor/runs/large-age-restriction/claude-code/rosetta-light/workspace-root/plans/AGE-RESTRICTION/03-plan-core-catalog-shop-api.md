# 03 — Core catalog + shop API: product flag, shop age settings (Phase B)
Depends on: 01, G1. Parallel with 02, 04, 05, 06. Spec: `S§6` (Product/ProductInput/Shop/ShopSettingsInput), `S§1` REQ-VIS, `S§10` (shop rows), `S§16` A2/A4.

## Do
1. `graphql/product/types/products.py` (`Product`): `isAgeRestricted: Boolean!`, public read, no permission/channel logic.
2. `ProductInput.isAgeRestricted` in `graphql/product/mutations/product/product_create.py` (inherited by create/update/bulk-create inputs); verify persistence through `ProductUpdate` and `ProductBulkCreate` (`product_bulk_create.py` passthrough) incl. any `update_fields` lists; `MANAGE_PRODUCTS` stays the only gate.
3. `graphql/shop/types.py` (`Shop`): `ageRestrictionMinimumAge: Int!` public; `timeZone: String!` `PermissionsField([MANAGE_SETTINGS])`.
4. `graphql/shop/mutations/shop_settings_update.py`: `ShopSettingsInput.ageRestrictionMinimumAge` (1..120, `null` ignored) and `timeZone` (member of `zoneinfo.available_timezones()`), `ShopError INVALID` with field names, following the existing validation style at `:230`.
5. `ADDED_IN_324` descriptions; fix existing tests in `graphql/product/tests`, `graphql/shop/tests`, `product/tests`, `site/tests` broken by the change.

## Subagents
- `rosetta-light:engineer` — implement; long-running.
- `rosetta-light:executor` — run `saleor/graphql/product saleor/graphql/shop saleor/site` suites on `DB_s03` (product suite is large: `-n 3`); short-term.

## Notes
- REQ-VIS (C1): zero changes to product querysets, filters, channel listings, `isAvailableForPurchase`; only additive field.
- `Shop.ageRestrictionMinimumAge` resolves from the request-fresh site (`get_site_promise`), not `Site.objects.get_current()` (SC-5), so an update is visible on the next request.
- `zoneinfo.available_timezones()` is empty when no tz database exists (A2): assert non-empty in a smoke check and tell 06/08 so tests fail loudly rather than skipping.
- Product webhook payload generators use explicit field lists: do not add the flag there (out of spec).
- CSV product export gets no column (`S§1` out of scope).
- Settings update must not mutate other `SiteSettings` fields when only the new inputs are sent.

## Done when
- Built-schema grep shows `Product.isAgeRestricted`, `ProductInput.isAgeRestricted`, `Shop.ageRestrictionMinimumAge`, `Shop.timeZone`, `ShopSettingsInput.{ageRestrictionMinimumAge,timeZone}` with `Added in Saleor 3.24.`; nothing else changed in product/shop types.
- Existing product/shop/site suites: no new failures vs baseline.

## Checklist
- [ ] STD-ALL  [ ] STD-C
- [ ] Public vs `MANAGE_SETTINGS` split exactly per `S§6`/`A4`
- [ ] Range 1..120 and tz validation inclusive edges (1, 120; 0, 121; `Mars/Base`)
- [ ] No filter/sort/where/search additions
- [ ] Persisted flag round-trips via `productUpdate`, `productCreate`, `productBulkCreate`
- [ ] Edge cases: `null` inputs ignored, partial inputs leave other settings intact
