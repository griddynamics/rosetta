# 16 — Storefront contract · handoff (2026-10-23)

**Status: done.** X-2 closed (orchestrator assigned the two kernel test expectations to 16; logged as S16-D1). X-1 reassigned to session 18 (orchestrator decision). Working tree only, nothing committed. Repo `react-storefront` (HEAD `3d3c3f5`).

**Done**
- Extension points (SC-3, no hashed file changed): `isAgeRestricted` in `src/graphql/extensions/{ProductListItemExtension,ProductDetailsExtension}.graphql`; `mapProductExtensions` → `{ isAgeRestricted }` in `src/config/storefront-view.ts`.
- New `src/graphql/ShopAgeRestriction.graphql` (`shop { ageRestrictionMinimumAge }`, no `timeZone`); registered in `src/config/data-extensions.ts`: op `cached/none/global`; profile `shopAgeRestriction` = catalog tier, tag `shop:age-restriction`, `pathPattern: null`, no webhook.
- `CheckoutAddLine.graphql` errors `+field code`. `CurrentUserProfile.graphql` `me +birthday isAgeEligible` (session op, not in `UserDetailsFragment`).
- No change needed: `CheckoutLinesUpdate` (already field/code), all `src/checkout/graphql` error selections (already carry `code`), `AccountUpdate` (`AccountInput.birthday` typed, errors have code).
- Kernel expectations (S16-D1): `src/lib/saleor/cache/manifest.test.ts` full-purge list += `shop:age-restriction`; `src/lib/saleor/__contracts__/data-layer.contract.test.ts` pinned pattern list += `shop-age-restriction:shop:age-restriction`.
- New tests: `src/config/storefront-view.test.ts` (2), `src/config/data-extensions.test.ts` (2).

**Evidence**
- `generate:all` with `NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8001/graphql/`: clean. `ShopAgeRestriction` and `isAgeRestricted` present in `src/gql` and checkout generated output.
- `data:lock` 65 calls, file unchanged. `data:lock:check` ✓, `core:lock:check` ✓, `lint:graphql-variants` ✓, `docs:check` ✓, `tsc --noEmit` ✓, ESLint + Prettier on all changed files ✓.
- `pnpm run verify` exit 0. `test:run`: 129 files, 791 passed, 0 failed (baseline 127 / 787 / 0).

**Data contract for 17–19**
- Documents: `ProductListItemDocument`/`ProductDetailsDocument` (extended), `ShopAgeRestrictionDocument` (new), `CheckoutAddLineDocument`, `CurrentUserProfileDocument`.
- PDP: `ProductView.extensions.isAgeRestricted: boolean` (from `mapProductExtensions`).
- Card: `isAgeRestricted` is on the generated `ProductListItemFragment` only, not yet on `ProductCardView`. Session 18 adds it (X-1).
- Shop age: read through a `"use cache"` loader in a `src/lib/*` loader path (S18), tag `shop:age-restriction`. Staleness: up to the catalog revalidate window (1h), hard bound 1d (expire). No webhook fires for shop settings.
- Me: `me.birthday` is a `YYYY-MM-DD` string (Date scalar), `me.isAgeEligible` boolean or null. Session-only; never place in cached loaders.
- Checkout: `CheckoutAddLine` errors give `field`, `code`, `message`. Codes: `AGE_RESTRICTION_LOGIN_REQUIRED|BIRTHDAY_REQUIRED|UNDERAGE`.
- Account: `accountUpdate` input `AccountInput { birthday }`; errors carry `code`.

**Decisions**
- Catalog tier chosen as the shortest available profile (`menus` and `channels` are equal or longer).
- Anonymous `shop { timeZone }` never selected (PERMISSION_DENIED nulls `shop`).

**Checklist (STD-E)**: types/lint/prettier ✓; tests added and passing ✓; `git status` changes limited to owned paths, plus the two new colocated `src/config/*.test.ts` and the two kernel test expectation edits (S16-D1, orchestrator-assigned); no birthday in logs/URLs/shared caches ✓; no DB/process/container created (footprint: none).

**Next**: session 18 owns X-1 (`to-card.ts`, `contract/listing.ts`, core:lock/coreOverrides/paper-core.lock.json/paper-version.json). 17–19 can proceed; 18's listing badge depends on X-1.
