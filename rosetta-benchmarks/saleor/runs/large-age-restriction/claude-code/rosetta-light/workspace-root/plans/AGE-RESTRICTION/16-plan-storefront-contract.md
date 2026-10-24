# 16 — Storefront contract: GraphQL documents, codegen, locks (Phase E)
Depends on: 07, G2. Parallel with 12 and core tests 08–11. Spec: `S§12` Storefront bullets 1–3 and the Account `.graphql` items; PLAN SC-3.

## Do
1. Add selections through the fork extension points, not the base documents: `isAgeRestricted` in `src/graphql/extensions/ProductListItemExtension.graphql` and `ProductDetailsExtension.graphql` (+ map it in `mapProductExtensions`, `src/config/storefront-view.ts`, and the card-side extension mapping once located); new `src/graphql/ShopAgeRestriction.graphql` (`shop { ageRestrictionMinimumAge }`) registered via `src/config/data-extensions.ts` with a short cache profile and tags; `CheckoutAddLine.graphql` and `CheckoutLinesUpdate.graphql` error selections (+`field code`); `CurrentUserProfile.graphql` (+`birthday isAgeEligible`, not in shared `UserDetailsFragment.graphql`); `AccountUpdate.graphql` input typing if needed. Check `src/checkout/graphql/*` documents for `checkoutComplete`/transaction error selections (own codegen) and add `code` where missing.
2. `NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8001/graphql/ pnpm run generate:all`.
3. Locks: `pnpm run data:lock` (new operation rows), then `pnpm run data:lock:check` and `pnpm run core:lock:check`. If a hashed core file must change (SC-3 fallback: `src/lib/listing/*`, `src/lib/storefront/contract/*`, `to-card.ts`), run `pnpm run core:lock`, add the file + reason to `paper-version.json` `coreOverrides`, log a Deviation.
4. Publish the data contract for 17–19 in `16-handoff.md`: generated document names, where `isAgeRestricted` surfaces on card data and PDP `ProductView.extensions`, how the shop age is read.

## Subagents
- `rosetta-light:engineer` — documents + codegen + locks; long-running.
- `rosetta-light:executor` — codegen/lock/typecheck runs; short-term.

## Notes
- Sole editor of every `.graphql` and of generated dirs (git-ignored `src/gql/`, `src/checkout/graphql/generated/`). 17–19 file Cross-scope requests for document changes.
- Product listing/PDP data is cached (cache tags, `cacheLife` tiers) and revalidated by webhooks; `isAgeRestricted` is public data, safe to cache; `birthday`/`isAgeEligible` are `me` data and must stay uncached (session queries only, `S§11` last bullet). `shop.ageRestrictionMinimumAge` has no webhook: choose a short profile and note the staleness window in handoff.
- Listing/PDP flow is: GraphQL → `src/lib/listing/providers/saleor/to-card.ts` / `toProductView` → UI; ESLint `paper/*` rules forbid UI importing `gql` directly (`ui-no-gql`) and require data access via the kernel. Use existing patterns; don't add direct fetches.
- `no Product.variants` rule: `pnpm run lint:graphql-variants` must stay green.
- ESLint reads the remote schema: all lint/typecheck runs need the API URL env.

## Done when
- `generate:all` clean against :8001; `data:lock:check` + `core:lock:check` green; `pnpm exec tsc --noEmit` passes with new types (UI not yet using them); contract note written.

## Checklist
- [ ] STD-ALL  [ ] STD-E
- [ ] Extension points used (or SC-3 fallback logged with `coreOverrides`)
- [ ] `me` documents selected only in uncached session queries
- [ ] New `shop` query registered with explicit cache profile
- [ ] Locks regenerated and checked
- [ ] Contract note for 17–19
