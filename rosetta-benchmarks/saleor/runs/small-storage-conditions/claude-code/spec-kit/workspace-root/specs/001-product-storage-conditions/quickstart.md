# Quickstart: validating Product Storage Conditions

## Prerequisites
- Backend env set up (`uv sync`, Postgres available for pytest); `pnpm install` done in `saleor-dashboard` and `react-storefront`.
- Backend running locally with the migration applied (`python manage.py migrate`).

## Automated checks (all must pass)
```bash
# backend (saleor/)
pytest saleor/graphql/product/tests/mutations/test_product_create.py saleor/graphql/product/tests/mutations/test_product_update.py -k storage_conditions
pytest saleor/graphql/product/tests -q          # regression
ruff check . && ruff format --check .
python manage.py makemigrations --check --dry-run
python manage.py get_graphql_schema | diff - saleor/graphql/schema.graphql

# dashboard (saleor-dashboard/)
pnpm generate && pnpm check-types && pnpm lint && pnpm test

# storefront (react-storefront/)
pnpm generate && pnpm typecheck && pnpm lint && pnpm test:run
```

## Manual end-to-end scenario
1. Dashboard → open a product → enter "Keep refrigerated at 2–8 °C" in Storage conditions → Save → reload: value persists (US1-1).
2. Storefront PDP of that product: description section shows a "Storage conditions" label with the text (US2-1).
3. Edit text in dashboard → reload storefront: updated text (US2-3).
4. Clear the field → Save: storefront shows no label or empty block (US1-3, US2-2).
5. Enter `<b>5 & 8</b>` → stored and shown literally, not as bold (edge case).
6. Enter 251 characters → dashboard shows the validation error, nothing saved.
7. Open a pre-existing product: unchanged, no label.

Contract details: [contracts/graphql.md](contracts/graphql.md); data rules: [data-model.md](data-model.md).
