# Review: BE implementation (S1) vs SPECS/PLAN

TLDR: No blocker or major findings. BE-01..BE-13 are implemented and match the specs. I found 2 minor observations and no required fixes.

Verified live (container saleor-benchmark-saleor-1):
- `makemigrations --check --dry-run` reports "No changes detected".
- `get_graphql_schema | diff schema.graphql -` is empty.
- `ruff check` and `ruff format --check` are clean.
- 0211 is applied on the local dev DB.

## Per-AC
- BE-01: SDL is additive only. Descriptions and `Added in Saleor 3.23.` tags match spec section 4. The enum value sits after PRODUCT_MEDIA. `ProductBulkCreateInput` inherits the field and does not redeclare it.
- BE-02: migration 0211 is two `AddField` operations (nullable CharField 250) and depends on 0210. It reverses by default because `AddField` has an auto reverse.
- BE-03/04/05:
  - `clean_storage_conditions` in product_cleaner.py:21-24 matches the spec formula exactly.
  - It is called from `ProductCreate.clean_input`, `ProductUpdate.clean_input` and `ProductBulkCreate.clean_base_fields` (product_bulk_create.py:265).
  - The 250 limit comes from the model `full_clean`, after the strip.
  - Create and update map `max_length` to INVALID.
  - Bulk create gets path `storageConditions` with code `max_length`. That value exists in `ProductBulkCreateErrorCode.MAX_LENGTH`, so there is no enum break.
- BE-06: the public field has no permission wrapper, same as `name`.
- BE-07: `productTranslate` validates through `validate_input_against_model` (>250 gives INVALID). Permission is unchanged.
- BE-08: `validate_input` is overridden in category and collection translate. The guard runs before the model validation. A non-empty value gives INVALID with the spec message and nothing is saved. A null or "" value deletes the key, so there is no FieldError or 500. `CollectionTranslate.perform_mutation` goes through `super()`, which calls `cls.validate_input`, so the guard applies there too.
- BE-09/10: `PRODUCT_FIELDS` gets `storage_conditions` last (payloads.py:676). `ProductTranslation.get_translated_keys` has the key (models.py:311).
- BE-11: the CSV enum and the mapping (after "product weight") are in place. `get_products_data` derives the fields from the mapping, so the column flows through `.values()`. A null value becomes an empty cell, the same as `description`.
- BE-12: no search or filter changes.
- BE-13: both CHANGELOG bullets are present, under GraphQL API and Webhooks.
- No unrelated diffs. Only the 16 files from spec section 15 plus the migration. No docs beyond CHANGELOG are required by the specs.

## Known deviation: `storage_conditions` in `ProductBulkTranslate.translation_fields` (product_bulk_translate.py:79-85)
JUSTIFIED. It is not in the spec file list, but it is required.
- `BaseBulkTranslateMutation` passes `_meta.translation_fields` to `bulk_update(...)` (translations/mutations/utils.py:491-493).
- Without the entry, existing translations would silently not persist `storage_conditions`. This would break BE-07 for the update path.
- Recommend the orchestrator accept it and add it to spec section 15.

## Findings
- minor-1: translations/mutations/utils.py:103-119. `reject_storage_conditions_for_non_products` mutates the caller's input dict (`del`). This is harmless today because `input` is a fresh dict per request and it avoids the FieldError. The docstring says "Drop", so it is documented. No change needed.
- minor-2: translation values are not stripped, so `"   "` is stored as-is for product translations. This is by spec (A4, section 6). The storefront falls back on blank. T1 should cover it.

## Checked, no issue
- Other Product creation or copy paths: there is no product duplicate mutation and no import path in this repo. Nothing else builds a `Product` from `ProductInput`.
- Null on `productUpdate` clears the value. An omitted key leaves it unchanged, because `clean_input` only touches present keys.
- Subscription payloads work automatically through the types.

Files: /Users/njakovljevic/saleor-benchmark/saleor/saleor/graphql/product/mutations/product/product_cleaner.py, /Users/njakovljevic/saleor-benchmark/saleor/saleor/graphql/translations/mutations/utils.py, /Users/njakovljevic/saleor-benchmark/saleor/saleor/product/migrations/0211_product_storage_conditions.py
