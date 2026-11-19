# PRODUCT-STORAGE-CONDITIONS — Tech Specs (Approved by user, size MEDIUM)

<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

## 1. TLDR
- New optional plain-text `storage_conditions` (≤250, "" allowed) on `Product` + `ProductTranslation`.
- Core: model+migration, GraphQL read/create/update/translate, schema rebuild.
- Dashboard: input on product create+update pages; field on product translations page.
- Storefront: PDP shows labeled line under description; translated value w/ fallback to base; hidden when empty.
- Also in scope: product webhook payloads (legacy `PRODUCT_FIELDS`; subscription payloads follow the type) and product CSV export. Not needed: filter, search, CSV import.
- Out of scope: cart/checkout/emails, search index/filters, e2e, new webhook events, rich text.
- Gates: unit/API tests + lint + typecheck + codegen in 3 repos; manual check on local stack.
- Status: Approved (tech specs). Plan awaiting approval; no code before it.

## 2. Scope & NFR
- Backward compat: additive only; no breaking schema change (GraphQL Inspector OK). Field nullable-safe for old clients (`String!`, default "").
- Migration: add column w/ default "" → no table rewrite lock concern on PG15 (constant default = metadata-only).
- Perf: no new query/N+1; field is a column on already-loaded row. Translation via existing translation dataloader.
- Security: stored as submitted (no stripping/sanitizing, so text like `Store < 8 °C` is kept intact); never treated as HTML; escaped on render. Permission: write needs `MANAGE_PRODUCTS` (existing mutations); read public (as `description`).

## 3. Architecture
Staff → dashboard `productCreate/productUpdate(input.storageConditions)` → core `Product.storage_conditions`.
Staff → dashboard `productTranslate(input.storageConditions)` → `ProductTranslation.storage_conditions`.
Shopper → storefront PDP query `product{storageConditions translation(languageCode){storageConditions}}` → mapper → PDP component.
No new components/services. Cache: storefront existing product cache tags + revalidate webhook (`PRODUCT_UPDATED`); no change.

## 4. API contracts (additive)
```graphql
type Product { storageConditions: String }               # nullable String, mirrors seoTitle
input ProductCreateInput { storageConditions: String }
input ProductInput        { storageConditions: String }   # update
type ProductTranslation { storageConditions: String }
input TranslationInput { storageConditions: String }   # SHARED input (no type rename → productTranslate/productBulkTranslate non-breaking)
type ProductTranslatableContent { storageConditions: String }  # via translatable fields
```
Decision: GraphQL type `String` (nullable) like `seoTitle`; DB column `CharField(250, blank=True, default="")`; resolver returns "" → null not needed. Translation column `CharField(250, blank=True, null=True)` like `name` (null = not translated → storefront falls back).
Bulk: `productBulkCreate` / `productBulkTranslate` accept the field (add to `translation_fields`, bulk create input inherits).
Shared-input side effect: `categoryTranslate`, `collectionTranslate` use the same `TranslationInput` → they must return `INVALID` (field `storageConditions`) if it is set, never write it (their models lack the column). Field description: "Product only."
Webhooks: add `storage_conditions` to `PRODUCT_FIELDS` (`saleor/webhook/payloads.py`); subscription payloads expose it via the `Product` type.
CSV export: new header `storage conditions` → `storage_conditions` in `ProductExportFields.HEADERS_TO_FIELDS_MAPPING["fields"]` (`saleor/csv/utils/__init__.py`), selectable in export info. Import not changed.
Errors: >250 chars → `GraphQLError code=INVALID`, field=`storageConditions`.

## 5. Data model
| Model | Field | Migration |
|---|---|---|
| `product.Product` | `storage_conditions = CharField(max_length=250, blank=True, default="")` | `0211_product_storage_conditions` |
| `product.ProductTranslation` | `storage_conditions = CharField(max_length=250, blank=True, null=True)` | same migration |
Flags: none. Reverse migration = drop column (reversible, no data backfill).

## 6. Error handling & validation
- Core: only `max_length` (250) validated in clean (create/update/translate/bulk) → INVALID error. No HTML stripping, no trimming at write; value stored as submitted.
- Category/collection translate: reject non-null `storageConditions` → INVALID.
- Dashboard: `maxLength=250` + counter; server errors shown via existing `getProductErrorMessage`/form error mapping.
- Storefront: trims for display; missing/blank → render nothing.

## 7. Component design (files; signatures only)
**saleor** (`saleor/`)
- `saleor/product/models.py`: fields above. `saleor/product/migrations/0211_*.py`.
- `saleor/graphql/product/types/products.py` (`Product`), `.../mutations/product/product_create.py` (`ProductInput`), `product_cleaner.py` (validation), `bulk_mutations/product_bulk_create.py`; `saleor/webhook/payloads.py`; `saleor/csv/utils/__init__.py` (+ `products_data.py`/`product_headers.py` if header lists need it); `translations/mutations/{utils.py (TranslationInput), category_translate.py, collection_translate.py}`.
- `saleor/graphql/translations/types.py` (`ProductTranslation`, `ProductTranslatableContent`, `ProductTranslationInput`), `mutations/product_translate.py`, `mutations/product_bulk_translate.py` (`translation_fields`).
- `saleor/graphql/schema.graphql` regenerated (`uv run poe build-schema`); CHANGELOG entry.
**saleor-dashboard**
- schema refresh: `fetch-local-schema` (local API) → `pnpm run generate`; `@lockSchema` not needed (field in local 3.23.x build only → see Assumption A1).
- `src/products/fragments`/queries: add `storageConditions` to product details fragment.
- `ProductCreatePage/form.tsx`, `ProductUpdatePage/{types.ts,ProductUpdatePage.tsx,form}`, `src/products/utils/data.ts` (`getProductUpdatePageFormData`), `views/ProductUpdate/handlers/utils.ts` (`getProductInput`/update payload), `ProductDetailsForm` (new `TextField` "Storage conditions").
- Translations: `src/translations/queries.ts`, `mutations.ts`, `components/TranslationsProductsPage` (+ form payload), `fragments/translations.ts`.
- `.changeset/*.md` (patch/minor).
**react-storefront**
- `src/graphql/ProductDetails.graphql`: add `storageConditions` + `translation{storageConditions}`; `pnpm generate:all`.
- `lib/storefront/contract/product.ts`: `storageConditions: string | null`.
- `lib/storefront/mappers/product.ts`: `storageConditions = translation?.storageConditions?.trim() || product.storageConditions?.trim() || null`.
- `ui/components/pdp/product-storage-conditions.tsx` (new): `({ value }: { value: string | null }) => JSX | null`; label via i18n message key (all supported locales; see A3).
- `products/[slug]/page.tsx`: render under description. Only this page.

## 8. Testing strategy
**core (pytest)**: model default ""; create w/ value / w/o / 250 ok / 251 INVALID / whitespace; update set+clear; permission denied w/o MANAGE_PRODUCTS; query public product returns value; translate create/update/clear + `translation(languageCode)` + translatable content; bulk create & bulk translate carry field; category/collection translate reject field; webhook payload includes `storage_conditions`; CSV export header + value; `<`-containing text round-trips unchanged; migration test (make migrations --check clean); snapshot of `schema.graphql` check (`gql-schema-check`).
**dashboard (Jest)**: form data mapper (value/empty); create payload; update payload only when changed; 251-char blocked; translations page payload + display; existing tests untouched/passing; `pnpm lint`, `tsc`, `generate` clean.
**storefront (Vitest)**: mapper — translation wins, base fallback, blank→null, trimmed; component — renders label+value, null→nothing, escapes `<script>`; `pnpm lint`, `typecheck`, `generate:all` clean.
Test data: happy `"Keep refrigerated at 2–8 °C"`, `"Store in a cool, dry place"`; edge `""`, 250/251 chars, whitespace-only, unicode `°C –`, `"Store < 8 °C"` (must stay intact); error 251 chars; security `"<img src=x onerror=alert(1)>"` stored as-is and rendered escaped.
**Manual (local stack)**: set value in dashboard (create+update), set a PL translation, open PDP in default and PL locale, clear value → block disappears; confirm cart/checkout unchanged.

## 9. Security
Injection/XSS: plain text, escaped on render, no `dangerouslySetInnerHTML`. AuthZ unchanged (MANAGE_PRODUCTS / MANAGE_TRANSLATIONS for translate). No PII. STRIDE: Tampering → permission-gated mutations; Info disclosure → intentionally public like `description`.

## 10. Dependencies & order
core (model→mutations→translations→schema) → dashboard (schema refresh→codegen→UI) → storefront (codegen vs running API→UI). Core must run locally with migration applied before client codegen. No new libs.

## 11. Assumptions (verify at implementation)
- A1 (approved by user): refresh dashboard schema via `fetch-local-schema`; modifying tracked `schema-main.graphql` is OK.
- A2: translate mutation handles new fields generically via the input type; confirm in `product_translate.py`.
- A3: storefront i18n catalog location/locales for label; confirm during implementation.
- A4 (restart approved by user): local API restart to apply migration; start command to be discovered first (WA-06).
- A5 (confirmed by user): category/collection translate reject the field with INVALID.

## 12. Tech summary — affected
saleor: ~14 files + migration + tests + schema.graphql + CHANGELOG. dashboard: ~12 files + generated + tests + changeset + schema. storefront: ~6 files + new component + tests + generated.

## 13. Implementation deviations (recorded 2026-10-21)
- Dashboard: product creation is the `CreateProductDialog` on the product list (`/products/add` redirects to it; user-confirmed it must carry the field). Field added to the dialog (sent only when non-blank), the update page and the translations page. `ProductCreatePage/form.tsx` is an unused legacy hook, not touched.
- Dashboard schema: `schema-main.graphql` patched with the core diff (not `fetch-local-schema`, which rewrites @doc printing); verified per-type against core schema. Selections carry `@lockSchema(schema: "main")`; UI gated by `isMainSchema()`.
- Storefront: implemented through the fork extension path (`ProductDetailsExtension.graphql`, `mapProductExtensions`), not the Paper-owned mapper/contract; label as prop of `ProductAttributes`.
- Core: bulk create length error code is `MAX_LENGTH` (bulk error enum), single mutations `INVALID`; bulk translate error codes normalised via `get_error_code_from_error`.
</CRITICAL>
