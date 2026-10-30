# PLAN — age-restricted products (Status: Approved by user)

Specs (WHAT, authority): `AGE-RESTRICTED-PRODUCTS-SPECS.md`. Brief/decisions: `AGE-RESTRICTED-PRODUCTS-BRIEF.md`. This plan = order, ownership, gates only; no spec content repeated (reference `SPECS §n`).

## Read first (every session)
`../../docs/CONTEXT.md`, `../../docs/ARCHITECTURE.md`, `../../agents/MEMORY.md`, repo `CLAUDE.md` + `docs/ARCHITECTURE.md` of the repo being edited, `SPECS`, `HANDOFF.md`.

## Governing rules
- Repo rules win inside a repo (`<repo>/CLAUDE.md`): no commit/push, tests + linters green before done, no new deps, no unrelated refactor.
- Never read/print `.env*`, `.jwt_key.pem`; birthday never in logs/fixtures printed to output (`sensitive-data`).
- DB/runtime actions on the shared local stack = `dangerous-actions` ⇒ explicit user approval first (gate G0).
- Generated files (`schema.graphql`, `*.generated.ts`, `src/gql`) only via commands, never by hand.
- Coded ≠ done: each session ends with a reviewer ≠ implementer subagent + checklist evidence; phases end with a HITL gate.
- Findings/decisions/root causes → `NN-handoff.md` + `HANDOFF.md`; lessons → `../../agents/MEMORY.md`.

## Sessions
| # | Session | Depends on | Parallel with |
|---|---|---|---|
| 00 | Baseline, env, runtime strategy | specs approved | — (alone) |
| 01 | Core data + domain | 00 | — |
| 02 | Core API: product, shop, user, audit | 01 | 03 |
| 03 | Core enforcement: checkout + drafts | 01 | 02 |
| 04 | Core finalize: schema, changelog, isolated runtime | 02, 03 | — (alone) |
| 05 | Dashboard | 04 | 06 |
| 06 | Storefront | 04 | 05 |
| 07 | Validation, docs, acceptance | 05, 06 | — (alone) |
Unlisted pairs are sequential. 02∥03 and 05∥06 are valid only because they share no files (ownership below). 00, 04, 07 run alone (shared stack/schema).

## File ownership
- 01: `saleor/{account,product,site}/{models.py,__init__.py,migrations/*}`, `account/age.py`, `account/age_audit.py`, `*/error_codes.py` (all), `checkout/age_restriction.py` and `order/age_restriction.py` (signatures + logic).
- 02: `saleor/graphql/{account,product,shop}/**`, their tests, `webhook` payload tests.
- 03: `saleor/graphql/{checkout,order}/**`, `saleor/checkout/complete_checkout.py`, their tests.
- 04: `saleor/graphql/schema.graphql`, `CHANGELOG.md`, benchmark tests, `docs/` of core.
- 05: `saleor-dashboard/**` only. 06: `react-storefront/**` only. 07: workspace `docs/`, `agents/`, repo `docs/` updates.
- Latent collision resolved: `graphql/core/enums.py` + `schema.graphql` touched by both 02 and 03 ⇒ enums derive from Python enums owned by 01; schema regenerated only in 04.

## Gates (HITL, strict approval sentence)
- G-plan: approve this plan before any code.
- G0 (after 00): approve runtime strategy (isolated DB/port; no change to the dev DB).
- G1 (after 04): core review summary + diff narrative ⇒ approve before client work.
- G2 (after 05+06): client review ⇒ approve before acceptance.
- G-final (after 07): acceptance against SPECS §7 coverage ⇒ close.

## Tracker
`plan.json` (status per session). Handoff: `HANDOFF.md`.
