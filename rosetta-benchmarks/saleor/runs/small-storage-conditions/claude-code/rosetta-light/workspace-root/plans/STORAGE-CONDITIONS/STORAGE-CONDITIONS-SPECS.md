<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# STORAGE-CONDITIONS — Tech Specs [Approved; delivered and accepted by user]

## TLDR
- Product gets optional plain-text `storageConditions` (≤250 chars, empty OK), translatable.
- Core: model col + translation col + migration, GraphQL read/write/translate, webhook payload, CSV export. No filter/search.
- Dashboard: product update page, create dialog, translations page.
- Storefront: labelled block after description on PDP only, hidden when empty; translated value preferred.
- Size LARGE (3 repos, migration). Verify: local pytest (local DB), jest, vitest, typecheck, lint, codegen.
- Decisions (user, HITL): new field · translatable · ≤250 · webhook+CSV yes · filter/search no · local stack OK.

## 1. Scope
In: above. Out: cart/checkout/order emails, filters, search vector, attributes/metadata, per-channel values.

## 2. NFR / ASR
- Backward compat: nullable/blank default → additive, non-breaking GraphQL (new optional input + new field).
- Migration safe: `AddField` null=True/blank, no default rewrite; reversible.
- Security: plain text only; storefront renders as escaped text (no `dangerouslySetInnerHTML`); API strips nothing but length-validates; permission = MANAGE_PRODUCTS (update), MANAGE_TRANSLATIONS (translate).

## 3. Core (`saleor/`)
Model (`saleor/product/models.py`):
- `Product.storage_conditions = CharField(max_length=250, blank=True, null=True)` + validator pattern as `seo_description`.
- `ProductTranslation.storage_conditions` same.
- Migration `0211_product_storage_conditions` (AddField ×2).
GraphQL:
- `ProductInput.storage_conditions: String` (inherited by Create/Update/BulkCreate inputs).
- `Product.storage_conditions: String` (camel `storageConditions`); resolved from translation by existing `translation(languageCode)` types.
- `ProductTranslation.storageConditions`, `ProductTranslatableContent.storageConditions`, `TranslationInput.storageConditions` (check the input used by `productTranslate`; reuse the product translate path).
- Validation: >250 → `ProductErrorCode.INVALID`, field `storageConditions`.
- Regenerate `saleor/graphql/schema.graphql` (`uv run poe build-schema`); `CHANGELOG.md` entry.
Webhooks: add `storage_conditions` to `PRODUCT_FIELDS` (`saleor/webhook/payloads.py`); subscription payload exposes it via GraphQL type automatically.
CSV export: add column `storage_conditions` in product export (`saleor/csv/utils/…`); engineer locates the field list/header mapping.
Bulk create: field persists via `create_products` (verify mapping).

## 4. Dashboard (`saleor-dashboard/`)
- Schema: refresh from local API (`fetch-local-schema`; tracked schema file may change — accepted), then `pnpm run generate`.
- Fragment `Product` + translation fragments/queries add `storageConditions`.
- `ProductUpdateFormData.storageConditions: string`; `getProductUpdatePageFormData`; `PRODUCT_DETAILS_SAVE_FIELDS`; `getProductUpdateVariables` maps to `ProductInput`.
- `ProductDetailsForm`: text input, max 250, label "Storage conditions".
- Create dialog on product list: field input + `createMinimalProduct` sends it (ProductCreateInput) when non-empty.
- Translations page (product): row for storage conditions, same pattern as name/description; mutation `productTranslate` input includes it.
- i18n: `pnpm run extract-messages`; no manual locale edits.

## 5. Storefront (`react-storefront/`)
- `ProductDetails.graphql`: select `storageConditions` and `translation(languageCode){ storageConditions }` (via extension hook if repo rules require; else direct).
- `withTranslatedProductFields` prefers the translation; mapper `product.ts` + contract `ProductView.storageConditions: string | null`.
- `product-attributes.tsx` (or page) renders block: `<h3>{t('storageConditions')}</h3><p>{text}</p>` after description, null/empty/whitespace → nothing. Text node only.
- Messages: `pdp.attributes.storageConditions` in all 8 `messages/*.json`.
- Locked roots touched (`src/lib/storefront`) → `pnpm core:lock` + `coreOverrides` entry in `paper-version.json`; `data:lock` re-check.

## 6. Error handling
- Over-length → API error shown on the dashboard field via existing error mapping. Null from API → storefront hides block.

## 7. Tests
Core (pytest --reuse-db): create/update/bulk-create set value; >250 invalid; 250 ok; empty/null ok; query returns field; translation create + translated query; webhook payload contains key; CSV export contains column/value; migration applies (test run applies it).
Dashboard (jest): form initial value, save composition dirty, variables utils (set/clear/unchanged), create-minimal sends value, translations page row, component render. 
Storefront (vitest): mapper (value, null, empty, translated precedence); component renders block with escaped HTML (`<script>` shown as text), hidden when empty.
Gates: `pnpm check-types`, lint, `generate`, `extract-messages`, `verify`/`core:lock:check`; core `ruff`, mypy per repo config.
Security cases: `<script>` input; 251 chars; whitespace only.

## 8. Dependencies / order
Core → (schema) → dashboard + storefront in parallel. Dashboard/storefront codegen need local API running with the migrated schema (migrate the **local dev DB** only).

## 9. Assumptions (A)
- A1 empty string and null are both "no value"; API returns what was stored.
- A2 `saleor-dashboard` tracked schema diff may include unrelated drift from local core 3.23.41 (accepted by user; will be reported).
- A3 Local API process must be restarted after migration/code change (runtime unverified, WA-06).
- A4 Don't commit; leave changes in working trees.

## 10. Affected files (est.)
saleor: product/models.py, migration, graphql product inputs/types, translations types+mutation, webhook/payloads.py, csv export, schema.graphql, CHANGELOG, tests. dashboard: fragments, queries/mutations, ProductUpdatePage/*, ProductDetailsForm, create dialog, translations page, generated, defaultMessages.json, tests. storefront: ProductDetails.graphql, mapper/contract, pdp component, messages ×8, locks, tests.

</CRITICAL>
