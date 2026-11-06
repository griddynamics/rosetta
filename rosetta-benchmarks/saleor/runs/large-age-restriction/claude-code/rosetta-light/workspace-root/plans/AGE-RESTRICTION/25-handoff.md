# 25 — Visibility audit + label follow-up · handoff (2026-10-23)

**Status: done.** Restricted products stay visible; "{N}+" label on every storefront card/line except X-16/X-17. Working tree only, no commits. Table: `25-visibility-audit.md`.
**Done:** no storefront or core catalog/search/discount/menu/collection filter on the flag (core reads it only in purchase enforcement). Label added to homepage hero and editorial packshots (`imageBadge` slot), cart drawer and cart page lines, account order lines. Category tile art never from a restricted product (S25-D1). `ProductAgeLabel` shared; tile helpers moved to `src/lib/catalog/homepage-packshot.ts`.
**Evidence:** `tsc` 0; `vitest run` 153 files / 985 tests (was 149 / 969; 16 new in 4 files); `verify` exit 0 (19 warnings, baseline 19); `core:lock:check`, `data:lock:check` (68), `cost:check` (32) pass; ESLint 0 errors; Prettier clean; codegen exit 0 before and after doc edits.
**Decisions:** S25-D1 tile art excludes restricted products (tile kept). S25-D2 hero/editorial show the same product, label added only. No new message keys (`pdp.ageRestriction.*`).
**Gaps:** X-16 checkout summary and order confirmation (`order-summary.tsx`): flag not in shared `CheckoutFragment`/`OrderLineFragment`, client tree needs prop threading. X-17 dashboard product list: no label (list fragment lacks the flag; datagrid column not trivial); detail toggle correct. PDP sticky bar: name only, not a card or line.
**Blockers:** none.
**Footprint:** clone `saleor_agevalid2` (from `saleor`, migrated) used for :8001 and codegen; uvicorn pid 27131 stopped; clone DROPPED by name. Remaining DBs: `postgres`, `saleor`, `template0`, `template1`, `test_saleor`. Logs `<scratchpad>/s25/` kept.
**Next:** orchestrator decides X-16 and X-17. G3 commit decision still open.
