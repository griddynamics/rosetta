# 02 — Core account API + audit · handoff (2026-10-23)

**Done:** `User.birthday` (Date), `isAgeEligible`, `isSuperuser` as plain resolvers (S§7; apps, anon, other staff get null). READ audit via `BirthdayReadAuditLoader` (one event per customer per request, one bulk INSERT). CHANGE audit from accountRegister (created row), accountUpdate, customerCreate, customerUpdate, customerBulkUpdate (per changed row). Inputs `CustomerInput.birthday` (UserCreateInput inherits), `AccountInput.birthday`, `AccountRegisterInput.birthday`, all `ADDED_IN_324`. Write gate runs before validation and persistence. Files = §6 row 02 only (9 files).

**Evidence:**
- `ruff check` + `ruff format --check`: clean (9 files). `mypy`: clean (9 files). `makemigrations --check --dry-run`: no changes.
- Schema via `manage.py get_graphql_schema` to scratch (`schema.graphql` untouched): 0 removed lines. Birthday only on CustomerInput, UserCreateInput, AccountInput, AccountRegisterInput. Not on StaffInput, UserInput, filters, sorters.
- `pytest saleor/account saleor/graphql/account -n 3 --reuse-db` (DB `test_saleor_s02`): 1167 passed, 1 failed. The failure was `graphql/account/tests/benchmark/test_customer_bulk_delete_retention.py::test_customer_bulk_delete_adds_one_events_update_per_batch` (session-06 file): its second `post_graphql(permissions=…)` call failed the no-permission precheck. Session 06 fixed it at 13:25 (`check_no_permissions=False`). Re-run of that file alone: 3 passed.
- Scratch smoke, 11 tests, deleted and not committed: owner unlogged; superuser value with one READ; MANAGE_USERS gets isAgeEligible only; app with MANAGE_USERS gets null everywhere; anon register logs one CHANGE; logged-in register denied; staff/app write denied with no side effect; S-3 app impersonation denied; future birthday gives INVALID on `birthday`; bulk logs per changed row; events list has `message` null.
- Query count `customers(first:100)`: base 8, with `isAgeEligible` 10 (+1 site settings, +1 audit INSERT). Meets ≤ baseline+2.

**Decisions:**
- Gate hook `BaseCustomerCreate.can_set_birthday`: superuser user only, apps never. AccountUpdate overrides it to any non-app user (owner, customerId rejected).
- accountRegister accepts birthday only from anonymous requests. Logged-in user, staff, app → PERMISSION_DENIED. Reading plan §5 "owner" as "new account has no owner yet". Open for confirmation.
- Register CHANGE is written synchronously in `save_and_create_task`, only when a row was created. The async task and timing comment are unchanged.
- `events.py` adds `build_customer_birthday_changed_event` (unsaved) for bulk_create. Spec helpers keep their signatures.
- Gate error is `PermissionDenied()` with no permission list (no permission enum exists for superuser). Message is generic.

**Blockers:** none for 02. Self-caused, fixed: a wrong relative import in `customer_bulk_update.py` (`...core.exceptions`) broke collection for 03 and 04 for about 3 min. Current file verified.
**Cross-scope:** none open. The session-06 helper issue above is closed by 06.
**Next:** 07 after 03, 04, 05 (02 done). Footprint: `test_saleor_s02`, `test_saleor_s02_gw0..2` (reuse-db, drop at G3). Scratch dir `<scratchpad>/s02/` kept.
