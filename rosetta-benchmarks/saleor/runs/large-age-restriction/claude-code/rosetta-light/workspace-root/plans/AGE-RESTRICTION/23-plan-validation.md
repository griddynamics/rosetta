# 23 — Validation: suites, lint, types, manual GraphQL checks (Phase F)
Depends on: 21, 22, remediation of all blocker/major findings (re-run affected gates after each fix). Runs ALONE. Ends with gate G3. Spec: `S§13` complete, `S§2`, `S§5`, `S§7`.

## Do
1. Fresh runs on final tree, own DB `saleor_v23`, one-shot: core full suite (compare with S00 failing list), `ruff`, `mypy` (changed files), `makemigrations --check`, schema gate, `uv.lock`/`pyproject.toml` clean; benchmark diff vs `bench-base.json`.
2. Dashboard: `check-types`, `pnpm test`, `format:check`, `lint:changesets`, `knip`, eslint on changed files. Storefront: `NEXT_PUBLIC_SALEOR_API_URL=…8001/graphql/ pnpm run verify`, `cost:check`.
3. Restart verification stack from the final tree (PLAN §5), then manual GraphQL checks with `curl` against `http://localhost:8001/graphql/` using generated test users/tokens (scratchpad only): anon `product{isAgeRestricted}`/`shop{ageRestrictionMinimumAge}`; guest `checkoutCreate`+`checkoutLinesAdd` restricted ⇒ LR; customer without birthday ⇒ BR; minor ⇒ UA; adult completes an order by the simplest completion available on the clone (e.g. a fully paid/zero-total checkout or a transaction created through an app token); if no payment path exists on the clone, record "not manually verifiable" and rely on 09; superuser sets/reads birthday ⇒ exactly one `BIRTHDAY_READ` in `User.events` via DB shell count; `MANAGE_USERS` staff sees flag, birthday null; app token sees null; `customerDelete` ⇒ birthday events retained with `user_id NULL` (DB shell); `shopSettingsUpdate` changes apply to the very next check; draft with no customer completes.
4. Traceability: table of every `S§13` TC id → test name/result or manual check id; list not run and why.
5. Optional (time permitting, throwaway DB only, never the dev DB): CI parity migrations-compat job — baseline code (clean checkout elsewhere) running against a DB migrated by the new code.
6. Report: results, evidence (command + summary), residual risks, CI-only gaps, cleanup list from the Footprint ledger, restore plan (PLAN §9 G3). Write `23-handoff.md`; update HANDOFF.

## Subagents
- `rosetta-light:validator` — validation + manual checks + report; long-running.
- `rosetta-light:executor` — full-suite/verify runs; long-running.

## Notes
- No product code edits. A failure goes back through the remediation loop (owner per PLAN §6), then this session re-validates affected parts and the full gates.
- Never print/store credentials or birthdays beyond throwaway test values in the scratchpad; do not read env files.
- Manual checks write test data into the throwaway clone `saleor_agevalid` only (DB shell inspection is read-only); the dev DB `saleor` is not touched in this session.
- Playwright e2e, Storybook/Chromatic, Inspector, semgrep: not run; listed explicitly.

## Done when
- Every `S§13` TC id has a pass (automated or manual) or a stated reason; gates equal/better than baseline; manual checks recorded with request/response summaries (no secrets); report delivered to the user at G3.

## Checklist
- [ ] STD-ALL (no-edit variant)
- [ ] All three repos' gates run on the final tree, results vs baseline
- [ ] Manual checks list executed, evidence recorded
- [ ] TC traceability table complete
- [ ] Residual risks + CI-only gaps + FU-1 stated
- [ ] Footprint cleanup and restore plan ready for G3
