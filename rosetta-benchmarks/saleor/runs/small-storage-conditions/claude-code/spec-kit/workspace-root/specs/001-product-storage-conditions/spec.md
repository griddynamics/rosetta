# Feature Specification: Product Storage Conditions

**Feature Branch**: `001-product-storage-conditions`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Products need a \"storage conditions\" field (e.g. \"Keep refrigerated at 2–8 °C\"). Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront. Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff set storage conditions on a product (Priority: P1)

A staff member editing a product in the dashboard enters free-text storage conditions (for example "Keep refrigerated at 2–8 °C"), saves the product, and later sees the same text when reopening it. They can edit or clear the text at any time.

**Why this priority**: Without the ability to record the data, nothing can be shown to customers. It is the foundation of the feature.

**Independent Test**: Open a product in the dashboard, enter storage conditions, save, reload the page, and confirm the value is persisted; then clear it, save, and confirm it is empty.

**Acceptance Scenarios**:

1. **Given** a product with no storage conditions, **When** staff enter "Keep refrigerated at 2–8 °C" and save, **Then** the product retains that text and it is shown on reopening the product.
2. **Given** a product with storage conditions, **When** staff change the text and save, **Then** the new text replaces the old one.
3. **Given** a product with storage conditions, **When** staff clear the field and save, **Then** the product has no storage conditions.
4. **Given** a staff member without permission to edit products, **When** they view a product, **Then** they cannot change its storage conditions.

---

### User Story 2 - Customers see storage conditions on the storefront (Priority: P1)

A customer viewing a product page on the storefront sees the storage conditions as part of the product description area, so they know how to store the product after purchase.

**Why this priority**: This is the customer-facing value that motivates the feature.

**Independent Test**: Set storage conditions on a product, open its storefront page, and confirm the text appears within the description area; open a product without storage conditions and confirm nothing extra (no empty label) appears.

**Acceptance Scenarios**:

1. **Given** a product with storage conditions "Keep refrigerated at 2–8 °C", **When** a customer opens its storefront page, **Then** the text is visible in the product description, clearly labelled as storage conditions.
2. **Given** a product without storage conditions, **When** a customer opens its storefront page, **Then** no storage-conditions label or empty section is displayed.
3. **Given** staff update the storage conditions, **When** a customer next loads the product page, **Then** the updated text is displayed.

---

### User Story 3 - Staff translate the storage conditions (Priority: P2)

A staff member opens the product translation page for a language, sees the original storage conditions next to an input for the translation, enters the translated text and saves. Customers browsing in that language then see the translated text; customers in other languages, or when the translation is empty, see the original.

**Why this priority**: Storage instructions are safety-relevant, so shops selling in several languages need them in the customer's language, but the feature is already useful with a single language.

**Independent Test**: Set storage conditions on a product, add a translation for one language, then load the storefront product page in that language and in another one.

**Acceptance Scenarios**:

1. **Given** a product with storage conditions, **When** staff enter and save a translation for a language, **Then** it is shown on the translation page on reload and to customers browsing in that language.
2. **Given** a translation exists, **When** staff clear it and save, **Then** customers in that language see the original text again.
3. **Given** a language with no storage-conditions translation, **When** a customer views the product in that language, **Then** the original text is shown.
4. **Given** a translation longer than 250 characters, **When** staff save it, **Then** it is rejected with an error on the field and nothing is saved.
5. **Given** a staff member without translation permission, **When** they try to save a translation, **Then** it is rejected.

---

### User Story 4 - Storage conditions reach integrations and exports (Priority: P3)

External systems that subscribe to product webhooks receive the storage conditions with the rest of the product data, and staff can export them with the product CSV.

**Why this priority**: Integrations and bulk data work need the same data staff and customers see, but the feature already works end to end without them.

**Independent Test**: Set storage conditions on a product, trigger a product webhook payload and a CSV export that includes the new column, and check the value appears in both.

**Acceptance Scenarios**:

1. **Given** a product with storage conditions, **When** a product webhook payload is generated, **Then** it contains the storage conditions; for a product without them it contains an empty value.
2. **Given** staff select the storage conditions column in the product export, **When** the export runs, **Then** the file has a "storage conditions" column with each product's value.
3. **Given** a product export without that column selected, **When** the export runs, **Then** the file is unchanged from before.

---

### Edge Cases

- Text containing special characters (e.g. "–", "°C", accents, quotes, `<` or `&`) is stored and displayed exactly as entered and is never interpreted as markup.
- Whitespace-only input is treated as empty.
- Very long text is rejected with a clear message once it exceeds the maximum length, rather than being silently truncated.
- Existing products created before this feature have no storage conditions and continue to display normally.
- A translation exists for a language but its storage-conditions text is empty or whitespace-only: customers see the base value, not an empty line.
- A product has a translation (e.g. a translated name) for a language but no storage-conditions translation: customers still see the base value.
- A translation is longer than the maximum length: it is rejected with a clear error, like the base value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every product MUST support an optional "storage conditions" text value.
- **FR-002**: Staff with product-editing permission MUST be able to set, change, and clear a product's storage conditions from the dashboard product page.
- **FR-003**: The dashboard MUST display the current storage conditions when a product is opened and persist changes on save.
- **FR-004**: The storefront product page MUST display the storage conditions within the product description area, with a visible label, when a value is present.
- **FR-005**: The storefront MUST NOT display any storage-conditions label or empty block when a product has no value.
- **FR-006**: Storage conditions MUST be displayed as plain text exactly as entered, with no markup interpretation.
- **FR-007**: Whitespace-only values MUST be stored as empty; values over the maximum length (250 characters) MUST be rejected with a clear error.
- **FR-008**: Products existing before this feature MUST remain valid and unchanged, with no storage conditions.
- **FR-010**: Staff with translation permission MUST be able to set, change and clear a translation of the storage conditions per language, on the same translation screen as the product name and description.
- **FR-011**: The storefront MUST show the translation for the customer's language when one exists; an empty or missing translation MUST fall back to the base value.
- **FR-012**: A translation MUST follow the same rules as the base value: plain text, trimmed, whitespace-only treated as empty, at most 250 characters.
- **FR-013**: The storage conditions MUST be part of the product wherever the product is delivered by the API, including the product payloads of product webhooks (created, updated and deleted events).
- **FR-014**: Staff MUST be able to include the storage conditions as a column in the product CSV/spreadsheet export, selectable like name and description, with the base (untranslated) value.
- **FR-009**: Storage conditions MUST be publicly readable wherever the product's description is publicly readable, and editable only by users permitted to edit products.

### Key Entities

- **Product**: Gains one optional attribute, *storage conditions* — a short free-text statement describing how the product must be stored (e.g. temperature, humidity, light).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A staff member can add storage conditions to a product and save it in under 1 minute, with the value present on reopening in 100% of attempts.
- **SC-002**: 100% of products with storage conditions show them on their storefront page, and 0% of products without them show an empty label or block.
- **SC-003**: After staff save a change, customers see the updated text on their next page load.
- **SC-004**: All existing product creation, editing, and viewing flows continue to work with no regressions, and the automated tests for the dashboard, API, and storefront all pass locally.

## Assumptions

- Storage conditions are a single free-text field (not structured temperature ranges or a predefined list); the example in the request is illustrative.
- The field is optional; no product is required to have a value.
- Maximum length is 250 characters (set explicitly by the requester; originally drafted as 500).
- The field is translatable per language like the product name and description (requested after the first draft), and is not tied to product variants; it applies to the product as a whole.
- Translating needs the existing translation permission, not the product-edit permission.
- On the product translation page the field counts in the page's progress bar like the other optional fields (for example the search-engine fields); the completion shown in the translation language list is unchanged.
- Placement on the dashboard is the product details/edit page, and on the storefront is the existing product description section.
- Existing permission model for editing products is reused; no new roles are introduced.
- The delivery scope covers all three sub-projects (backend, dashboard, storefront) with automated tests and lint passing locally, per the project constitution.
- Out of scope: search or filtering by storage conditions (no filter, sort or search-index changes), and display in emails or invoices.
