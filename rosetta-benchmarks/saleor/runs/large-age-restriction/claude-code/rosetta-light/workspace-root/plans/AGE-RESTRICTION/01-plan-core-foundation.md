# 01 — Core foundation: models, migrations, domain module, error codes, deletion hook (Phase A)
Depends on: 00 (core part). Runs ALONE. Ends with gate G1. Spec: `S§4`, `S§8`, `S§9.1`, `S§6` (enum values), `S§14` Models/Domain rows.

## Do
1. Fields per `S§8`: `User.birthday`, `Product.is_age_restricted` (`default`+`db_default`), `SiteSettings.age_restriction_minimum_age` (validators 1..120) and `time_zone`; hand-check migration numbers against leaves (`0106`, `0211`, `0053`) with `makemigrations --check`, file names as in `S§8`.
2. `account/__init__.py`: `CustomerEvents.BIRTHDAY_CHANGED/READ` (+ `CHOICES` text) and `RETAINED_CUSTOMER_EVENT_TYPES`; `CustomerEvent.type` choices update and `CustomerEvent.user` FK → `on_delete=cascade_except_retained_customer_events` in the same migration `0106` (state-only `AlterField`s).
3. `account/deletion.py` (new): `cascade_except_retained_customer_events` exactly as `S§9.1`; docstring states RK-1/RK-4 (raw-SQL/`_raw_delete`, Django `db_on_delete`).
4. `account/age_restriction.py` (new): full contract `S§4` incl. R1–R9, `MAX_AGE_YEARS = 120`, `AgeRestrictionError` with generic `__str__` (no birthday/age/min age), `validate_birthday` raising Django `ValidationError(code=AccountErrorCode.INVALID.value)`; `today` injectable.
5. Error codes: `AGE_RESTRICTION_{LOGIN_REQUIRED,BIRTHDAY_REQUIRED,UNDERAGE}` on `CheckoutErrorCode`, `CheckoutCreateFromOrderUnavailableVariantErrorCode` (`checkout/error_codes.py:4,65`), `TransactionInitializeErrorCode`, `TransactionProcessErrorCode` (`payment/error_codes.py:87,95`); `AGE_RESTRICTION_{LOGIN_REQUIRED,NOT_ELIGIBLE}` on `OrderCreateFromCheckoutErrorCode` (`checkout/error_codes.py:40`); `AGE_RESTRICTION_NOT_ELIGIBLE` on `OrderErrorCode` (`order/error_codes.py:4`).
6. `ADDED_IN_324` in `graphql/core/descriptions.py` (match `ADDED_IN_323` format).
7. Baseline-safe verification only (no new test files; tests are 06/08–10): `manage.py check`, `makemigrations --check --dry-run`, `sqlmigrate` for the three apps, import smoke of the new modules, affected existing suites. Put `sqlmigrate` output in `01-handoff.md` for G1.

## Subagents
- `rosetta-light:engineer` — implement + verify; long-running.
- `rosetta-light:executor` — run `saleor/account saleor/site saleor/graphql/account saleor/graphql/shop` suites, summarise; short-term.

## Notes
- `on_delete` callable is serialised by dotted path in the migration ⇒ module-level function in an importable module; `account/deletion.py` must not import models at import time (circular with `account/models.py`).
- Verify `Collector.add_field_update` / `CASCADE` signatures in `saleor/.venv/lib/python3.12/site-packages/django/db/models/deletion.py` (Django 5.2.18); a wrong filter would silently delete or keep the wrong events.
- `S§8` says AlterFields are state-only: confirm `sqlmigrate account 0106` prints only `ADD COLUMN birthday … NULL` and no FK DDL. New NOT NULL columns must have DB defaults (CI migrations-compat job runs old code on the new schema).
- Domain enum additions flow into graphene enums automatically ⇒ `schema.graphql` drifts until 07 (expected; do not regenerate here, do not hand-edit).
- Container hot-reload (PLAN §5): edit model + migration files back-to-back so the tree stays importable; if :8000 stays up, it will 500 until migrated (Option B: wait for G1).
- `CustomerEvent.type` choices are built as `(type_name.upper(), type_name)` from `CHOICES` (`account/models.py:396`); add both new values consistently.

## Done when
- `sqlmigrate`: account 0106 = one nullable `ADD COLUMN`, no FK DDL; product 0211 = boolean `DEFAULT false NOT NULL`; site 0053 = int default 18 and varchar default 'UTC', both NOT NULL.
- `python manage.py shell -c` imports `saleor.account.age_restriction` and `saleor.account.deletion`; `makemigrations --check --dry-run` clean; ruff/mypy clean on changed files.
- Existing suites `saleor/account`, `saleor/site`, `saleor/graphql/account`, `saleor/graphql/shop` have no new failures vs baseline.
- `git diff --stat` touches only §6 row-01 files.

## Checklist
- [ ] STD-ALL  [ ] STD-C
- [ ] `S§4` contract matches signature-for-signature (R1–R9)
- [ ] Deletion hook verified against Django 5.2.18 source
- [ ] `sqlmigrate` output captured for G1
- [ ] Error enums added exactly per `S§6` (no extras)
- [ ] Migrations additive, zero-downtime (`db_default`)
- [ ] Edge cases: Feb 29, tz boundaries, `time_zone` validity left to 03/domain — documented in handoff
