# 08 — Core API tests · handoff (2026-10-23)

**Done:** 12 new test files (no source edits), all in §6 row 08: `graphql/account/tests/mutations/test_{account_update,account_register,customer_create,customer_update,customer_bulk_update}_birthday.py`, `graphql/account/tests/queries/test_customer_birthday_events.py`, `graphql/account/tests/benchmark/test_customers_birthday_query_count.py`, `graphql/product/tests/mutations/test_product_{create,update,bulk_create}_age_restricted.py`, `graphql/product/tests/queries/test_product_age_restricted_query.py`, `graphql/shop/tests/mutations/test_shop_settings_update_age_restriction.py`. 53 tests.

**TC coverage (named tests, TC id in docstring):** TC-H-05 (accountUpdate/accountRegister), TC-H-06 (customerCreate/Update/BulkUpdate), TC-H-07 (shop settings → next domain check), TC-H-08 (product flag write + public read), TC-E-09, TC-E-10 (shop-today, 120-year and shop time-zone boundaries, API), TC-B-10 (min age 1/120), TC-P-02, TC-SEC-10 change half (event shape on subject).

**Evidence:**
- `pytest` on the 12 files, `DATABASE_URL=…/saleor_s08`, `--reuse-db`: `-n0` 53 passed; `-n 3` 53 passed.
- Benchmark (TC-P-02): `customers(first:100)` baseline 5 queries; with `isAgeEligible` 6 queries (+1 site settings); 1 audit INSERT into `account_customerevent`. Budget baseline+2 met.
- Coverage (`pytest --cov`, account + shop + product create/update/bulk suites, `-n 3`): 1466 passed, 1 failed (see Observed). Changed source lines in `graphql/account`, `graphql/shop`, product create/update/bulk/types: 132/132 = 100 %.
- ruff check and ruff format --check clean (12 files). `uv.lock`, `pyproject.toml` untouched.

**Decisions:**
- Orchestrator decisions tested as written: `accountRegister.birthday` denied for logged-in, staff and app (anonymous only); `productUpdate{isAgeRestricted:null}` sets `false`.
- Negative paths: unchanged value (no event, others edited), clear (one event), wrong type (malformed date → top-level error, stored value kept), missing permission (non-superuser staff, MANAGE_PRODUCTS, MANAGE_SETTINGS).
- Bulk test placed in `graphql/account/tests/mutations/` (plan §6 glob), not `bulk_mutations/`, to stay inside ownership.
- Mock only for `PluginsManager.notify` (email, register flow). No freezegun dependence outside boundary tests.

**Observed (not mine, not fixed):** during the coverage run `graphql/account/tests/queries/test_birthday_privacy_routes.py::test_birthday_route_matrix[app_all_perms-ExportFile.user]` failed ("route ExportFile.user unreachable for app_all_perms"). The file belongs to session 10 (in progress). Report to 10, no cross-scope request from 08.

**Blockers:** none. **Next:** footprint at G3: `DROP DATABASE test_saleor_s08; DROP DATABASE test_saleor_s08_gw0; …_gw1; …_gw2;`. Coverage artifacts in `<scratchpad>/s08/` (cov.json, cov-run.log, changed_cov.py).
