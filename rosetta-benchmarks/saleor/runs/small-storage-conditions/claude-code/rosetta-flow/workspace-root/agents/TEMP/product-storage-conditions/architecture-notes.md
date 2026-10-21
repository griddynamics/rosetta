# Architecture notes: Product "storage conditions"

Scope: an optional plain-text product field, max 250 chars, also translatable. Staff edit it in the dashboard. The storefront PDP shows it as a labelled block after the description, picking the translation when present and falling back to the base value. Approved decisions are not re-opened here.
The field must also appear in every webhook payload that serializes `Product` (including the legacy JSON payload) and in the product CSV export. It must **not** be filterable or searchable.
User decisions on the open questions: Q1 shared `TranslationInput`; Q2 the storefront `page.tsx` one-prop edit is approved; Q3 changed to the webhook + export scope above; Q4 the migration may be applied to the local Docker dev DB only.
Legend: **[V]** = verified in code/run, **[A]** = assumption or not executed.

---

## 1. Affected areas (exact paths)

### saleor (backend). Root `/Users/njakovljevic/saleor-benchmark/saleor`
| Area | File | Change |
|---|---|---|
| Model | `saleor/product/models.py` (`Product` l.179, `ProductTranslation` l.277, `get_translated_keys` l.~300) | add `storage_conditions` to both; add key to `get_translated_keys` |
| Migration | `saleor/product/migrations/0211_product_storage_conditions.py` (new; leaf is `0210_collection_external_reference_unique_constraint`) [V] | 2× `AddField` |
| Product type | `saleor/graphql/product/types/products.py` (`class Product` l.941) | `storage_conditions = graphene.String(...)` |
| Inputs | `saleor/graphql/product/mutations/product/product_create.py` (`ProductInput` l.31; `ProductCreateInput(ProductInput)` l.114; `ProductUpdate` uses `ProductInput`) | add input field once in `ProductInput` |
| Cleaner | `saleor/graphql/product/mutations/product/product_cleaner.py` | new `clean_storage_conditions(cleaned_input)` |
| Create/Update | `.../product/product_create.py` `clean_input` l.145; `.../product/product_update.py` `clean_input` l.65 | call cleaner |
| Bulk create | `saleor/graphql/product/bulk_mutations/product_bulk_create.py` (`ProductBulkCreateInput(ProductCreateInput)` l.117 inherits the field automatically; `clean_base_fields` l.238) | call cleaner |
| Translation types | `saleor/graphql/translations/types.py` (`ProductTranslation` l.409, `ProductTranslatableContent` l.444) | add field to both |
| Translation input | `saleor/graphql/translations/mutations/utils.py` (`TranslationInput` l.199, shared by product/category/collection) | add `storage_conditions` (see §3.2) |
| Category/Collection guard | `saleor/graphql/translations/mutations/category_translate.py`, `collection_translate.py` | reject or drop the product-only field |
| Bulk translate | `saleor/graphql/translations/mutations/product_bulk_translate.py` (`translation_fields = TranslationInput`) | none (inherits); validated against `ProductTranslation` model [V] |
| Legacy product webhook payload | `saleor/webhook/payloads.py` `PRODUCT_FIELDS` (l.666). This one tuple feeds `generate_product_payload` (l.715: PRODUCT_CREATED/UPDATED, and the PRODUCT_CREATED sample payload at l.1143) and `generate_product_deleted_payload` (l.759: PRODUCT_DELETED) [V] | append `"storage_conditions"` |
| CSV export enum | `saleor/graphql/csv/enums.py` `ProductFieldEnum` (l.35) | `STORAGE_CONDITIONS = "storage conditions"` |
| CSV export mapping | `saleor/csv/utils/__init__.py` `ProductExportFields.HEADERS_TO_FIELDS_MAPPING["fields"]` | `"storage conditions": "storage_conditions"` (plain column; no annotation needed in `csv/utils/products_data.py`) |
| Schema SDL | `saleor/graphql/schema.graphql` | regenerate |
| Changelog | `CHANGELOG.md` → `# 3.23.0` → `### GraphQL API` (field, inputs, enum value) and `### Webhooks` (legacy payload key) | 2 bullets |
| Desc. suffix | `saleor/graphql/core/descriptions.py` `ADDED_IN_323` (latest; collection `externalReference` uses it) [V] | reuse |

### saleor-dashboard. Root `/Users/njakovljevic/saleor-benchmark/saleor-dashboard`
| Area | File |
|---|---|
| Fragment (details) | `src/fragments/products.ts` (`fragment Product`, l.215; seo fields l.221-223) |
| Form types | `src/products/components/ProductUpdatePage/types.ts` (`ProductUpdateFormData` l.39) |
| Initial data | `src/products/utils/data.ts` (`getProductUpdatePageFormData`, l.190-220) |
| Dirty/save | `src/products/components/ProductUpdatePage/saveComposition.ts` (`PRODUCT_DETAILS_SAVE_FIELDS`). **Must add the field here, or Save stays disabled** |
| Render | `src/products/components/ProductDetailsForm/ProductDetailsForm.tsx` (+ `.stories.tsx`); wiring in `ProductUpdatePage.tsx` (~l.707) |
| Submit mapping | `src/products/views/ProductUpdate/handlers/utils.ts` (`getProductUpdateVariables`, l.31-104) |
| Translation fragment | `src/fragments/translations.ts` (`ProductTranslation on ProductTranslatableContent`, l.76-102: `product{}` + `translation{}`) |
| Translation mutation | `src/translations/mutations.ts` (`UpdateProductTranslations`, l.3-35, `$input: TranslationInput!`) |
| Translation field enum | `src/translations/types.ts` (`TranslationInputFieldName`, l.10) |
| Translation page | `src/translations/components/TranslationsProductsPage/TranslationsProductsPage.tsx` (sections built ~l.130-170 via `src/translations/translationSectionBuilders.ts`) |
| Completion | `src/translations/views/EntityLists/utils.ts` (`getProductTranslationCompletion`) |
| Hint messages | `src/translations/components/TranslationsDetailLayout/messages.ts` |
| Schema / generated | `schema-main.graphql` (`schema.graphql` is a symlink to it); `src/graphql/{types,hooks,typePolicies,fabbrica,fabbricaTypes}.generated.ts` |
| Fixtures | `src/products/fixtures.ts` (`product()` typed `ProductFragment`, seoTitle l.577) |
| i18n catalog | `locale/defaultMessages.json` |
| Export dialog | `src/products/components/ProductExportDialog/ProductExportDialogInfo.tsx` (product-info `FieldAccordion`, ~l.590: DESCRIPTION, NAME, PRODUCT_MEDIA, VARIANT_MEDIA); labels in `.../ProductExportDialog/messages.ts` (`useProductExportFieldMessages`, a map keyed by `ProductFieldEnum`); story `ProductExportDialogInfo.stories.tsx` |
| Changeset | `.changeset/<name>.md` (`"saleor-dashboard": patch` only) [V] |
| Create flow | No change. `ProductCreatePage/form.tsx` is now type-only, and the create dialog sends only name + type before redirecting to the update page [V] |

### react-storefront. Root `/Users/njakovljevic/saleor-benchmark/react-storefront`
| Area | File | Core-locked? |
|---|---|---|
| Query | `src/graphql/extensions/ProductDetailsExtension.graphql` (fork-owned; spread at `src/graphql/ProductDetails.graphql:115`) | no |
| Mapper | `src/config/storefront-view.ts` (`mapProductExtensions`) | no |
| Route (attributes slot) | `src/app/(storefront)/[locale]/[channel]/(main)/products/[slug]/page.tsx` (`productAttributesNode`, ~l.204) | no (but see §6 ADR) |
| UI | `src/ui/components/pdp/product-attributes.tsx` (`ProductAttributes` accordion; description item first) | no |
| i18n | `messages/{en,de,fi,fr,ja,ko,nb,pl}.json` → `pdp.attributes.storageConditions` (sibling of `careInstructions`, l.~66) | no |
| Do **not** touch | `src/lib/storefront/contract/product.ts`, `src/lib/storefront/mappers/product.ts`, `src/graphql/ProductDetails.graphql`: hashed in `paper-core.lock.json` / ADR 0006 [V] | yes |
| Translation helper | `src/lib/saleor-translations.ts` `pickTranslatedField` (reuse; no edit) | no |
| Generated | `src/gql/{graphql,gql,index}.ts` (gitignored `gql/`) [V] | — |

---

## 2. Solution options

| # | Option | Pros | Cons |
|---|---|---|---|
| **A** | **Real model column on Product + ProductTranslation; typed GraphQL field/inputs** | Typed and validated (250 enforced by DB and `full_clean`); first-class translation (`productTranslate`, bulk, translation webhooks); queryable without config; matches the approved "product-level field" decision | 3-repo change; migration; schema regen in two clients; dashboard dual-schema gating |
| B | PLAIN_TEXT product attribute `storage-conditions` assigned per product type | No backend code; dashboard edit and translation UI already exist; storefront already reads `assignedAttributes` | Not product-level (needs per-type assignment and data ops); no 250 limit without backend change; storefront would also list it under "Product Details" unless excluded, and the exclusion list is in the **core-locked** mapper; depends on a slug convention |
| C | Public metadata key `storageConditions` | Zero schema change | **Not translatable** (fails an approved decision); no validation; generic key/value UX; untyped |

**Chosen: A.** B breaks the product-level, 250-char and lock constraints. C breaks translatability. Confidence 0.9.

---

## 3. Design for option A

### 3.1 DB / migration
- `Product.storage_conditions = models.CharField(max_length=250, blank=True, null=True)`. Same on `ProductTranslation`. `CharField` gives `MaxLengthValidator` automatically.
- Migration `0211_product_storage_conditions`: two `AddField`, nullable, no default. On Postgres this is a metadata-only change: no rewrite, no backfill, safe for a rolling deploy. Reversible.
- `ProductTranslation.get_translated_keys()` adds `"storage_conditions"`. This feeds the legacy TRANSLATION_* webhook payload (`saleor/webhook/payloads.py:1192`).

### 3.2 GraphQL (all public read; descriptions end with `ADDED_IN_323`)
- `Product.storageConditions: String`. The default resolver via `ChannelContextType.resolver_with_context` is enough.
- `ProductInput.storageConditions: String` → inherited by `ProductCreateInput` and `ProductBulkCreateInput`; `productUpdate` uses `ProductInput`.
- `ProductTranslation.storageConditions: String` and `ProductTranslatableContent.storageConditions: String`.
- **`TranslationInput.storageConditions: String`** (shared input). The user approved this route (Q1).
  - Why not a new `ProductTranslationInput`: changing `productTranslate(input: TranslationInput!)` would be **breaking** for every client that declares `$input: TranslationInput!`. That includes the dashboard (`src/translations/mutations.ts:6`), the storefront `scripts/deploy-catalog-translations.mjs:188`, and the upstream-staging dashboard document [V].
  - Cost of the shared input: category and collection translate must handle the field.
    - Non-empty value → `ValidationError` on `storageConditions` with `TranslationErrorCode.INVALID`.
    - `null`/`""` → drop the key.
    - Without the guard, `validate_input_against_model(Category, …)` raises `TypeError` (HTTP 500) and `update_or_create(defaults=…)` raises `FieldError` [V, from code].
  - Input description: "Translated storage conditions. Products only."
- `productBulkTranslate.translationFields` inherits the field. Its validation runs `full_clean` on `ProductTranslation`, which enforces 250 [V].
- schema.graphql changes are additive only, so graphql-inspector reports nothing breaking.

### 3.3 Permissions
- Read: public, like `name`/`description`. The storefront reads it anonymously.
- Write: `MANAGE_PRODUCTS` (create/update/bulkCreate, already on those mutations); `MANAGE_TRANSLATIONS` (productTranslate, productBulkTranslate).
- No new permission.

### 3.4 Sanitization / validation
- New `product_cleaner.clean_storage_conditions(cleaned_input)`. It runs only when the key is present: `value = (value or "").strip() or None`. So blank or whitespace becomes `null`, and `null` clears the field.
- It is called in `ProductCreate.clean_input`, `ProductUpdate.clean_input` and `ProductBulkCreate.clean_base_fields`.
- Length: model `full_clean` in `clean_instance` / bulk `clean_instance` checks the value **after** strip. Django code `max_length` maps to `ProductErrorCode.INVALID` (`graphql/core/utils/error_codes.py:3-15`) [V], with field `storageConditions`.
- Translations: no strip, consistent with the other translation fields. Max 250 via `validate_input_against_model(Product, …)` (single) or the `ProductTranslation` model (bulk). A blank or whitespace translation counts as "no translation"; the storefront falls back.
- Plain text, no HTML sanitizer. Every consumer renders it as text: React escapes it on the storefront; the dashboard uses an input. **Never use `dangerouslySetInnerHTML`.**

### 3.5 Side systems: in or out of scope (user decision applied to Q3)
| System | Decision | Notes |
|---|---|---|
| Subscription webhooks (PRODUCT_CREATED/UPDATED/DELETED, PRODUCT_VARIANT_* `product{}`, TRANSLATION_*) | **in, automatic** | The payload is the app's GraphQL subscription and `Product.storageConditions` is a public field, so it is selectable with no code |
| Legacy PRODUCT_CREATED/UPDATED/DELETED JSON payload | **in** | See §3.5.1 |
| Legacy TRANSLATION_* payload (`get_translated_keys`) | **in** | Parity with name/description |
| Legacy variant, checkout and order payloads | n/a | They do not serialize `Product`: they carry only `product_id` (`payloads.py:823-858`) and line-level `product_name` (`webhook/serializers.py:65`) [V] |
| Product CSV export | **in** | See §3.5.2 |
| `productBulkCreate` | **in** | Inherits the input field, so it must be cleaned, persisted and tested |
| Import | n/a | Saleor has no product CSV import; `productBulkCreate` is the bulk-write path (covered) |
| Search vector / `search_document` (`product/search.py` `PRODUCT_SEARCH_FIELDS`) | **out (user)** | Do not add the field |
| Filters (`ProductWhereInput`, `ProductFilterInput`, `products(where:)`) | **out (user)** | Do not add the field |
| populatedb / sample data | out | Not required |

### 3.5.1 Legacy webhook payload
- `PRODUCT_FIELDS += ("storage_conditions",)`, appended **last**. `PayloadSerializer` emits a snake_case key with the raw value, so `null` when unset. This matches how `name`, `description` and `weight` appear.
- One change covers PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DELETED (`plugins/webhook/plugin.py:1838/1858/1904`) and the PRODUCT_CREATED sample payload (`webhookSamplePayload`) [V].
- PRODUCT_METADATA_UPDATED uses `generate_metadata_updated_payload` (id + meta only), so it is unaffected.
- No prefetch change: it is a plain column on `Product`.
- Tests that change. There are **no static snapshots**; existing tests compare against the generator output, so they stay green [V]:
  - `saleor/webhook/tests/test_webhook_payloads.py`: add `test_generate_product_payload_storage_conditions` (set → value; unset → `None`) next to `test_generate_product_payload_charge_taxes` (l.598). Add a deleted-payload assertion via `generate_product_deleted_payload`. Extend the product translation payload test (~l.1094) with `translation_keys["storage_conditions"]`.
  - Auto-consistent, no edit: `saleor/plugins/webhook/tests/test_webhook.py:682` (deleted) and `saleor/webhook/tests/test_webhook_sample_payloads.py:164` (sample).

### 3.5.2 Product CSV export
- **API:** add `ProductFieldEnum.STORAGE_CONDITIONS = "storage conditions"`. Insert it after `PRODUCT_MEDIA`, before the `VARIANT_*` values, to keep product-level fields grouped.
  - This is additive and input-only, so it is non-breaking.
  - No `ADDED_IN` suffix: the enum values have no descriptions.
- **Header:** `storage conditions`. The pattern is the enum value itself, lower-case with spaces, like `product weight` and `variant sku`; `get_product_export_fields_and_headers` writes the enum value as the file header [V].
- **Lookup:** `"storage conditions": "storage_conditions"` in `HEADERS_TO_FIELDS_MAPPING["fields"]`, placed after `"product weight"`.
- **Column order:** follows the order of `exportInfo.fields` sent by the client. `id` is always first, then the requested fields in order, then attribute, warehouse and channel headers [V]. The mapping position does not change file order.
- **Values:** one value per product, repeated on each variant row like `name` and `description` (rows are product×variant). `null` → empty cell (petl). Not stripped or escaped beyond what is stored.
  - CSV formula injection (a value starting with `=`) is a pre-existing risk shared with `name` and not addressed here.
- **Import / bulk:** no CSV import exists. `productBulkCreate` already accepts `storageConditions` (§3.2), so an export → bulk-create round trip works by field name.
- **Dashboard:**
  - Add `ProductFieldEnum.STORAGE_CONDITIONS` to the product-info `FieldAccordion` list in `ProductExportDialogInfo.tsx`, **only when `isMainSchema()`**. The staging schema lacks the enum value, so sending it would be rejected.
  - Add the label "Export Storage Conditions" to `messages.ts`.
  - Because "select all" toggles only the listed fields, gating the list is enough.
- **Tests that change [V]:**
  - `saleor/csv/tests/export/products_data/test_get_products_data.py::test_get_products_data` exports **every** mapped field (l.44-49), so its `expected_data` must add `"storage_conditions": product.storage_conditions`. Set a value on one product in the test.
  - `saleor/csv/tests/export/products_data/test_prepare_headers.py`: add a case asserting `storage conditions` → `storage_conditions`.
  - `saleor/csv/tests/export/test_export.py`: add an end-to-end case with `ProductFieldEnum.STORAGE_CONDITIONS.value` and check the header and cell.
  - `saleor/graphql/csv/tests/mutations` (exportProducts): optional enum acceptance case.
  - Dashboard `src/products/views/ProductList/export.test.ts`: unchanged; add a field-list or gating test if the list is extracted into a helper.

### 3.6 Dashboard
- **Dual schema [V]:** `src/graphql/lockSchema.test.ts` validates every document against both `schema-main.graphql` and `schema-staging.graphql` (upstream saleor main, which lacks the field).
  - Mark every selection `storageConditions @lockSchema(schema: "main")`, following the precedent at `src/fragments/attributes.ts:38`.
  - Gate rendering with `isMainSchema()` (`@dashboard/graphql/schemaVersion`).
  - **Do not** edit `schema-staging.graphql`, and do not run `fetch-schema:main`/`fetch-schema:staging`: they would overwrite the local-API schema.
- **Details form:**
  - `fragment Product` gets `storageConditions @lockSchema(schema: "main")`.
  - Add `storageConditions: string` to `ProductUpdateFormData`, with initial value `product.storageConditions ?? ""`.
  - Add the field to `PRODUCT_DETAILS_SAVE_FIELDS`.
  - `ProductDetailsForm`: widen the `data` type and render a macaw `Textarea` after the description when `isMainSchema()`.
    - `name="storageConditions"`, `maxLength={250}`, error state when length > 250.
    - Character counter copies the `SeoForm.tsx` pattern (constant + "({numberOfCharacters} of {maxCharacters} characters)").
    - Errors via `getFormErrors([... "storageConditions"])` and `getProductErrorMessage`.
    - Label "Storage conditions", helper e.g. "Shown to customers on the product page".
- **Submit:** `getProductUpdateVariables`: `if (data.storageConditions !== undefined) input.storageConditions = data.storageConditions || null;`. Key present means changed; empty means an explicit clear, same pattern as `rating`.
- **Create:** no UI change (dialog → update page) [V].
- **Translations:**
  - Add `TranslationInputFieldName.storageConditions = "storageConditions"`.
  - Fragment `ProductTranslation`: add `storageConditions @lockSchema(schema:"main")` in both `product{}` and `translation{}`. Do the same in the `UpdateProductTranslations` response selection. Leave the variable type `TranslationInput!` unchanged.
  - `TranslationsProductsPage`: when `isMainSchema()`, append a product-only field to the general section after description, type `TranslationFieldType.LONG`. Do not change the shared builder signature for category/collection; append in the product page or pass an option.
  - `getParsedTranslationInputData` already maps plain fields to `{[name]: string}` [V].
  - Completion: `getProductTranslationCompletion` counts the field when `isMainSchema()`. It is product-only, so do not touch `getGeneralEntityTranslationCompletion`, which category/collection share.
- **i18n:**
  - `intl.formatMessage` with ids filled by `pnpm run lint:eslint` (formatjs `enforce-id`).
  - Then `pnpm run extract-messages`, which updates `locale/defaultMessages.json`.
- **Changeset:** `.changeset/product-storage-conditions.md`, `patch`.

### 3.7 Storefront (ADR 0006 extension path; no core-locked files)
- **Query** (`ProductDetailsExtension.graphql`):
  ```graphql
  fragment ProductDetailsExtension on Product {
    __typename
    storageConditions
    translation(languageCode: $languageCode) { storageConditions }
  }
  ```
  - The fragment uses the `$languageCode` operation variable, which is valid because its only spread is in `ProductDetails` [V].
  - The `translation(...)` field merges with the core selection: same alias and args.
  - `data-layer.lock.md` is unaffected (same document and loader) [V].
- **Mapper** (`src/config/storefront-view.ts`):
  - `mapProductExtensions` returns `{ storageConditions }` where the value is `pickTranslatedField(product.translation, "storageConditions", product.storageConditions)?.trim() || null`.
  - Add a typed reader `getStorageConditions(extensions: Record<string, unknown>): string | null`, because `extensions` is `unknown`-typed.
  - The loader's `withTranslatedProductFields` keeps `translation` intact [V].
- **Route:** `page.tsx` passes `storageConditions={getStorageConditions(view.extensions)}` to `<ProductAttributes>`. This is a one-prop edit (see §6 ADR tension / Q2).
- **UI:** `ProductAttributes` gets a new optional prop `storageConditions?: string | null`.
  - It renders `<AccordionItemWithContext value="storage">` **immediately after** the description item, labelled `t("storageConditions")`.
  - The content is a plain text node.
  - It is hidden when the value is falsy.
  - Add `"storage"` to `defaultValue` so it is visible by default [A, UX choice]. Radix unmounts closed content.
  - Works in both `attributesPlacement` modes, because the whole slot moves together.
- **i18n (ADR 0002):** the label is functional chrome (developer-owned), so it goes in next-intl `pdp.attributes.storageConditions` in all 8 catalogs. Missing locales would fall back to en via `mergeMessagesWithDefault`, but keep parity.
  - Suggested strings: en "Storage Conditions", de "Lagerungshinweise", fr "Conservation", pl "Warunki przechowywania", fi "Säilytysohjeet", nb "Oppbevaring", ja "保存方法", ko "보관 방법".
- The value itself is Saleor catalog data with Saleor translation; it is not CMS copy. This is consistent with ADR 0002.

---

## 4. Cross-repo ordering and codegen

1. **saleor first.** Model → migration → GraphQL → cleaners/guard → `get_translated_keys` → tests → regenerate `saleor/graphql/schema.graphql` → CHANGELOG.
2. **Dashboard and storefront in parallel**, both from the step-1 SDL. They are independent of each other.

| Repo | Regenerate how | Generated or changed artefacts |
|---|---|---|
| saleor | `docker exec -w /app saleor-benchmark-saleor-1 sh -c "python manage.py makemigrations product -n product_storage_conditions"`; `... sh -c "python manage.py get_graphql_schema > saleor/graphql/schema.graphql"` (= `poe build-schema`) | `saleor/product/migrations/0211_product_storage_conditions.py`, `saleor/graphql/schema.graphql` |
| dashboard | Preferred: `API_URL=http://localhost:8000/graphql/ pnpm run fetch-local-schema` (writes through the `schema.graphql` → `schema-main.graphql` symlink; the API container runs `--reload` on the mounted repo [V]; introspection needs no migration). Fallback: hand-apply the new SDL lines to `schema-main.graphql`. Then `pnpm run generate:main` (**not** `generate`/`fetch-schema`) | `schema-main.graphql`, `src/graphql/types.generated.ts`, `hooks.generated.ts`, `typePolicies.generated.ts`, `fabbrica*.generated.ts` (if schema-derived), `locale/defaultMessages.json`. Staging files unchanged |
| storefront | `NEXT_PUBLIC_SALEOR_API_URL=/Users/njakovljevic/saleor-benchmark/saleor/saleor/graphql/schema.graphql pnpm run generate:all` (codegen accepts an SDL path; the file declares its directives [V]; there is no `.env` in the repo [V]) | `src/gql/*` and `src/checkout/graphql/generated/*` (both gitignored, local only) |

Notes:
- Baseline dashboard commit `78273c4` produced `schema-main.graphql` from the local API in introspection-print format. Keep that format to avoid a noisy diff.
- Introspection may be blocked if the dev shop has `allowStorefrontTraffic=false` (saleor ADR 0007). In that case use the fallback.
- The dashboard regen also changes the `ProductFieldEnum` TypeScript enum in `src/graphql/types.generated.ts` (new `STORAGE_CONDITIONS` member).
- **Runtime:** the user approved applying the migration to the **local Docker dev DB only**: `docker exec -w /app saleor-benchmark-saleor-1 python manage.py migrate product`. Do this after the migration file exists and before any manual or E2E check. Codegen and unit tests don't need it.

---

## 5. Tests and commands

### saleor (pytest in container `saleor-benchmark-saleor-1`, repo mounted at `/app`; Python 3.12, Django 5.2.18, ruff, mypy present [V]; no local venv or uv on host [V])
- Tests to add or extend:
  - `saleor/graphql/product/tests/mutations/test_product_create.py`: set and stripped; blank → null; 251 chars → `INVALID` on `storageConditions`.
  - `.../test_product_update.py`: set, clear (`null`/`""`), too long.
  - `.../test_product_bulk_create.py`: persisted; too long → per-row error.
  - `saleor/graphql/product/tests/queries/test_product_query.py`: anonymous read.
  - `saleor/graphql/translations/tests/mutations/test_product_translate.py`: translate, update, too long.
  - `.../test_product_bulk_translate.py`.
  - `.../test_category_translate.py` and `test_collection_translate.py`: non-empty rejected; null ignored.
  - `saleor/graphql/translations/tests/test_translations.py`: `translation.storageConditions`, `translatableContent.storageConditions`.
  - `saleor/webhook/tests/test_webhook_payloads.py`: legacy product created/updated/deleted payload key, plus the translation payload keys at ~l.1094 (§3.5.1).
  - CSV: `saleor/csv/tests/export/products_data/test_get_products_data.py` (**breaks until updated**), `test_prepare_headers.py`, `saleor/csv/tests/export/test_export.py` (§3.5.2).
- Commands:
  - `docker exec -w /app saleor-benchmark-saleor-1 python -m pytest --reuse-db <files>` (use `python -m pytest`: the `pytest` on PATH is pipx). Collection was verified [V]. The test DB is created on `db:5432` (container up [V]); not run here [A].
  - `docker exec -w /app saleor-benchmark-saleor-1 ruff check saleor && ruff format --check saleor`
  - `docker exec -w /app saleor-benchmark-saleor-1 mypy saleor` (slow) [A]
  - `docker exec -w /app saleor-benchmark-saleor-1 sh -c "python manage.py makemigrations --check --dry-run"` (pre-commit `migrations-check`)
  - `docker exec -w /app saleor-benchmark-saleor-1 sh -c "python manage.py get_graphql_schema | diff saleor/graphql/schema.graphql -"` (pre-commit `gql-schema-check`)

### saleor-dashboard (jest, swc, jsdom; node 24 / pnpm 11.13.1 present; jest/tsc/eslint in `node_modules/.bin` [V])
- Tests:
  - `src/products/views/ProductUpdate/handlers/utils.test.ts` (`getProductUpdateVariables`, l.303+): set, clear → null, untouched → absent.
  - `src/products/components/ProductUpdatePage/form.test.ts`: change → submit payload; Save enabled.
  - `saveComposition.test.ts`.
  - `src/translations/utils.test.ts`.
  - `src/translations/views/EntityLists/utils.test.ts` (completion).
  - `src/graphql/lockSchema.test.ts` (must stay green).
  - Optionally `useProductUpdateHandler.test.tsx` (typed `ProductUpdateSubmitData` literal) and `src/products/fixtures.ts` parity.
  - Export: a new test of the export field-list gating (main includes `STORAGE_CONDITIONS`, staging excludes it), after extracting the list into a small helper next to `ProductExportDialogInfo.tsx`. Label present in `messages.ts`.
- Commands:
  - `pnpm exec jest <paths>`; full suite: `pnpm test`.
  - `pnpm run check-types:src` (`tsc --noEmit && tsc-strict`).
  - `pnpm run lint:eslint` (**writes**: `--fix`).
  - `pnpm exec prettier --check <changed files>`.
  - `pnpm run lint:changesets`.
  - `pnpm run extract-messages`.

### react-storefront (vitest, node env, `*.test.ts` only; no testing-library or jsdom, and adding them is not allowed [V])
- Tests:
  - New `src/config/storefront-view.test.ts`: base only; translation wins; whitespace translation → base; both blank → null; reader typing.
  - New `src/ui/components/pdp/product-attributes.test.ts`: `renderToStaticMarkup` + `createElement`, following the precedent in `src/lib/storefront/__contracts__/templates.contract.test.ts` [V]. Wrap in `NextIntlClientProvider` with en messages. Assert the block renders after the description, is hidden when null, and escapes text.
  - Optional: assert `extensions` in `src/lib/storefront/mappers/product.test.ts` (test files are excluded from the core hash [V]).
- Commands:
  - `NEXT_PUBLIC_SALEOR_API_URL=<abs SDL path> pnpm run typecheck` (prehook runs codegen).
  - `pnpm exec vitest run <files>` / `pnpm run test:run`.
  - `pnpm run lint`, `pnpm run lint:design-tokens`, `pnpm run data:lock:check` (green at baseline [V]).
- **Baseline red [V]:**
  - `core:lock:check` already fails: `src/lib/{saleor,storefront}/AGENTS.md` were removed.
  - `docs:check` fails: there is no `skills/` dir.
  - Hence `pnpm run verify` is red before any change. Run the gates individually, and confirm the change adds **no new** core drift.
- E2E (`pnpm test:e2e`) needs a running app and API. Not part of the unit gate [A].

---

## 6. Risks, ADR notes, open questions

**Risks**
- R1, shared `TranslationInput`: the field is visible but meaningless on category/collection translate. Mitigated by the explicit guard and tests. The alternative is a breaking change (Q1).
- R2, dashboard dual schema: if any selection misses `@lockSchema(schema:"main")`, `lockSchema.test.ts` fails, or staging builds send an unknown field. Gate the UI with `isMainSchema()`.
- R3, storefront cache: PDP invalidation listens to `product_updated` but **not** TRANSLATION_* events (`src/lib/saleor/invalidation/webhook-events.ts`) [V]. Translated values refresh on the catalog TTL. Name and description translations already behave this way; out of scope.
- R4, runtime: until the migration is applied to the dev DB, product queries selecting the column fail. Codegen and unit tests are unaffected.
- R5, dashboard schema regen could pull unrelated drift if the running API differs from `schema-main.graphql`. Review the diff; fall back to a hand-applied SDL.
- R6, the legacy PRODUCT_* payload gains a new `storage_conditions` key. This is additive, but receivers that validate payloads strictly (closed schemas) could reject it. Call it out in the CHANGELOG `### Webhooks` section.
- R7, dashboard export on staging builds: `STORAGE_CONDITIONS` is missing from `schema-staging.graphql`, so the export dialog must gate it with `isMainSchema()`. `@lockSchema` cannot strip enum values from variables.
- R8, `test_get_products_data` iterates every mapped export field, so it fails until `expected_data` is updated. This is expected, not a regression.
- R9, CSV formula injection for free text is pre-existing (shared with `name`) and not addressed.

**ADR check**
- saleor `docs/adr/0001-0010`: none touch product, translation or schema design. No conflict. ADR 0007 only affects anonymous introspection used for codegen (handled in §4).
- dashboard `docs/adr/0001` (nav pins), `CONTEXT.md`: no conflict.
- storefront ADR 0002: label → `messages/*.json`; the value is Saleor catalog data. Consistent.
- storefront ADR 0005: same `cachedQuery` document. Consistent.
- storefront ADR 0007: listing is unaffected.
- **Storefront ADR 0006 tension:** the fork-field path (extension fragment + `mapProductExtensions`) is followed, and core-locked contract/mapper files stay untouched. But "immediately after description" requires a one-prop edit to the product route `page.tsx`, which `src/config/storefront-view.ts` says not to edit. A template-only render (`src/templates/pdp/product-layout.tsx`) would place the block after the whole accordion, after Shipping & Returns, which misses the approved placement. → Resolved: the user approved the route edit (Q2).

**Decisions (user, closed)**
- Q1: shared `TranslationInput` + category/collection guard.
- Q2: storefront `page.tsx` one-prop edit approved. The ADR 0006 tension is accepted.
- Q3: field included in all `Product`-serializing webhook payloads (legacy JSON included) and in the product CSV export; no filter, no search.
- Q4: migrate the local Docker dev DB only.

**Remaining open questions:** none blocking.

**Assumptions (no question needed):**
- The storefront block is an accordion item that is open by default.
- "Payloads that serialize Product" means the PRODUCT_CREATED/UPDATED/DELETED payloads plus subscription types. Variant, checkout and order payloads only reference products (`product_id`, `product_name`) and are not extended.

Overall confidence: 0.86. Weakest links: dashboard lockSchema and staging gating (fields and export enum). Backend and storefront test commands were not executed end to end.
