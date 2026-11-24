# 04 — Core finalize: schema, changelog, isolated runtime
Depends on: 02, 03. Runs alone.
## Do
1. `uv run poe build-schema`; schema diff reviewed = additive only (SPECS §4).
2. `CHANGELOG.md` entry; core docs (`docs/*CONTEXT/ARCHITECTURE`) updated per project doc rules.
3. Full core gates: whole pytest (not e2e), pre-commit all, `makemigrations --check`.
4. Start isolated core instance per G0 strategy (separate port + DB); verify schema introspection exposes new fields.
5. Present G1 review (diff narrative, test evidence).
## Subagents
- executor (short): full gates. reviewer (short): schema diff + migration safety.
## Rules
- Dev DB and its API on :8000 untouched. Env files never read.
## Done when
- Gates green; isolated API serves new fields; G1 approved.
## Checklist
- [ ] Full tests green  - [ ] Pre-commit green  - [ ] Schema additive only  - [ ] Changelog  - [ ] Docs updated  - [ ] Isolated runtime verified  - [ ] G1 approved  - [ ] Handoff written
