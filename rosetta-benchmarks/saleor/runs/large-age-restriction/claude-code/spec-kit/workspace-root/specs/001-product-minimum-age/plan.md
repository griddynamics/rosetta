# Implementation Plan: Product Minimum Age Restriction

**Branch**: `001-product-minimum-age` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-product-minimum-age/spec.md`

## Summary

Add an optional `minimumAge` to products and an optional `birthday` to users in the Saleor backend (model, migration, GraphQL input/output), enforce eligibility on checkout line creation and checkout completion, and expose the new fields in the dashboard (product edit, customer create/edit) and storefront (account profile, checkout error display). All work uses the existing stack and patterns of the three repositories; no new dependencies.

## Technical Context

**Language/Version**: Python 3.12 / Django (saleor); TypeScript / React (saleor-dashboard); TypeScript / Next.js (react-storefront)

**Primary Dependencies**: existing only (graphene GraphQL, Apollo + graphql-codegen in the frontends); none added

**Storage**: PostgreSQL via Django migrations (two nullable columns)

**Testing**: pytest (saleor, per-module `tests/` folders); Jest/vitest (saleor-dashboard); vitest (react-storefront); existing linters (ruff/mypy, eslint, tsc)

**Target Platform**: Web (GraphQL API server, admin SPA, customer storefront)

**Project Type**: Web application across three repositories (backend + two frontends)

**Performance Goals**: Age check adds no extra query per checkout line beyond reading already-loaded product data

**Constraints**: Backward-compatible schema (nullable fields, additive GraphQL changes); no behavior change for unrestricted products

**Scale/Scope**: 2 model fields, ~5 mutations touched, ~3 UI screens in each frontend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. Follow existing style/patterns | PASS | Reuse `ProductInput`/`CustomerInput`/`AccountInput`, existing error code enums, `checkout_cleaner` helpers, dashboard form/messages patterns |
| II. Focused changes | PASS | Only touches product, account, checkout validation, and the related UI screens |
| III. Minimal dependencies | PASS | None added |
| IV. Automated tests | PASS | Tests planned in each repo (see Source Code) |
| V. Verify before finishing | PASS | Quickstart lists the test/lint commands that must pass |

Post-design re-check: PASS (no violations; Complexity Tracking not needed).

## Project Structure

### Documentation (this feature)

```text
specs/001-product-minimum-age/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── graphql-schema.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (three repositories side by side)

```text
saleor/saleor/
├── product/models.py                     # Product.minimum_age
├── product/migrations/                   # new migration
├── product/error_codes.py                # (reuse INVALID)
├── account/models.py                     # User.birthday
├── account/migrations/                   # new migration
├── checkout/error_codes.py               # new AGE_RESTRICTED / BIRTHDAY_REQUIRED codes
├── checkout/checkout_cleaner.py          # age-eligibility validation helper
├── graphql/product/types/products.py     # Product.minimumAge
├── graphql/product/mutations/product/    # ProductInput.minimumAge + validation
├── graphql/account/types.py              # User.birthday
├── graphql/account/mutations/            # CustomerInput / AccountInput birthday + validation
├── graphql/checkout/mutations/           # checkoutCreate, checkoutLinesAdd, checkoutComplete,
│                                         #   orderCreateFromCheckout call the age check
├── graphql/schema.graphql                # regenerated
└── (tests beside each area: product, account, checkout, graphql/*/tests)

saleor-dashboard/src/
├── products/components/ProductOrganization|ProductDetailsForm  # minimum age field
├── products/views, queries/fragments, mutations                # field in fragments & input
├── customers/components/CustomerDetailsPage, CustomerCreatePage# birthday field
├── customers/{queries,mutations}.ts, fragments                 # field in fragments & input
├── graphql/ (schema + generated types via existing codegen)
└── intl messages + unit tests next to components

react-storefront/src/
├── graphql/{CurrentUserProfile,AccountUpdate}.graphql          # birthday
├── app/(storefront)/.../account/                               # profile birthday field
├── checkout/ & app/actions.ts                                  # show age-restriction errors
├── gql/ (regenerated types)
└── tests beside changed code
```

**Structure Decision**: Three-repository web application; each change lives in the repo's existing feature folders as listed above.

## Complexity Tracking

No constitution violations.
