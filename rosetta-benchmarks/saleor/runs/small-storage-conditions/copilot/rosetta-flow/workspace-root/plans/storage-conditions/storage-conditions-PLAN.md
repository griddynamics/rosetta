# Storage conditions: plan (session index and sessions)

Specs (what to build): `plans/storage-conditions/storage-conditions-SPECS.md`. Status: `plans/storage-conditions/HANDOFF.md`.
Format note: the user asked for exactly 3 files, so the session plans live in this file instead of `NN-plan-*.md` files.

## Read first
- Specs §1–§8. Design and evidence: `agents/TEMP/storage-conditions/architecture-notes.md`.
- Team rules in `saleor/CLAUDE.md` (the same rules apply in all 3 repos).
- `saleor/docs/ARCHITECTURE.md:46-70` and `saleor/docs/GRAPHQL-ARCHITECTURE.md:23-57`.
- `saleor-dashboard/docs/ARCHITECTURE.md:39-55,126-146`.
- `react-storefront/docs/ARCHITECTURE.md:79-102` and `react-storefront/docs/DATA-ARCHITECTURE.md:53`.

## Governing rules
- No commit or push; no new dependencies; tests for every change. Authority: `*/CLAUDE.md`.
- Never hand-edit generated files: `saleor/graphql/schema.graphql`, dashboard `src/graphql/*.generated.ts`, storefront `src/gql/`.
- Saleor: every model change needs a migration and every API change needs `build-schema`; both are CI-checked (`saleor/docs/ARCHITECTURE.md:62`).
- Storefront: no drift in core-locked files (`scripts/paper-core-lock.mjs:18-24`). Fork fields go through the extension seam (`src/config/storefront-view.ts:5-11`).
- Dashboard: main schema only (UD2). Reads use `@lockSchema(schema:"main")` (`src/fragments/attributes.ts:35-38`).
- Record outcomes, evidence and decisions in `HANDOFF.md` only.

## File ownership (no file has two owners)
| Session | Owns (write) | Reads only |
|---|---|---|
| 01 Backend | `saleor/**` | — |
| 02 Dashboard | `saleor-dashboard/**` | `saleor/saleor/graphql/schema.graphql` |
| 03 Storefront | `react-storefront/**` | `saleor/**` (running API) |
| 04 Validation | `plans/storage-conditions/HANDOFF.md` | everything |

## Phases
| # | Session | Depends on | Parallel with |
|---|---|---|---|
| G0 | HITL: approve specs and plan, confirm AD1 | — | — |
| 01 | Backend API, translations, migration, schema | G0 | — (runs alone) |
| G1 | HITL: approve the API contract (schema diff) | 01 | — |
| 02 | Dashboard product form and translation page | G1 | 03 |
| 03 | Storefront PDP rendering | G1 | 02 |
| 04 | Cross-repo validation and review | 02, 03 | — (runs alone) |
| G2 | HITL: final acceptance | 04 | — |
- Any pair not listed as parallel runs sequentially. 02 and 03 can run in parallel only because they are in different repos and share no files.
- Collision resolved: both 02 and 03 need the new schema. 02 reads the committed SDL file; 03 introspects the running API. Neither writes into `saleor/`.

## HITL gates (exact)
- **G0, before any product code.** The user explicitly replies "approve plan" to SPECS and PLAN, and confirms AD1 (shared `TranslationInput`, non-breaking) or chooses the breaking `ProductTranslationInput`. Without that reply, nothing starts.
- **G1, after 01.** The orchestrator shows the user the `schema.graphql` diff (7 additions), the migration file and the test summary. The user replies "approve API". Until then 02 and 03 do not start.
- **G2, after 04.** The user reviews the HANDOFF evidence (commands, results, manual checks) and replies "accept". If anything fails, it goes back to the session that owns it.

---

# 01: Backend (saleor)
Depends on: G0

## Do
1. Add `Product.storage_conditions` and `ProductTranslation.storage_conditions` and one migration `0211_*` (Specs §4.1).
2. Product API contract (Specs §4.2): type field, `ProductInput` field, a trim/blank/length cleaner wired into create, update and bulk create.
3. Translation contract (Specs §4.3): `TranslationInput`, `ProductTranslation` and `ProductTranslatableContent` fields; product translate and bulk translate; rejection in category/collection translate.
4. Add `storage_conditions` to `ProductTranslation.get_translated_keys()`.
5. Run `build-schema` and add a `CHANGELOG.md` entry under `# 3.23.0` → `### GraphQL API` (`CHANGELOG.md:5,35`).
6. Tests T1–T14 in the existing per-operation test files.

## Subagents
- engineer: implementation and tests (long-running). executor: runs tests and linters (short).

## Rules (traps)
- `validate_input_against_model` drops falsy values and builds `model(**data)` (`translations/mutations/utils.py:74-79`).
  - Blank values skip validation, so normalise `""` to `None` before saving.
  - Category and collection translate would raise `TypeError` (a 500) on the unknown field, so add an explicit typed rejection.
- `productTranslate` validates against `Product`, not `ProductTranslation` (`utils.py:138-139`, `product_translate.py:28-31`). Both fields need the same `max_length`.
- Bulk translate saves only `Meta.translation_fields` (`product_bulk_translate.py:79`, `utils.py:467`). Add `storage_conditions` there.
- The product mutations use the legacy `DeprecatedModelMutation` / `ModelWithExtRefMutation`. Extend them in place; do not migrate them (`product_create.py:128`, `product_update.py:26`).
- Field descriptions use `ADDED_IN_323` (`graphql/product/types/collections.py:61-62`).
- Do not add the field to the legacy `PRODUCT_FIELDS` (`webhook/payloads.py:666-676`) or to search.

## Done when
- `makemigrations --check` is clean, and the `schema.graphql` diff is exactly the 7 additions (Specs AC2–AC3).
- T1–T14 pass. ruff and mypy are clean on the touched files.

## Checklist
- [ ] Model fields and migration `0211` (nullable, max 250)
- [ ] Product type and input fields with `ADDED_IN_323`
- [ ] Cleaner: trim, blank → null, > 250 → `INVALID` on `storageConditions`
- [ ] Create, update and bulk create all use the cleaner
- [ ] Translation fields on the input and both types
- [ ] productTranslate: blank → null, length validated
- [ ] productBulkTranslate: saved on create and update
- [ ] category/collectionTranslate: typed error, no 500
- [ ] `get_translated_keys` updated
- [ ] Schema regenerated, not hand-edited
- [ ] CHANGELOG entry
- [ ] T1–T14 written and passing
- [ ] Permission test (T6) and anonymous read test (T8)
- [ ] Edge cases: exactly 250, 251, whitespace only, unicode `°C` `–`
- [ ] ruff, ruff-format and mypy clean
- [ ] No unrelated refactors
- [ ] HANDOFF updated (commands and results)

---

# 02: Dashboard (saleor-dashboard)
Depends on: G1 · Parallel with: 03

## Do
1. Add the 7 additions to `schema-main.graphql` so they mirror `saleor/saleor/graphql/schema.graphql`. Additive only, no other drift.
2. Read selections with `@lockSchema(schema:"main")`: the `Product` fragment (`src/fragments/products.ts:214-258`), the `ProductTranslation` fragment (`src/fragments/translations.ts:77-98`), and the `UpdateProductTranslations` response (`src/translations/mutations.ts:3-35`).
3. Product page (Specs §4.4): Textarea in `ProductDetailsForm`, form data, initial values (`src/products/utils/data.ts:196-219`), `PRODUCT_DETAILS_SAVE_FIELDS`, `getProductUpdateVariables`.
4. Translation page (Specs §4.4): enum value, the field in the product general section, submit through the existing mutation.
5. Run `generate` and `extract-messages`, update fixtures, add a patch changeset, write tests D1–D5.

## Subagents
- engineer (long-running). executor: generation, tests and linters (short).

## Rules (traps)
- Keep `$input: TranslationInput!` and `ProductUpdate`'s `ProductInput!`. The mutation documents do not list input fields.
- Field-level `@lockSchema` works in any document (`src/graphql/lockSchema.ts:45-60`). `lockSchema.test.ts` checks every document against staging (`:37-58`), so every read of the field needs the lock.
- With `avoidOptionals.field: true` (`codegen-main.ts:50-51`), `src/products/fixtures.ts` and any other typed literal of `ProductFragment` / `ProductTranslationFragment` must include the new key. `src/translations/fixtures.ts` currently has none.
- `ProductCreatePage/form.tsx` is effectively dead, since creation is minimal (`createMinimalProduct.ts:35-51`). Do not add the field there.
- `ProductDetailsForm.tsx` has `// @ts-strict-ignore`. New files must pass `tsc-strict`.
- The update payload holds only changed keys. An empty value is an explicit clear, sent as `null` (`handlers/utils.ts:68-74`).

## Done when
- D1–D5 pass. `check-types`, `lint:eslint` and `format:check` are clean. Generated files and `locale/defaultMessages.json` are regenerated; the changeset exists (Specs AC4).

## Checklist
- [ ] schema-main: only the 7 additions
- [ ] Three read selections locked to main
- [ ] Textarea: label, maxLength 250, test id, error text
- [ ] Form data, initial values, save fields, variables (`""` → null)
- [ ] Translation enum, section field and submit payload
- [ ] `pnpm run generate` output committed to the working tree, not hand-edited
- [ ] Fixtures updated
- [ ] D1–D5 passing
- [ ] Messages extracted
- [ ] Patch changeset
- [ ] check-types, eslint and prettier clean
- [ ] Unset product: form and payload unchanged
- [ ] HANDOFF updated

---

# 03: Storefront (react-storefront)
Depends on: G1 (running local Saleor with 01 applied and migrated) · Parallel with: 02

## Do
1. Extension fragment selection (Specs §4.5).
2. `mapProductExtensions`: resolve translation over base, return `{}` when unset. Write `src/config/storefront-view.test.ts` (S1).
3. `ProductAttributes`: new prop; the Description item rendering rule and order (Specs §4.5, UD4).
4. Route passes one prop (`page.tsx:212-219`).
5. `pdp.attributes.storageConditions` in `messages/en.json`, plus translations in the other 7 locale files.
6. Run `pnpm generate` against the local API.

## Subagents
- engineer (long-running). executor: codegen, verify steps (short).

## Rules (traps)
- Do not edit `ProductDetails.graphql`, `src/lib/storefront/**` (core-locked; `paper-core.lock.json:21,24`) or `src/lib/saleor/**`.
- The route edit is limited to the one prop. This deliberately goes against the advisory comment in `storefront-view.ts:9-10` (approved in the design).
- `src/lib/storefront/mappers/product.test.ts:72` must still show `extensions: {}`, so return no key when the field is unset.
- Vitest collects only `src/**/*.test.ts` (`vitest.config.ts:9`). Keep the resolution logic in `storefront-view.ts` so it can be tested.
- Codegen and ESLint read the remote `NEXT_PUBLIC_SALEOR_API_URL` (`.graphqlrc.ts:24-36`). If no local API is reachable, STOP and report; do not point codegen at a remote demo API.
- No raw colours in `src/ui/**` (`docs/ARCHITECTURE.md:75`). Render the text as a text node only.

## Done when
- S1–S2 pass. `typecheck`, `lint`, `core:lock:check`, `data:lock:check` and `lint:design-tokens` are clean; the lock files are unchanged (Specs AC5).

## Checklist
- [ ] Extension fragment includes the translation selection
- [ ] Mapper: translation > base, trimmed, `{}` when unset
- [ ] S1 cases (6) passing; S2 unchanged
- [ ] Description item shows for storage-only; order correct
- [ ] No `dangerouslySetInnerHTML` for the new text
- [ ] Route: one-prop diff only
- [ ] en message plus 7 locale translations
- [ ] Core and data locks unchanged and checks green
- [ ] typecheck, lint and design tokens clean
- [ ] HANDOFF updated

---

# 04: Cross-repo validation and review
Depends on: 02, 03 · Runs alone

## Do
1. Run the minimal command set below in all 3 repos and record the results in HANDOFF.
2. Manual check (Specs S3, AC6–AC7): set, clear and translate in the dashboard, then check the PDP for the 4 states.
3. Independent code review against SPECS: contracts, traps, security (text-node rendering), no unrelated changes, no lock drift.
4. Send any defect back to the owning session. Do not fix it here.

## Subagents
- validator: commands and manual checks (long-running). reviewer: read-only diff review (short).

## Done when
- AC1–AC7 are evidenced in HANDOFF, there are no open defects, and the G2 package is ready.

## Checklist
- [ ] All commands green, with output summarised
- [ ] Manual PDP checks: 4 states plus 1 translated locale
- [ ] Dashboard: persists after reload, clear works
- [ ] Schema diff shows 0 breaking changes
- [ ] Review findings resolved or escalated
- [ ] HANDOFF final status

---

## Minimal test commands
- saleor (from `saleor/`):
  - `uv run python manage.py makemigrations product -n product_storage_conditions`
  - `uv run poe build-schema`
  - `uv run python manage.py makemigrations --check --dry-run`
  - Tests:
    ```
    uv run poe test -n0 saleor/graphql/product/tests/mutations/test_product_create.py \
      saleor/graphql/product/tests/mutations/test_product_update.py \
      saleor/graphql/product/tests/mutations/test_product_bulk_create.py \
      saleor/graphql/product/tests/queries/test_product_query.py \
      saleor/graphql/translations/tests/mutations/test_product_translate.py \
      saleor/graphql/translations/tests/mutations/test_product_bulk_translate.py \
      saleor/graphql/translations/tests/mutations/test_category_translate.py \
      saleor/graphql/translations/tests/mutations/test_collection_translate.py \
      saleor/graphql/translations/tests/test_translations.py -k "storage_conditions"
    ```
    Rerun without `-k` for the touched files.
  - `uv run ruff check <touched>`, `uv run ruff format --check <touched>`, `uv run mypy <touched non-test>`
- dashboard (from `saleor-dashboard/`):
  - `pnpm run generate`
  - `pnpm run test:quiet src/products src/translations src/graphql/lockSchema.test.ts`
  - `pnpm run check-types:src`, `pnpm run lint:eslint`, `pnpm run format:check`, `pnpm run extract-messages`
- storefront (from `react-storefront/`):
  - `pnpm generate`
  - `pnpm exec vitest run src/config/storefront-view.test.ts src/lib/storefront/mappers/product.test.ts`
  - `pnpm typecheck`, `pnpm lint`, `pnpm core:lock:check`, `pnpm data:lock:check`, `pnpm lint:design-tokens`
