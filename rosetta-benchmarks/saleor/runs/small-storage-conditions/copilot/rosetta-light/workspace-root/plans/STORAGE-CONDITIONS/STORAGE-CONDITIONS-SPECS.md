# Storage Conditions: Technical Specification

## Table of Contents

1. Overview and scope
2. Architecture and data model
3. GraphQL contracts
4. Dashboard behavior
5. Storefront behavior
6. Error handling and compatibility
7. Test strategy
8. Outbound product data
9. Affected files and services

## 1. Overview and Scope

**TLDR**

- Add optional, product-level `storageConditions` plain text, maximum 255 characters.
- Translate it per product language; blank translation falls back to the product default.
- Staff edit the default value in the product form and each translation in Translations.
- The PDP shows a labeled block after the description only when the resolved value is non-empty.
- Do not show the value in listings, cart, checkout, order pages, transactional emails, SEO, search, or JSON-LD.

The field is a merchant-authored product fact, not an attribute, metadata entry, or replacement for
the Editor.js product description. It is not channel-specific. Default and translated values are
independently optional.

## 2. Architecture and Data Model

| Owner | Contract |
|---|---|
| Core `Product` | `storage_conditions: CharField(max_length=255, blank=True, default="")` |
| Core `ProductTranslation` | `storage_conditions: CharField(max_length=255, blank=True, default="")` |
| Persistence | One forward Django migration adds both nullable-free, empty-string-backed columns. Existing products remain valid and render nothing. |
| Authorization | Existing `MANAGE_PRODUCTS` controls create/update; existing translation permission controls `productTranslate`. |
| Value rules | Save the supplied plain text; the 255-character database limit is authoritative. Empty string clears the value. No HTML, Editor.js JSON, trimming policy, channel override, or search-index change. |

`ProductTranslation.storage_conditions` uses the same fallback contract as name and description:
the requested locale value applies only when non-empty; otherwise the primary product value applies.

## 3. GraphQL Contracts

Expose `storageConditions: String` on:

1. `Product`
2. `ProductTranslation`
3. `ProductInput`
4. `TranslationInput`

`productCreate` and `productUpdate` accept the default field through `ProductInput`.
`productTranslate` accepts the localized field through `TranslationInput`. Existing mutation
permissions, error types, and partial-update semantics remain unchanged.

Dashboard operations and fragments select the field where they currently select product details and
translation details. The committed Saleor schema and generated dashboard operations/types refresh
with the repository-standard schema/codegen workflow.

## 4. Dashboard Behavior

1. Add a text input labeled **Storage conditions** to the existing product general-information form.
   It reads the default product value, preserves unsaved edits, submits only when changed, and clears
   the API value with `""`.
2. Include `storageConditions` in the product details fragment, form data, submit data, update
   variables, fixtures, and focused form/update-variable tests.
3. Add a normal plain-text **Storage conditions** row to the Product translation view. It shows the
   default and current translated values, submits via `productTranslate`, supports clear, and joins
   the translation completion calculation.
4. Add the field to the existing product-translation query/mutation response and focused translation
   form/utility tests. App-extension translation payload contracts do not change unless their
   existing product-field whitelist is explicitly extended by a separate request.

## 5. Storefront Behavior

The PDP `ProductDetails` operation selects the default and requested-language
`storageConditions`. The existing locale mapper resolves the translation using its non-empty-value
fallback rule. The product view contract carries the resolved value.

`ProductAttributes` receives it and renders a separate **Storage conditions** block immediately
after the description block and before product details. The block is absent when the resolved value
is empty. It is text-rendered, not injected as HTML. No other storefront operation or surface reads
the field.

Add the label to every supported locale message catalog, following the existing `pdp.attributes`
message namespace.

## 6. Error Handling and Compatibility

- Django/GraphQL enforce the 255-character maximum; dashboard form errors use the returned product
  mutation field error.
- Blank default and blank translation are valid. A blank translation never creates an empty PDP
  block; the primary value remains eligible for fallback.
- Existing clients remain compatible: the added GraphQL output/input fields are optional.
- Existing products, translations, PDP cache tags, publication rules, visibility, SEO, and
  descriptions are unchanged.

## 7. Test Strategy

| Layer | Required coverage |
|---|---|
| Core model/migration | Default empty values and persisted non-empty values for product and translation. |
| Core GraphQL | Product query returns default and locale value; create/update writes and clears default; `productTranslate` writes and clears translated value; overlength input returns the established validation error. |
| Dashboard | Form initializes and submits the value; update variables omit unchanged data and carry explicit clears; translation row reads, saves, and clears the value; generated operation types compile. |
| Storefront mapper/UI | Default value is mapped; non-empty translation wins; blank translation falls back; absent resolved value does not render a block; non-empty value renders a labeled text block after description. |
| Regression | Existing product description rendering, translation fallback, and product update/translation tests remain green. |

## 8. Outbound Product Data

Storage conditions must leave Saleor through product webhooks and CSV export. No filtering,
searching, indexing, dashboard, or storefront behavior changes are part of this extension.

| Surface | Contract |
|---|---|
| Legacy product webhooks | Add `storage_conditions` to the fixed product payload allowlist. Product-created, product-updated, and product-deleted payloads contain the default product value under the snake-case JSON key `storage_conditions`; blank values serialize as `""`. |
| Subscription product webhooks | No automatic serialization change is possible or needed: payloads execute each app's stored GraphQL subscription query. `Product.storageConditions` is already queryable. Update test subscription documents to select and assert it; real app subscriptions receive it only when their stored query selects `storageConditions`. |
| Product CSV export | Add a selectable `storage conditions` field to `ProductFieldEnum` and the export header-to-model mapping. Rows export only `Product.storage_conditions`, the default plain-text value; no translated values or locale-specific columns are added. |

Focused tests cover: legacy payload key/value; a subscription query selecting `storageConditions`;
CSV field acceptance, header, and row value; blank default values; schema generation. Existing
webhook permissions and product visibility behavior remain unchanged.

## 9. Affected Files and Services

| Repository | Primary areas |
|---|---|
| `saleor` | Product model/migration and GraphQL contracts; legacy webhook payload allowlist/tests; subscription webhook query fixtures/delivery tests; CSV product field enum/mapping/export tests; generated schema. |
| `saleor-dashboard` | Product fragment, product form/types/data/update variables/tests, translation query/mutation/view/builders/types/tests, generated GraphQL types. |
| `react-storefront` | `ProductDetails.graphql`, translation mapper, product view contract, PDP attributes component/tests, all locale message catalogs. |

No dependency, feature flag, configuration, migration backfill, filter, search, or index change is
required.
