# Storage Conditions for Products

## Problem and approach

Add a nullable, plain-text `storage_conditions` field to products and a matching nullable translated field to product translations. Expose both through Saleor GraphQL, allow staff to edit the base value on the product form and localized values on the product translation page, then render the locale-resolved value on the storefront PDP. An absent, empty, or whitespace-only translation must use the base product value.

## Todos

1. **Extending Saleor persistence and product GraphQL**
   - Add nullable `storage_conditions` columns to `Product` and `ProductTranslation`, including a generated migration.
   - Add the field to `ProductInput`, `TranslationInput`, `Product`, and `ProductTranslation`, relying on the existing model-mutation construction and translation update flow.
   - Include the translated field in product translation keys so translation webhooks/events identify changes.
   - Add focused API tests for base-value create/update/clear behavior, translated mutation behavior, and query exposure.

2. **Adding Dashboard editing and translation support**
   - Regenerate Dashboard GraphQL types after extending product and translation fragments.
   - Add a labeled plain-text input to the product general-information form and thread its state through product hydration, submit data, and `productUpdate` variables, preserving explicit clearing.
   - Add storage conditions as a translatable field in the product translation data fragment and translation section, with a matching label and app-form bridge payload/cache support if required by the existing translation form contract.
   - Add focused Dashboard component/handler tests for initial values, submit/clear payloads, and translated-field configuration.

3. **Displaying locale-resolved conditions on the storefront PDP**
   - Select base and translated storage conditions in `ProductDetails.graphql`.
   - Apply the existing non-empty translated-field fallback convention in `withTranslatedProductFields`, then add the resolved field to `ProductView` and `toProductView`.
   - Render it as an optional dedicated “Storage conditions” accordion entry in the existing product description/details area, using a localized label and omitting the entry when no base or translation value exists.
   - Update mapper/component tests to cover translated output, empty-translation fallback, and absent-value omission; regenerate storefront GraphQL artifacts.

4. **Validating the end-to-end change**
   - Run the focused Saleor GraphQL product and translation test modules plus migration checks.
   - Run affected Dashboard unit tests, GraphQL code generation/type checking, and linting.
   - Run affected storefront Vitest tests, GraphQL code generation/type checking, and linting.

## Notes and considerations

- Storage conditions are product-level, not variant- or channel-specific.
- The field is plain text rather than Editor.js rich content; display it as text, not HTML.
- The source locale retains the base value. Locale-specific entries override it only when non-empty after trimming, matching the storefront’s existing translation fallback behavior.
- The new backend API field will be additive and nullable, preserving existing clients and existing product data.
- Reuse existing Dashboard form, translation-section, and storefront PDP accordion patterns rather than introducing a new surface or dependency.
