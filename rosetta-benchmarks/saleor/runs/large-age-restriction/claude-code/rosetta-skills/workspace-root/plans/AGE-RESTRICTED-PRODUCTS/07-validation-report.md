# 07 Validation report: SPECS 7.5 (manual/e2e, isolated stack)

Stack: core API 127.0.0.1:8001 (uvicorn), throwaway DB `saleor_run` in container `age-check-db`. Backend GraphQL only (scripts in the session scratchpad); UI (dashboard/storefront) NOT run. Birthday values are not recorded here; results are given as eligible/underage/etc.
Date used by the shop: UTC, today = 2026-10-26.

Setup changes in the throwaway DB only: product "Apple Juice" flagged `isAgeRestricted`; `enableAccountConfirmationByEmail=false` and channel `allowUnpaidOrders=true` (to allow registration/completion without email/payment); synthetic customers `v-adult|v-nobday|v-minor|v-edge`, two staff (group MANAGE_USERS / group MANAGE_SETTINGS; password hash copied via psql inside `age-check-db` from a synthetic customer), one app (MANAGE_USERS, IMPERSONATE_USER, MANAGE_ORDERS). "Complete blocked" cases were built by creating the checkout/draft while the product was unflagged, then flagging (that is the only way to hold a restricted line without add-time block).

| # | Scenario | Expected | Observed | Result |
|---|---|---|---|---|
| 1 | Staff flags product via `productUpdate(isAgeRestricted)` | flag true | `isAgeRestricted: true`, no errors | PASS |
| 2 | Guest `checkoutCreate` with restricted line | `AGE_RESTRICTION_LOGIN_REQUIRED`, field lines | exact code + message "Sign in to buy age-restricted products." | PASS |
| 3 | Guest `checkoutLinesAdd` restricted | LOGIN_REQUIRED | LOGIN_REQUIRED | PASS |
| 4 | Guest `checkoutLinesUpdate` qty 2 on restricted line; qty 0 (removal) | blocked; removal allowed | LOGIN_REQUIRED; removal OK | PASS |
| 5 | Guest `checkoutComplete` with restricted line | LOGIN_REQUIRED | LOGIN_REQUIRED, no order | PASS |
| 6 | Guest completes using the email of an adult customer (D14 spoof) | still LOGIN_REQUIRED | LOGIN_REQUIRED | PASS |
| 7 | Customer without birthday: create / lines add / complete | `AGE_RESTRICTION_BIRTHDAY_REQUIRED` | BIRTHDAY_REQUIRED on all three; message matches spec | PASS |
| 8 | Underage customer: create / lines add / complete | `AGE_RESTRICTION_UNDERAGE` | UNDERAGE on all three | PASS |
| 9 | Adult customer: create, add, complete | allowed; order created | order created (UNCONFIRMED), linked to the user | PASS |
| 10 | Boundary: turns 18 today / tomorrow / yesterday | allowed / UNDERAGE / allowed | allowed / UNDERAGE / allowed | PASS |
| 11 | Feb-29 birth (2008-02-29), min age 18 and 19 | 18 reached 2026-03-01: allowed; 19 not until 2027-03-01: UNDERAGE | allowed; UNDERAGE | PASS |
| 12 | `minimumAge` raised 18 to 21 for a 19-year-old | UNDERAGE on next check | UNDERAGE | PASS |
| 13 | Shop `timeZone`: birthday-18th "tomorrow" in UTC | UNDERAGE in UTC; allowed in Pacific/Kiritimati (UTC+14) | UNDERAGE; allowed | PASS |
| 14 | MANAGE_USERS non-superuser staff reads `birthday` / `isAgeEligible` / `isSuperuser` (user and `customers` list) | null / boolean / null | null / boolean / null | PASS |
| 15 | Same staff `customerUpdate`/`customerCreate` with birthday (set, unchanged value, explicit null) | `PERMISSION_DENIED` even when unchanged | PERMISSION_DENIED in all (field `birthday`); update without birthday key OK | PASS |
| 16 | Staff without MANAGE_USERS (only MANAGE_SETTINGS) querying user | denied (existing permission) | PermissionDenied (existing gate) | PASS |
| 17 | Superuser reads/sets birthday on customer; invalid future / pre-1900 | value visible; set OK; INVALID with no date in message | visible; set OK; `INVALID` "Invalid birthday." for both | PASS |
| 18 | Owner (`me`) sees own birthday/eligibility/`isSuperuser=false`; `accountUpdate` valid/future | value; OK; INVALID | as expected | PASS |
| 19 | App token (MANAGE_USERS + IMPERSONATE_USER) reads fields | all null | birthday/isAgeEligible/isSuperuser null | PASS |
| 20 | App `customerUpdate`/`customerCreate` birthday (set, null), `accountUpdate(customerId)` birthday | PERMISSION_DENIED | PERMISSION_DENIED in all four | PASS |
| 21 | `customerBulkUpdate` birthday by non-superuser (extra path) | not changeable | `INVALID` "Birthday cannot be changed with this mutation." (count 0) | PASS |
| 22 | Audit events `BIRTHDAY_CHANGED/BIRTHDAY_VIEWED/AGE_ELIGIBILITY_VIEWED` in `User.events` | visible only to superuser | superuser sees all three types; MANAGE_USERS staff and app see only ACCOUNT_CREATED/PLACED_ORDER | PASS |
| 23 | Audit event content (read in DB) | no values, no `message`, no app/order | `parameters` hold only `action`, `actor_type`, `actor_id` (+`kind`); `message` null; unchanged-value superuser update wrote no event; owner self-view wrote none; app reads wrote none | PASS |
| 24 | Birthday absent from webhooks/public API | absent | static grep: no `birthday` in `saleor/webhook`, `saleor/csv`, `account/search.py`; anonymous `me`=null, `user(email)` permission denied; app (subscription-context equivalent) gets null. Live webhook delivery NOT exercised | PASS (static + API) |
| 25 | Draft `draftOrderCreate` explicit minor / no-birthday customer + restricted line | UNDERAGE / BIRTHDAY_REQUIRED | UNDERAGE / BIRTHDAY_REQUIRED (field lines) | PASS |
| 26 | Draft with explicit adult; with no customer; with email-only match of a minor's email | allowed | all created; all three completed (UNFULFILLED) once shipping method set (D15 email-only allowed) | PASS |
| 27 | `orderLinesCreate` restricted on draft with explicit minor | UNDERAGE; no-customer draft allowed | UNDERAGE; allowed | PASS |
| 28 | `draftOrderComplete` for explicit minor / no-birthday customer (draft built pre-flag) | UNDERAGE / BIRTHDAY_REQUIRED | as expected | PASS |
| 29 | Unlink customer (`draftOrderUpdate user=null`), then complete | completes | completed with `user: null` | PASS |
| 30 | `shopSettingsUpdate` minimumAge/timeZone with MANAGE_SETTINGS; without; invalid 0/121/bad zone; public read | OK; denied; `INVALID`; public | OK; permission denied (null); INVALID with message; anonymous `shop{minimumAge timeZone}` readable | PASS |
| 31 | Dashboard checkbox / settings UI; storefront badge, prompts, birthday form | per 5/6 handoffs | NOT RUN (best effort, skipped) | NOT VERIFIED |

## Defects
None found in the exercised scope.

## Observations (not defects, per spec)
- `draftOrderUpdate` that sets an explicit under-age/no-birthday customer onto a draft already holding a restricted line is accepted; the block happens at `draftOrderComplete` (spec 3.3 hooks only line add/update/create and completion).
- Staff superuser reads are logged with `actor_type: staff`; every superuser view of the same user in one request is deduplicated as designed.

## Not covered
- UI (dashboard/storefront), live webhook delivery, performance, and the e2e Feb-29 case at a real Feb-29/Mar-1 date (covered by the Mar-1-2026 and leap-offset cases above only).
- Throwaway DB left in modified state (flagged product, test users/group/app, confirmation off, unpaid orders on); stack on 5432/8000 and benchmark containers untouched.
