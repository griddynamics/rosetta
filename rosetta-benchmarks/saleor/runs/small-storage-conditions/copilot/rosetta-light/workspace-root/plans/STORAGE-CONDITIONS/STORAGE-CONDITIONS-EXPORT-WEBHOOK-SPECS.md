# Storage Conditions Export and Webhook — Technical Specification

## TLDR

- **Status:** Draft; implementation approval pending.
- Add one optional base-product CSV column: `storage conditions`.
- Include the base field in fixed legacy product webhook payloads.
- Subscription webhook owners select `product.storageConditions` in their own GraphQL queries.
- Do not add locale export, filters, search, indexes, or search-document content.

## 1. Scope

| ID | Requirement | Verification |
|---|---|---|
| FR-SCEW-001 | Product CSV export can include base `storage conditions`. | CSV header/value tests |
| FR-SCEW-002 | Fixed legacy product webhooks include `storage_conditions`. | Payload serialization tests |
| FR-SCEW-003 | Product webhook subscriptions can select `product.storageConditions`. | Subscription delivery tests |
| FR-SCEW-004 | Storage conditions remains excluded from filters and search. | Schema/static inspection |

Out of scope: translated CSV values, CSV import behavior, dynamic locale columns, filtering, search, indexing, catalog search documents, and new webhook event types.

## 2. CSV Export Contract

- Add `STORAGE_CONDITIONS` to `ProductFieldEnum`.
- Map the export header `storage conditions` to `Product.storage_conditions`.
- Export one base-product scalar value per exported product/variant row, following existing product CSV row behavior.
- Export the stored base value or an empty cell when unset.
- Do not export `ProductTranslation.storage_conditions`; product CSV has no locale dimension and its row shape remains unchanged.
- Existing exports remain unchanged unless callers select the new field in `exportProducts.exportInfo.fields`.

## 3. Webhook Contract

### Legacy payloads

- Add `storage_conditions` to the shared fixed `PRODUCT_FIELDS` serializer selection.
- The legacy `PRODUCT_CREATED`, `PRODUCT_UPDATED`, and `PRODUCT_DELETED` payload serializers include the base value under the serializer’s established field naming convention.
- An unset value serializes consistently with other nullable product scalar fields.

### Subscription payloads

- No webhook event type, resolver, or stored application subscription query is rewritten.
- `product.storageConditions` is selectable because it is part of the existing `Product` GraphQL type.
- Subscription owners include the field explicitly, for example:

```graphql
product { storageConditions }
```

- A subscriber may additionally select a localized value via the existing product translation GraphQL field. This extension does not alter automatic locale selection.

## 4. Compatibility and Tests

- The CSV enum/header addition and legacy payload field are additive.
- Subscription payload shape remains owner-defined; existing queries retain their current response shape.
- Tests cover:
  - CSV enum/header mapping, selected base value, unset value, and a differing translation that does not alter the base export value or row shape;
  - legacy product-created, product-updated, and product-deleted payload serialization;
  - subscription delivery when `product.storageConditions` is selected and unchanged delivery shape when it is omitted;
  - absence of new filter/search schema fields.
- Expected focused commands:

```text
uv run poe test saleor/csv/tests/export/products_data/test_prepare_headers.py saleor/csv/tests/export/products_data/test_get_products_data.py saleor/csv/tests/export/test_export.py -n0
uv run poe test saleor/webhook/tests/test_webhook_payloads.py saleor/webhook/tests/subscription_webhooks/test_create_deliveries_for_subscription.py -n0
```
