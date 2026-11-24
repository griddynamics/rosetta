# CONTEXT (workspace registry)

Purpose: business view of the whole workspace: what the three services are for, how they form one commerce stack, why this workspace exists.
Content: system-level bullets + per-repo one-liner and link. Domain rules, actors and glossaries live in each repo's `docs/CONTEXT.md`; this file does not copy them.
Style: terse bullets, grep by `##`, no technology (see `ARCHITECTURE.md`). Links are workspace-relative from `docs/`. Unknowns: `ASSUMPTIONS.md`.

## Workspace purpose
- Saleor e-commerce stack (`../gain.json`) ready for development: GraphQL API, admin dashboard and Next.js customer storefront side by side. Code and issues live on GitHub (`saleor` org).
- Each sub-repo is an independent git repo with its own docs, rules and release cycle. The workspace root is not a repo.
- A local stack runs for manual checks (see `ARCHITECTURE.md` `## Local runtime`).

## The system in one picture
- Saleor is headless commerce: one backend owns all store data and rules; every user-facing surface is a separate client of it.
- Staff manage the store in the dashboard. Shoppers buy in the storefront. Both read and change the same data in the core.
- The core decides prices, stock, discounts, taxes, payments and permissions. Clients display and request; they never decide.
- Extensions (apps) plug into the core and can also show screens inside the dashboard. None are part of this workspace.

## Services
| Repo | Business role | Primary users | Context doc |
|---|---|---|---|
| `saleor` | Commerce engine: catalog, channels, checkout, orders, payments, customers, apps | Merchants, operators, apps; indirectly everyone | [saleor CONTEXT](../saleor/docs/CONTEXT.md) |
| `saleor-dashboard` | Staff back office for running the store | Store staff | [dashboard CONTEXT](../saleor-dashboard/docs/CONTEXT.md) |
| `react-storefront` | "Paper" shopper-facing shop template that merchants deploy or fork | Shoppers, customers, fork developers | [storefront CONTEXT](../react-storefront/docs/CONTEXT.md) |

## How the services relate (business view)
- One store, one source of truth: what staff change in the dashboard is what shoppers see in the storefront.
- Shared concepts across all three: channel (= market in the storefront), product/variant, checkout (= cart), order, customer, staff, app, gift card, voucher, promotion.
- Storefront copy is managed by staff as content ("Models") in the dashboard and served by the core.
- Store freshness: the core notifies the storefront of catalog changes; without that, the storefront catches up on a timer.
- Access: staff rights come from permission groups held in the core; the dashboard only hides what the core would refuse.
- Versions move together by release line: dashboard and core belong to the same Saleor release line; the storefront follows whichever core it is connected to.

## Term owners
- Domain terms: `../saleor/docs/CONTEXT.md` `## Core glossary` (core is canonical for shared concepts).
- Dashboard UI terms (Model, Model type, pins): `../saleor-dashboard/CONTEXT.md` (repo root, human-owned).
- Storefront terms (market, surface, PDP/PLP): `../react-storefront/docs/CONTEXT.md` `## Glossary`.
- Same word, different repo: always name the repo when a term differs (e.g. "Model" = core "Page").

## Age-restricted products (cross-repo behavior)
- Staff flag a product `isAgeRestricted` (dashboard product update page). One store-wide `Shop.minimumAge` (default 18) and shop `timeZone` (default UTC) are set in dashboard site settings (`MANAGE_SETTINGS`).
- Buying is blocked, visibility is not: restricted products stay visible everywhere in the storefront with an "N+" label. Checks run at checkout/draft line add or update and again at completion (completion is the authority).
- Guests are blocked and asked to sign in. A customer without birthday or under age is blocked. Draft orders: only an explicit Customer link is checked; an email-only match is not a link.
- `User.birthday` is PII: only the owner and a superuser can set or read it; apps and other staff never. Staff with `MANAGE_USERS` see only `isAgeEligible`. Every change and non-owner read is audited as hidden `CustomerEvent`s (no values). No ID verification.
- Spec and decisions: `../plans/AGE-RESTRICTED-PRODUCTS/AGE-RESTRICTED-PRODUCTS-SPECS.md`, `...-BRIEF.md` (D1-D16, C1-C2).

## Per-area context (by repo)
- saleor: `../saleor/docs/COMMERCE-CONTEXT.md`, `../saleor/docs/CATALOG-CONTEXT.md`, `../saleor/docs/PLATFORM-CONTEXT.md`.
- saleor-dashboard: single file, `../saleor-dashboard/docs/CONTEXT.md`.
- react-storefront: `../react-storefront/docs/CONTEXT.md`, `../react-storefront/docs/international-storefront.md`.

## Decisions
- ADRs are per repo: `../saleor/docs/adr/`, `../saleor-dashboard/docs/adr/`, `../react-storefront/docs/adr/`. No workspace-level ADRs.

## Related workspace docs
- `ARCHITECTURE.md` (cross-service tech), `TECHSTACK.md`, `CODEMAP.md`, `DEPENDENCIES.md` (registries).
- `ASSUMPTIONS.md` (cross-repo unknowns), `TODO.md` (cross-repo work).
- `../agents/IMPLEMENTATION.md` (change log), `../agents/MEMORY.md` (agent lessons), `../README.md` (navigation).
- Work inside one repo: load that repo's `docs/` and `CLAUDE.md` first; repo rules win inside the repo.

MUST USE SKILL `large-workspace-handling`
