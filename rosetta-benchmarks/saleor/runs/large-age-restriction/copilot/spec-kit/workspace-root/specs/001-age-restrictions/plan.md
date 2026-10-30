# Implementation Plan: Age-Restricted Products

**Branch**: `[001-age-restrictions]` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-age-restrictions/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add age-restricted Products, a store-wide Minimum age and shop time zone, private Customer
Birthdays, and a permission-limited age-eligibility status. Saleor will persist the data,
enforce eligibility when checkout lines change and authoritatively at checkout completion, and
record privacy-sensitive access. The dashboard will manage Product and site settings, while the
storefront will guide guests to sign in and signed-in Customers to complete their profile.

## Technical Context

**Language/Version**: Python/Django/GraphQL in `saleor`; TypeScript/React in
`saleor-dashboard`; TypeScript/Next.js in `react-storefront` (use each repository's existing
supported version)

**Primary Dependencies**: Existing Saleor account, product, site settings, checkout, event, and
GraphQL layers; existing dashboard GraphQL/code-generation and form components; existing
storefront GraphQL server actions and checkout error utilities

**Storage**: Existing Saleor relational database migrations for Product, SiteSettings, User, and
CustomerEvent records

**Testing**: Existing backend pytest/GraphQL mutation tests; dashboard component and mutation
payload tests; storefront unit and Playwright E2E tests

**Target Platform**: Saleor API, dashboard, and server-rendered storefront

**Project Type**: Three-repository e-commerce web application

**Performance Goals**: Preserve existing checkout interaction expectations; age validation adds no
new remote dependency and uses data already required for Product, checkout, Customer, and site
settings processing

**Constraints**: No new dependencies; compare calendar dates in the configured shop time zone;
never expose Birthday values to public, unauthenticated, app, webhook, export, or unauthorized
staff surfaces; completion-time validation is authoritative

**Scale/Scope**: One Product flag, two site settings, one Customer Birthday, a computed
age-eligibility status, checkout enforcement, audit records, and corresponding dashboard and
storefront workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-design: PASS**

- **Existing Patterns**: The design follows existing Product, SiteSettings, User,
  CustomerEvent, checkout-cleaner, GraphQL, dashboard form, and storefront error patterns.
- **Focused Changes**: Only catalog restriction, settings, Customer privacy, checkout, and
  directly dependent UI/API surfaces are included.
- **Dependency Discipline**: No new dependency is required.
- **Automated Testing**: Backend mutation/unit tests, dashboard form/query tests, and
  storefront unit/E2E flows are planned.
- **Validation Before Completion**: The quickstart identifies focused checks for all three
  repositories.

**Post-design: PASS**

The data model and contracts retain the same existing patterns. Privacy restrictions are
enforced at each external boundary rather than creating a parallel data store or service.

## Project Structure

### Documentation (this feature)

```text
specs/001-age-restrictions/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
saleor/
├── saleor/account/              # User Birthday and audit events
├── saleor/product/              # Product Age-restricted flag
├── saleor/site/                 # Minimum age and shop time-zone settings
├── saleor/checkout/             # Central completion-time validation
├── saleor/graphql/              # Private/account, product, shop, and checkout contracts
└── saleor/webhook/              # Explicit Birthday exclusion tests

saleor-dashboard/
└── src/
    ├── products/                # Product flag form, fragment, and mutations
    ├── siteSettings/            # Minimum age and time-zone settings UI
    └── customers/               # MANAGE_USERS eligibility display; no Birthday disclosure

react-storefront/
├── src/app/                     # Account Birthday profile action and cart actions
├── src/checkout/                # Eligibility-error classification
└── src/ui/components/           # Product/cart alerts and account Birthday form
```

**Structure Decision**: Modify the existing three repositories. Saleor owns persistent data,
permissions, privacy boundaries, and authoritative checkout enforcement; the dashboard owns
staff configuration and permitted status display; the storefront owns Customer profile input and
user-facing recovery guidance.

## Complexity Tracking

No constitution violations or additional architectural layers are required.
