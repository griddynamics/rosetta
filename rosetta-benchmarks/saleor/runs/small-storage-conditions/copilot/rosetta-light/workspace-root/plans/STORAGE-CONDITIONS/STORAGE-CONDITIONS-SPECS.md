# Storage Conditions — Technical Specification

## TLDR

- **Status:** Draft; no implementation approval yet.
- Add `storageConditions`: optional normalized plain text, maximum 250 characters.
- Store base text on `Product`; store locale overrides on `ProductTranslation`.
- Input trimming converts whitespace-only content to an unset value; newlines are not preserved.
- `productUpdate` and `productTranslate` accept the additive nullable field.
- Dashboard exposes base and localized fields in their existing product editing surfaces.
- The storefront PDP shows a labeled block after the description when the resolved value exists.
- Locale resolution uses a non-empty translation, otherwise the non-empty base value.

## 1. Scope and Requirements

| ID | Requirement | Verification |
|---|---|---|
| FR-SC-001 | Staff can set, clear, and translate product storage conditions. | Core mutation and Dashboard tests |
| FR-SC-002 | The value is plain text, normalized, optional, and capped at 250 characters. | Model, API, and form tests |
| FR-SC-003 | PDP shows the localized non-empty value or base fallback after the description. | Storefront mapper/component tests |
| FR-SC-004 | PDP hides the block when neither localized nor base text exists. | Storefront component test |
| FR-SC-005 | The value is absent from cart, checkout, order emails, and unrelated surfaces. | Query/component scope inspection |

Out of scope: regulatory temperature parsing, structured storage metadata, new permissions, catalog search/indexing, carts, checkout, orders, and emails.

## 2. Data and API Contract

### Persistence

- `Product.storage_conditions`: nullable `CharField(max_length=250, blank=True)`.
- `ProductTranslation.storage_conditions`: nullable `CharField(max_length=250, blank=True)`.
- Migration adds both columns. Existing products and translations remain unset.
- Normalization applies to both base and translated input:
  - trim leading/trailing whitespace;
  - replace line breaks with spaces before storage;
  - collapse resulting whitespace;
  - persist an empty result as `NULL`;
  - reject normalized text over 250 characters.
- Omitted mutation input leaves the existing value unchanged. Explicit `null`, empty, or whitespace-only input clears it.

### GraphQL

All additions are nullable and additive:

```graphql
type Product { storageConditions: String }
type ProductTranslation { storageConditions: String }
input ProductInput { storageConditions: String }
input TranslationInput { storageConditions: String }
```

- `productUpdate` persists the base value through `ProductInput`.
- `productTranslate` persists the locale value through the shared `TranslationInput`; no product-only translation input or breaking `productTranslate` change is introduced.
- Field visibility follows existing `Product` visibility rules. Updates retain `MANAGE_PRODUCTS`.
- Regenerate `saleor/graphql/schema.graphql`; never edit generated SDL directly.

## 3. Dashboard Contract

- Product create/update General Information exposes a single-line text input labeled **Storage conditions** after Description.
- Product translations exposes the same labeled input with the selected locale's value.
- Inputs are optional, normalize line breaks and whitespace before enforcing/counting the 250-character limit, and display the remaining/maximum length using established Dashboard form conventions.
- The update form sends a changed base value via `ProductInput.storageConditions`.
- The translation form sends a changed locale value through the existing `productTranslate` input.
- Empty/whitespace-only values clear the corresponding base or translation value.
- Existing product permission routing remains unchanged.
- Refresh the release-compatible Dashboard schema and regenerate operation types; no generated source is hand-edited.

## 4. Storefront Contract

- The product detail query selects `storageConditions` on `Product` and its selected locale translation.
- Product mapping resolves:
  1. normalized non-empty selected-locale translation;
  2. otherwise normalized non-empty base `storageConditions`;
  3. otherwise `null`.
- The PDP renders **Storage conditions** as a separate plain-text block immediately after the Description block in the product description area.
- The PDP escapes/renders it as text, never rich HTML.
- The block is hidden for a `null` resolved value.
- No product list, cart, checkout, order, email, or other storefront query/component changes.
- Regenerate storefront GraphQL types from the running compatible API.

## 5. Error Handling and Compatibility

- Overlength input returns the repository-standard GraphQL field validation error; the Dashboard prevents it client-side.
- Invalid/unavailable product and permission failures retain current mutation semantics.
- The field is nullable in outputs and optional in inputs, so clients that neither query nor send it retain current behavior.
- Translation fallback is display-only: a missing translation never mutates or copies the base value.

## 6. Test Strategy

| Requirement | Focused evidence |
|---|---|
| FR-SC-001 | Core `productUpdate` and `productTranslate`: set, clear with `null`/empty/whitespace, omitted input unchanged, permission denial; Dashboard base and translation mutation variable tests |
| FR-SC-002 | Core: trim, whitespace-only clear, newline normalization, exactly 250 normalized characters accepted, 251 rejected; Dashboard normalized length/count parity |
| FR-SC-003 | Storefront mapper: locale value wins; PDP renders label and resolved text after description |
| FR-SC-004 | Storefront mapper/component: missing and whitespace-only base/translation hide block |
| FR-SC-005 | Review product operation selections and render sites; focused PDP test confirms scope |

Validation order: core migration and targeted mutation tests → generated API schema → Dashboard schema/codegen and focused tests → Storefront codegen, mapper/component tests, and repository verification.

## 7. Security and Dependencies

- Plain text is rendered as text; no new HTML, token, or permission surface is introduced.
- Content is product metadata, not a secret or customer data. Follow existing staff permission and product visibility enforcement.
- Dependencies: Django migration/Graphene schema in `saleor`; Apollo generated types in `saleor-dashboard`; GraphQL code generation in `react-storefront`. No new package is required.

## 8. Affected Files and Traceability

| Area | Expected files |
|---|---|
| Core | `saleor/product/models.py`, next `saleor/product/migrations/*`, `graphql/product/types/products.py`, product input/cleaner/mutations, product mutation/translation tests, generated schema |
| Dashboard | product fragments/queries/mutations, product details form/update handlers, product translation form/handlers, focused tests, compatible schema/generated types |
| Storefront | `graphql/ProductDetails.graphql`, product contract/mapper, PDP description component, mapper/component tests, generated local types |

Discovery evidence and file-line map: `catalog-contract-discovery` agent report, 2026-10-29. Exact files must be reconfirmed by the implementation owner before edits.
