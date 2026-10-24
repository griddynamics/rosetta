# Contract: GraphQL API changes

Additive and backward compatible.

## Input (create and update)

```graphql
input ProductInput {
  # ...existing fields...
  """Storage conditions of the product, e.g. "Keep refrigerated at 2–8 °C". Max 250 characters."""
  storageConditions: String
}
```
Inherited by `ProductCreateInput` and `ProductInput` used by `productUpdate`.

- Omitted → unchanged on update, empty on create.
- `""` or whitespace-only → stored as empty (clears the value).
- Longer than 250 chars (after strip) → `ProductError { field: "storageConditions", code: INVALID }`.
- Requires `MANAGE_PRODUCTS` (existing mutation permission).

## Output

```graphql
type Product {
  # ...existing fields...
  """Storage conditions of the product."""
  storageConditions: String
}
```
Returns `""` when not set. Readable with the same visibility as `description`.

## Webhooks and export

- Legacy product webhook payloads (`PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`) gain a `storage_conditions` string (empty when unset). Subscription payloads can select `storageConditions` on `Product`.
- `enum ProductFieldEnum` gains `STORAGE_CONDITIONS` (CSV header `storage conditions`, base value only) for `exportProducts`.
- Product translation webhooks (`TRANSLATION_CREATED`, `TRANSLATION_UPDATED`) include a `storage_conditions` key with the translated text (null when not translated).
- No filter, sort or search input changes.

## Translations

```graphql
input ProductTranslationInput {   # replaces TranslationInput on productTranslate
  # ...name, slug, seoTitle, seoDescription, description as before...
  """Translated storage conditions. Max 250 characters."""
  storageConditions: String
}

type ProductTranslation            { storageConditions: String }   # translated text, null when none
type ProductTranslatableContent    { storageConditions: String }   # original text to translate
```

- `productTranslate` and `productBulkTranslate` accept `storageConditions` (bulk input uses `ProductTranslationInput` for `translationFields`).
- Trimmed; `""` or whitespace-only clears the translation; longer than 250 chars (after trim) → error on `storageConditions` with code `INVALID`.
- Requires `MANAGE_TRANSLATIONS`.
- `TranslationInput` itself is unchanged, so category and collection translations are unaffected.

## Storefront view contract (internal)

`ProductView.extensions.storageConditions: string | null` — the translation for the page language when it is non-empty, otherwise the base value, otherwise `null` so the UI renders nothing (FR-005, FR-011).
