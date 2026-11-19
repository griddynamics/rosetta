# Data Model: Product Storage Conditions

## Product (existing entity, one new attribute)

| Field | Type | Required | Default | Rules |
|-------|------|----------|---------|-------|
| `storage_conditions` | text, max 250 chars | No | empty string | Stripped of leading/trailing whitespace on write; whitespace-only → empty; > 250 chars rejected with an `INVALID` error on `storageConditions`; stored verbatim otherwise (no markup interpretation) |

- **Relationships**: none added. Not per-variant or per-channel.
- **Migration**: `0211_product_storage_conditions` adds the column with constant default `""`; existing rows become empty (FR-008). Reversible.
- **State transitions**: none (empty ⇄ set by edit).
- **Access**: read — anyone who can read the product; write — users permitted to manage products (FR-009).
- **Integrations**: included in product webhook payloads (FR-013) and selectable in product CSV export (FR-014); not filterable or searchable.

## ProductTranslation (existing entity, one new attribute)

| Field | Type | Required | Default | Rules |
|-------|------|----------|---------|-------|
| `storage_conditions` | text, max 250 chars | No | null | Same normalisation as `Product.storage_conditions`; null or empty means "no translation", so the base value is shown (FR-011) |

- **Relationships**: none added; one translation row per product and language, as today.
- **Migration**: `0212_producttranslation_storage_conditions` adds a nullable column; no backfill.
- **Access**: read — with the product translation; write — users permitted to manage translations (FR-010).
