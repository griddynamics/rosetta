# 02 — Core account API: birthday, eligibility, isSuperuser, write gates, audit (Phase B)
Depends on: 01, G1. Parallel with 03, 04, 05, 06. Spec: `S§6` (User/inputs/CustomerEventsEnum), `S§7`, `S§9`, `S§10` (birthday rows), `S§11` I-1/S-3/T-1/E-1.

## Do
1. `graphql/account/types.py` (`User`): `birthday`, `isAgeEligible`, `isSuperuser` as plain resolvers (not `PermissionsField`), null on unauthorized per `S§7` matrix; requestor via `get_user_or_app_from_context` (app first; `request.requestor` ignored).
2. `graphql/account/dataloaders.py`: `BirthdayReadAuditLoader(DataLoader[int, None])` per `S§9`; resolvers return `loader.load(root.id).then(lambda _: value)` only when a value is actually returned to a non-owner.
3. `account/events.py`: `customer_birthday_changed_event`, `customer_birthday_read_events` per `S§9` (parameters exactly `{customer_id, actor_user_id}`; no `message`; `bulk_create` under `allow_writer()` on default connection).
4. Inputs: `AccountInput.birthday`, `AccountRegisterInput.birthday`, `CustomerInput.birthday` (`graphql/account/mutations/base.py`; NOT `UserInput`); wire `account_register`, `account_update`, `customer_create`, `customer_update`, `customer_bulk_update` with the write gate (`PermissionDenied` before any side effect), `validate_birthday` → `AccountError INVALID field=birthday`, CHANGE event once per user per mutation iff value changed.
5. Descriptions with `ADDED_IN_324`; no `birthday`/`isAgeEligible` in any `where`/`filter`/`sortBy`; `account/search.py` untouched.
6. Fix existing tests in `graphql/account/tests` and `account/tests` broken by the change (existing files only).

## Subagents
- `rosetta-light:engineer` — implement; long-running.
- `rosetta-light:executor` — run `saleor/graphql/account saleor/account` suites on `DB_s02`; short-term.

## Notes
- Gate semantics: key `birthday` PRESENT in input (even `null`) ∧ requestor not allowed ⇒ `PermissionDenied` top-level `PERMISSION_DENIED`; allowed = owner (`accountUpdate`/`accountRegister`, anonymous allowed only for register) or `is_superuser` (`Customer*`). App tokens denied even with `MANAGE_USERS`/`IMPERSONATE_USER`; `AppImpersonateMixin` path in `account_update.py:47` must be rejected for birthday (S-3).
- Superuser editing own account = owner ⇒ no READ event; owner reads never logged (A5). Mutation payloads resolving `user{birthday}` count as reads.
- `UserCreateInput ⊂ CustomerInput` (`customerCreate`) but `staffCreate/StaffInput(UserInput)` must NOT gain `birthday` — verify by introspection.
- Exactly one READ event per customer per request across both fields and aliases/routes: loader `context_key` unique, key = subject user id; writer guard raises in tests outside `allow_writer()`.
- `CustomerEvent.message` resolver (`graphql/account/types.py:254`) must keep returning null for these rows; `CustomerEvent.user` for them is the subject (differs from staff-action events, which stay unchanged).
- Bulk update: events per changed row; gate evaluated once for the request.
- Eligibility uses the request-fresh site via `get_site_promise` (not `Site.objects.get_current()`, SC-5).

## Done when
- Introspection of the built schema (`get_graphql_schema` to stdout, grep) shows exactly the account additions of `S§6`, none in `StaffInput`/filter/sort inputs.
- Manual-in-test smoke (not committed): owner, superuser, `MANAGE_USERS` staff, app, anon each get the `S§7` outputs for `birthday`/`isAgeEligible`/`isSuperuser`.
- Existing `saleor/graphql/account`, `saleor/account` suites: no new failures vs baseline.

## Checklist
- [ ] STD-ALL  [ ] STD-C
- [ ] `S§7` matrix implemented cell-by-cell (incl. apps null everywhere)
- [ ] Audit: one READ per customer per request; CHANGE only on changed value; no old/new values stored
- [ ] No birthday in logs/exceptions/search/filters/sorters
- [ ] Write gate precedes validation and persistence
- [ ] Query count for `customers(first:100){isAgeEligible}` plausible ≤ baseline + 2 (asserted in 08)
- [ ] Security checked: E-1, S-3, T-1 paths walked
