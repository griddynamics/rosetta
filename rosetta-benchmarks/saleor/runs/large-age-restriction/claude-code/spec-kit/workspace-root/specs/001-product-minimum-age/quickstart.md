# Quickstart: Validating Product Minimum Age

Repositories are side by side in the workspace.

## Backend (`saleor/`)
1. Apply migrations: `python manage.py migrate`
2. Regenerate schema: `npm run build-schema` (or the repo's existing schema-build command)
3. Run tests: `pytest saleor/product saleor/account saleor/checkout saleor/graphql/product saleor/graphql/account saleor/graphql/checkout -k "age or birthday or minimum"` then the full affected suites
4. Lint/type-check with the repo's configured tools (ruff, mypy).

## Dashboard (`saleor-dashboard/`)
1. Point codegen at the updated backend schema and run the existing generate script.
2. `npm run test` for the touched components; `npm run lint` and `npx tsc --noEmit`.

## Storefront (`react-storefront/`)
1. Run the existing codegen script, then `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`.

## Manual end-to-end scenarios (see spec.md)
- Staff set minimum age 18 on a product (dashboard) and see it persisted.
- Set a customer's birthday in dashboard and storefront profile; future date is rejected.
- Add restricted product to cart/checkout as: 17-year-old (blocked), 18-year-old today (allowed), no birthday (blocked, asks for birthday), guest (blocked); unrestricted product unaffected.
