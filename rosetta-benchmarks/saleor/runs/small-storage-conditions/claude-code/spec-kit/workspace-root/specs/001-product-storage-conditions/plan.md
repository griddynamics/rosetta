# Implementation Plan: Product Storage Conditions

**Branch**: `001-product-storage-conditions` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-product-storage-conditions/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add an optional, plain-text `storage_conditions` field (max 250 chars) to `Product`, expose it through the GraphQL API, let staff edit it on the dashboard product page, and show it in the description area of the storefront product page. Approach: follow the existing wiring of comparable product fields (`seo_description`, `external_reference`) in each repository; no new dependencies.

## Technical Context

**Language/Version**: Python 3.12 / Django (saleor); TypeScript + React (saleor-dashboard); TypeScript + Next.js (react-storefront)

**Primary Dependencies**: existing only — graphene (GraphQL), Apollo + graphql-codegen (dashboard), graphql-codegen + next-intl (storefront). No additions.

**Storage**: PostgreSQL via Django ORM; one new column on `product_product` (migration after `0210`)

**Testing**: pytest (saleor), jest (dashboard), vitest (storefront)

**Target Platform**: Web — GraphQL API server, admin SPA, Next.js storefront

**Project Type**: Multi-repository web application (backend + two frontends in one workspace)

**Performance Goals**: No measurable change; one extra short column read with the product row

**Constraints**: Backward-compatible additive API; existing products unaffected; plain-text rendering only; do not hand-edit generated files; no commit/push (per repo CLAUDE.md)

**Scale/Scope**: ~1 model field, 1 migration, 2 input/output GraphQL fields, ~10 dashboard files, ~6 storefront files, plus tests in each repo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Follow existing style/patterns | PASS | Wiring mirrors `seoDescription` / `externalReference` in each repo |
| II. Focused changes | PASS | Only the storage-conditions path; no refactors. Out-of-scope items listed in spec |
| III. No new dependencies | PASS | None added; user input also states this |
| IV. Automated tests for every change | PASS | Tests planned in all three repos (research R6) |
| V. Verify before finishing | PASS (planned) | Lint, type-check and tests per repo in quickstart; skipped checks will be reported |

Post-design re-check: still PASS. Open risk is process-only (schema/codegen source for the frontends), tracked in research.md.

## Project Structure

### Documentation (this feature)

```text
specs/001-product-storage-conditions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── graphql.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
saleor/                                  # backend
├── saleor/product/models.py             # + storage_conditions
├── saleor/product/migrations/0211_*.py  # new migration
├── saleor/graphql/product/mutations/product/product_create.py   # ProductInput field, clean_input
├── saleor/graphql/product/types/products.py                     # Product.storage_conditions
├── saleor/graphql/schema.graphql        # regenerated
├── saleor/graphql/product/tests/mutations/test_product_{create,update}.py
├── saleor/graphql/product/tests/queries/ (product query test)
└── CHANGELOG.md                         # entry

saleor-dashboard/
├── src/fragments/products.ts
├── src/products/utils/data.ts
├── src/products/components/ProductCreatePage/form.tsx (+ page)
├── src/products/components/ProductUpdatePage/{ProductUpdatePage.tsx,types.ts,saveComposition.ts}
├── src/products/views/ProductUpdate/handlers/utils.ts (+ utils.test.ts)
├── src/graphql/*.generated.ts, schema-*.graphql   # regenerated
├── locale/defaultMessages.json          # extracted strings
└── .changeset/*.md

react-storefront/
├── src/graphql/ProductDetails.graphql
├── src/gql/                             # regenerated
├── src/lib/storefront/contract/product.ts
├── src/lib/storefront/mappers/product.ts (+ product.test.ts)
├── src/app/(storefront)/[locale]/[channel]/(main)/products/[slug]/page.tsx
├── src/ui/components/pdp/product-attributes.tsx (+ new test)
└── messages/*.json
```

**Webhooks and export**: `storage_conditions` is added to the legacy product webhook payload fields (`saleor/saleor/webhook/payloads.py`, used for product created, updated and deleted payloads); subscription payloads get it from the GraphQL `Product` type. For CSV export, `ProductFieldEnum.STORAGE_CONDITIONS` ("storage conditions") maps to the model column in `saleor/saleor/csv/utils/__init__.py`, and the dashboard export dialog lists it next to name and description. No filter, sort or search change.

**Bulk create**: `ProductBulkCreateInput` inherits `ProductInput`, so it also accepts `storageConditions`. It applies the same trim and 250-character rule (`product_bulk_create.py`), otherwise over-length input would fail at the database. This is the one addition beyond the original task list.

**Structure Decision**: Keep the existing three-repository layout; changes are confined to the paths above in each repository.

## Complexity Tracking

No constitution violations; nothing to justify.
