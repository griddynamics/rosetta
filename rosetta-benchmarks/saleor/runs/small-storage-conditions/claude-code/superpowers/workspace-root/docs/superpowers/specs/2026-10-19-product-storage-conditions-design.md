# Product "storage conditions" field — design

## Goal
Products get an optional "storage conditions" text (e.g. "Keep refrigerated at 2–8 °C").
Staff set it on a product in the dashboard; customers see it in the product description on the storefront.
The field is translatable like product `name`/`description`; the storefront shows the translation when one exists.

Done = implemented end to end across `saleor`, `saleor-dashboard`, `react-storefront`, with tests, and all relevant tests/linters passing locally. Per repo rules: follow existing patterns, no new dependencies, no commits or pushes (changes stay in the working tree).

## Decisions
- Optional short plain text, product level (not variant). `CharField(max_length=250)`, nullable/blank, like `name`.
- Translatable via `ProductTranslation.storage_conditions`.
- Approach: first-class field on `Product` and `ProductTranslation` (not metadata/attributes).

## Backend (`saleor`)
- `Product.storage_conditions` and `ProductTranslation.storage_conditions`; migration `0211`; add to `ProductTranslation.get_translated_keys`.
- GraphQL: `Product.storageConditions`, `ProductTranslation.storageConditions`, `ProductInput` (create/update), translation inputs (`productTranslate`, `productBulkTranslate`). Translated read through `translation(languageCode:)` as for `name`.
- Regenerate `schema.graphql`; add CHANGELOG entry if the repo convention requires it.
- Tests: model/translated keys, create/update mutations, translate and bulk-translate mutations, type resolution.

## Dashboard (`saleor-dashboard`)
- Regenerate schema/types (`generate:main`).
- `ProductDetailsForm`: "Storage conditions" text input under description; wired into form data, create/update payloads, product fragment/query, error display.
- `TranslationsProductsPage`: short-text row next to name; translation query/fragment and `productTranslate` payload.
- Tests: form payload, translation payload, `ProductDetailsForm` render/change.

## Storefront (`react-storefront`)
- `ProductDetails.graphql`: `storageConditions` at top level and inside `translation(languageCode:)`; run `generate`.
- Resolve translation-first, fall back to base, hide when both empty (same pattern as name/description).
- Render a labelled "Storage conditions" block under the description only when a value exists; new i18n message added to all locale files.
- Tests: resolution (translated / fallback / empty), component render/hide; check existing e2e specs for impact.

## Verification
- Backend: apply migration, pytest for product/translations/schema subsets, ruff.
- Dashboard: Jest, `tsc`, eslint.
- Storefront: unit tests, `tsc`, lint.
