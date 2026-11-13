# HANDOFF — PRODUCT-STORAGE-CONDITIONS
Status: sessions 01-04 done 2026-10-21; follow-up (user request): field also settable in the create flow, done; ACCEPTED by user (G4), 2026-10-21. Nothing committed or pushed.
Next: user review.
Blockers: none. Deferred: none.
Decisions (user): new Product field; plain text <=250, stored as-is; translatable via shared TranslationInput; category/collection reject; webhook+CSV export in; unit tests+linters+manual, no e2e; schema refresh + API restart allowed.
Deviations: see SPECS §13.

## Evidence
- 01 core: new tests 32 pass; wide regression (graphql/product, product, translations, webhook, core, csv) 5169 passed; ruff, mypy, `makemigrations --check` clean; schema.graphql +50 additive lines.
- 02 dashboard: tsc clean; eslint 0 errors on changed files; prettier clean; `jest -w 2` 931 suites pass (6149 tests); lint-rules + changesets OK. Unloaded runs flaked 2-4 unrelated suites (pass alone).
- 03 storefront: tsc, eslint, design-tokens, graphql-variants, data/core lock checks, vitest 129 files / 808 tests pass.
- 04 manual (local stack, Apple Juice product, reverted after): API set/clear/251-char INVALID/PL translate/category reject; storefront PDP shows "Storage conditions: Keep refrigerated at 2–8 °C" under description (screenshot); dashboard product page edit+save persisted, 250 maxlength; dashboard translations page shows field, source and PL value.
- Not manually verified: CSV export run (unit-tested only); PL storefront locale (not enabled in local storefront, /pl redirects to /en; fallback unit-tested).
- Follow-ups verified after acceptance request: real CSV export (task run directly, no worker) has `storage conditions` column with correct values; PL translation + fallback verified on live API data through the real storefront mapper. Local storefront has only `en` enabled, so `/pl/*` redirects to `/en` or soft-404s (middleware + ChannelRouteGuard); user chose not to change local config.
