<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Product storage conditions: tech specs (WHAT)

Companion plan (HOW): `plans/product-storage-conditions/product-storage-conditions-PLAN.md`. Design rationale: `agents/TEMP/product-storage-conditions/architecture-notes.md` (approved).

## TLDR
- New optional plain-text `Product.storageConditions` (≤250 chars, stripped, blank → null). Translatable through `ProductTranslation.storageConditions`.
- Write paths: `productCreate`, `productUpdate`, `productBulkCreate` (MANAGE_PRODUCTS); `productTranslate`, `productBulkTranslate` (MANAGE_TRANSLATIONS) via the shared `TranslationInput`. Category/collection translate reject the field.
- Read: public. Exposed in the legacy PRODUCT_CREATED/UPDATED/DELETED JSON payloads (`storage_conditions`), the legacy TRANSLATION_* keys, subscription payloads (automatic), and the CSV export column `storage conditions`.
- Dashboard: textarea on the product page, translation field, export option. All gated to the main schema (`@lockSchema(schema:"main")` + `isMainSchema()`).
- Storefront: fork extension fragment → `mapProductExtensions` → PDP accordion item "Storage Conditions" right after Description, open by default, hidden when empty. Translation wins over base.
- Out of scope: filters, search/indexing, CSV import, storefront listing cards, other payloads.

## TOC
1 Scope · 2 NFR · 3 Architecture · 4 API contracts · 5 Data model · 6 Errors · 7 Webhooks & export · 8 Dashboard · 9 Storefront · 10 Security · 11 Acceptance criteria · 12 Test data · 13 Out of scope · 14 Assumptions · 15 Files affected

## 1. Scope
| In | Repo |
|---|---|
| Model + migration, GraphQL field/inputs/translation, validation, permissions | saleor |
| Legacy product webhook payload key, translation webhook key, CSV export enum + column | saleor |
| Product edit UI, translation UI + progress, export dialog option, i18n, changeset | saleor-dashboard |
| PDP query extension, mapper, UI block, i18n label (8 locales) | react-storefront |

## 2. NFR / ASR
- Backward compatible: all schema changes are additive. graphql-inspector: no breaking changes. `productTranslate` keeps `input: TranslationInput!`.
- Migration is metadata-only (nullable `AddField`): no table rewrite, no backfill, reversible. Rolling-deploy safe.
- No new dependencies in any repo. No change to search ranking or filter surface.
- Storefront: no edits to core-locked files (`paper-core.lock.json` must gain no new drift). PDP stays in the same `cachedQuery` document (`data-layer.lock.md` unchanged). PPR shell unaffected.
- Dashboard: documents valid against both `schema-main.graphql` and `schema-staging.graphql` (`src/graphql/lockSchema.test.ts`).
- Repo rules: each repo's `CLAUDE.md` (follow patterns, focused change, tests, no commit/push).

## 3. Architecture
```
Dashboard ──productUpdate/productTranslate/exportProducts──▶ Saleor API ──▶ Postgres (product_product, product_producttranslation)
                                                              ├─▶ webhooks: legacy JSON (PRODUCT_FIELDS, get_translated_keys) + subscriptions
                                                              └─▶ CSV export (ProductExportFields mapping)
Storefront PDP ──ProductDetails{…ProductDetailsExtension}──▶ Saleor API (anonymous)
   getProductData → toProductView → mapProductExtensions{storageConditions} → page.tsx → ProductAttributes
```
Responsibilities (SRP):
- Backend cleaner: normalizes the value.
- Model `full_clean`: enforces length.
- Storefront mapper: resolves the translation and blank handling.
- UI: renders only; it does not trim or fall back.

## 4. API contracts (SDL delta, `saleor/graphql/schema.graphql`)
Descriptions end with `\n\nAdded in Saleor 3.23.` (`ADDED_IN_323`).
```graphql
type Product { storageConditions: String }                    # "Storage conditions of the product, e.g. \"Keep refrigerated at 2–8 °C\". Plain text, max 250 characters."
input ProductInput { storageConditions: String }              # inherited by ProductCreateInput, ProductBulkCreateInput; "Storage conditions of the product. Plain text, max 250 characters; blank clears it."
type ProductTranslation { storageConditions: String }         # "Translated storage conditions."
type ProductTranslatableContent { storageConditions: String } # "Storage conditions to translate."
input TranslationInput { storageConditions: String }          # "Translated storage conditions. Applies to products only; non-empty values are rejected for other entities."
enum ProductFieldEnum { …, PRODUCT_MEDIA, STORAGE_CONDITIONS, VARIANT_ID, … }  # value "storage conditions"
```
- Unchanged signatures: `productTranslate(id, languageCode, input: TranslationInput!)`, `productBulkTranslate`, `categoryTranslate`, `collectionTranslate`.
- No new arguments on `products(where/filter/search)`.

**Permissions**
| Operation | Permission |
|---|---|
| Read `Product.storageConditions`, `ProductTranslation.storageConditions`, `ProductTranslatableContent.storageConditions` | public (same as `name`) |
| productCreate / productUpdate / productBulkCreate | MANAGE_PRODUCTS (existing) |
| productTranslate / productBulkTranslate | MANAGE_TRANSLATIONS (existing) |
| exportProducts | existing (MANAGE_PRODUCTS) |

## 5. Data model
| Model | Field | Definition |
|---|---|---|
| `saleor/product/models.py::Product` | `storage_conditions` | `CharField(max_length=250, blank=True, null=True)` |
| `::ProductTranslation` | `storage_conditions` | same |
- `ProductTranslation.get_translated_keys()` adds `"storage_conditions": self.storage_conditions`.
- Migration `saleor/product/migrations/0211_product_storage_conditions.py`, depends on `("product", "0210_collection_external_reference_unique_constraint")`. Contains 2× `AddField`; atomic.
- Normalization contract: `clean_storage_conditions(cleaned_input: dict) -> None` in `saleor/graphql/product/mutations/product/product_cleaner.py`.
  - No-op when the key is absent.
  - Otherwise sets `cleaned_input["storage_conditions"] = (value or "").strip() or None`.
- No feature flag (backend). Dashboard schema gating per §8.

## 6. Error handling
| Path | Condition | Result |
|---|---|---|
| productCreate / productUpdate | stripped length > 250 | `errors[{field:"storageConditions", code: INVALID}]` (ProductErrorCode); product not created/changed |
| productBulkCreate | stripped length > 250 | row `errors[{path:"storageConditions", code: MAX_LENGTH}]`; row not created; other rows unaffected (per errorPolicy) |
| productTranslate | length > 250 | `errors[{field:"storageConditions", code: INVALID}]` (TranslationErrorCode); translation unchanged |
| productBulkTranslate | length > 250 | request-level GraphQL error (row code `max_length` is not in `ProductTranslateErrorCode`; same as existing `name` behavior); nothing saved. Corrected after implementation, see review-tests-saleor.md MAJOR-1 |
| categoryTranslate / collectionTranslate | `storageConditions` non-empty | `errors[{field:"storageConditions", code: INVALID, message:"Storage conditions can only be translated for products."}]`; nothing saved |
| categoryTranslate / collectionTranslate | `storageConditions` null or "" | key ignored; rest of the input saved as today (no 500, no FieldError) |
- Translation inputs are **not** stripped (parity with the other translation fields).

## 7. Webhooks & CSV export
**Legacy JSON** (`saleor/webhook/payloads.py`):
- `PRODUCT_FIELDS` gains `"storage_conditions"` as its last element.
- Each serialized product object then contains `"storage_conditions": <str|null>`.
- Applies to `generate_product_payload` (PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_CREATED sample payload) and `generate_product_deleted_payload` (PRODUCT_DELETED).
- No other payload changes. Variant, checkout and order payloads do not serialize `Product`.

**Translation legacy payload:** `keys[]` contains `{"key":"storage_conditions","value":…}` for ProductTranslation.

**Subscriptions:** no code change; `Product.storageConditions` and `ProductTranslation.storageConditions` are selectable.

**CSV export** (`saleor/csv/utils/__init__.py`, `saleor/graphql/csv/enums.py`):
| Item | Contract |
|---|---|
| Enum | `ProductFieldEnum.STORAGE_CONDITIONS = "storage conditions"`, declared after `PRODUCT_MEDIA` |
| Header | `storage conditions` (enum value) |
| Mapping | `HEADERS_TO_FIELDS_MAPPING["fields"]["storage conditions"] = "storage_conditions"`, placed after `"product weight"` |
| Column order | `id` first, then requested `fields` in client order, then attribute/warehouse/channel headers (unchanged logic) |
| Cell | product value repeated on each product×variant row; null → empty cell; raw stored text |
| Import | none exists; `productBulkCreate.storageConditions` accepts the exported value |

## 8. Dashboard contracts (`saleor-dashboard`)
**Schema gating (all selections):** `storageConditions @lockSchema(schema: "main")`. UI and inputs only when `isMainSchema()` (`@dashboard/graphql/schemaVersion`). `schema-staging.graphql` is unchanged.

**Product page**
| Element | Contract |
|---|---|
| Fragment `Product` (`src/fragments/products.ts`) | `storageConditions @lockSchema(schema:"main")` |
| `ProductUpdateFormData` (`.../ProductUpdatePage/types.ts`) | `storageConditions: string` |
| Initial data (`src/products/utils/data.ts::getProductUpdatePageFormData`) | `product?.storageConditions ?? ""` |
| Dirty/save (`.../ProductUpdatePage/saveComposition.ts::PRODUCT_DETAILS_SAVE_FIELDS`) | includes `"storageConditions"` |
| UI (`src/products/components/ProductDetailsForm/ProductDetailsForm.tsx`) | macaw `Textarea` `name="storageConditions"` after Description, before Rating, rendered iff `isMainSchema()`; label "Storage conditions"; helper "Shown to customers on the product page."; `maxLength={250}`; counter "({numberOfCharacters} of {maxCharacters} characters)" when non-empty (SeoForm pattern); server error via `getFormErrors`/`getProductErrorMessage` |
| Submit (`src/products/views/ProductUpdate/handlers/utils.ts::getProductUpdateVariables`) | `data.storageConditions !== undefined` → `input.storageConditions = data.storageConditions \|\| null`; absent key → not sent |
| Create flow | unchanged (dialog → update page). `ProductCreatePage/form.tsx` untouched |

**Translations**
| Element | Contract |
|---|---|
| `TranslationInputFieldName` (`src/translations/types.ts`) | `storageConditions = "storageConditions"` |
| Fragment `ProductTranslation` (`src/fragments/translations.ts`) | `storageConditions @lockSchema(schema:"main")` in `product{}` and `translation{}` |
| `UpdateProductTranslations` (`src/translations/mutations.ts`) | same field added to the response `product{}` and `translation{}`; variable type stays `TranslationInput!` |
| `TranslationsProductsPage` | iff `isMainSchema()`: field `{name: storageConditions, type: LONG, value: product.storageConditions ?? "", translation: translation?.storageConditions ?? null, displayName "Storage conditions"}` appended to the **product** general section after Description. Category/collection pages unchanged |
| Save | existing `getParsedTranslationInputData` → `{storageConditions: string}` |
| Progress (`src/translations/views/EntityLists/utils.ts::getProductTranslationCompletion`) | +1 `max` and +1 `current` when translated, iff `isMainSchema()`; `getGeneralEntityTranslationCompletion` unchanged |

**Export dialog** (`src/products/components/ProductExportDialog/`):
- `STORAGE_CONDITIONS` is listed in the product-info `FieldAccordion` (with DESCRIPTION, NAME, PRODUCT_MEDIA, VARIANT_MEDIA) iff `isMainSchema()`.
- Label "Export Storage Conditions" in `messages.ts`.

**i18n:** `intl.formatMessage`/`defineMessages` with formatjs ids; `locale/defaultMessages.json` regenerated.

**Changeset:** `.changeset/*.md`, `"saleor-dashboard": patch`.

## 9. Storefront contracts (`react-storefront`)
| Element | Contract |
|---|---|
| `src/graphql/extensions/ProductDetailsExtension.graphql` | adds `storageConditions` and `translation(languageCode: $languageCode) { storageConditions }` (keeps `__typename`) |
| `src/config/storefront-view.ts` | `mapProductExtensions(product): Record<string, unknown>` returns `{ storageConditions: string \| null }`; new `getStorageConditions(extensions: Record<string, unknown>): string \| null` (returns a non-empty string or null) |
| Resolution rule | `pickTranslatedField(product.translation, "storageConditions", product.storageConditions)?.trim() \|\| null`: translation wins when non-blank, else base, else null |
| `src/app/(storefront)/[locale]/[channel]/(main)/products/[slug]/page.tsx` | only change: `<ProductAttributes … storageConditions={getStorageConditions(view.extensions)} />` |
| `src/ui/components/pdp/product-attributes.tsx` | prop `storageConditions?: string \| null`; when truthy, render `AccordionItemWithContext value="storage"` **directly after** the `description` item; trigger `t("storageConditions")`; content is a plain text node (no `dangerouslySetInnerHTML`); `defaultValue` includes `"storage"`; when falsy, nothing is rendered |
| i18n `messages/*.json` → `pdp.attributes.storageConditions` | en "Storage Conditions", de "Lagerungshinweise", fr "Conservation", pl "Warunki przechowywania", fi "Säilytysohjeet", nb "Oppbevaring", ja "保存方法", ko "보관 방법" |
| Untouched | `src/graphql/ProductDetails.graphql`, `src/lib/storefront/**` (core-locked), `src/lib/saleor-translations.ts`, templates |

## 10. Security
- Plain text, never rendered as HTML: React text node on the storefront, input value on the dashboard. Rendering it as HTML is a defect.
- Stored XSS payloads (`<script>`) must render escaped.
- Writes are permission-gated (existing perms). No PII. Public read is intended.
- CSV formula injection: pre-existing class of issue (same as `name`); not mitigated here.
- Translation guard prevents a 500 or attribute injection on non-product models.

## 11. Acceptance criteria
Backend
- **BE-01** `Product.storageConditions`, `ProductTranslation.storageConditions`, `ProductTranslatableContent.storageConditions`, `TranslationInput.storageConditions`, `ProductInput.storageConditions` (and inherited create/bulk inputs), and `ProductFieldEnum.STORAGE_CONDITIONS` exist in the committed `schema.graphql` and match `get_graphql_schema` output.
- **BE-02** Migration 0211 applies and reverses. `makemigrations --check` is clean.
- **BE-03** productCreate/productUpdate persist the stripped value; `""`/whitespace/`null` → `null`; an omitted key on update leaves the value unchanged.
- **BE-04** 250 chars (after strip) accepted; 251 rejected per §6 (create, update, bulkCreate).
- **BE-05** productBulkCreate persists the value; an invalid row reports `path:"storageConditions"`.
- **BE-06** Anonymous `product(slug, channel){ storageConditions translation(languageCode){ storageConditions } }` returns the values.
- **BE-07** productTranslate / productBulkTranslate save and update `storageConditions`; >250 rejected; staff without MANAGE_TRANSLATIONS denied (existing behavior).
- **BE-08** categoryTranslate/collectionTranslate: non-empty `storageConditions` → INVALID error, nothing saved; `null` → success, other fields saved.
- **BE-09** Legacy PRODUCT_CREATED/UPDATED/DELETED payload objects contain `storage_conditions` (value or null).
- **BE-10** Legacy translation payload for ProductTranslation contains key `storage_conditions`.
- **BE-11** CSV export with `STORAGE_CONDITIONS` has header `storage conditions` in the requested position and per-row values (empty when null).
- **BE-12** No search/filter change: `PRODUCT_SEARCH_FIELDS` and the product where/filter inputs are unchanged.
- **BE-13** CHANGELOG `# 3.23.0` has a bullet under `### GraphQL API` (field, inputs, translation, export enum) and one under `### Webhooks` (legacy payload key).

Dashboard
- **DA-01** On the main schema, the product page shows the "Storage conditions" textarea with the current value. Editing only that field enables Save and sends `storageConditions` in `productUpdate`. Clearing sends `null`.
- **DA-02** Over 250 chars: counter and error state; a server error renders under the field.
- **DA-03** The product translation page shows the field (source + translation); saving sends `storageConditions` via `productTranslate`; the progress count includes it.
- **DA-04** The export dialog offers "Export Storage Conditions" and sends `STORAGE_CONDITIONS`.
- **DA-05** With staging schema (`FF_USE_STAGING_SCHEMA=true`), no `storageConditions` selection, input or export value reaches the API; `lockSchema.test.ts` passes.
- **DA-06** `check-types:src`, jest, eslint, prettier and `lint:changesets` pass. `locale/defaultMessages.json` contains the new ids.

Storefront
- **SF-01** The PDP renders a "Storage Conditions" item immediately after "Description", expanded, with the base value.
- **SF-02** For a locale with a non-blank Saleor translation, the translated text is shown; a blank or whitespace translation falls back to the base value.
- **SF-03** Base and translation both empty → no item and no label in the HTML.
- **SF-04** Values containing HTML render escaped (proven by a vitest render test). The diff adds no new `dangerouslySetInnerHTML`.
- **SF-05** The label is localized from `messages/<locale>.json` (all 8 locales have the key).
- **SF-06** `typecheck`, `lint`, `lint:design-tokens`, `lint:graphql-variants`, `data:lock:check` and vitest pass. `core:lock:check` shows only the pre-existing AGENTS.md drift.

## 12. Test data
| Case | Input | Expected |
|---|---|---|
| happy | `"Keep refrigerated at 2–8 °C"` | stored as-is |
| strip | `"  Keep dry  "` | `"Keep dry"` |
| blank | `""`, `"   "`, `null` | `null` |
| boundary | `"a"*250` / `" "+"a"*250+" "` | accepted |
| over | `"a"*251` | rejected |
| unicode | `"保存方法: 冷蔵 2–8 °C"` | stored; counted as characters |
| html | `"<script>alert(1)</script>"` | stored raw; rendered escaped |
| translation DE | `"Gekühlt lagern bei 2–8 °C"` | storefront `/de/…` shows it |
| translation blank | `"  "` | storefront falls back to base |
| category translate | `{storageConditions:"x"}` | INVALID |

Delivery gate: the ACs are met only after phase 11 tests (T1–T3) and V2 pass. Implementation alone (phase 7) is not "done".

## 13. Out of scope
- Filtering/where/sort by the field; search vector/`search_document`.
- CSV import.
- Storefront listing/cards, search results, JSON-LD.
- TRANSLATION_* storefront cache invalidation (pre-existing TTL behavior).
- Variant/checkout/order payloads.
- `schema-staging.graphql` edits.
- populatedb sample data.
- Dashboard product list column.
- CSV formula-injection hardening.

## 14. Assumptions
- [A1] "Payloads that serialize Product" = PRODUCT_CREATED/UPDATED/DELETED legacy + subscriptions.
- [A2] The storefront item is open by default.
- [A3] Dashboard i18n ids are generated by `formatjs/enforce-id` via `lint:eslint`.
- [A4] Translation fields are not stripped server-side.
- [A5] `ADDED_IN_323` is the correct version suffix (current section `# 3.23.0`).

## 15. Files affected
- saleor:
  - `saleor/product/models.py`
  - `saleor/product/migrations/0211_product_storage_conditions.py` (new)
  - `saleor/graphql/product/types/products.py`
  - `saleor/graphql/product/mutations/product/{product_create.py,product_update.py,product_cleaner.py}`
  - `saleor/graphql/product/bulk_mutations/product_bulk_create.py`
  - `saleor/graphql/translations/types.py`
  - `saleor/graphql/translations/mutations/{utils.py,category_translate.py,collection_translate.py}`
  - `saleor/webhook/payloads.py`
  - `saleor/csv/utils/__init__.py`
  - `saleor/graphql/csv/enums.py`
  - `saleor/graphql/schema.graphql`
  - `CHANGELOG.md`
- saleor-dashboard:
  - `schema-main.graphql`
  - `src/graphql/*.generated.ts` (main only)
  - `src/fragments/{products.ts,translations.ts}`
  - `src/translations/{mutations.ts,types.ts}`
  - `src/translations/components/TranslationsProductsPage/TranslationsProductsPage.tsx`
  - `src/translations/views/EntityLists/utils.ts`
  - `src/products/components/ProductUpdatePage/{types.ts,saveComposition.ts}` (`ProductUpdatePage.tsx` only if prop wiring needs it; it already passes `data={data}`)
  - `src/products/utils/data.ts`
  - `src/products/components/ProductDetailsForm/ProductDetailsForm.tsx` (no `*.stories.tsx` edits, user D4)
  - `src/products/views/ProductUpdate/handlers/utils.ts`
  - `src/products/components/ProductExportDialog/{ProductExportDialogInfo.tsx,messages.ts}`
  - `src/products/fixtures.ts`
  - `locale/defaultMessages.json`
  - `.changeset/product-storage-conditions.md`
- react-storefront:
  - `src/graphql/extensions/ProductDetailsExtension.graphql`
  - `src/config/storefront-view.ts`
  - `src/app/(storefront)/[locale]/[channel]/(main)/products/[slug]/page.tsx`
  - `src/ui/components/pdp/product-attributes.tsx`
  - `messages/{en,de,fi,fr,ja,ko,nb,pl}.json`

</CRITICAL>
