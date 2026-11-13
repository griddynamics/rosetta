# 01 — Core foundation · handoff (2026-10-23)

**Done:** fields (`User.birthday`, `Product.is_age_restricted`, `SiteSettings.age_restriction_minimum_age`/`time_zone`); `CustomerEvents.BIRTHDAY_CHANGED/READ` + `RETAINED_CUSTOMER_EVENT_TYPES`; `CustomerEvent.user` hook; `account/deletion.py`, `account/age_restriction.py` (S§4 R1–R9); S§6 error enums; `ADDED_IN_324`; migrations `account/0106_user_birthday`, `product/0211_product_is_age_restricted`, `site/0053_sitesettings_age_restriction`. 13 files = §6 row 01; `uv.lock`, `pyproject.toml`, `schema.graphql` untouched.

**G1 `sqlmigrate` (`<scratchpad>/s01/sqlmigrate.txt`):**
- 0106: `ALTER TABLE "account_user" ADD COLUMN "birthday" date NULL;` (choices and `on_delete` are no-ops, no FK DDL).
- 0211: `ALTER TABLE "product_product" ADD COLUMN "is_age_restricted" boolean DEFAULT false NOT NULL;`
- 0053: `ADD COLUMN "age_restriction_minimum_age" smallint DEFAULT 18 NOT NULL CHECK (>= 0)`; `ADD COLUMN "time_zone" varchar(64) DEFAULT 'UTC' NOT NULL`.
- All additive, constant defaults (no rewrite on PG 15). 1..120 is enforced by validators; DB CHECK is Django's `>= 0`.

**Deletion hook (RK-1, S§9.1):** non-retained events → `CASCADE(sub_objs.exclude(type__in=RETAINED))`; retained birthday events → `add_field_update(user, None)` (`user_id NULL`, parameters kept). Django 5.2.18: a non-`CASCADE` `on_delete` disables `can_fast_delete`, so the hook runs on every ORM delete; field updates run before deletes, same transaction.

**Evidence:**
- `makemigrations --check --dry-run`: No changes detected. `manage.py check`: no issues. Import smoke: OK.
- `ruff check` + `ruff format --check` (13 files): clean. `mypy` (13 files): clean, with one `# type: ignore[arg-type]` on the deletion `add_field_update` line (django-stubs; repo precedent).
- Domain smoke, 21 checks, no DB (scratchpad): Feb 29, turning-age day, tz boundary, reason precedence, 120-year bound, generic `str(AgeRestrictionError)`: PASS.
- `pytest saleor/account saleor/site saleor/graphql/account saleor/graphql/shop -n 3`: 1266 passed, 0 failed.
- Hook runtime, 2 scratch tests (temp file removed, not committed): user delete keeps birthday events detached with parameters; deletes other events; queryset delete path identical. PASS.

**Decisions:**
- `sqlmigrate` pointed at maintenance DB `postgres` (read-only); `saleor_s01` not created (outside E3).
- `site 0053` is `smallint` (`PositiveSmallIntegerField`, S§8), not `int`.
- `AgeRestrictionError.__str__` is fixed generic text, no reason or ids.

**Blockers:** none. **Next:** 02–05 and 06 after G1 review. Pending for 06: TC-R-04 guard and DB-level retention tests.
