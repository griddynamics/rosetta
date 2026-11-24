# 00 — Preflight baseline (Phase 0)
Depends on: G0 approved (plan, Option A/B, env actions E1/E3). Index: `AGE-RESTRICTION-PLAN.md` §5, §9.

## Do
1. Per repo (3 executors in parallel, no code edits): record HEAD sha, `git status --short` (expected clean, detached), tool versions (`uv`, Python 3.12, Node 24, pnpm 11).
2. Core, clean tree, own DB `saleor_s00`, one-shot (no `--reuse-db`): full suite `pytest -m "not e2e" -n 8` (PLAN §5). Record pre-existing failing/erroring test ids and total runtime. Then query-count baseline: `pytest saleor/graphql/checkout/tests/benchmark saleor/graphql/account/tests/benchmark -n0 --django-db-bench=<scratch>/bench-base.json`.
3. Core static baseline: `ruff check saleor`, `ruff format --check saleor` counts; `mypy` on `saleor/account saleor/site saleor/checkout saleor/graphql/account` (count only); `get_graphql_schema | diff` (verified in sync).
4. Dashboard: `pnpm run check-types`, full `pnpm run test:quiet`, `pnpm exec eslint "src/**/*.@(ts|tsx)"` (no fix), `pnpm run format:check`, `pnpm exec jest src/graphql/lockSchema.test.ts` (pre-change sweep result).
5. Storefront: `NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8000/graphql/ pnpm run verify` (live API still unmodified); note any extra required env var it demands (e.g. `NEXT_PUBLIC_DEFAULT_CHANNEL`).
6. Stack snapshot (read-only): `docker ps` names/ports, listening ports, `docker exec saleor-benchmark-db-1 psql -U saleor -d postgres -Atc "select datname from pg_database order by 1"`.
7. If G0 chose Option A and E1 approved: stop `saleor-benchmark-api` only after step 5 finished (storefront baseline needs :8000); log in ledger.
8. Write results into `HANDOFF.md` (Baseline table, failing-test lists, bench json path) and `00-handoff.md`.

## Subagents
- `rosetta-light:executor` ×3 (core, dashboard, storefront) — run commands, summarise failures only; long-running (core).

## Notes
- Core part must finish before 01 edits core (tests collect lazily-imported modules; migrations change the DB schema under test).
- Do NOT run `pnpm run lint:eslint` / `lint:prettier` (write in place). Do NOT use `uv run` without `--no-sync`.
- Failures here are the "known red" list; later sessions are judged against it, not against green.

## Done when
- HANDOFF Baseline lists per repo: green/red per gate, failing ids, runtime, bench json path, stack snapshot.
- `git status --short` is empty in all three repos; `uv.lock` unchanged; ledger lists any retained DB (`test_saleor_s00*` only if `--reuse-db` was used).

## Checklist
- [ ] STD-ALL
- [ ] Core full-suite baseline recorded with failing ids
- [ ] Query-count baseline json saved (scratchpad path in HANDOFF)
- [ ] Dashboard + storefront gates recorded, extra env needs noted
- [ ] `lockSchema.test.ts` pre-change result recorded
- [ ] Stack snapshot + env action E1 outcome recorded
