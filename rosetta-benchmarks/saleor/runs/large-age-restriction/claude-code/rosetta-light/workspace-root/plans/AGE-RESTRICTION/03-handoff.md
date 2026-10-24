# 03 — Core catalog + shop API · handoff (2026-10-23)

**Done:** `Product.isAgeRestricted` (public, `Boolean!`); `ProductInput.isAgeRestricted` (inherited by productCreate, productUpdate, productBulkCreate); `Shop.ageRestrictionMinimumAge` (public, `Int!`); `Shop.timeZone` (`String!`, MANAGE_SETTINGS); `ShopSettingsInput.ageRestrictionMinimumAge` (1..120) and `timeZone` (IANA, `zoneinfo.available_timezones()`), `ShopError INVALID` with field names. Source: 4 files = §6 row 03, nothing else. Tests: 14 appended to `graphql/shop/tests/mutations/test_shop_settings_update.py`, 3 appended to `graphql/product/tests/mutations/test_product_{create,update,bulk_create}.py` (existing files, own regression dirs).

**Evidence:**
- Built schema (`manage.py get_graphql_schema` to scratchpad, `graphql/schema.graphql` untouched): 7 new declarations, each `Added in Saleor 3.24.`; diff vs repo snapshot shows no other product/shop change.
- `shop` + `site` suites: 187 passed (`-n 3`). `product` + `product/tests` suites: 2663 passed, 1 skipped (before the 3 new tests; the 4 edited files: 261 passed after).
- `graphql/tests`: 95 passed. `manage.py check` clean. `makemigrations --check --dry-run`: no changes.
- ruff check + format clean (8 files). mypy clean (4 source files).
- 15 throwaway checks (file removed): min age 0/1/120/121/-1, tz `Mars/Base`/`""`, null ignored, partial update keeps other settings, anonymous `ageRestrictionMinimumAge`=18, anonymous `timeZone` PermissionDenied, product flag round-trip via create/update/bulk, anonymous product read.

**Decisions:**
- Partial input: `construct_instance` writes only provided keys. `null` for both new shop settings is dropped before write (NOT NULL column). Spec silent on `timeZone` null; applied the same rule as min age (checklist: "null inputs ignored").
- Product flag `null` sets `false`. Core `construct_instance` replaces `None` on non-null model fields with the model default. Spec silent. The description says so. Ignoring null needs an edit in `product_update.py`, which no §6 row owns. Raised as cross-scope request in HANDOFF; not changed unilaterally.
- Added permanent tests to existing files, not new files: plan §6 gives new test files to 08, while CLAUDE.md asks for tests with every change. TC-H-07/08 and TC-E-09 coverage in new files stays with 08.
- Checked `zoneinfo.available_timezones()` is non-empty (smoke test in shop tests) so 06/08 fail loudly if tzdata is missing (A2).

**Blockers:** none open. Transient: another session's in-progress file (`graphql/account/bulk_mutations/customer_bulk_update.py`, relative import of `core.exceptions`) broke URL loading for about 3 minutes; I waited and did not touch it.

**Footprint:** `test_saleor_s03` (+ `_gw0..2`) created by `--reuse-db` runs; drop at G3. Logs in `<scratchpad>/s03/`. Throwaway test file created and removed.

**Next:** 08 (tz edge TCs, new-file coverage), 10. Parent decides the product `null` semantics (cross-scope request) before 08 writes tests against it.
