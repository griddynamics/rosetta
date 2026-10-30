# Tasks: Add Storage Conditions

**Input**: Design documents from `specs/001-add-storage-conditions/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/product-storage-conditions.graphql.md](contracts/product-storage-conditions.graphql.md), [quickstart.md](quickstart.md)

**Tests**: Required by the feature definition and the project constitution.

**Organization**: Tasks are grouped by user story so each completed phase can be validated independently.

## Phase 1: Setup

**Purpose**: Confirm the existing code-generation and test workflows before changing contracts.

- [X] T001 Verify the dashboard GraphQL generation and targeted Jest commands in `saleor-dashboard/package.json`.
- [X] T002 [P] Verify the storefront GraphQL generation, Vitest, type-check, and lint commands in `react-storefront/package.json`.
- [X] T003 [P] Review product model, product translation, webhook, and CSV export conventions in `saleor/saleor/product/models.py`, `saleor/saleor/webhook/payloads.py`, and `saleor/saleor/csv/utils/products_data.py`.

---

## Phase 2: Foundational API and persistence

**Purpose**: Establish the single product-level field and stable GraphQL contract used by all stories.

**⚠️ CRITICAL**: Complete this phase before dashboard or storefront work.

- [X] T004 Add nullable, blank `storage_conditions` fields to `Product` and `ProductTranslation` in `saleor/saleor/product/models.py`; enforce the data-model rule verbatim: "Maximum 250 characters after line-break normalization; empty is allowed and represents no value."
- [X] T005 Create the schema-only migration for both new fields in `saleor/saleor/product/migrations/`; do not backfill or transform existing rows.
- [X] T006 Add shared normalization and validation for base and translated storage conditions in `saleor/saleor/graphql/product/mutations/product/product_create.py` and `saleor/saleor/graphql/translations/mutations/utils.py`; enforce the rule verbatim: "A normalized value longer than 250 characters is rejected through the existing product mutation error mechanism."
- [X] T007 Extend product GraphQL output and `ProductInput` with `storageConditions` in `saleor/saleor/graphql/product/types/products.py` and `saleor/saleor/graphql/product/mutations/product/product_create.py`, resolving a non-empty requested-language translation before the base value.
- [X] T008 Extend the shared `TranslationInput` in `saleor/saleor/graphql/translations/mutations/utils.py` and update `saleor/saleor/graphql/translations/mutations/product_translate.py` so `productTranslate` keeps its signature while storage-conditions writes require `MANAGE_PRODUCTS`.
- [X] T009 Reject `storageConditions` on every non-product translation mutation that consumes the shared input in `saleor/saleor/graphql/translations/mutations/`, returning `TranslationErrorCode.INVALID` at `storageConditions` without persistence.
- [X] T010 Update the generated Saleor schema snapshot in `saleor/saleor/graphql/schema.graphql` after the backend contract changes.

**Checkpoint**: A nullable product field, translation fallback, validation, authorization, and public GraphQL contract are available for the application layers.

---

## Phase 3: User Story 1 - Set Product Storage Conditions (Priority: P1) 🎯 MVP

**Goal**: Staff with `MANAGE_PRODUCTS` can save, edit, and clear a base plain-text value from the product details page.

**Independent Test**: Save a product with a 250-character-or-shorter value, reload it to verify persistence, update it, then clear it; confirm 251 normalized characters and an unauthorized mutation fail.

### Tests for User Story 1

- [X] T011 [P] [US1] Add base create/update/clear, 250-character boundary, newline-normalization, public-read, and `MANAGE_PRODUCTS` permission tests in `saleor/saleor/graphql/product/tests/mutations/test_product_update.py` and `saleor/saleor/graphql/product/tests/mutations/test_product_create.py`.
- [X] T012 [P] [US1] Add product webhook payload coverage for the base `storage_conditions` value in `saleor/saleor/webhook/tests/test_webhook_payloads.py`.
- [X] T013 [P] [US1] Add product CSV header and row-value coverage for the base `storage_conditions` column in `saleor/saleor/csv/tests/export/products_data/test_prepare_headers.py` and `saleor/saleor/csv/tests/export/products_data/test_get_products_data.py`.
- [X] T014 [P] [US1] Add form and save-composition coverage for the optional 250-character dashboard field on the product update page and product-list create dialog in `saleor-dashboard/src/products/components/ProductUpdatePage/form.test.ts`, `saleor-dashboard/src/products/components/ProductUpdatePage/saveComposition.test.ts`, and `saleor-dashboard/src/products/components/CreateProductDialog/CreateProductDialog.test.tsx`.

### Implementation for User Story 1

- [X] T015 [US1] Include `storageConditions` in product webhook serialization in `saleor/saleor/webhook/payloads.py`.
- [X] T016 [US1] Register the selectable `storage_conditions` export header and field mapping in `saleor/saleor/csv/utils/__init__.py` and emit its base value from `saleor/saleor/csv/utils/products_data.py`.
- [X] T017 [US1] Add `storageConditions` to the product dashboard fragment and detail query in `saleor-dashboard/src/fragments/products.ts` and `saleor-dashboard/src/products/queries.ts`.
- [X] T018 [US1] Add the optional single-line Storage conditions input with `maxLength={250}`, visible character-limit guidance, and product-error display to `saleor-dashboard/src/products/components/ProductDetailsForm/ProductDetailsForm.tsx`.
- [X] T019 [US1] Wire `storageConditions` through product-update form state and mutation payload composition in `saleor-dashboard/src/products/components/ProductUpdatePage/form.tsx`, `saleor-dashboard/src/products/components/ProductUpdatePage/types.ts`, and `saleor-dashboard/src/products/components/ProductUpdatePage/saveComposition.ts`.
- [X] T020 [US1] Add the same optional 250-character `storageConditions` input and create payload wiring to the product-list create flow in `saleor-dashboard/src/products/components/CreateProductDialog/CreateProductDialog.tsx`.
- [X] T021 [US1] Regenerate dashboard GraphQL artifacts in `saleor-dashboard/src/graphql/` using the existing `saleor-dashboard/package.json` generation script.

**Checkpoint**: Staff can manage base storage conditions; exports and product webhook payloads include the base value without adding product filtering or search.

---

## Phase 4: User Story 3 - View Product Storage Conditions (Priority: P1)

**Goal**: Customers see the resolved storage conditions only as a labeled PDP block immediately after the description.

**Independent Test**: A public product query and PDP show the saved base value; a product without a value shows no block, and no cart, checkout, or order-email surface changes.

### Tests for User Story 3

- [X] T022 [P] [US3] Add PDP GraphQL query and cached-product contract coverage for `storageConditions` in `react-storefront/src/lib/saleor/__contracts__/cached-query.contract.test.ts` and `react-storefront/src/lib/catalog/get-product-data.ts`.
- [X] T023 [P] [US3] Add view-model coverage for present and absent base storage conditions in `react-storefront/src/lib/storefront/mappers/product.test.ts`.
- [X] T024 [P] [US3] Add PDP component coverage that renders a labeled block after the description only for a non-empty value in `react-storefront/src/ui/components/pdp/product-attributes.tsx`.

### Implementation for User Story 3

- [X] T025 [US3] Request `storageConditions` in the PDP operation at `react-storefront/src/graphql/ProductDetails.graphql` and regenerate artifacts in `react-storefront/src/gql/`.
- [X] T026 [US3] Carry the optional resolved field through the storefront product contract and mapper in `react-storefront/src/lib/storefront/contract/product.ts` and `react-storefront/src/lib/storefront/mappers/product.ts`.
- [X] T027 [US3] Render the plain-text Storage conditions accordion block immediately after the description and hide it for empty values in `react-storefront/src/ui/components/pdp/product-attributes.tsx`.

**Checkpoint**: The storefront PDP shows the base value only in the approved description-area location.

---

## Phase 5: User Story 2 - Translate Storage Conditions (Priority: P2)

**Goal**: Staff can manage a localized value, and customers receive it in the selected storefront language with fallback to the base value.

**Independent Test**: Save a non-empty translated value for a language and confirm the localized PDP shows it; clear the translation and confirm the PDP falls back to the base value.

### Tests for User Story 2

- [X] T028 [P] [US2] Add product-translation create/update/clear, 250-character boundary, fallback, and `MANAGE_PRODUCTS` authorization tests in `saleor/saleor/graphql/translations/tests/mutations/test_product_translate.py`.
- [X] T029 [P] [US2] Add regression tests that every non-product translation mutation returns `INVALID` for `storageConditions` and persists nothing in `saleor/saleor/graphql/translations/tests/mutations/`.
- [X] T030 [P] [US2] Add dashboard translation section, payload, 250-character input, and translation-progress-count coverage in `saleor-dashboard/src/translations/components/TranslationsProductsPage/use-translation-product-form-app-response.test.ts`, `saleor-dashboard/src/translations/components/TranslationsProductsPage/`, and `saleor-dashboard/src/translations/progress.test.ts`.
- [X] T031 [P] [US2] Add storefront translated-value and empty-or-missing fallback coverage in `react-storefront/src/lib/saleor-translations.ts` and `react-storefront/src/lib/storefront/mappers/product.test.ts`.

### Implementation for User Story 2

- [X] T032 [US2] Expose `storageConditions` on product translations and implement non-empty translation-or-base resolution in `saleor/saleor/graphql/translations/types.py` and `saleor/saleor/graphql/product/types/products.py`.
- [X] T033 [US2] Add `storageConditions` to dashboard product translation fragments, detail query, and mutation payload in `saleor-dashboard/src/fragments/translations.ts`, `saleor-dashboard/src/translations/queries.ts`, and `saleor-dashboard/src/translations/mutations.ts`.
- [X] T034 [US2] Add the single-line, 250-character Storage conditions field, app-extension draft/cache handling, and translation-progress field registration to `saleor-dashboard/src/translations/components/TranslationsProductsPage/TranslationsProductsPage.tsx`, `saleor-dashboard/src/translations/translationSectionBuilders.ts`, `saleor-dashboard/src/translations/components/TranslationsProductsPage/use-translations-products-data-cache.ts`, and `saleor-dashboard/src/translations/progress.ts`.
- [X] T035 [US2] Extend the storefront translated-product transformation to use a non-empty localized storage-conditions value and otherwise the base value in `react-storefront/src/lib/saleor-translations.ts`.
- [X] T036 [US2] Regenerate dashboard and storefront GraphQL artifacts in `saleor-dashboard/src/graphql/` and `react-storefront/src/gql/` using their existing package scripts.

**Checkpoint**: Translated storage conditions are editable by product managers, replace the base value when non-empty, and fall back correctly when empty or absent.

---

## Phase 6: Polish and cross-cutting validation

**Purpose**: Verify the completed feature against its contract without expanding scope.

- [X] T037 [P] Run the focused Saleor pytest suites and formatter/linter described in `specs/001-add-storage-conditions/quickstart.md`.
- [X] T038 [P] Run the dashboard targeted Jest suite and source type check described in `specs/001-add-storage-conditions/quickstart.md`.
- [X] T039 [P] Run the storefront targeted Vitest suite, type check, and lint described in `specs/001-add-storage-conditions/quickstart.md`.
- [ ] T040 Perform the end-to-end manual scenarios for base values, translations, public API, webhooks, CSV export, empty states, and excluded cart/checkout/email surfaces in `specs/001-add-storage-conditions/quickstart.md`.

---

## Dependencies and execution order

- **Phase 1** has no dependencies.
- **Phase 2** depends on Phase 1 and blocks all user-story implementation.
- **US1 and US3** are P1 stories and may proceed in parallel after Phase 2; both depend on the backend contract.
- **US2** depends on Phase 2 and uses the completed base contract; it may proceed alongside US3 after the shared contract is stable.
- **Phase 6** depends on all implemented story phases.

## Parallel opportunities

- T001-T003 can be completed in parallel where repository context is independent.
- T011-T014, T022-T024, and T028-T031 are independent test tasks within their stories.
- After Phase 2, the dashboard-focused US1 work and storefront-focused US3 work can proceed concurrently.
- T037-T039 can run concurrently after the implementation is complete.

## Implementation strategy

### MVP first

1. Complete Phases 1 and 2.
2. Complete US1 so staff can save and manage base values, including webhook and CSV requirements.
3. Complete US3 to expose that base value on the PDP.
4. Validate the public API and base-value flow before adding translations.

### Incremental delivery

1. Add persistence and API contract.
2. Deliver base-value staff management and product-page visibility.
3. Add translations and fallback.
4. Run all repository-specific checks and the end-to-end scenarios.
