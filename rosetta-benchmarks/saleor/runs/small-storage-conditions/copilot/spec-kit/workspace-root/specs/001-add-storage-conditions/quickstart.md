# Quickstart: Add Storage Conditions Validation

## Prerequisites

- Local Saleor API, dashboard, and storefront environments configured against the same Saleor instance.
- A staff account with `MANAGE_PRODUCTS`.
- A published product and a configured non-default language.
- Dependencies already installed in each repository; no dependency changes are needed.

## Validation scenarios

1. In the dashboard product details screen, enter a plain-text storage-conditions value shorter than 250 characters and save. Reopen the product and confirm it is retained.
2. Enter 251 characters and confirm the dashboard communicates the limit and the API rejects the save through the normal product error flow.
3. Submit a value containing a line break and confirm the persisted and returned value contains no preserved line break.
4. On the dashboard product translations page, add a non-empty translated value and save. Select the corresponding storefront locale and confirm the PDP shows that translation in a labeled block immediately after the description.
5. Clear the translation and confirm the same locale falls back to the base value. Clear the base value and confirm the PDP omits the block entirely.
6. Confirm the value is returned by a public product query, available in product webhook payloads and the product CSV export, unavailable to a user lacking `MANAGE_PRODUCTS` for base or translated-value mutations, and absent from cart, checkout, and order-email surfaces.
7. Submit `storageConditions` to a non-product translation mutation using the shared translation input. Confirm it returns an `INVALID` error at that field and does not persist data. Confirm product filtering and search return the same results as before.

## Targeted automated checks

Run these after adding or updating the matching tests:

```sh
cd /Users/rcimendur/saleor-benchmark/saleor
uv run pytest saleor/graphql/product/tests saleor/graphql/translations/tests

cd /Users/rcimendur/saleor-benchmark/saleor-dashboard
pnpm exec jest src/products src/translations
pnpm run check-types:src

cd /Users/rcimendur/saleor-benchmark/react-storefront
pnpm exec vitest run src/lib/storefront src/lib/catalog src/ui/components/pdp
pnpm run typecheck
pnpm run lint
```

Run the relevant format/lint command in `saleor` after the targeted tests, and regenerate GraphQL artifacts in both TypeScript repositories before their type checks.
