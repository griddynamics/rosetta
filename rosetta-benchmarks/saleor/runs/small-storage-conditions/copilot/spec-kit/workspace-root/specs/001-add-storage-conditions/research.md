# Research: Add Storage Conditions

## Product and translation persistence

**Decision**: Add nullable, blank plain-text fields named `storage_conditions` to the product and product-translation records, each limited to 250 characters. Normalize line breaks before validating and persisting the value. Add one schema migration without a backfill.

**Rationale**: `Product` and `ProductTranslation` already hold product-specific and localized content. Nullable optional fields keep existing products empty and preserve their behavior. A shared field definition/validation helper prevents divergent length or newline behavior between base and translated values.

**Alternatives considered**:

- Product attribute: rejected because the field requires a fixed public API contract, first-class translations, and one consistent PDP placement.
- Rich-text description content: rejected because the field must be plain text, separately labeled, length-limited, and removable independently.
- Data backfill: rejected because existing products must remain unchanged.

## GraphQL API and authorization

**Decision**: Add `storageConditions` to product and product-translation output types and to `ProductInput`. Add it once to the shared `TranslationInput`, keep the `productTranslate` signature unchanged, and support the field only for product translations. Require `MANAGE_PRODUCTS` to mutate base or translated storage conditions. All other mutations using the shared input reject a supplied value with `TranslationErrorCode.INVALID`. Enforce the 250-character normalized value in accepted mutation paths.

**Rationale**: Saleor's product GraphQL types and `ProductInput` already expose and mutate corresponding product content. `productTranslate` already receives the shared `TranslationInput`, so extending that input preserves its public signature. Applying the same product-management permission to the new translated field keeps it consistent with other product fields. Per-mutation rejection prevents non-product translations from accepting an unsupported field. The product field remains publicly readable under existing product visibility behavior.

**Alternatives considered**:

- A separate mutation: rejected because it duplicates product permission, error, and save behavior.
- A private-only API field: rejected because the storefront must read the field through the public product API.
- A product-specific translation input: rejected because it would change the established shared input contract and unnecessarily alter `productTranslate`.

## Dashboard editing and translation

**Decision**: Add a normal text input with a visible 250-character limit to the product details form, include the field in product query fragments and update payload composition, and add an equivalent field to the existing product translation section and translation mutation payload.

**Rationale**: `ProductDetailsForm` already uses Macaw inputs for scalar product fields. `TranslationsProductsPage` builds the product name/description section from reusable translation-field configuration, which keeps the new field alongside existing product translations.

**Alternatives considered**:

- A separate dashboard page: rejected because staff must manage it with other product fields and translations.
- A multiline editor: rejected because line breaks are not retained.

## Storefront data, translations, and presentation

**Decision**: Request `storageConditions` on the existing PDP product query, carry it through the existing translated-product and view-model transformations, and render a labeled accordion block immediately after the description when the resolved value is non-empty.

**Rationale**: `getProductData` already sends locale variables and `withTranslatedProductFields` resolves translated product fields. `ProductAttributes` owns the description area and conditionally renders adjacent informational blocks, so it is the narrowest PDP-only display point.

**Alternatives considered**:

- Rendering in the buy box: rejected because the approved placement is after the description.
- Rendering through cart or order data: rejected because those surfaces are expressly out of scope.

## Generated clients and validation

**Decision**: Regenerate dashboard and storefront GraphQL artifacts after updating their operations/fragments, then cover model/mutation/query, dashboard form/save/translation, and storefront mapper/PDP behavior with the repositories' existing test frameworks.

**Rationale**: Both TypeScript clients consume generated GraphQL types. Tests at each boundary ensure the length, newline normalization, permission, translation fallback, and empty-state rules remain consistent.

**Alternatives considered**:

- Hand-maintaining generated types: rejected because it bypasses repository code-generation workflows.

## Webhooks, CSV exports, and discovery

**Decision**: Add the base product value to the existing product webhook serializer fields and to the selectable product CSV export header/field mapping and row data. Do not extend product filters, search indexes, or search queries.

**Rationale**: Product webhooks and CSV exports serialize explicit product fields, so they require deliberate inclusion. The request explicitly excludes discovery behavior, keeping product query performance and semantics unchanged.

**Alternatives considered**:

- Translation-specific webhook or CSV values: rejected because the requested export and webhook inclusion is for the product field, while the base value is the unambiguous product-level value.
- Search/filter support: rejected because it is out of scope.
