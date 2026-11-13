# 25 — Visibility audit: restricted products stay visible, labelled "{N}+" (2026-10-23)

Directive (user): restricted products stay visible everywhere with an age label; visibility is not restricted, buying is. Scope: storefront (fix), core (read-only), dashboard (read-only, label only if trivial).

"Before" = storefront state at session start (after sessions 16–20). "After" = this session.

## 1. Storefront surfaces

| # | Surface | File(s) | Hides restricted? | Label before | Fix needed | After |
|---|---|---|---|---|---|---|
| 1 | Category PLP | `app/…/categories/[slug]/page.tsx` → `plp/plp-listing-client.tsx` → `plp/product-grid.tsx` → `plp/product-card-base.tsx` | No (no filter on flag) | Yes (S18) | none | Labelled |
| 2 | Collection PLP | `app/…/collections/[slug]/page.tsx` (same grid) | No | Yes (S18) | none | Labelled |
| 3 | All products PLP | `app/…/products/page.tsx` (same grid) | No | Yes (S18) | none | Labelled |
| 4 | Search results | `app/…/search/page.tsx` → `ui/components/search-results.tsx` → `ProductGrid` | No | Yes (S18) | none | Labelled |
| 5 | Homepage featured collection | `ui/sections/featured-collection-section/…` → `ProductGrid` | No | Yes (S18) | none | Labelled |
| 6 | PDP header | `app/…/products/[slug]/page.tsx` → `templates/pdp/product-layout.tsx` (slot) | No | Yes (S18) | none | Labelled |
| 7 | Homepage hero packshot (`EditorialHero` image, first featured product) | `app/…/(main)/page.tsx` | No | **No** | overlay slot `imageBadge` | Labelled when restricted |
| 8 | Homepage editorial packshot (`ImageWithText` fallback, CMS image absent) | `app/…/(main)/page.tsx`, `ui/sections/image-with-text/image-with-text.tsx` | No | **No** | overlay slot `imageBadge` | Labelled when restricted |
| 9 | Homepage category tiles (fallback art = a product thumbnail) | `lib/catalog/homepage-packshot.ts` (moved from page) | No (tile kept) | **Restricted thumbnail could be tile art, unlabelled** | tile art never from a restricted product; tile kept with no image if the category has only restricted products | Fixed (S25-D1) |
| 10 | Cart drawer lines | `ui/components/cart/cart-drawer.tsx`, `cart-drawer-wrapper.tsx`, query `graphql/CheckoutFind.graphql` | No | **No** (flag not selected) | select `...ProductListItemExtension`; pass config from server wrapper | Labelled |
| 11 | Cart page lines | `app/…/cart/page.tsx`, query `CheckoutFind` | No | **No** | same | Labelled |
| 12 | Account order detail lines | `app/…/account/orders/[number]/page.tsx`, query `graphql/OrderByNumber.graphql` | No | **No** | select extension; config in server page | Labelled |
| 13 | Account orders list | `app/…/account/orders/page.tsx` | n/a | n/a (no product lines rendered) | none | N/A |
| 14 | Checkout order summary (checkout flow) | `checkout/views/saleor-checkout/order-summary.tsx` (client), fragment `checkout/graphql/checkout.graphql` | No | No | see gap G1 | Labelled (S26, X-16 closed) |
| 15 | Order confirmation lines | `checkout/views/order-confirmation/order-confirmation.tsx` → `OrderSummary` (same component), fragment `checkout/graphql/order.graphql` | No | No | see gap G1 | Labelled (S26, X-16 closed; also order-by-number view `/order/[key]`) |
| 16 | PDP sticky bar | `ui/components/pdp/sticky-bar.tsx` (product name only, not a card or line) | No | No (the PDP header label is on the same page) | optional `nameBadge` slot (S26) | Labelled (S26, G3 closed) |
| 17 | PDP "related" / "you may also like" | none in repo | n/a | n/a | none | N/A |
| 18 | Wishlist / recently viewed | none in repo | n/a | n/a | none | N/A |
| 19 | Discounts, promotions, sale pages, voucher lists | none as product lists; per-card "Sale" badge and `DiscountPercentLabel` on cards only | No | Yes (cards, S18) | none | N/A (cards labelled) |
| 20 | Menus / mega menu | `ui/components/nav/components/mega-menu-desktop.tsx` (category/collection links; featured slot "reserved", empty) | n/a | n/a | none | N/A |
| 21 | Search bar | `ui/components/nav/components/search-bar.tsx` (form → `/search`; no suggestions) | n/a | n/a | none | N/A |
| 22 | Content blocks / CMS product refs | `lib/content/saleor/mappers/{homepage,products}.ts` (only featured collection; no product references) | n/a | covered by 5, 7, 8 | none | N/A |
| 23 | OG image route | `app/api/og/route.tsx` (not used for product pages) | n/a | n/a | none | N/A |

Storefront filters: `grep isAgeRestricted|ageRestriction` over `src` (non-test, non-generated) shows no filter, `where`, or `sort` on the flag. Listing constraints (`lib/listing/providers/saleor/constraints.ts`) and `lib/catalog/listing-query.ts` do not reference it.

## 2. Core (read-only)

`grep is_age_restricted|isAgeRestricted` over `saleor/**/*.py` (excluding tests and migrations) returns only:

| File | Use | Filters catalog? |
|---|---|---|
| `product/models.py` | field definition | no |
| `graphql/product/types/products.py` | field resolver | no |
| `graphql/product/mutations/product/product_create.py` | input field | no |
| `account/age_restriction.py`, `checkout/complete_checkout.py` | purchase-side enforcement | no (purchase only) |
| `graphql/checkout/mutations/{checkout_create,checkout_lines_add,checkout_create_from_order}.py`, `graphql/checkout/utils.py` | purchase-side enforcement | no |
| `graphql/payment/mutations/transaction/utils.py` | purchase-side enforcement | no |

Product filters, search, sorters, discount, menu, collection and channel-listing modules have no reference to the flag. Visibility queries are unchanged (REQ-VIS).

## 3. Dashboard (read-only)

| Surface | Hides restricted? | Label | Note |
|---|---|---|---|
| Product list (`src/products/queries.ts` `productListQuery` → `ProductWithChannelListings`) | No | Labelled (S26, X-17 closed): "Age restricted" in the name cell | Flag added to the list fragment (`@lockSchema(schema: "main")`), drawn after the name by the thumbnail cell. No column, no column-picker entry. Shop minimum age not in the list view, so the neutral copy is used. |
| Product detail (`ProductOrganization` toggle, `src/fragments/products.ts` `Product` fragment) | No | Toggle "Age restricted", hint "The product stays visible to everyone." | Already correct. No change. |
| Customer pages | n/a | n/a | Out of scope for product visibility. |

## 4. Gaps (remaining, with reason)

- **G1 Checkout summary and order confirmation lines**: closed in S26 (X-16). The flag is selected in the checkout and order line fragments; the server routes pass the shop config through a small `CheckoutAgeRestrictionProvider` to `OrderSummary`.
- **G2 Dashboard product list label**: closed in S26 (X-17), see §3.
- **G3 PDP sticky bar product name**: closed in S26. Optional `nameBadge` slot; the label sits beside the name in the mobile bar.
- **G4 Discount/voucher/sale product lists**: none exist in this storefront, so there is nothing to label beyond the cards.

## 5. Evidence

- Storefront: `tsc --noEmit` exit 0. `vitest run` 153 files / 985 tests passed (last recorded before this session: 149 files / 969 tests, 17 rev 3). 16 new tests, 4 new files.
- `NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8001/graphql/ pnpm run verify` exit 0 (lint 0 errors / 19 warnings, unchanged from baseline).
- `core:lock:check` ✓, `data:lock:check` ✓ (68 calls), `cost:check` ✓ (32 tests). ESLint 0 errors and Prettier clean on changed files.
- Codegen (`generate:all`) against the temporary clone API: exit 0, before and after the document edits.
- Decision S25-D1: tile art excludes restricted products. S25-D2: the hero and editorial packshots carry the label when restricted (overlay slot, no change to which product is shown).
- S26 closure evidence (`26-handoff.md`): storefront `verify` exit 0 (155 files / 991 tests, 19 warnings baseline); dashboard `pnpm test` 937 suites / 6206 passed / 0 failed; the list label is covered by 3 new dashboard tests and 2 cell-draw tests.
