# PRODUCT-STORAGE-CONDITIONS — Plan (Draft)

Specs (WHAT, authority): `PRODUCT-STORAGE-CONDITIONS-SPECS.md`. This plan = order + gates only.

## Read first
`../../docs/ARCHITECTURE.md` `## Cross-repo change rules` · each repo's `CLAUDE.md` + `docs/` · specs.

## Governing rules
- Specs win on contract; deviation → stop, ask (skill `deviation`).
- Additive API only; no breaking schema change.
- Repo rules (`<repo>/CLAUDE.md`) win inside each repo. Sub-repos are separate git repos: no commits/push unless user asks.
- Never read/print env files or `.jwt_key.pem`.
- Restart of local API allowed by user (specs A4); nothing else on the stack.
- Record findings → `HANDOFF.md`; lessons → `../../agents/MEMORY.md`; final state → `../../agents/IMPLEMENTATION.md`.

## Ownership
01 → `saleor/**`. 02 → `saleor-dashboard/**`. 03 → `react-storefront/**`. 04 → no code, `docs/`+`agents/` only. No shared files.

## Sessions
| # | Session | Depends on | Parallel with |
|---|---|---|---|
| 01 | core: model, API, translations, webhook, CSV, tests, schema | — | — |
| 02 | dashboard: schema refresh, UI, translations, tests | 01 (API running with migration) | — |
| 03 | storefront: query, mapper, PDP, tests | 01 (API running) | 02 (disjoint files; only valid after 01) |
| 04 | manual check on local stack + docs | 01,02,03 | — |
Unlisted pairs sequential. 01 and 04 run alone.

## HITL gates
- G1 plan approval → before any code (this file).
- G2 after 01: review core diff + test run; approve before client work (schema is the contract).
- G3 after 02+03: review diffs + results.
- G4 after 04: final acceptance on coverage vs specs.
