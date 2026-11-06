# 00 — Baseline, env, runtime strategy
Depends on: specs approved.
## Do
1. Run each repo's full test+lint+typecheck baseline unchanged; record pass/fail + timings in `00-handoff.md` (core: `uv run poe test`, pre-commit; dashboard: `pnpm test`, `check-types`, `lint:eslint`; storefront needs `NEXT_PUBLIC_SALEOR_API_URL`, `pnpm verify`).
2. Establish how core tests get a DB (`PYTEST_DB_URL` vs local postgres) without touching dev data.
3. Design runtime strategy for sessions 04–07: new core instance on a separate port + separate database (never migrate the running dev DB); how to seed it (`seed.dump` is reference only, no restore rule ⇒ propose, do not execute).
4. Present strategy to user (G0).
## Subagents
- executor (short): run baselines, summarize output.
## Notes
- WA-05/06 (`docs/ASSUMPTIONS.md`): API start command unverified; verify read-only.
- Pre-existing failures are recorded, not fixed.
## Done when
- Baseline table per repo in handoff; runtime strategy approved by user.
## Checklist
- [ ] Baselines recorded  - [ ] No file changed in repos  - [ ] No secret read/printed  - [ ] G0 approved
