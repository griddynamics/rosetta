# Plan: Product "storage conditions" field (backend → dashboard → storefront)

## Context
Products need a free-text `storageConditions` field (e.g. "Keep refrigerated at 2–8 °C"). Staff set it on the product update page in the dashboard; customers see it in the product description section on the storefront PDP. Done = implemented end to end, tests added, everything passing locally.

## 1. Backend (`saleor/`, run via docker container `saleor-benchmark-saleor-1`)
- `saleor/product/models.py:~186`: add `storage_conditions = models.TextField(blank=True, default="")` to `Product`.
- New migration `saleor/product/migrations/0211_product_storage_conditions.py` (depends on `0210_collection_external_reference_unique_constraint`), generated with `makemigrations product -n product_storage_conditions`.
- `saleor/graphql/product/mutations/product/product_create.py:31` `ProductInput`: add `storage_conditions = graphene.String(description="Storage conditions of the product.")`. Create, update and bulk create inherit it via `construct_instance`.
- `saleor/graphql/product/types/products.py:~946` `Product` type: add the same field (no resolver needed).
- Regenerate `saleor/graphql/schema.graphql` (`python manage.py get_graphql_schema`).
- `CHANGELOG.md` (3.23.0 → GraphQL API): add bullet.
- Tests: extend `test_product_create.py`, `test_product_update.py` (query/input/assert pattern as `externalReference`), a bulk-create case, and a product query test under `graphql/product/tests/queries/`.
- Verify: `pytest --reuse-db <files> -n0`, `makemigrations --check --dry-run`, `ruff check` and `ruff format`.

## 2. Dashboard (`saleor-dashboard/`, pnpm)
- Copy the new schema to `schema-main.graphql` (and staging if applicable), then `pnpm run generate`.
- `src/fragments/products.ts:~222`: add `storageConditions` to the `Product` fragment.
- Form data: `ProductUpdatePage/types.ts` (`ProductUpdateFormData`), `products/utils/data.ts` (`getProductUpdatePageFormData`), `saveComposition.ts` (`PRODUCT_DETAILS_SAVE_FIELDS`), `views/ProductUpdate/handlers/utils.ts` (`getProductUpdateVariables`, send when changed, empty clears).
- UI: `ProductDetailsForm.tsx`: add a text `Input` (name `storageConditions`, error handling, intl message, data-test-id). Run `pnpm run extract-messages` for `locale/defaultMessages.json`.
- Tests: `src/products/fixtures.ts`, `handlers/utils.test.ts` (mirror the rating tests), `form.test.ts`, `useProductUpdateHandler.test.tsx` as needed.
- Changeset via `pnpm run change:add` (must be `patch`).
- Verify: `pnpm run check-types:src`, `pnpm jest src/products`, `pnpm run lint:eslint`, `pnpm run lint:prettier`.

## 3. Storefront (`react-storefront/`, pnpm)
- Add `storageConditions` to `src/graphql/extensions/ProductDetailsExtension.graphql` (fork-owned extension point). Run `pnpm run generate` against the updated running API (check `NEXT_PUBLIC_SALEOR_API_URL`; otherwise use a local schema file). Regenerate `data-layer.lock.md` with `pnpm data:lock` if needed.
- View model: add `storageConditions: string | null` to `ProductView` (`lib/storefront/contract/product.ts`), map in `mappers/product.ts` (`trim() || null`). Update the literal in `__contracts__/templates.contract.test.ts`.
- Render: `ui/components/pdp/product-attributes.tsx`: new `storageConditions` prop, shown in the description accordion under the description (plain text, React-escaped). Pass it from `products/[slug]/page.tsx:~213`.
- i18n: add `pdp.attributes.storageConditions` to all `messages/*.json` (de, en, fi, fr, ja, ko, nb, pl).
- Tests: extend `mappers/product.test.ts`.
- Verify: `pnpm run test:run`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run lint:graphql-variants`.

## Notes
- No translation (per-language) support for the field; out of scope.
- Dashboard create flow is minimal (name and type), so the field is on the update page only.
- No git commits (repo isn't git; the saleor CLAUDE.md says not to commit).
- Final check: manually query the live API (:8000) to confirm the field after migrating the DB.
