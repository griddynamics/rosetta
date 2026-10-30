# Storage Conditions — Handoff

- **Status:** Accepted, 2026-10-29.
- **Decision:** Locale translation → base fallback; labeled PDP block after Description; optional normalized plain text, 250-character maximum.
- **Scope:** `saleor`, `saleor-dashboard`, `react-storefront`; no cart, checkout, order, or email changes.
- **Validation:** Core focused mutations (98), Dashboard focused tests (69), Storefront focused tests (8), generated-contract checks, type checks, and scoped lint passed. No persistent migration was applied.
- **Extension:** Accepted CSV export and product webhook support: base-only selected CSV column, legacy product payload inclusion, and subscription-query selection. CSV (50) and webhook (235) focused tests, Ruff, formatting, and GraphQL schema checks passed.
- **Next:** No pending implementation work.
- **Discovery:** `catalog-contract-discovery` agent report, 2026-10-29.
