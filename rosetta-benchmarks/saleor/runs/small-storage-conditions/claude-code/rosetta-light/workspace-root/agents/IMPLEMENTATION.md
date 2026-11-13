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

### Product storage conditions: done (user-approved, uncommitted), 2026-10-21

- Product + ProductTranslation `storage_conditions` (≤250, optional, per product, NULL for existing rows, no data migration); core migration `0211`; GraphQL create/update/bulk/translate; webhook payload; CSV export; no filter/search.
- Dashboard: update page, create dialog, translations page. Storefront: labelled block after description on PDP, hidden when empty.
- Spec: `plans/STORAGE-CONDITIONS/STORAGE-CONDITIONS-SPECS.md`. Open: dashboard staging-schema reads-only `@lockSchema`; translation progress/app-bridge payload/export UI not covering the field; dashboard changeset (`pnpm run change:add`) before PR.

### Rosetta workspace documentation: done, 2026-10-21

- Root registry docs: `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/ASSUMPTIONS.md`, `docs/TODO.md`, `README.md`, `agents/MEMORY.md`, this file (TECHSTACK/CODEMAP/DEPENDENCIES from discovery).
