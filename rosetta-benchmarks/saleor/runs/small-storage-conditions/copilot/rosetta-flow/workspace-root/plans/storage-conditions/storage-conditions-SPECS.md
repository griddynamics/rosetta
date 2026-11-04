# Storage conditions: tech specs (target state)

Status: draft for approval · Size: MEDIUM · Companions: `storage-conditions-PLAN.md` (how), `HANDOFF.md` (status)
Design basis: `agents/TEMP/storage-conditions/architecture-notes.md` (Option A, selected) plus user decisions UD1–UD4 (§1).

## TLDR
- New optional plain-text product field `storageConditions`: at most 250 characters, blank clears it to null, translatable like name and description.
- Saleor: `Product.storage_conditions` and `ProductTranslation.storage_conditions` in one migration.
  - Read on `Product`, `ProductTranslation` and `ProductTranslatableContent`.
  - Written through `ProductInput` (create, update, bulk create) and the shared `TranslationInput` (product translate and bulk translate only).
- Dashboard (main 3.23 only): a Textarea in the product's General information card and a field on the product translation page. Read selections carry `@lockSchema(schema: "main")`.
- Storefront: comes in through the fork extension seam and renders inside the PDP "Description" accordion, after the description HTML. The translation wins when present, otherwise the base value. The section shows even when only storage conditions exist.
- Unchanged: the canonical `description`, `description_plaintext`, search, and SEO/JSON-LD. When the field is unset, every surface looks exactly as it does today.

## 1. Scope, decisions, non-goals
- UD1: translatable exactly like name and description. The storefront renders the translation when present. The dashboard translation page supports it.
- UD2: the dashboard targets `schema-main.graphql` (3.23) only. `@lockSchema(schema: "main")` goes on read selections only. The staging schema and staging build are out of scope (no UI gating).
- UD3: plain text, optional, at most 250 characters; blank clears it.
- UD4: the Description section is rendered when storage conditions exist without a description.
- AD1 (architect, needs confirmation at G0): translations are written through a new optional field on the shared `TranslationInput`, which is non-breaking. The other mutations using that input reject the field. Rationale in §4.3.
- Non-goals: rich text, search indexing, CSV export/import, the legacy webhook `PRODUCT_FIELDS`, the staging schema, storefront listings/cart/checkout, JSON-LD/SEO.

## 2. Non-functional and architecture-significant requirements
- Backward compatible: only a new DB column and new optional GraphQL fields. No existing argument or input type is renamed or retyped, so GraphQL Inspector stays clean and no `approved-breaking-change` label is needed.
- Migration is safe with old code: nullable `AddField`, no backfill, no index.
- Performance: a scalar column on rows that are already loaded. No extra SQL per product or translation resolve. Query cost unchanged (unmapped scalar, cost 0).
- Security: text shown to customers is rendered as escaped text only.
- Storefront: no new data-layer call, no change to core-locked files, no new dependency.

## 3. Architecture
```
Staff ─dashboard─► productUpdate(input.storageConditions) ─► Product.storage_conditions
Translator ─dashboard─► productTranslate(input.storageConditions) ─► ProductTranslation.storage_conditions
Shopper ─storefront PDP─► product{storageConditions translation(lang){storageConditions}}
        └► mapProductExtensions → view.extensions.storageConditions → ProductAttributes(Description item)
```
Roles: saleor owns the data and validation; the dashboard is the staff editor; the storefront only reads and renders.

## 4. Contracts

### 4.1 Data model (saleor)
| Model | Field | Type |
|---|---|---|
| `product.Product` | `storage_conditions` | `CharField(max_length=250, blank=True, null=True)` |
| `product.ProductTranslation` | `storage_conditions` | `CharField(max_length=250, blank=True, null=True)` |
- One migration `product/migrations/0211_*`, depending on `0210_collection_external_reference_unique_constraint`, with 2× `AddField`.
- `ProductTranslation.get_translated_keys()` includes `"storage_conditions"`. This feeds the translation webhook payloads.
- Stored-value invariant: `NULL` or a trimmed, non-empty string of at most 250 characters. Never `""`.

### 4.2 GraphQL: product
```
type Product { storageConditions: String }          # public, no PermissionsField; ADDED_IN_323
input ProductInput { storageConditions: String }    # inherited by ProductCreateInput, ProductBulkCreateInput
```
Input rules for `productCreate`, `productUpdate` and `productBulkCreate`:
| Input | Result |
|---|---|
| key omitted | unchanged (on create: null) |
| `null`, `""`, whitespace only | stored as `null` |
| `"  Keep refrigerated at 2–8 °C  "` | stored trimmed |
| trimmed length > 250 | `ProductError{field:"storageConditions", code: INVALID}`; nothing is saved (bulk: per-row error, following the error policy) |
- Write permission: existing `MANAGE_PRODUCTS` (Meta unchanged). Events: existing `PRODUCT_CREATED` / `PRODUCT_UPDATED`.

### 4.3 GraphQL: translations
```
type ProductTranslation { storageConditions: String }          # ADDED_IN_323
type ProductTranslatableContent { storageConditions: String }  # base value; ADDED_IN_323
input TranslationInput { storageConditions: String }            # "Products only."; ADDED_IN_323
```
- `productTranslate` and `productBulkTranslate` follow the same rules: trim, blank becomes null, at most 250. Errors use the existing `TranslationError` / `ProductBulkTranslateError` on field `storageConditions`.
- `categoryTranslate` and `collectionTranslate` also use `TranslationInput`. A non-null `storageConditions` there returns a validation error on field `storageConditions` (code `INVALID`), never a 500. Null or omitted keeps today's behaviour.
- Bulk translate saves the field on both the create and update paths.
- `Product.translation(languageCode)` returns `storageConditions`, null when not translated. Permission: `MANAGE_TRANSLATIONS` (unchanged).
- Why the shared input (AD1): existing clients declare their variable as `TranslationInput`; the dashboard uses `$input: TranslationInput!`. Switching the argument to a product-specific input type would make those variables fail validation for every existing caller. The alternative, a new `ProductTranslationInput` (breaking, with a CHANGELOG "Breaking changes" entry), applies only if the user overrides this at G0.

### 4.4 Dashboard (main 3.23)
- `schema-main.graphql`: add only the §4.2–4.3 SDL, with no unrelated drift.
- Reads, each with `storageConditions @lockSchema(schema: "main")`:
  - `Product` fragment
  - `ProductTranslation` fragment (both `product{}` and `translation{}`)
  - `UpdateProductTranslations` response selection
- Product page: a "Storage conditions" Textarea in `ProductDetailsForm`, below the description.
  - `name="storageConditions"`, `maxLength=250`, `data-test-id="product-storage-conditions"`.
  - API errors appear as helper text.
- Form model:
  - `ProductUpdateFormData.storageConditions: string`, initialised to `product.storageConditions ?? ""`.
  - Listed in `PRODUCT_DETAILS_SAVE_FIELDS`.
  - Update variables include the key only when it changed; `""` is sent as `null`.
- Translation page: the product "General information" section gets a `storageConditions` field (`TranslationInputFieldName.storageConditions`, type LONG, showing the base value and the translation). Saving sends `{storageConditions: value}` through the existing `UpdateProductTranslations`.
- Messages go through react-intl (`extract-messages`). No new permission checks, since the pages are already behind `MANAGE_PRODUCTS` / `MANAGE_TRANSLATIONS`.

### 4.5 Storefront
- `src/graphql/extensions/ProductDetailsExtension.graphql` selects `storageConditions` and `translation(languageCode: $languageCode){ storageConditions }`.
- `mapProductExtensions(product)` returns `{ storageConditions: string }` only when the resolved value is non-empty, otherwise `{}`. Resolution: the trimmed translation if non-blank, else the trimmed base value (same semantics as `pickTranslatedField`, `src/lib/saleor-translations.ts:7-17`).
- `ProductAttributes` gets `storageConditions?: string | null`. The route passes `view.extensions.storageConditions`, narrowed to a string.
- The Description accordion item renders when `descriptionHtml.length>0 || storageConditions`.
  - Order: description HTML first, then a block with the label `t("storageConditions")` and the text as a text node.
  - Default-open behaviour is unchanged (`defaultValue={["description"]}`).
- Message `pdp.attributes.storageConditions` in `messages/en.json`. Other locales SHOULD get a translation; missing keys fall back to en.

## 5. Error handling
- API: validation errors are returned only through the typed error lists. No input to `storageConditions` on any translate mutation may cause a 500.
- Dashboard: `storageConditions` field errors appear as Textarea helper text or as the translation field's error. Save stays retryable.
- Storefront: missing, null or blank means nothing is rendered. An unexpected type is treated as absent.

## 6. Security
| Threat | Mitigation |
|---|---|
| Stored XSS in storefront/dashboard rendering | Text nodes only: no `dangerouslySetInnerHTML`, no HTML parsing |
| Privilege escalation | Writes only through existing `MANAGE_PRODUCTS` / `MANAGE_TRANSLATIONS` |
| Information disclosure | Intentionally public, like `description`; contains no PII |
- No secrets, no new endpoints, no new dependencies.

## 7. Test scenarios (minimum)
| ID | Layer | Scenario | Expected |
|---|---|---|---|
| T1 | API | `productCreate` with value | stored/returned trimmed |
| T2 | API | `productCreate` without | `null` |
| T3 | API | `productUpdate` set → change → `null` → `""` → `"   "` | value, value, null, null, null |
| T4 | API | `productUpdate` omit key | unchanged |
| T5 | API | 250 chars; 251 chars | ok; `INVALID` on `storageConditions`, DB unchanged |
| T6 | API | staff without `MANAGE_PRODUCTS` | permission denied |
| T7 | API | `productBulkCreate` with value; with 251 chars | stored; row error |
| T8 | API | anonymous `product(slug, channel)` | `storageConditions` returned; null when unset |
| T9 | API | `productTranslate` set / blank / 251 chars | stored / null / TranslationError |
| T10 | API | `productBulkTranslate` create + update | saved on both paths |
| T11 | API | `product.translation(languageCode)` + translatable content | translated + base values |
| T12 | API | `categoryTranslate`/`collectionTranslate` with `storageConditions` | typed error, no 500 |
| T13 | API | translation webhook payload keys | contain `storage_conditions` |
| T14 | API | `makemigrations --check`; regenerated schema equals committed | clean |
| D1 | Dash | update variables: changed / `""` / untouched | sent / `null` / absent |
| D2 | Dash | form change → submit; dirty state | submitted; Save enabled |
| D3 | Dash | `ProductDetailsForm` renders value, onChange, error text | as specified |
| D4 | Dash | translation section includes the field; submit payload | `{storageConditions}` |
| D5 | Dash | `lockSchema.test.ts` | green |
| S1 | SF | mapper: base only / translation only / both / blank translation / null / whitespace | base / translation / translation / base / `{}` / `{}` |
| S2 | SF | existing `toProductView` test | still `extensions: {}` |
| S3 | SF manual | PDP: description + storage, storage only, neither, translated locale | item with both; item with storage only; unchanged; translated text |

## 8. Acceptance criteria (measurable)
- AC1: All T*, D* and S1–S2 automated tests pass locally, with zero failures in the touched test files.
- AC2: Saleor `makemigrations --check` is clean. The regenerated `schema.graphql` diff contains only the 7 `storageConditions` additions (Product, ProductInput, ProductCreateInput, ProductBulkCreateInput, ProductTranslation, ProductTranslatableContent, TranslationInput) and their descriptions.
- AC3: Schema diff against the pre-change schema shows 0 breaking changes.
- AC4: Dashboard `check-types`, `lint:eslint` and `format:check` are clean. Generated files are regenerated, not hand-edited. `locale/defaultMessages.json` is updated and a patch changeset is present.
- AC5: Storefront `typecheck`, `lint`, `core:lock:check`, `data:lock:check` and `lint:design-tokens` are clean. `paper-core.lock.json` and `data-layer.lock.md` are unchanged.
- AC6: For a product with the field unset, the PDP DOM for Description, Details, Care and Shipping is identical to before the change (S3 "neither").
- AC7: Staff set a value in the dashboard and still see it after a reload. The translated value appears on the matching storefront locale (manual S3, evidence recorded in HANDOFF).

## 9. Dependencies and assumptions
- Pytest needs a local Postgres. Storefront codegen, lint and typecheck need a running, migrated local Saleor at storefront `NEXT_PUBLIC_SALEOR_API_URL`. Not verified, because env files were not inspected.
- A1: client-preset codegen types extension fields as optional, so the existing `ProductShell` test literals still compile.
- A2: `ProductBulkCreate` runs the model's `full_clean` (`product_bulk_create.py:684-689`). The cleaner is still needed for trimming and blank handling.

## 10. Affected files (summary)
- saleor:
  - `saleor/product/models.py`, `saleor/product/migrations/0211_*.py`
  - `saleor/graphql/product/{types/products.py,mutations/product/product_create.py,product_update.py,product_cleaner.py,bulk_mutations/product_bulk_create.py}`
  - `saleor/graphql/translations/{types.py,mutations/utils.py,product_translate.py,product_bulk_translate.py,category_translate.py,collection_translate.py}`
  - `saleor/graphql/schema.graphql` (generated), `CHANGELOG.md`, tests
- dashboard:
  - `schema-main.graphql`
  - `src/fragments/{products.ts,translations.ts}`
  - `src/translations/{mutations.ts,types.ts,translationSectionBuilders.ts}`, `src/translations/components/TranslationsProductsPage/TranslationsProductsPage.tsx`
  - `src/products/components/{ProductDetailsForm/*,ProductUpdatePage/{types.ts,saveComposition.ts}}`, `src/products/utils/data.ts`, `src/products/views/ProductUpdate/handlers/utils.ts`
  - `src/products/fixtures.ts`, plus any other typed fragment literals
  - `src/graphql/*.generated.ts` (generated), `locale/defaultMessages.json` (generated), `.changeset/*.md`
- storefront:
  - `src/graphql/extensions/ProductDetailsExtension.graphql`
  - `src/config/storefront-view.ts` (+ `.test.ts`)
  - `src/ui/components/pdp/product-attributes.tsx`
  - `src/app/(storefront)/[locale]/[channel]/(main)/products/[slug]/page.tsx`
  - `messages/*.json`
