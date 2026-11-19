# 02 — Core API: product, shop, user, audit
Depends on: 01. Parallel with 03. SPECS §3.4, §4, §6, §7.2 (product/shop/birthday/audit/privacy rows).
## Do
1. `isAgeRestricted` on `ProductInput`/`Product` (+ bulk create test). `minimumAge`/`timeZone` on `Shop`/`ShopSettingsInput` with validation.
2. `User.birthday|isAgeEligible|isSuperuser` resolvers; `birthday` on `AccountRegisterInput`, `AccountInput`, `CustomerInput` with permission/validation rules; app + impersonation rejection.
3. Audit writes (change/read, per-request dedup, fail-closed) and `User.events` hiding.
4. API tests: full read/write matrix, privacy (legacy payload, subscription as app, search), audit visibility.
## Subagents
- engineer (long); reviewer + security reviewer (short, independent).
## Rules
- Do not use `PermissionsField` for `birthday` (superuser is not a permission); resolve via `get_user_or_app_from_context`.
- Query resolvers writing audit rows need `allow_writer()` (writer guard raises in tests).
- Unauthorized fields return null, never a permission error (SPECS §10 AS-2).
- Do not regenerate `schema.graphql` (04 owns it).
## Done when
- All §7.2 rows for these areas pass; no birthday value appears in any event/log/payload test assertion output.
## Checklist
- [ ] Implemented  - [ ] API tests per matrix  - [ ] Query-count benchmark added  - [ ] Security checked (STRIDE rows)  - [ ] Edge cases  - [ ] ruff/mypy/semgrep on touched files  - [ ] Reviewed by non-author  - [ ] Handoff written
