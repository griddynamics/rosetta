# 18 — Storefront: "{N}+" age label on listings, search, PDP (Phase E)
Depends on: 16. Parallel with 17, 19, 13, 14. Spec: `S§1` REQ-VIS (C1), `S§12` Storefront (Age label), `S§13` TC-V-03..05; PLAN SC-3/SC-4.

## Do
1. New `src/ui/components/age-restriction-badge.tsx`: renders `"{N}+"` only when `product.isAgeRestricted` is true; N from the public shop setting loaded by 16's `ShopAgeRestriction` operation.
2. Use it in listing cards (`plp/product-card-link.tsx`, `plp/product-card-with-quick-add.tsx`, card data in `plp/product-card-data.ts`), `search-results.tsx`, and the PDP header/badge host (a PDP file other than S17's `variant-section-dynamic`/`add-to-cart`/`sticky-bar`). Nothing is filtered or hidden: restricted products render for guests, same as others (C1).
3. If the data path needs `src/lib/listing/providers/saleor/to-card.ts` or contract types (hashed core), prefer the extension mapping; only fall back per SC-3 with `core:lock` + Deviation.
4. Tests (`.test.ts`, SC-4): TC-V-03 restricted product still present in PLP/search/PDP data for guests (no filtering in the data path), TC-V-04 badge for `true`/absent for `false`, TC-V-05 label uses configured age (21 → "21+", default → "18+"); pure label helper + `renderToStaticMarkup`.
5. Register message keys (label pattern, aria text) in HANDOFF; no `messages/en.json` edits.

## Subagents
- `rosetta-light:engineer` — implement + tests; long-running.

## Notes
- Owns the card files; S17 may only change quick-add behaviour in `quick-add-overlay.tsx`/actions. If both need the same file, Cross-scope request.
- Label is purely presentational: no product-query filter, no `where`, no hiding (spec audit in `S§1`).
- Listing pages are cached and PPR-split; the shop age query must not add per-request Saleor calls beyond its cache profile (cost rules: `pnpm run cost:check` contracts under `src/lib/saleor/__contracts__`).
- Do not hardcode 18: always from the shop setting; if the shop query fails, fall back to a neutral label policy decided in handoff (no silent wrong number).
- `src/ui` must not import `gql` directly (ESLint `ui-no-gql`); get data through props from lib/template layers.

## Done when
- Changed-file `tsc`, ESLint, Prettier clean; TC-V-03..05 tests pass; `pnpm run cost:check` still passes.

## Checklist
- [ ] STD-ALL  [ ] STD-E
- [ ] Badge on PLP, search, PDP; none on unrestricted
- [ ] No filtering/hiding anywhere (guest path tested)
- [ ] Age comes from the shop setting
- [ ] Message keys registered
- [ ] Edge cases: N=1/120, missing shop data, `isAgeRestricted` undefined (older API)
