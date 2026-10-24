---

description: "Task list for Product Minimum Age Restriction"
---

# Tasks: Product Minimum Age Restriction

**Input**: Design documents from `/specs/001-product-minimum-age/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql-schema.md, quickstart.md

**Tests**: Included. The project constitution (Principle IV) requires automated tests for every change.

**Organization**: Grouped by user story. Paths are relative to the workspace root, where `saleor/`, `saleor-dashboard/` and `react-storefront/` sit side by side. Don't commit or push; leave changes in the working tree.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Inspect how existing tests, schema build, and codegen are run in each repo (`saleor/CLAUDE.md`, `saleor/package.json`, `saleor-dashboard/package.json`, `react-storefront/package.json`) and note the exact commands to use in quickstart verification

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Model fields shared by all stories

- [X] T002 [P] Add `minimum_age = models.PositiveSmallIntegerField(null=True, blank=True)` to `Product` in `saleor/saleor/product/models.py` (nullable; null = unrestricted; values ≥ 1) and create the migration in `saleor/saleor/product/migrations/`
- [X] T003 [P] Add `birthday = models.DateField(null=True, blank=True)` to `User` in `saleor/saleor/account/models.py` (nullable; not in the future) and create the migration in `saleor/saleor/account/migrations/`
- [X] T004 Run the migrations locally and confirm the existing model/migration check tests pass (`saleor/saleor/tests/` migration check)

**Checkpoint**: Fields exist; stories can start.

---

## Phase 3: User Story 1 - Staff mark a product with a minimum age (Priority: P1)

**Goal**: Staff can set, change and clear a product's minimum age.

**Independent Test**: Set minimum age 18 via dashboard/API, reload and see 18; clear it; reject 0, negative values.

### Tests for User Story 1

- [X] T005 [P] [US1] Add backend tests in `saleor/saleor/graphql/product/tests/mutations/` for `productCreate`/`productUpdate` with `minimumAge`: set, clear with null, reject 0 and negative with `ProductError{field:"minimumAge", code:INVALID}`, and `Product.minimumAge` query output
- [X] T006 [P] [US1] Add dashboard tests next to the product form component in `saleor-dashboard/src/products/components/` covering rendering and submitting the minimum age field

### Implementation for User Story 1

- [X] T007 [US1] Add `minimum_age = graphene.Int(...)` to `ProductInput` in `saleor/saleor/graphql/product/mutations/product/product_create.py` and validate it is ≥ 1 (reuse the cleaner in `product_cleaner.py`, error code `INVALID`); ensure `productUpdate` saves it
- [X] T008 [US1] Expose `minimumAge: Int` on the `Product` GraphQL type in `saleor/saleor/graphql/product/types/products.py`
- [X] T009 [US1] Regenerate `saleor/saleor/graphql/schema.graphql` with the repo's schema build command and add a CHANGELOG entry in `saleor/CHANGELOG.md` following existing style
- [X] T010 [US1] Update the dashboard product fragments, queries and update/create mutation inputs under `saleor-dashboard/src/products/` and `saleor-dashboard/src/fragments/` to include `minimumAge`; refresh the schema and generated types in `saleor-dashboard/src/graphql/` with the repo's codegen
- [X] T011 [US1] Add a "Minimum age" number input to the product page (`saleor-dashboard/src/products/components/ProductUpdatePage`, `ProductCreatePage`, and the form/data/submit handling they use), with intl messages, empty = unrestricted
- [X] T012 [US1] Run backend product tests and dashboard tests, lint and `tsc`; fix failures

**Checkpoint**: US1 works end to end.

---

## Phase 4: User Story 2 - Customers record their birthday (Priority: P1)

**Goal**: Birthday can be set, changed and cleared on the customer profile by the customer and staff.

**Independent Test**: Save a birthday, reload, see it; future date rejected; clear it.

### Tests for User Story 2

- [X] T013 [P] [US2] Add backend tests in `saleor/saleor/graphql/account/tests/` for `customerCreate`, `customerUpdate`, `accountUpdate` with `birthday`: set, clear, future date rejected with `AccountError{field:"birthday", code:INVALID}`, and `User.birthday` visibility (owner and staff with manage-users only)
- [X] T014 [P] [US2] Add dashboard tests beside `saleor-dashboard/src/customers/components/CustomerDetailsPage/` and `CustomerCreatePage/` for the birthday field
- [X] T015 [P] [US2] Add storefront tests next to the changed profile code in `react-storefront/src/app/(storefront)/[locale]/[channel]/(main)/account/` for saving a birthday

### Implementation for User Story 2

- [X] T016 [US2] Add `birthday = graphene.Date(...)` to `CustomerInput` in `saleor/saleor/graphql/account/mutations/base.py` and to `AccountInput`/`AccountBaseInput` in `saleor/saleor/graphql/account/mutations/account/`, validate not in the future (`INVALID`), and make sure the update-field lists (e.g. `ACCOUNT_UPDATE_FIELDS` in `account/utils.py`) include it
- [X] T017 [US2] Expose `birthday: Date` on `User` in `saleor/saleor/graphql/account/types.py`, restricted to the owner or staff with manage-users permission like other personal fields
- [X] T018 [US2] Regenerate `saleor/saleor/graphql/schema.graphql` and extend the CHANGELOG entry
- [X] T019 [US2] Update the dashboard customer fragments/queries/mutations in `saleor-dashboard/src/customers/` and `saleor-dashboard/src/fragments/`; regenerate types; add a date field with intl messages to `CustomerCreateDetails`/`CustomerCreatePage` and `CustomerDetailsPage`
- [X] T020 [US2] Add `birthday` to `react-storefront/src/graphql/CurrentUserProfile.graphql` (and `UserDetails` fragment if appropriate), regenerate gql types with the repo's codegen, and add a birthday field to the account profile form and its server action (`account/actions.ts`) using the existing `AccountUpdate` mutation, with i18n messages in `react-storefront/messages/`
- [X] T021 [US2] Run backend account tests, dashboard and storefront tests, lint and `tsc`; fix failures

**Checkpoint**: US1 and US2 work independently.

---

## Phase 5: User Story 3 - Underage customers cannot buy restricted products (Priority: P1)

**Goal**: Purchases of restricted products are refused unless the customer's age ≥ the minimum age.

**Independent Test**: Product restricted to 18: 17-year-old blocked, turns 18 today allowed, no birthday blocked, guest blocked, mixed cart blocked and lists items, unrestricted products unaffected.

### Tests for User Story 3

- [X] T022 [P] [US3] Add unit tests for the age helper in `saleor/saleor/checkout/tests/` (completed-years math: day before/on birthday, 29 Feb in non-leap year, no birthday, guest, no restriction)
- [X] T023 [P] [US3] Add API tests in `saleor/saleor/graphql/checkout/tests/mutations/` for `checkoutCreate`, `checkoutLinesAdd`, `checkoutComplete`, `orderCreateFromCheckout`: under-age, exactly of age, no birthday, guest, mixed cart (error lists restricted variants), unrestricted product, and re-check at complete after birthday/product age change or customer attach
- [X] T024 [P] [US3] Add storefront tests next to the add-to-cart and checkout error handling code in `react-storefront/src/app/actions.ts` and `react-storefront/src/checkout/` for the two new error codes

### Implementation for User Story 3

- [X] T025 [US3] Add `PRODUCT_AGE_RESTRICTED` and `BIRTHDAY_REQUIRED` to `CheckoutErrorCode` and `OrderCreateFromCheckoutErrorCode` in `saleor/saleor/checkout/error_codes.py` (and any mirrored GraphQL error enums in `saleor/saleor/graphql/core/enums.py`)
- [X] T026 [US3] Implement the helper in `saleor/saleor/checkout/checkout_cleaner.py`: compute age in completed years (`today.year - b.year - ((today.month, today.day) < (b.month, b.day))`), return `ValidationError` on `lines` with `params={"variants": [global IDs]}` for ineligible lines; guest or missing birthday → `BIRTHDAY_REQUIRED`, too young → `PRODUCT_AGE_RESTRICTED`; unrestricted lines ignored
- [X] T027 [US3] Call the helper from `saleor/saleor/graphql/checkout/mutations/checkout_create.py` and `checkout_lines_add.py` (variants being added, using the checkout/requesting user)
- [X] T028 [US3] Call the helper on completion in `saleor/saleor/checkout/complete_checkout.py` (`_prepare_checkout`) and in `validate_checkout` in `checkout_cleaner.py` used by `order_create_from_checkout.py`, so `checkoutComplete` and `orderCreateFromCheckout` re-check; map codes into each mutation's error enum
- [X] T029 [US3] Regenerate `saleor/saleor/graphql/schema.graphql`; update CHANGELOG
- [X] T030 [US3] Refresh storefront generated types and show clear messages for `PRODUCT_AGE_RESTRICTED` (naming affected items) and `BIRTHDAY_REQUIRED` (prompting to add birthday in profile) in the add-to-cart and checkout flows, with i18n entries in `react-storefront/messages/`
- [X] T031 [US3] Run backend checkout tests, storefront tests, lint and `tsc`; fix failures

**Checkpoint**: Full feature works end to end.

---

## Phase 6: Polish & Cross-Cutting

- [X] T032 Run the broader affected suites in each repo (backend product/account/checkout/graphql; dashboard `npm run test`; storefront `pnpm test`) and linters (ruff, mypy, eslint, tsc); everything must pass
- [X] T033 Walk through the manual scenarios in `specs/001-product-minimum-age/quickstart.md` against a local stack
- [X] T034 Summarize changes and how they were verified (leave changes uncommitted)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. US1 and US2 are independent after Phase 2 and can run in parallel; US3 needs T002/T003 (and its tests use US1/US2 inputs, so finish T007 and T016 first).
- Schema regeneration (T009, T018, T029) must precede the matching frontend codegen tasks (T010, T019, T020, T030).
- Within a story: tests → backend → schema → frontends → verification.

## Parallel Examples

- T002 ‖ T003; T005 ‖ T006; T013 ‖ T014 ‖ T015; T022 ‖ T023 ‖ T024.
- After T018: T019 ‖ T020.

## Implementation Strategy

MVP = Phase 2 + US1 + US3 backend (staff flags, enforcement) using the API; then US2 UI. Since US3 requires birthdays, deliver US2 backend before US3 tests. Validate after each checkpoint.

---

## Phase 7: Convergence

- [X] T035 Make the storefront age-restriction messages name the affected items: map the `variants` IDs returned with `PRODUCT_AGE_RESTRICTED` and `BIRTHDAY_REQUIRED` to product names in the add-to-cart flow (`react-storefront/src/app/actions.ts`, `react-storefront/src/ui/components/pdp/add-to-cart-form.tsx`) and the checkout completion flow (`react-storefront/src/app/(checkout)/actions.ts`, `react-storefront/src/checkout/lib/age-restriction-error-message.ts`), add i18n strings in `react-storefront/messages/*.json`, and add vitest tests per US3/AC4 and FR-009 (partial)
- [X] T036 Run the manual end-to-end scenarios in `specs/001-product-minimum-age/quickstart.md` against a local stack, and confirm that the storefront `core:lock:check` and `docs:check` failures and the unrun `knip` check are not caused by this feature (compare against the unmodified code; run `knip` with `NEXT_PUBLIC_SALEOR_API_URL` set to the local schema file); report any failure per Constitution V (partial)
- [X] T037 [P] Cap the birthday date inputs at today (`max` attribute) in `saleor-dashboard/src/customers/components/CustomerInfo/CustomerInfo.tsx` and `saleor-dashboard/src/customers/components/CustomerCreateDetails/CustomerCreateDetails.tsx`, with a test per FR-005 and US2/AC2 (partial)
- [X] T038 [P] Add a link to the account profile page in the storefront checkout `BIRTHDAY_REQUIRED` message, or record in `specs/001-product-minimum-age/spec.md` Assumptions why it is omitted, per FR-009 and US3/AC3 (partial)
- [X] T039 [P] Decide whether the dashboard product-create dialog (`saleor-dashboard/src/products/components/ProductList` create flow, `createMinimalProduct`) needs a minimum-age field per FR-001 and US1; if not, record the decision in `specs/001-product-minimum-age/spec.md` Assumptions (partial)
