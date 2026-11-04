# Storage Conditions Discovery Notes

## Confirmed behavior

- Add an optional Product storage-conditions value as plain text, at most 250
  Unicode characters.
- Translate it using the same fallback behavior as Product name and description.
- Dashboard editing targets the tracked main (3.23) schema refreshed from the
  local API.
- The storefront shows a labeled PDP block immediately after the Product
  description, only when the translated-or-fallback value is non-empty.
- Do not show the value in cart, checkout, or order emails. Do not search or
  filter by it.
- Include the value in Product webhook payloads and Product CSV export.
- Translation-only edits must invalidate the storefront PDP cache immediately
  when catalog notifications are connected.

## Verified extension points

- Core needs `Product` and `ProductTranslation` persisted fields, a migration,
  Product GraphQL read/write fields, shared translation-input validation, bulk
  product translation parity, schema generation, webhook payload coverage, CSV
  export coverage, and focused API tests.
- Dashboard needs the refreshed main schema, product edit form data/mutation,
  translated Product field, validation, messages, generated GraphQL artifacts,
  and focused tests.
- Storefront needs its PDP query, translation merge, ProductView contract,
  mapper, PDP description-area component, messages, cache invalidation route,
  and focused tests.

## Contract constraints

- `TranslationInput` is shared by Product, Category, and Collection. It may
  expose `storageConditions`, but Category and Collection translation mutations
  must reject it with an `INVALID` error.
- The backend is authoritative for the 250-character Unicode limit; the
  dashboard applies the same visible limit where practical.
- Dashboard schema refresh must use the local API; do not hand-edit generated
  schema or code-generation output.
