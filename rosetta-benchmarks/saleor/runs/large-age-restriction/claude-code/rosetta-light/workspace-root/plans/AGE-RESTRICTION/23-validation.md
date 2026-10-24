# 23 — Validation report (independent, execution-based)

Date: 2026-10-23. Validator: independent (did not implement). Trees validated: `saleor` HEAD `bb00425` + working tree (92 entries), `saleor-dashboard` HEAD `a667b12` + working tree (62), `react-storefront` HEAD `3d3c3f5` + working tree (85). No product source edited. No commits.
Authority: `AGE-RESTRICTION-SPECS.md` (S§5, S§7, S§13), `AGE-RESTRICTION-PLAN.md` §5, §9, `HANDOFF.md`, `21-review.md`, `22-review.md`, `21r-handoff.md`, `07-handoff.md`.
Deviation from instructions: core DB name `saleor_s23` as instructed (session file said `saleor_v23`). Core suite was not re-run after the coordinator's message: no `.py` file changed since the 18:07 start of the run (checked: 0 files newer than the run start), so the run is valid for the final tree.

## 1. Pass / fail per check

| # | Check | Result | Evidence (command, numbers) |
|---|---|---|---|
| C1 | Core full suite `pytest -m "not e2e" -n 8` (DB `saleor_s23`) | **FAIL 2 (environmental)** | 18495 passed, 2 failed, 1 skipped, 630.9 s. Baseline S00 18161 / 0 / 1; S11 18482 / 0 / 1 (+13 from 21r). Failed: `saleor/core/tests/test_http_client.py::test_http_client_disallows_private_ip_ranges[https|http]` (see D2). Log: `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s23/core-full.log` |
| C2 | Known open: shop gateway test under xdist | **Root cause proven** (not an age defect) | Leaker identified (D1). Leaker→victim in one process: 1 failed, 1 passed; victim alone: pass; same pair on clean `git archive HEAD`: 1 failed, 1 passed. Full run at -n 8: pass |
| C3 | ruff check (86 changed/new .py) | PASS | "All checks passed!" |
| C4 | ruff format --check (86) | PASS | 86 files already formatted |
| C5 | mypy changed non-test modules (39) | PASS | Success: no issues found in 39 source files |
| C6 | `makemigrations --check --dry-run` | PASS | "No changes detected" on `saleor_agevalid` (migrated, history consistent). On `saleor_s23` (absent) the history check is skipped with a warning; the model check still passed |
| C7 | Schema gate `get_graphql_schema \| diff` | PASS | 0 diff lines (40204 lines). `schema.graphql` vs HEAD: +124 / -0 |
| C8 | `uv.lock` / `pyproject.toml` untouched | PASS | 0 changed (both repos' status checked) |
| C9 | Query-count bench (`--django-db-bench`, `django-queries diff` vs `bench-base.json`) | PASS, 1 row moved | 58 passed (S00 baseline 50; +8 new TC-P tests). Diff: only "delete staff members" 51 → 52 (+1 UPDATE, the designed per-batch retention UPDATE, S§9.1 / TC-R-05). All checkout rows unchanged (e.g. complete checkout 200, add checkout lines 103) |
| C10 | Dashboard `pnpm run check-types` | PASS | exit 0 |
| C11 | Dashboard `pnpm test` | PASS | exit 0. Test Suites 935 passed (1 skipped suite), Tests 6201 passed, 8 skipped. No Jest timeouts this run (the five known flakes were not re-run because none failed). Baseline 6132 passed / 2 failed / 8 skipped |
| C12 | Dashboard lockSchema (`src/graphql/lockSchema.test.ts`) | PASS | exit 0 |
| C13 | Dashboard `lint:changesets` | PASS | exit 0 |
| C14 | Dashboard `format:check` | FAIL (pre-existing) | Only `agents/MEMORY.md` (baseline red, S00). Not age-related |
| C15 | Dashboard eslint, changed src files, no fix (57 files) | PASS | 0 errors, 144 warnings (repo-wide baseline was 7166 warnings; not comparable) |
| C16 | Dashboard `knip` | PASS | exit 0 |
| C17 | Storefront `NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8001/graphql/ pnpm run verify` | PASS | exit 0. 149 files / 969 tests passed (S20: 147 / 953). lint 0 errors / 19 warnings (baseline 19) |
| C18 | Storefront `cost:check` | PASS | 32 / 32 |
| C19 | Restart :8001 from current tree | PASS | Old pid 71120 stopped; new pid **14123** started 18:09 (`SEND_USAGE_TELEMETRY=False`, DB `saleor_agevalid`), smoke `shop{ageRestrictionMinimumAge}` = 18. No `.py` change after the restart |
| C20 | Manual API matrix, script 1 (`s23/manual.py`) | PASS 57 / 57 | Table 2 |
| C21 | Manual API matrix, script 2 (`s23/manual2.py`) | PASS 7 / 7 | X1-X3, X5-X8 (TC-B-08, TC-H-02 guest, TC-H-05 owner update, TC-SEC-05) |
| C22 | Git status 3 repos: no unintended files, no secrets, no `test_tmp_*` source | PASS with notes | No secrets (regex scan on all changed and untracked files: JWT, PEM, AWS, GitHub/Slack tokens, personal names: 0 hits). No `test_tmp_*` source. Only gitignored `.pyc` leftovers (`test_tmp_s04_*`, `test_tmp_s08_*`, `test_tmp_s11_*`) in `__pycache__` (see D5). `uv.lock`/`pyproject.toml` untouched. Counts stable vs 18:20 (saleor 92, dashboard 62, storefront 85) |
| C23 | Footprint (DBs, processes, containers) | PASS with ledger drift | See section 5 (`test_saleor_s04` listed as existing in HANDOFF, absent in `pg_database`) |

Dashboard and storefront `verify`/`cost:check` ran sequentially after the core suite, so no load contention affected the Jest timeouts or the core run.

## 2. Manual behavioural checks (live API :8001, current tree, pid 14123)

Evidence: `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s23/manual.py`, `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s23/manual2.py`, results `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s23/manual-results.json` and `manual2-results.json`. Scripts print only codes and booleans; tokens, passwords and birthdays were not printed. Generated test data only, on clone `saleor_agevalid`.

| ID | Scenario | Observed |
|---|---|---|
| A1 | anon `shop{ageRestrictionMinimumAge}` | 18 |
| B1 | staff `productUpdate{isAgeRestricted:true}` | true, no errors |
| B2 / B3 / B4 | anon product flag; anon `products` list and search return restricted product | true; 29 products listed incl. restricted; search hit 1 |
| B5 | staff products list | restricted product present |
| C1 / C3 | guest checkoutCreate and checkoutLinesAdd restricted | `AGE_RESTRICTION_LOGIN_REQUIRED`, variants = [restricted] |
| C4 / C6 | no-birthday customer: checkoutCreate and linesAdd | `AGE_RESTRICTION_BIRTHDAY_REQUIRED` |
| C5 / C7 | minor: checkoutCreate and linesAdd | `AGE_RESTRICTION_UNDERAGE` |
| C8-C11 | adult: checkoutCreate restricted, billing address, app/superuser transaction, checkoutComplete | order created, status UNFULFILLED |
| D1 | owner `me`: birthday and eligible true, no BIRTHDAY_READ | reads delta 0 |
| D2 | superuser `user(id)` | birthday present, eligible true, exactly 1 BIRTHDAY_READ |
| D3 / D4 | MANAGE_USERS staff: birthday null, eligible flag true (adult) and false (minor) | matches S§7; the flag read logs one BIRTHDAY_READ (S§7 D6) |
| D5 / D6 / D7 | app token: null/null; anon `user(id)`: PERMISSION_DENIED; anon `me`: null | as S§7 |
| D8 / D9 / D10 | `isSuperuser`: staff sees null on superuser; superuser on `me` true; staff on `me` false | as S§6 |
| D11 | superuser list read, single vs aliased request | single request: 4 customers with birthday → 4 BIRTHDAY_READ events; request with the same query aliased twice: also 4 events (one per customer per request, no duplicates) |
| E1-E3 | anon accountRegister with birthday; user.birthday null in response; stored | as TC-H-05 / TC-SEC-01 |
| E4-E6 | superuser customerCreate: 1 BIRTHDAY_CHANGED, actor superuser; unchanged update adds no event | as TC-H-06 |
| E7 / E8 | non-superuser staff and app customerUpdate{birthday}: PERMISSION_DENIED, value unchanged | as TC-SEC-05 / 06 |
| E9 / E10 | future birthday; birthday older than 120 years | `INVALID` on field `birthday` |
| F1 | shopSettingsUpdate min age 0, 121; timeZone `Mars/Base` | `INVALID` (3 of 3) |
| F2-F6 | min age 18 → 19-year-old allowed; staff sets 21 → next check `UNDERAGE` immediately; anon reads 21; restored to 18 | as TC-H-07 |
| G1 / G2 | draftOrderCreate restricted, no customer, then draftOrderComplete | accepted and completed (UNFULFILLED) |
| G3 / G4 | draft linked to no-birthday customer: create with restricted line; orderLinesCreate restricted | `AGE_RESTRICTION_NOT_ELIGIBLE` both |
| G5 | draft with userEmail = minor, orderLinesCreate restricted | `AGE_RESTRICTION_NOT_ELIGIBLE` |
| G6a-c | draft (no customer, restricted line) linked to no-birthday customer → complete blocked; unlinked → completes | NE, then UNFULFILLED |
| G7 | minor checkoutCreateFromOrder of order with restricted line | restricted variant absent from lines, unavailable code `AGE_RESTRICTION_UNDERAGE` |
| H1 / H2 | superuser customerDelete of customer with birthday events | birthday_changed and birthday_read kept with `user_id` NULL, `customer_id`/`actor_user_id` intact; account_created removed; user row gone |
| X1-X3 | TC-B-08: birthday cleared after restricted line added, then checkoutComplete | `AGE_RESTRICTION_BIRTHDAY_REQUIRED`, no order |
| X6 | guest checkout of unrestricted no-shipping product: complete | UNFULFILLED, no error |
| X7 | owner accountUpdate{birthday} | stored, 1 BIRTHDAY_CHANGED, actor = self |
| X8 | non-superuser staff customerCreate with birthday | PermissionDenied, no user created |
| Msg | Error message text for minor, no-birthday, guest | no birthday or age value in text (TC-E-06, message part) |
| Log | DOB literals in `uvicorn-8001-restart.log` | 0 hits (access log only; weak check) |

Not manually verifiable on this clone (need DB injection of a restricted line into a cart of a minor or guest, or a Stripe webhook): TC-E-03, TC-E-05, TC-H-03, TC-E-11 (partial), TC-SEC-07 (subscription payloads). These are covered by automated tests (table 3).

Setup deviations (all on the clone, all recorded for G3):
1. Superuser was not in any permission group. Channel access in Saleor is group-based, so channel-scoped draft mutations returned PermissionDenied ("You don't have access to some objects' channel"). Added user 46 to group id 1 "Full Access" (`restricted_access_to_channels = false`). Pre-existing behaviour, not an age defect.
2. Setup transactions created by the superuser: the app token has no `HANDLE_PAYMENTS`.
3. The 19-year-old test account was registered through `accountRegister`, which sets `is_confirmed = false`. Mailpit received no confirmation mail, so the account was confirmed by a DB update (`is_confirmed = true`, id 51, 52, 54, 56 are re-run accounts of the same role). The email-confirmation flow was therefore not exercised.
4. Anonymous `product(id)` requires a `channel` argument when two channels exist ("More than one channel exists"). Pre-existing; the validator passed the channel.
5. Test data left on the clone: product 126 `is_age_restricted = true`; adult birthday cleared and restored to the seeded 1990-01-01 (X2/X5); min age restored to 18; test orders, checkouts, customer events (33 orders, 31 checkouts, 72 events on the clone). Credentials for the 19-year-old account were written to the mode-600 creds file under `customer_19`; passwords never printed.

## 3. S§13 TC traceability

Automated rows: test name from the test tree (grep by TC id, lowercase `tc_sec_` names included). All automated tests ran in C1 (core) or C11/C17 (dashboard/storefront); the only core failures are the two in D2, neither an age test. Manual rows: table 2.

| TC | Automated test (first match) | Manual / bench id |
|---|---|---|
| TC-B-01 | `saleor/account/tests/test_age_restriction.py::test_eligibility_date` | - |
| TC-B-02 | `saleor/account/tests/test_age_restriction.py::test_eligibility_date` | - |
| TC-B-03 | `saleor/graphql/checkout/tests/mutations/test_checkout_age_restriction_lines.py::(see file)` | - |
| TC-B-04 | `saleor/account/tests/test_age_restriction.py::test_eligibility_date` | - |
| TC-B-05 | `saleor/graphql/checkout/tests/mutations/test_checkout_age_restriction_lines.py::(see file)` | - |
| TC-B-06 | `saleor/account/tests/test_age_restriction.py::test_customer_fixtures_have_documented_birthdays` | - |
| TC-B-07 | `saleor/graphql/account/tests/mutations/test_account_update_birthday.py::test_account_update_birthday_today_is_shop_local_date` | - |
| TC-B-08 | `saleor/graphql/checkout/tests/mutations/test_checkout_complete_age_restriction.py::(see file)` | X2, X3 |
| TC-B-09 | `saleor/graphql/account/tests/mutations/test_account_update_birthday.py::test_account_update_birthday_shop_today_and_120_year_boundaries` | - |
| TC-B-10 | `saleor/graphql/shop/tests/mutations/test_shop_settings_update_age_restriction.py::test_shop_settings_update_accepts_minimum_age_bounds` | - |
| TC-B-11 | `saleor/graphql/checkout/tests/mutations/test_checkout_age_restriction_lines.py::(see file)` | - |
| TC-B-12 | `saleor/account/tests/test_age_restriction.py::test_is_user_age_eligible_defaults_to_current_shop_day` | - |
| TC-E-01 | `saleor/graphql/checkout/tests/mutations/test_checkout_age_restriction_lines.py::(see file)` | C1, C3 |
| TC-E-02 | `saleor/graphql/checkout/tests/mutations/test_checkout_age_restriction_lines.py::test_no_birthday_customer_checkout_create_birthday_required` | C4-C7 |
| TC-E-03 | `saleor/graphql/checkout/tests/mutations/test_checkout_age_restriction_lines.py::test_minor_update_quantity_zero_removes_restricted_line` | - |
| TC-E-04 | `saleor/graphql/checkout/tests/mutations/test_checkout_age_restriction_lines.py::test_checkout_create_from_order_excludes_restricted_line_for_minor` | G7 |
| TC-E-05 | `saleor/payment/gateways/stripe/tests/test_webhooks_age_restriction.py::(see file)` | - |
| TC-E-06 | `saleor/payment/gateways/stripe/tests/test_webhooks_age_restriction.py::(see file)` | message text checked (3 codes) |
| TC-E-07 | `saleor/graphql/order/tests/mutations/test_order_age_restriction.py::(see file)` | G3, G6b, G6c |
| TC-E-08 | `saleor/graphql/order/tests/mutations/test_order_age_restriction.py::(see file)` | G5 |
| TC-E-09 | `saleor/graphql/shop/tests/mutations/test_shop_settings_update_age_restriction.py::test_shop_settings_update_rejects_invalid_age_settings` | F1 |
| TC-E-10 | `saleor/graphql/account/tests/mutations/test_customer_bulk_update_birthday.py::test_superuser_bulk_update_invalid_birthday_rejects_everything` | E9, E10 |
| TC-E-11 | `saleor/graphql/payment/tests/mutations/test_transaction_age_restriction.py::(see file)` | - |
| TC-H-01 | `saleor/graphql/payment/tests/mutations/test_transaction_age_restriction.py::(see file)` | C8-C11 |
| TC-H-02 | `saleor/graphql/checkout/tests/mutations/test_checkout_age_restriction_lines.py::test_adult_checkout_create_restricted_line_passes` | C2, X6 |
| TC-H-03 | `saleor/payment/gateways/stripe/tests/test_webhooks_age_restriction.py::test_stripe_webhook_guest_with_adult_email_blocked_and_refunded` | - |
| TC-H-04 | `saleor/graphql/order/tests/mutations/test_order_age_restriction.py::(see file)` | G1, G2 |
| TC-H-05 | `saleor/graphql/account/tests/mutations/test_account_register_birthday.py::test_account_register_anonymous_birthday_logs_change_for_new_user` | E1, E2, X7 |
| TC-H-06 | `saleor/graphql/account/tests/mutations/test_customer_bulk_update_birthday.py::test_superuser_bulk_update_logs_one_change_per_changed_row` | E4-E6 |
| TC-H-07 | `saleor/graphql/shop/tests/mutations/test_shop_settings_update_age_restriction.py::test_shop_settings_update_is_used_by_next_eligibility_check` | F3-F5 |
| TC-H-08 | `saleor/graphql/product/tests/mutations/test_product_create_age_restricted.py::test_create_product_with_is_age_restricted_true_is_stored` | B1, B2 |
| TC-P-01 | `saleor/graphql/checkout/tests/benchmark/test_checkout_age_restriction_query_counts.py::(see file)` | bench row 'complete checkout' 200 unchanged |
| TC-P-02 | `saleor/graphql/account/tests/benchmark/test_customers_birthday_query_count.py::test_customers_is_age_eligible_adds_at_most_two_queries_and_one_audit_insert` | bench row 'customers query' 53 = 53 |
| TC-R-01 | `saleor/graphql/account/tests/mutations/test_account_delete_retention.py::test_account_delete_keeps_birthday_events_and_deletes_other_events` | H1, H2 |
| TC-R-02 | `saleor/graphql/account/tests/mutations/test_staff_delete_retention.py::test_staff_delete_keeps_birthday_events_where_staff_is_subject` | - |
| TC-R-03 | `saleor/account/tests/test_deletion_retention.py::(see file)` | - |
| TC-R-04 | `saleor/account/tests/test_migration_0106.py::(see file)` | - |
| TC-R-05 | `saleor/account/deletion.py::(see file)` | bench row 'delete staff members' +1 |
| TC-SEC-01 | `saleor/graphql/account/tests/queries/test_birthday_privacy_routes.py::(see file)` | D6, D7, E1 |
| TC-SEC-02 | `test_tc_sec_02_* / test_tc_sec_04_* (lowercase names, test_birthday_privacy.py)` | - |
| TC-SEC-03 | `saleor/graphql/account/tests/queries/test_birthday_privacy.py::test_tc_sec_03_manage_users_staff_minor_flag_is_false` | D3, D4, D11 |
| TC-SEC-04 | `test_tc_sec_02_* / test_tc_sec_04_* (lowercase names, test_birthday_privacy.py)` | - |
| TC-SEC-05 | `saleor/graphql/account/tests/mutations/test_birthday_write_permissions.py::(see file)` | X8, E7 |
| TC-SEC-06 | `saleor/graphql/account/tests/mutations/test_birthday_write_permissions.py::(see file)` | D5, E8 |
| TC-SEC-07 | `saleor/webhook/tests/test_birthday_privacy_payloads.py::(see file)` | - |
| TC-SEC-08 | `saleor/graphql/account/tests/queries/test_birthday_privacy_schema.py::(see file)` | - |
| TC-SEC-09 | `not defined in spec (N-5)` | - |
| TC-SEC-10 | `saleor/graphql/account/tests/queries/test_birthday_privacy_audit.py::(see file)` | D2, E4 |
| TC-SEC-11 | `saleor/graphql/account/tests/queries/test_birthday_privacy.py::(see file)` | D8, D9, D10 |
| TC-V-01 | `saleor/graphql/product/tests/queries/test_product_visibility_restricted.py::(see file)` | B3, B4 |
| TC-V-02 | `saleor/graphql/product/tests/queries/test_product_visibility_restricted.py::(see file)` | B5 |
| TC-V-03 | `storefront:src/ui/components/plp/product-grid.test.ts::(see file)` | - |
| TC-V-04 | `storefront:src/ui/components/age-restriction-badge.test.ts::(see file)` | - |
| TC-V-05 | `storefront:src/ui/components/age-restriction-badge.test.ts::renders nothing to markup for unrestricted products` | - |

Items not run and why: TC-SEC-09 is not defined in the spec (N-5, already noted in 21r). Playwright e2e, Storybook/Chromatic, GraphQL Inspector, semgrep, pre-commit hooks: not run (see section 6).

## 4. Defects (ranked, with owner and fix)

No defect in the age-restriction behaviour was found by execution. All S§5 enforcement, S§7 permission and S§13 manual paths matched the spec. The findings are test infrastructure and open items:

| Rank | Sev | Finding | Evidence | Owner | Suggested fix (not applied) |
|---|---|---|---|---|---|
| D1 | Major (CI reliability; pre-existing at HEAD) | Shop gateway test fails under some xdist distributions. Root cause: autouse fixture `setup_dummy_credit_card_gateway` sets `DeprecatedDummyCreditCardGatewayPlugin.DEFAULT_ACTIVE = True` as a class attribute and never restores it (`saleor/payment/gateways/dummy_credit_card/tests/test_dummy_credit_card.py:29-30`). Every later test in that worker process sees the gateway as active. `git show HEAD:` contains the same line; file has no working-tree change. | Leaker→victim, one process: 1 failed / 1 passed on the current tree and on clean HEAD archive copy. Victim alone passes. Full -n 8 run passes. Leaker is `test_authorize_success` (its autouse fixture). | Owner of payment/gateways tests (pre-existing, not the age feature) | Use `monkeypatch.setattr(DeprecatedDummyCreditCardGatewayPlugin, "DEFAULT_ACTIVE", True)` in the fixture (add the `monkeypatch` argument). Then check whether the `mock.patch` string targets in `graphql/payment/tests/mutations/test_payment_capture.py:186` and `graphql/checkout/tests/mutations/test_checkout_complete_with_payment.py:2985` also restore. |
| D2 | Minor (environmental, not reproducible on demand) | `test_http_client_disallows_private_ip_ranges[https]` and `[http]` failed in the full run, passed alone. Cause: during the run `example.com` resolved to an IPv6 address (`2606:4700:10::ac42:93f3`). `requests_hardened` used that netloc and VCR's `port` parser raised `ValueError` on the unbracketed IPv6 literal. Cassettes record IPv4 (`23.215.0.136`). `saleor/core` has no diff. Now 60/60 DNS samples are IPv4-only. | Full run log; alone: 3 passed; `getaddrinfo` sample. | Core test infra (owner of `saleor/core/tests/test_http_client.py`) | Make the test deterministic: force IPv4 resolution in the test (monkeypatch `socket.getaddrinfo`), or match on host and path only, so VCR does not parse the resolved netloc. Do not rely on live DNS. |
| D3 | Minor (open decision, carried from prior sessions) | Release and remediation items still open: FU-1 legal review (release-blocking, non-code); S11-O1 InsufficientStock voucher release gap; 21r m-1 gift-line listings; 21r m-2 draft line-add race (needs `select_for_update`); S02-I1 authenticated accountRegister birthday denied (interpretation). | HANDOFF "Deferred decisions", "Deviations" | Parent / orchestrator | Decisions, not code, for G3 |
| D4 | Minor (documentation/ledger) | HANDOFF footprint says `test_saleor_s04` exists; `pg_database` has no such DB. HANDOFF also lists `s05`, `s06`, `s10` as self-dropped: confirmed absent. | `pg_database` query (section 5) | Orchestrator (HANDOFF) | Correct the ledger row before G3 |
| D5 | Minor (hygiene) | Gitignored sourceless `test_tmp_s04_age_smoke`, `test_tmp_s08_probe`, `test_tmp_s11_insufficient_control`, `test_tmp_s11_sql` `.pyc` files in `__pycache__` (`saleor/checkout/tests`, `saleor/graphql/*/tests`). Not collected by pytest, not source. | `find` in `saleor/` | Owners 04, 08, 11 | Delete the `__pycache__/test_tmp_*.pyc` files at G3 |
| D6 | Minor (pre-existing) | Dashboard `format:check` red on `agents/MEMORY.md` (baseline S00). | `dash-format.log` | Not age scope | Out of scope; note in G3 |
| D7 | Observation (product, not defect) | Superuser without a group cannot run channel-scoped draft mutations (group-based channel access). Anonymous `product(id)` needs `channel` when two channels exist. | Manual setup steps 1, 4 | Platform config / docs | Document in test setup. Not age-related |

## 5. Footprint (for G3)

| Item | State | Cleanup at G3 |
|---|---|---|
| DBs present (pg_database): `saleor_agevalid`, `test_saleor_s02(+gw0-2)`, `s03(+gw0-2)`, `s08(+gw0-2)`, `s09(+gw0-2)`, `s09b(+gw0-2)`, `s11(+gw0-7)`, `s21r(+gw0-2)` | exist | `DROP DATABASE` list per HANDOFF; `saleor_agevalid` only after :8001 is stopped |
| `test_saleor_s04` | ledger says exists, **absent** (D4) | Fix ledger |
| `test_saleor_s23` and `_gw*` | self-dropped (no `--reuse-db`) | none |
| `saleor` (dev), `test_saleor` | untouched by this session: no command pointed at them (manual checks used `saleor_agevalid`, tests used `saleor_s23`) | none |
| uvicorn :8001 | running, pid **14123** (restarted 18:09 on current tree) | `kill "$(cat .../s07/uvicorn-8001.pid)"` at G3 |
| docker `saleor-benchmark-api` | `Exited (0)` (E1) | `docker start saleor-benchmark-api` at G3, after migrating dev DB `saleor` (Option A) |
| docker db, cache, mailpit, saleor-1 | up | none |
| Dev servers next :3000 (pid 79409) and vite :9000 (pid 79387) | running, no API behind them | stop or leave per user; they were not started by this session |
| `s07/validation-credentials.json` | mode 600; new key `customer_19` added | `rm` at G3 with `saleor_agevalid` |
| `s23/` scratch | `head-src/` (git archive copy of HEAD, used for the baseline proof), logs, `manual*.py`, `*-results.json`, `tc-table.md`, `schema-now.graphql`, `fe-chain.sh` | remove at G3 if desired |
| Repo state | no commits; `saleor` 92, dashboard 62, storefront 85 entries; `schema.graphql` +124 / -0 (only in-scope generated file change); `uv.lock`/`pyproject.toml` untouched | commit decision at G3 |

## 6. Residual risks and CI-only gaps

- Not run (CI-only or not locally runnable): GraphQL Inspector, semgrep (not installed), pre-commit, changelog enforcer, migrations-compat job (`PYTEST_DB_URL` on a throwaway DB; not run in this session), Playwright e2e (`-m e2e`), Storybook/Chromatic, dashboard `e2e/`.
- Email confirmation of new accounts not exercised end-to-end (mailpit empty; DB confirmation used). Affects only the setup of the 19-year-old account, not the age logic.
- Storefront `{N}+` label can lag a minimum-age change by up to 1 h / 1 d (known limitation, HANDOFF). Shop settings have no webhook. Enforcement reads settings fresh (verified by F3-F5).
- Restricted `checkoutLinesAdd` costs about +2 to +3 queries over an unrestricted add (21r observation; NFR-1 covers unrestricted carts only; bench rows unchanged).
- FU-1 legal review (ToS, privacy policy, retention, staff access logging) is open and release-blocking (S§17).

## 7. Verdict

All executable gates on the final tree pass except: (a) the two environmental HTTP-client failures in the core full suite (D2), which do not touch this feature, and (b) the pre-existing dashboard `format:check` on `agents/MEMORY.md` (D6). The shop gateway failure is proven to be a pre-existing order-dependent test leak (D1); it passes in the full run and reproduces at HEAD. Manual API behaviour matches S§5, S§7 and the S§13 manual TCs: 64 of 64 checks pass. Go/no-go for G3 is the user's decision; FU-1 remains open.
