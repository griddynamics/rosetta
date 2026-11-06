# Rosetta Implementation Summary

This file is a brief and durable summary of the current implementation state.
It is intentionally concise and should not be used as a chronological work log.

For detailed change history, use git history and PRs instead of expanding this file.

Purpose: workspace-level change log (cross-repo and root-doc changes only); baseline first, then workstreams (newest first).
Style: DRY; one `###` per workstream with status and date; per-repo changes go to that repo's `agents/IMPLEMENTATION.md`.

## Baseline

- Three independent sub-repos at the HEADs listed in `docs/CODEMAP.md`; workspace root is not a git repo.
- Per-repo baselines: `saleor/agents/IMPLEMENTATION.md`, `saleor-dashboard/agents/IMPLEMENTATION.md`, `react-storefront/agents/IMPLEMENTATION.md`.
- Cross-service shape and local runtime: `docs/ARCHITECTURE.md`. Open cross-repo items: `docs/ASSUMPTIONS.md`, `docs/TODO.md`.

## Major Implemented Workstreams

### [Workstream 1]: [status], [modified date]

- [Brief changes with keywords and references]

### Age-restricted products: implemented, awaiting final acceptance, 2026-10-26

- Cross-repo feature: product flag, store-wide `minimumAge` + shop time zone, `User.birthday` (owner/superuser only), checkout/draft enforcement, audit events; clients in dashboard and storefront.
- Spec/plan/evidence: `plans/AGE-RESTRICTED-PRODUCTS/` (`HANDOFF.md` traceability, `07-validation-report.md`). Changes are uncommitted in the three repos.

### Rosetta workspace documentation: done, 2026-10-21

- Root registry docs: `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/ASSUMPTIONS.md`, `docs/TODO.md`, `README.md`, `agents/MEMORY.md`, this file (TECHSTACK/CODEMAP/DEPENDENCIES from discovery).
