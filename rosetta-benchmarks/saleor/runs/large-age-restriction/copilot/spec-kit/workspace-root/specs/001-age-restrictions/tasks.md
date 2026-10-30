---

description: "Task list for Age-Restricted Products implementation"
---

# Tasks: Age-Restricted Products

**Input**: Design documents from `/specs/001-age-restrictions/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/graphql.md](contracts/graphql.md), and
[quickstart.md](quickstart.md)

**Tests**: Required by the feature definition of done and the project constitution. Add focused
tests before or alongside each behavior change using each repository's established test patterns.

**Organization**: Tasks are grouped by user story so each can be delivered and tested
independently after the foundational phase.

## Phase 1: Setup

**Purpose**: Confirm the existing, dependency-free development commands used by this feature.

- [X] T001 [P] Verify the existing backend test and migration commands in `saleor/pyproject.toml` and `saleor/manage.py` without adding dependencies.
- [X] T002 [P] Verify the GraphQL code-generation and focused test commands in `saleor-dashboard/package.json` and `react-storefront/package.json` without adding dependencies.

---

## Phase 2: Foundational

**Purpose**: Add shared persisted state, private schema primitives, and common eligibility logic
that block all user stories.

**⚠️ CRITICAL**: Complete this phase before implementing any user story.

- [X] T003 Add the nullable `is_age_restricted` Product flag, defaulting to false so existing Products remain unrestricted, and its migration in `saleor/saleor/product/models.py` and `saleor/saleor/product/migrations/`.
- [X] T004 [P] Add persistent SiteSettings fields for Minimum age, default 18, and an IANA shop time zone, default UTC, plus migration and validation in `saleor/saleor/site/models.py` and `saleor/saleor/site/migrations/`.
- [X] T005 [P] Add nullable Customer Birthday storage and its migration in `saleor/saleor/account/models.py` and `saleor/saleor/account/migrations/`, enforcing “Must be valid and not after today in the shop time zone.”
- [X] T006 Add reusable calendar-date age eligibility calculation, including “29 February reaches the anniversary on 1 March in a non-leap year,” in `saleor/saleor/account/age_restrictions.py`.
- [X] T007 Add Product flag, Minimum age, shop time zone, private Birthday, and permission-scoped age-eligibility schema fields and inputs in `saleor/saleor/graphql/product/`, `saleor/saleor/graphql/shop/`, and `saleor/saleor/graphql/account/`.
- [X] T008 Add structured guest, missing-Birthday, and underage checkout error codes in `saleor/saleor/graphql/checkout/error_codes.py`.
- [X] T009 Add focused model, validation, resolver, and permission tests for the foundational data rules in `saleor/saleor/product/tests/`, `saleor/saleor/site/tests/`, `saleor/saleor/account/tests/`, and `saleor/saleor/graphql/account/tests/`.

**Checkpoint**: Product, site policy, Customer data, eligibility calculation, and typed private
contracts are available for all user stories.

---

## Phase 3: User Story 1 - Buy an Age-Restricted Product (Priority: P1) 🎯 MVP

**Goal**: A Customer who meets the Minimum age can buy an Age-restricted product; guests,
Customers without a Birthday, and underage Customers are blocked at line changes and again at
checkout completion.

**Independent Test**: Using an Age-restricted Product and configured Minimum age, verify eligible,
underage, missing-Birthday, and guest checkouts through the API and storefront; then change
eligibility after line creation and verify completion remains authoritative.

### Tests for User Story 1

- [X] T010 [P] [US1] Add calendar-boundary tests for an eligible anniversary today, a 29 February Birthday on 1 March in a non-leap year, and shop-time-zone date comparison in `saleor/saleor/account/tests/test_age_restrictions.py`.
- [X] T011 [P] [US1] Add checkout-line mutation tests for eligible, underage, missing-Birthday, guest, mixed restricted/unrestricted, and unrestricted Product cases in `saleor/saleor/graphql/checkout/tests/mutations/test_checkout_lines_add.py` and `saleor/saleor/graphql/checkout/tests/mutations/test_checkout_lines_update.py`.
- [X] T012 [P] [US1] Add authoritative completion tests covering changed Product flags, Minimum age, and Birthday after a line was added in `saleor/saleor/checkout/tests/test_checkout_complete.py`.
- [X] T013 [P] [US1] Add storefront unit tests for mapping typed guest, missing-Birthday, and underage errors to sign-in, profile, and non-retryable alerts in `react-storefront/src/checkout/lib/checkout-availability.test.ts`.
- [X] T014 [P] [US1] Add storefront E2E cases for guest sign-in guidance, missing-Birthday profile guidance, underage rejection, and eligible checkout in `react-storefront/e2e/age-restrictions.spec.ts`.

### Implementation for User Story 1

- [X] T015 [US1] Implement the shared checkout validator for restricted lines, guest state, missing Birthday, calendar-date eligibility, and current SiteSettings in `saleor/saleor/checkout/age_restrictions.py`.
- [X] T016 [US1] Invoke the shared validator for checkout line additions and updates, returning the new structured errors, in `saleor/saleor/graphql/checkout/mutations/checkout_lines_add.py` and `saleor/saleor/graphql/checkout/mutations/checkout_lines_update.py`.
- [X] T017 [US1] Invoke the shared validator from authoritative checkout completion validation in `saleor/saleor/checkout/checkout_cleaner.py` and `saleor/saleor/graphql/checkout/mutations/checkout_complete.py`.
- [X] T018 [US1] Preserve structured line-mutation errors and classify the new eligibility errors in `react-storefront/src/app/actions.ts` and `react-storefront/src/checkout/lib/server/mutation-result.ts`.
- [X] T019 [US1] Render accessible sign-in, Birthday-profile, and underage blocking alerts for product/cart/checkout line actions in `react-storefront/src/ui/components/pdp/variant-section-dynamic.tsx` and `react-storefront/src/checkout/lib/checkout-availability.ts`.

**Checkpoint**: User Story 1 is independently complete: backend enforcement is authoritative and
the storefront provides the correct recovery guidance.

---

## Phase 4: User Story 2 - Manage Age Restrictions (Priority: P2)

**Goal**: Authorized staff can set the Age-restricted Product flag and staff with site-settings
permission can change the store-wide Minimum age and shop time zone.

**Independent Test**: Enable/disable a Product restriction and update Minimum age through the
dashboard; verify the saved values are reflected in later eligibility checks and unauthorized
staff cannot update site settings.

### Tests for User Story 2

- [X] T020 [P] [US2] Add Product create/update GraphQL tests for the empty-by-default Age-restricted flag and `MANAGE_PRODUCTS` access in `saleor/saleor/graphql/product/tests/mutations/`.
- [X] T021 [P] [US2] Add shop-settings mutation tests for Minimum age default/validation, time-zone default/validation, and `MANAGE_SETTINGS` enforcement in `saleor/saleor/graphql/shop/tests/mutations/test_shop_settings_update.py`.
- [X] T022 [P] [US2] Add dashboard Product form state, payload, and toggle tests in `saleor-dashboard/src/products/views/ProductUpdate/handlers/utils.test.ts` and `saleor-dashboard/src/products/components/ProductCreatePage/`.
- [X] T023 [P] [US2] Add dashboard site-settings initial-state, permission, and submit-payload tests in `saleor-dashboard/src/siteSettings/components/SiteSettingsPage/SiteSettingsPage.test.tsx`.

### Implementation for User Story 2

- [X] T024 [US2] Add the Age-restricted Product flag to Product GraphQL create/update inputs, resolvers, and `MANAGE_PRODUCTS` handling in `saleor/saleor/graphql/product/mutations/product/product_create.py` and `saleor/saleor/graphql/product/`.
- [X] T025 [US2] Add Minimum age and shop time-zone validation and `MANAGE_SETTINGS` updates to the existing shop-settings mutation in `saleor/saleor/graphql/shop/mutations/shop_settings_update.py` and `saleor/saleor/graphql/shop/types.py`.
- [X] T026 [US2] Add `isAgeRestricted` to shared Product fragments, Product create defaults, update hydration, and mutation variables in `saleor-dashboard/src/fragments/products.ts`, `saleor-dashboard/src/products/components/ProductCreatePage/form.tsx`, `saleor-dashboard/src/products/utils/data.ts`, and `saleor-dashboard/src/products/views/ProductUpdate/handlers/utils.ts`.
- [X] T027 [US2] Add the Age-restricted checkbox only to the Product update UI in `saleor-dashboard/src/products/components/ProductUpdatePage/`.
- [X] T028 [US2] Add Minimum age and shop time-zone fields to the shared shop fragment, settings form, and update payload in `saleor-dashboard/src/siteSettings/queries.ts`, `saleor-dashboard/src/siteSettings/mutations.ts`, `saleor-dashboard/src/siteSettings/components/SiteSettingsPage/SiteSettingsPage.tsx`, and `saleor-dashboard/src/siteSettings/views/index.tsx`.
- [X] T029 [US2] Regenerate dashboard GraphQL types and update generated artifacts referenced by `saleor-dashboard/src/gql/`.

**Checkpoint**: User Story 2 is independently complete: staff can maintain the restriction flag
and store policy through existing authorized flows.

---

## Phase 5: User Story 3 - Maintain a Private Birthday (Priority: P3)

**Goal**: A Customer can maintain their own Birthday privately; super-admins can access it when
needed; `MANAGE_USERS` staff receive only age eligibility; all sensitive reads and changes are
redacted-audited.

**Independent Test**: Save and retrieve a Customer's own Birthday, verify super-admin and
`MANAGE_USERS` behavior, inspect redacted super-admin-only audit events, and verify all forbidden
delivery paths omit Birthday.

### Tests for User Story 3

- [X] T030 [P] [US3] Add account mutation/query tests for owner-only Birthday access, super-admin cross-Customer access, `MANAGE_USERS` true/false eligibility, and null eligibility for all other viewers in `saleor/saleor/graphql/account/tests/`.
- [X] T031 [P] [US3] Add audit-event tests for Birthday change and staff Birthday/eligibility reads, redacted parameters, actor/time/action capture, and super-admin-only event visibility in `saleor/saleor/account/tests/` and `saleor/saleor/graphql/account/tests/`.
- [X] T032 [P] [US3] Add regression tests proving Birthday is absent from public, unauthenticated, app, webhook, and export outputs in `saleor/saleor/webhook/tests/`, `saleor/saleor/graphql/account/tests/`, and the applicable export test modules under `saleor/saleor/`.
- [X] T033 [P] [US3] Add dashboard role tests that `MANAGE_USERS` staff see eligibility but never Birthday and cannot edit it in `saleor-dashboard/src/customers/components/CustomerDetailsPage/CustomerDetailsPage.test.tsx`.
- [X] T034 [P] [US3] Add storefront profile tests for valid Birthday save, future-date rejection, and private account display in `react-storefront/src/app/(storefront)/[locale]/[channel]/(main)/account/`.

### Implementation for User Story 3

- [X] T035 [US3] Implement owner-or-super-admin Birthday resolver and mutation authorization, date validation, and owner/`MANAGE_USERS` eligibility resolver behavior in `saleor/saleor/graphql/account/types.py` and `saleor/saleor/graphql/account/mutations/base.py`.
- [X] T036 [US3] Add dedicated non-sensitive CustomerEvent types and create events for Birthday changes and staff Birthday/eligibility reads in `saleor/saleor/account/__init__.py`, `saleor/saleor/account/events.py`, `saleor/saleor/account/models.py`, and `saleor/saleor/graphql/account/types.py`.
- [X] T037 [US3] Enforce super-admin-only access to Birthday audit events and explicitly exclude Birthday from webhook, application/plugin, and export serializers in `saleor/saleor/graphql/account/types.py`, `saleor/saleor/webhook/payloads.py`, and applicable serializers under `saleor/saleor/`.
- [X] T038 [US3] Add permission-conditional Customer eligibility selection and display, without selecting or rendering Birthday, in `saleor-dashboard/src/customers/queries.ts`, `saleor-dashboard/src/customers/hooks/useCanEditCustomers.ts`, and `saleor-dashboard/src/customers/components/CustomerDetailsPage/CustomerDetailsPage.tsx`.
- [X] T039 [US3] Add the owner-only Birthday field, account query/mutation input, and validation feedback to the storefront profile flow in `react-storefront/src/app/(storefront)/[locale]/[channel]/(main)/account/actions.ts`, `react-storefront/src/app/(storefront)/[locale]/[channel]/(main)/account/AccountUpdate.graphql`, and `react-storefront/src/ui/components/account/edit-name-form.tsx`.
- [ ] T040 [US3] Regenerate dashboard and storefront GraphQL types and update generated artifacts in `saleor-dashboard/src/gql/` and `react-storefront/src/gql/`.

**Checkpoint**: User Story 3 is independently complete: Birthday is private, eligibility is
minimally disclosed, and sensitive access is redacted-audited.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature, privacy boundaries, and all repository quality gates.

- [ ] T041 [P] Review all new GraphQL fields and payload serializers against `specs/001-age-restrictions/contracts/graphql.md` to confirm Birthday is absent from every prohibited boundary.
- [X] T042 [P] Run the focused backend Product, SiteSettings, account/privacy/audit, checkout mutation, and checkout-cleaner tests identified in `specs/001-age-restrictions/quickstart.md`.
- [X] T043 [P] Run dashboard GraphQL generation and focused Product, site-settings, and Customer details tests identified in `specs/001-age-restrictions/quickstart.md`.
- [ ] T044 [P] Run storefront unit and Playwright age-restriction flows identified in `specs/001-age-restrictions/quickstart.md`.
- [ ] T045 Run the end-to-end manual validation scenarios and record any deviations in `specs/001-age-restrictions/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; provides the MVP.
- **US2 (Phase 4)**: Depends on Foundational; can proceed in parallel with US1, though its
  completed configuration UI improves US1’s operational readiness.
- **US3 (Phase 5)**: Depends on Foundational; can proceed in parallel with US1 and US2. Its
  storefront profile form completes the recovery path linked from US1.
- **Polish (Phase 6)**: Depends on completed desired user stories.

### User Story Dependency Graph

```text
Setup → Foundational ─┬→ US1: Checkout enforcement (MVP)
                      ├→ US2: Staff configuration
                      └→ US3: Private Birthday and audit
US1 + US2 + US3 → Polish and end-to-end validation
```

### Parallel Opportunities

- T003, T004, and T005 can proceed in parallel; T006 follows the SiteSettings and Birthday
  shape.
- Within US1, T010–T014 are parallel test tasks; T018 can begin once checkout error codes are
  stable while backend enforcement is completed.
- Within US2, T020–T023 are parallel test tasks; dashboard Product and site-settings work
  (T026–T028) can run in parallel after the backend contracts are available.
- Within US3, T030–T034 are parallel test tasks; dashboard display (T038) and storefront
  profile (T039) can run in parallel after account contracts are available.
- T041–T044 can run in parallel after implementation is complete.

---

## Parallel Example: User Story 1

```text
T010: Calendar-boundary backend tests
T011: Checkout line mutation tests
T012: Checkout completion tests
T013: Storefront error-classification tests
T014: Storefront E2E tests
```

After T015–T017 define the backend contract, T018–T019 can proceed alongside final backend test
adjustments.

---

## Implementation Strategy

### MVP First

1. Complete T001–T009.
2. Complete T010–T019 to deliver authoritative Age-restricted checkout enforcement.
3. Validate the US1 independent test before advancing.

### Incremental Delivery

1. Deliver US1 for compliant purchasing enforcement.
2. Deliver US2 to give staff self-service Product and store policy controls.
3. Deliver US3 to provide private Customer Birthday management, tightly bounded status access,
   and auditing.
4. Complete cross-cutting privacy and end-to-end validation.

## Format Validation

All 45 tasks use the required checkbox, sequential ID, optional `[P]`, applicable `[US#]`, and
explicit file-path format.

## Phase 7: Convergence

- [X] T046 CRITICAL Validate Age-restricted Products against the projected checkout lines before persisting add or update mutations in `saleor/saleor/graphql/checkout/mutations/checkout_lines_add.py` and `saleor/saleor/graphql/checkout/mutations/checkout_lines_update.py` per FR-007 and US1/AC4 (contradicts).
- [X] T047 CRITICAL Align storefront eligibility-error constants and completion error formatting with Saleor's `AGE_RESTRICTED_GUEST`, `AGE_RESTRICTED_MISSING_BIRTHDAY`, and `AGE_RESTRICTED_UNDERAGE` codes in `react-storefront/src/checkout/lib/checkout-availability.ts`, `react-storefront/src/checkout/lib/payment/format-checkout-complete-error.ts`, and their tests per FR-008 and US1/AC4 (contradicts).
- [X] T048 Align the dashboard shop time-zone field with Saleor's `shopTimezone` GraphQL field and `shopTimezone` input, then regenerate types in `saleor-dashboard/src/fragments/shop.ts`, `saleor-dashboard/src/siteSettings/views/index.tsx`, and `saleor-dashboard/src/graphql/` per FR-002, FR-005, and SC-004 (contradicts).
- [ ] T049 Add and run focused backend settings/privacy/audit/checkout mutation and completion tests plus storefront profile and E2E age-restriction flows in `saleor/saleor/graphql/`, `saleor/saleor/checkout/tests/`, `saleor/saleor/webhook/tests/`, and `react-storefront/e2e/` per SC-001 through SC-006 and Constitution IV (missing).

## Phase 8: Convergence

- [X] T050 Return false, rather than null, for a permitted Customer or `MANAGE_USERS` viewer whose Birthday is missing while retaining null for unauthorized viewers in `saleor/saleor/account/age_restrictions.py` and `saleor/saleor/graphql/account/types.py` per FR-011 (contradicts).
