# Storage conditions: handoff

## Status
- G0 is approved: the shared `TranslationInput` contract is selected.
- Implementation is complete in `saleor/`, `saleor-dashboard/` and `react-storefront/`; validation is active.
- G2 is accepted with the documented dashboard format-check exception.

## Artifacts
- Specs: `plans/storage-conditions/storage-conditions-SPECS.md`
- Plan, with sessions 01–04 and gates G0–G2: `plans/storage-conditions/storage-conditions-PLAN.md`
- Design and evidence: `agents/TEMP/storage-conditions/architecture-notes.md`
- Flow state: `agents/TEMP/storage-conditions/coding-flow-state.md`

## Decisions
- UD1: translatable like name and description, on the storefront and the dashboard translation page (user, binding).
- UD2: dashboard targets main 3.23 only; `@lockSchema` on reads only; staging is out of scope (user, binding).
- UD3: plain text, optional, at most 250 characters, blank clears (user, binding).
- UD4: the Description section shows when only storage conditions exist (user, binding).
- AD1 (approved): add the field to the shared `TranslationInput`, which is non-breaking; category and collection translate reject a non-null value. Evidence:
  - `TranslationInput` is used by category, collection, product and product bulk translate (`saleor/saleor/graphql/translations/mutations/{category_translate.py:20,collection_translate.py:22,product_translate.py:24,product_bulk_translate.py:51}`).
  - The dashboard declares `$input: TranslationInput!` (`saleor-dashboard/src/translations/mutations.ts:6`).
- AD2: the dashboard `schema-main.graphql` gets only the additive SDL, not a full `fetch-local-schema` refresh. Reason: the format and content drift between the files is unknown (architecture notes U4).

## Blockers and risks
- R1: storefront codegen, lint and typecheck need a running, migrated local Saleor at `NEXT_PUBLIC_SALEOR_API_URL`. Not verified, because env files were not inspected. If no local API is reachable, session 03 stops.
- R2: Saleor pytest needs a local Postgres. Not verified.

## Session log
| Session | Status | Evidence |
|---|---|---|
| 01 Backend | complete | 578 focused tests passed; migration, schema and API contract implemented. |
| 02 Dashboard | complete | Code generation, type checks, schema-lock test and 773 focused tests passed. |
| 03 Storefront | complete | Code generation, typecheck, focused mapper tests, lock checks and touched-area lint passed. |
| 04 Validation | complete | Focused suites, API introspection, type/lock/schema checks and diff checks passed; browser checks were replaced by the user-approved automated/API alternative. |

## Common issues and solutions
- Dashboard `format:check` fails only on unchanged `agents/MEMORY.md`; accepted as a pre-existing, non-feature exception.
