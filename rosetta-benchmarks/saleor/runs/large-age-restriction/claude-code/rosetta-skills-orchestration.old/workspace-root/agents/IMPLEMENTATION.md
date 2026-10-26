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

### Rosetta workspace documentation: done, 2026-10-21

- Root registry docs: `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/ASSUMPTIONS.md`, `docs/TODO.md`, `README.md`, `agents/MEMORY.md`, this file (TECHSTACK/CODEMAP/DEPENDENCIES from discovery).

### MIN-AGE (age-restricted products + customer birthday): implemented, awaiting user acceptance, 2026-10-22
- Specs/decisions: `plans/MIN-AGE/` (D1-D7). Core (3 migrations, checkout/draft enforcement, privacy, audit), dashboard, storefront; uncommitted in each repo.
- Validated independently: core 13,464 tests, dashboard 6,196, storefront 867 pass; E2E smoke on throwaway DB passed. Open: WEAK UI render tests, tx-flow age check (saleor/docs/TODO.md), no retention job (TODO).
- Accepted by user 2026-10-22. Local dev DB migrated (account 0106, product 0211, site 0053) and API container restarted, with approval; pre-migration dump kept in session scratchpad.
