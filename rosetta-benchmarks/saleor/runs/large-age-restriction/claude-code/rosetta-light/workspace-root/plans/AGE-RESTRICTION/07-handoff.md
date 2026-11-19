# 07 — Core schema contract + verification stack · handoff (2026-10-23)

**Done:** `schema.graphql` regenerated (`poe build-schema`), diff is additions only, schema gate (`get_graphql_schema | diff`) empty. Verification API on :8001 running from clone `saleor_agevalid` (migrated), smoke passed. Validation users and app seeded on the clone. Gate G2 waived by user ("fully autonomous"); this file is the G2 packet.

**G2 packet: diff vs S§6**
- `saleor/graphql/schema.graphql`: +124 / -0 lines (40204 total). Zero removed or changed existing lines.
- 15 new field descriptions, each ends `Added in Saleor 3.24.`. Enum values carry no per-value description (see flags).
- Declarations (32 new field/value lines, 18 declarations):
  - `type User`: `birthday: Date`, `isAgeEligible: Boolean`, `isSuperuser: Boolean`
  - `type Product`: `isAgeRestricted: Boolean!`
  - `input ProductInput`, `ProductCreateInput`, `ProductBulkCreateInput` (inherited copy): `isAgeRestricted: Boolean`
  - `type Shop`: `ageRestrictionMinimumAge: Int!`, `timeZone: String!`
  - `input ShopSettingsInput`: `ageRestrictionMinimumAge: Int`, `timeZone: String`
  - `input AccountInput`, `AccountRegisterInput`, `CustomerInput`, `UserCreateInput` (inherited copy): `birthday: Date`
  - `enum CustomerEventsEnum`: `BIRTHDAY_CHANGED`, `BIRTHDAY_READ`
  - `enum OrderErrorCode`: `AGE_RESTRICTION_NOT_ELIGIBLE`
  - `enum CheckoutErrorCode`, `TransactionInitializeErrorCode`, `TransactionProcessErrorCode`, `CheckoutCreateFromOrderUnavailableVariantErrorCode`: `AGE_RESTRICTION_LOGIN_REQUIRED`, `AGE_RESTRICTION_BIRTHDAY_REQUIRED`, `AGE_RESTRICTION_UNDERAGE`
  - `enum OrderCreateFromCheckoutErrorCode`: `AGE_RESTRICTION_LOGIN_REQUIRED`, `AGE_RESTRICTION_NOT_ELIGIBLE`
- `birthday` absent from `UserInput`, `StaffInput`, every filter/where/sort input (checked by declaration walk). Only on the 4 inputs and `User`.
- No `variants` field (orchestrator decision (a); S§5 deviation).

**Flags for the owner (none blocking, none changed by 07):**
1. Enum values are not described per value. S§6 shows none, and HEAD's error enums carry none, so this matches precedent. Enum values need no change unless G2 wants them.
2. Anonymous `shop { timeZone }` returns `PERMISSION_DENIED` and nulls `data`, because `Shop` is non-null. Per S§6 (`MANAGE_SETTINGS`). Clients (12, 16) must not select `timeZone` on anonymous shop queries.
3. Two accepted deviations: transaction errors #10/#11 have no `variants` (orchestrator (a)); `productUpdate{isAgeRestricted:null}` resets to `false` (orchestrator (b)).

**Evidence:**
- `poe build-schema` exit 0. Backup of HEAD copy: `<scratchpad>/s07/schema.head.graphql`. Scratchpad root: `/private/tmp/claude-502/-Users-isolomatov-saleor-benchmark/3a0bde06-3aea-48aa-ad4d-2163e312e3d1/scratchpad/s07/`.
- Clone: `CREATE DATABASE saleor_agevalid TEMPLATE saleor` (no connections to `saleor` at the time). Migrate applied `account.0106_user_birthday`, `product.0211_product_is_age_restricted`, `site.0053_sitesettings_age_restriction`. Log: `migrate-agevalid.log`.
- Smoke on :8001: anonymous `{ shop { ageRestrictionMinimumAge } }` → 18. Introspection → `Query`/`Mutation`. `Product.isAgeRestricted` present.
- Tokens verified for all seeded roles (`tokenCreate` returns a token; `me` correct; app token answers `shop`). Storefront traffic guard did not block anonymous calls.

**Verification stack (start / stop / restart):**
- Start (no `--reload`; telemetry off):
  ```
  cd /Users/isolomatov/saleor-benchmark/saleor
  DATABASE_URL='<settings.py:139 default URL, path /saleor_agevalid>' SEND_USAGE_TELEMETRY=False nohup .venv/bin/uvicorn saleor.asgi:application --host 127.0.0.1 --port 8001 > <scratchpad>/s07/uvicorn-8001.log 2>&1 & echo $! > <scratchpad>/s07/uvicorn-8001.pid
  ```
- Stop: `kill "$(cat <scratchpad>/s07/uvicorn-8001.pid)"`.
- Restart: stop, then start. Required after any core code change. Owner: whoever changes core code. Log the restart here.
- Base URL: `http://127.0.0.1:8001/graphql/`. Current process: pid `71120`.

**Tokens (no secret values in repo):**
- Credentials file: `<scratchpad>/s07/validation-credentials.json` (mode 600), keys `superuser`, `staff`, `customer_adult`, `customer_no_birthday`, `customer_minor` (email + password), `app` (token).
- User JWT: `mutation($e:String!,$p:String!){ tokenCreate(email:$e,password:$p){ token errors{ code } } }`, sent with that role's email and password. Send `Authorization: Bearer <token>`.
- App: `Authorization: Bearer <app.token>`.
- Example helper: `<scratchpad>/s07/check_tokens.py`.

**Validation users on `saleor_agevalid` (roles only; birthdays are synthetic and not recorded here):**

| Role | Email | Account id | Flags | Birthday |
|---|---|---|---|---|
| superuser | agevalid-superuser@example.com | 46 | superuser, staff | no |
| staff | agevalid-staff@example.com | 47 | staff; MANAGE_USERS, MANAGE_PRODUCTS, MANAGE_SETTINGS | no |
| customer adult | agevalid-customer-adult@example.com | 48 | customer | yes |
| customer no birthday | agevalid-customer-nobday@example.com | 49 | customer | no |
| customer minor | agevalid-customer-minor@example.com | 50 | customer | yes |
| app | agevalid-app | app id 1 | MANAGE_USERS, MANAGE_PRODUCTS, MANAGE_SETTINGS, HANDLE_CHECKOUTS | n/a |

Seed script: `<scratchpad>/s07/seed_validation_users.py` (re-runnable; rotates passwords and app token).

**Decisions:**
- Clone via `TEMPLATE`, not `pg_dump`, since no sessions were attached. Source `saleor` was only read.
- Telemetry disabled (`SEND_USAGE_TELEMETRY=False`) on the verification API. The first start (pid 70869) sent one aggregate usage-telemetry POST at boot before I restarted with it off. Counts only, no PII.
- Schema build and `uv.lock`/`pyproject.toml`: only `schema.graphql` changed.

**Blockers:** none. **Next:** 08–10 run against :8001 or their own test DBs. 12 and 16 consume the frozen schema (flag 2 applies). Restore and cleanup at G3.

**Footprint:** recorded in `HANDOFF.md` ledger (`saleor_agevalid`, pid 71120 on :8001, credentials file, `s07/` scratch, `schema.graphql` change).
