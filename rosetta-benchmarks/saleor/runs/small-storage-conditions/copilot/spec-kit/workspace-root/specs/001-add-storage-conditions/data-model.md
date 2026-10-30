# Data Model: Add Storage Conditions

## Product

| Field | Type | Required | Rules |
|---|---|---:|---|
| `storage_conditions` | Plain text | No | Maximum 250 characters after line-break normalization; empty is allowed and represents no value. |

- One value belongs to one product.
- It is independent of the existing rich-text product description.
- New and existing products default to no value.
- Product variants do not carry this field.

## Product Translation

| Field | Type | Required | Rules |
|---|---|---:|---|
| `storage_conditions` | Plain text | No | Maximum 250 characters after line-break normalization; empty is allowed and represents no translation. |

- One translation belongs to one product and one language.
- A non-empty translation is shown for that language.
- A missing or empty translation resolves to the product's base value.

## Validation and state transitions

1. Staff with `MANAGE_PRODUCTS` may create, update, or clear both the base value and a product translation; no other staff permission grants storage-conditions write access.
2. Before validation and persistence, line breaks are normalized so they are not retained.
3. A normalized value longer than 250 characters is rejected through the existing product mutation error mechanism.
4. Clearing the base value leaves the product with no storage conditions; clearing a translation removes the override and restores base-value fallback.
5. Public product readers receive the resolved value through the normal product API and storefront query, subject to existing product visibility rules.
6. Non-product translation mutations receiving `storageConditions` return `INVALID` and do not save it.
7. Product webhook payloads and product CSV rows include the base value; it is not indexed for filtering or search.

## Migration

Add nullable fields through one schema migration. No existing product or translation record is populated or transformed.
