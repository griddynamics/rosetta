# 26 — Label gaps closed (X-16, X-17, PDP sticky bar) · handoff (2026-10-23)

**Status: done. X-16 and X-17 closed. No open restricted-product label gap remains on storefront or dashboard.** Working tree only, nothing committed. Core untouched.

**Done**
- X-16 storefront checkout summary and order confirmation (`OrderSummary`): `isAgeRestricted` selected under `variant.product` in `CheckoutLineFragment` and `OrderLineFragment` (covers `/order/[key]` and order-by-number). Shop config from the server routes (`checkout-session-loader`, `order/[key]/page`) via `CheckoutAgeRestrictionProvider` (`src/checkout/providers/checkout-age-restriction.tsx`, new) into `CheckoutApp` and `OrderConfirmationApp`. Label is `ProductAgeLabel` under the line name.
- PDP sticky bar (G3): optional `nameBadge` on `StickyBar` / `AddToCartForm`; `VariantSectionDynamic` passes a `ProductAgeLabel`; page passes the config.
- X-17 dashboard product list: `isAgeRestricted @lockSchema(schema: "main")` in `ProductWithChannelListings`; name cell (`getNameCellContent`) passes a badge to `thumbnailCell`; `ThumbnailCell` draws it after the name. Neutral "Age restricted" (shop minimum age not in the list view). Guard: `isMainSchema() && isAgeRestricted === true`.
- Checkout codegen against a clone (`saleor_agevalid3`, :8001, pid 30607): diff is only `isAgeRestricted: boolean` in the checkout operations. Dashboard codegen from `schema-main.graphql` (no API): hooks and types only.

**Evidence (before → after)**
- Storefront vitest: 153 files / 985 tests → 155 / 991 (+2 files: `order-summary.test.ts` 4 tests, `sticky-bar.test.ts` 2 tests).
- Storefront: `tsc --noEmit` 0 errors. `pnpm run verify` exit 0, lint 0 errors / 19 warnings (baseline 19). `data:lock:check` 68 calls, `core:lock:check` ok (no lock change needed), `cost:check` 5 files / 32 tests. ESLint 0 errors and Prettier clean on all changed files.
- Dashboard: `check-types` exit 0 (4216 strict files). `pnpm test` exit 0: 937 suites passed, 6206 tests passed, 0 failed, 8 skipped (baseline 6200 at session 15; no session-26 start count). Focused run of the datagrid, cell and lockSchema suites: 11 suites / 40 tests. `knip` exit 0. `lint:changesets` 1 file, patch. ESLint 0 errors on changed files (no `--fix`). `extract-messages` adds only `rSXTpe` ("Age restricted").
- Mock updates (S12-D1 precedent): 20 list-node fixtures in `src/products/fixtures.ts` gain `isAgeRestricted: false` to keep `check-types` green.

**Decisions**
- S26-D1 list label: neutral "Age restricted" (no shop value in the list view). Drawn after the name, not a new column.
- S26-D2 checkout config via a small client provider, not a prop on each line. Children optional on the provider to keep the test render simple.
- S26-D3 PDP sticky bar label is optional (`nameBadge`), so existing callers are unchanged.

**Blockers:** none. **Core:** no change (last core edits 18:37–18:41, session 24).

**Footprint:** `saleor_agevalid3` created and DROPPED by name; uvicorn :8001 pid 30607 stopped (port closed). Logs in `<scratchpad>/s26/`. Working tree changes listed in `HANDOFF.md` ledger (storefront and dashboard, session 26 rows).
**Next:** orchestrator commit decision at G3 (open). Known pre-existing items unchanged: storefront `settings-page.tsx` Prettier warning (already unformatted at HEAD), dashboard `format:check` on `agents/MEMORY.md` (baseline).
