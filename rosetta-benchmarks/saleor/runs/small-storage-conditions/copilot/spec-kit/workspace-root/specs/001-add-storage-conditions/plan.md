# Implementation Plan: Add Storage Conditions

**Branch**: `001-add-storage-conditions` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-add-storage-conditions/spec.md`

## Summary

Add an optional, 250-character plain-text storage-conditions value to products and product translations. Expose it through the existing Saleor product GraphQL contracts, product webhook payloads, and CSV export; edit it through the dashboard's product and translation workflows; and render it as a separate labeled PDP block in the Next.js storefront. Reuse existing product-update permission checks, shared translation input, translation selection, generated GraphQL types, and product-page presentation patterns; add no dependencies.

## Technical Context

**Language/Version**: Python 3.12 (Saleor); TypeScript 5.8 (dashboard); TypeScript 5.3 (storefront)

**Primary Dependencies**: Django 5.2 and Graphene (Saleor); React 18, Apollo Client, Macaw UI, and `react-intl` (dashboard); Next.js 16, React 19, `next-intl`, and urql GraphQL generation (storefront)

**Storage**: Existing Saleor relational product and product-translation persistence

**Testing**: pytest (Saleor); Jest (dashboard); Vitest and Playwright where appropriate (storefront)

**Target Platform**: Saleor GraphQL service, browser-based staff dashboard, and server-rendered storefront product page

**Project Type**: Three-repository web application

**Performance Goals**: Preserve existing product-page data loading behavior; add no additional customer-visible request.

**Constraints**: Optional plain text only; normalize line breaks; maximum 250 characters in persistence, GraphQL validation, and dashboard input; require MANAGE_PRODUCTS for base and translated storage conditions; preserve the shared `TranslationInput` and translation fallback; return `INVALID` for storage conditions on non-product translation mutations; no new dependencies; storage conditions appear only on the storefront PDP; no filtering or searching.

**Scale/Scope**: One product-level base field and one optional field per product translation; include base values in product webhooks and product CSV exports; no variant fields, backfill, product filtering/search, cart, checkout, or order-email changes.

## Constitution Check

**Pre-design gate: PASS**

- **Existing Patterns**: The plan extends the established Saleor product model, GraphQL product inputs/types, dashboard product and translation forms, and storefront PDP query/component flow.
- **Focused Changes**: Scope is limited to the requested product field and directly dependent API, translation, dashboard, storefront, generated-type, migration, and test changes.
- **Dependency Discipline**: No dependencies are required.
- **Automated Testing**: Backend mutation/query/permission tests, dashboard form and save-composition tests, and storefront mapper/PDP tests are required.
- **Validation Before Completion**: Run the targeted tests and repository linters/type checks listed in [quickstart.md](quickstart.md).

**Post-design gate: PASS** — Research and contracts preserve the same constraints. No constitution exceptions or complexity justifications are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-add-storage-conditions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── product-storage-conditions.graphql.md
└── tasks.md
```

### Source Code (repository root)

```text
saleor/
├── saleor/product/models.py
├── saleor/product/migrations/
├── saleor/graphql/product/types/products.py
├── saleor/graphql/product/mutations/product/
├── saleor/graphql/translations/mutations/
├── saleor/csv/utils/
├── saleor/webhook/
└── saleor/graphql/product/tests/

saleor-dashboard/
├── src/fragments/products.ts
├── src/products/
│   ├── queries.ts
│   ├── components/ProductDetailsForm/
│   └── components/ProductUpdatePage/
└── src/translations/
    ├── components/TranslationsProductsPage/
    ├── translationSectionBuilders.ts
    └── mutations.ts

react-storefront/
├── src/gql/
├── src/lib/catalog/
├── src/lib/saleor-translations.ts
├── src/lib/storefront/
└── src/ui/components/pdp/product-attributes.tsx
```

**Structure Decision**: Implement the persistent API contract in `saleor`, consume the generated dashboard contract in the existing product details and product translations screens, and include the field in the storefront's existing PDP data query, translation transformation, view model, and description-area component.
