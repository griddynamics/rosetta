# 18 — Storefront catalog label · handoff (2026-10-23)

**Status: done for the label (X-7, X-8 closed by grant). X-9 pass-through done; the quick-add CTA itself has no caller yet (decision below).** Working tree only, nothing committed. Repo `react-storefront` (HEAD `3d3c3f5`).

**Done**
- Card flag: `to-card.ts` → `isAgeRestricted === true`; `ProductCardView.isAgeRestricted?` (X-1).
- Shop age: `src/lib/custom/shop-age-restriction.ts` (cached loader, profile `shopAgeRestriction`). `src/lib/custom/age-restriction-config.ts` (server-only) builds `{ minimumAge, copy }` per locale. Copy from `pdp.ageRestriction.*` with English fallback (`age-restriction-copy.ts`). Shared types in `src/lib/custom/age-restriction-types.ts` (lib may not import ui; the badge re-exports them).
- Badge: `src/ui/components/age-restriction-badge.tsx`. Renders only for `isAgeRestricted === true`. Visible `{N}+`, neutral copy when N is unknown, sr-only sentence.
- Listing: `ProductCardBase` (top-right, `pointer-events-none`), `ProductCard`, `ProductGrid`, `PlpListingClient` (required prop), `SearchResults`, `FeaturedCollectionSection`. Routes: `products`, `search`, `collections/[slug]`, `categories/[slug]` pass the config. Restricted products are never filtered.
- PDP (X-8): `PdpTemplateSlots.ageRestriction?` (`src/lib/storefront/templates.ts`, coreOverrides + core:lock). Route `products/[slug]/page.tsx` builds the badge only for restricted products. `product-layout.tsx` places it beside the bestseller badge, above the h1.
- X-9: `ProductCardWithQuickAdd` takes `ageCta` and `ageLinks`. Restricted products with a CTA show it instead of quick-add, even with variants. Unrestricted cards are unchanged.

**Evidence**
- Render tests (`renderToStaticMarkup`, `.test.ts`): `age-restriction-badge.test.ts` (11), `to-card.test.ts` (5), `age-restriction-copy.test.ts` (3), `plp/product-card-base.test.ts` (6), `plp/product-grid.test.ts` (3), `plp/product-card-with-quick-add.test.ts` (8), `templates/pdp/product-layout.test.ts` (4). TC-V-03 guest listing and PDP keep restricted products, TC-V-04 only restricted products show the badge, TC-V-05 "21+" from config.
- Full `test:run`: 146 files, 923 passed, 0 failed. `cost:check` ✓ (30 tests).
- `core:lock:check` ✓. `data:lock:check` ✓ (68 calls). One run failed transiently while another session changed a call count. The lock was regenerated, and the diff contained no change from this work.
- ESLint ✓ and Prettier ✓ on all touched files. `tsc --noEmit`: no errors in 18's files. Remaining errors are in session 17 (`add-to-cart`, `quick-add-overlay`, checkout gateway) and session 19 (`edit-birthday-form`, `sign-up-form`), all awaiting session 20's keys.

**Decisions**
- Caching: no session read was added to any listing or the PDP shell. Only the cached shop loader and `getTranslations` (explicit locale) run on the page path. Unrestricted cards never touch session state.
- Label copy is read through the `pdp` namespace with English fallback. The typed-catalog cast in `age-restriction-config.ts` is temporary (see S18-D5).
- Shared types moved to `src/lib/custom` to satisfy `paper/no-lib-ui`.

**Open decision (X-9 caller)**
- No listing renders quick-add today. `QuickAddOverlay` is used only by `ProductCardWithQuickAdd`, which no route renders. So the CTA is not visible on any listing yet.
- Options: (a) add quick-add to restricted cards on listings with a per-card dynamic session island (makes the listing dynamic); (b) restricted cards link to the PDP and skip the CTA on listings (no session read, cache-friendly); (c) keep listings without quick-add. Spec S§12 implies (a). Orchestrator to choose.

**Next**
- Orchestrator: X-9 caller decision above. Session 20: add `pdp.ageRestriction.{label,neutral,srLabel}` to `messages/en.json` and locales, then drop the fallback and the cast (S18-D5).
