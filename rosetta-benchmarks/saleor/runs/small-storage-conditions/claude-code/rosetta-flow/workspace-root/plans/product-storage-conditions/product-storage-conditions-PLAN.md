# Product storage conditions: execution plan (HOW)

The WHAT lives in `plans/product-storage-conditions/product-storage-conditions-SPECS.md` (§N = spec section, AC IDs = spec §11). Rationale: `agents/TEMP/product-storage-conditions/architecture-notes.md`. Ledger and status: `agents/TEMP/product-storage-conditions/coding-flow-state.md` (orchestrator-owned; sessions append a terse result line).

## Read first
1. SPECS (whole). 2. architecture-notes §3–§6. 3. `saleor/CLAUDE.md`, `saleor-dashboard/CLAUDE.md`, `react-storefront/CLAUDE.md`. 4. `saleor-dashboard/schema-directives.graphql` (`@lockSchema`). 5. `react-storefront/docs/adr/0002`, `0006`.

## Governing rules
- No commit, no push, no branch ops. Leave changes in the working tree (each repo's `CLAUDE.md`).
- No new dependencies in any repo (`CLAUDE.md`).
- Follow existing patterns; keep the change focused; no unrelated refactors (`CLAUDE.md`).
- **Tests are phase 11, after the user approves the implementation (phase 10).** Phases 7 and 9 write no new tests.
  - The feature is **not done** and must not be reported as done until T1–T3 and V2 pass. The orchestrator ledger keeps the phase-10 gate open.
  - Exception (user D3): S2 may add the new field to existing dashboard fixtures and typed test literals. Field only, no new assertions.
- DB writes (user D1) are allowed **only** on the local Docker dev DB (`saleor-benchmark-db-1`):
  - (a) the S1 migration;
  - (b) pytest test DBs (`test_saleor*`);
  - (c) V1/V2 validation data, strictly per the "Snapshot/Restore" protocol in V1.
  - If a restore fails → STOP and report. Nothing else, no other environment.
- Browser checks (user D2) only if a browser tool is already available and needs no new credentials. Otherwise rely on automated tests and API checks.
- Do not edit core-locked storefront files (`react-storefront/paper-core.lock.json` list), `schema-staging.graphql`, or the dashboard `fetch-schema*` outputs. Do not run `pnpm generate` (main+staging) or `fetch-schema*` in the dashboard.
- Do not create users or apps; do not change shop settings.

## Environment / commands (verified unless marked [A])
Backend: there is no host Python/uv. Use the container `saleor-benchmark-saleor-1` (repo mounted at `/app`). The API container `saleor-benchmark-api` serves `http://localhost:8000/graphql/` with `--reload` on the same mount.
```
BE="docker exec -w /app saleor-benchmark-saleor-1"
$BE sh -c "python manage.py makemigrations product -n product_storage_conditions"
$BE python manage.py migrate product                      # local dev DB only
$BE sh -c "python manage.py get_graphql_schema > saleor/graphql/schema.graphql"
$BE python -m pytest --create-db -p no:cacheprovider <paths>  # FIRST run after the migration: existing test_saleor* DBs predate the column
$BE python -m pytest --reuse-db -p no:cacheprovider <paths>   # later runs; NOT bare `pytest` (pipx)
$BE ruff check <paths> ; $BE ruff format --check <paths>
$BE mypy --cache-dir=/tmp/mypy-cache <changed .py paths>  # verified: 2 files ≈22 s, "Success"; the cache dir keeps /app clean
$BE sh -c "python manage.py makemigrations --check --dry-run"
$BE sh -c "python manage.py get_graphql_schema | diff saleor/graphql/schema.graphql -"
```
Dashboard (`cd saleor-dashboard`; node 24, pnpm 11):
```
API_URL=http://localhost:8000/graphql/ pnpm run fetch-local-schema   # writes schema-main.graphql via symlink
pnpm run generate:main                                              # NOT `generate`
pnpm exec jest <paths> ; pnpm test                                   # full suite
pnpm run check-types:src
pnpm exec eslint --fix <changed files> ; pnpm exec prettier --check <changed files>
pnpm run lint:changesets ; pnpm run extract-messages
```
Fallback when introspection is blocked or the diff is noisy: hand-apply the SDL delta from SPECS §4 to `schema-main.graphql` (introspection-print style), then `generate:main`.

Storefront (`cd react-storefront`; there is no `.env`):
```
SDL=/Users/njakovljevic/saleor-benchmark/saleor/saleor/graphql/schema.graphql
NEXT_PUBLIC_SALEOR_API_URL=$SDL pnpm run generate:all
NEXT_PUBLIC_SALEOR_API_URL=$SDL pnpm run typecheck        # prehook regenerates
pnpm exec vitest run <paths> ; pnpm run test:run
pnpm run lint ; pnpm run lint:design-tokens ; pnpm run lint:graphql-variants ; pnpm run data:lock:check ; pnpm run core:lock:check
```
No new `dangerouslySetInnerHTML` (run in each JS repo; must print nothing):
```
git diff -U0 -- src | grep -E '^\+.*dangerouslySetInnerHTML'
```
**Baseline red (pre-existing, do not fix):**
- `core:lock:check` reports `src/lib/{saleor,storefront}/AGENTS.md` removed.
- `docs:check` fails (no `skills/`), so `pnpm run verify` is red.
- Gate: the drift list stays exactly those 2 lines.

## File ownership (prevents collisions)
| Owner | Files |
|---|---|
| S1/T1 | everything under `saleor/` |
| S2/T2 | everything under `saleor-dashboard/` |
| S3/T3 | everything under `react-storefront/` |
| V1/V2 | read-only on source; DB writes per rules; no file edits except scratch output outside the repos |

## Phases & sessions
| Phase | # | Session | Depends on | Parallel with |
|---|---|---|---|---|
| 7 impl | S1 | Backend implementation | — | **alone, first** |
| 7 impl | S2 | Dashboard implementation | S1 (schema.graphql + running API) | S3 |
| 7 impl | S3 | Storefront implementation | S1 (schema.graphql) | S2 |
| 9 validate | V1 | Implementation validation | S1, S2, S3 | — |
| 11 tests | T1 | Backend tests | user approval (phase 10) | T2, T3 |
| 11 tests | T2 | Dashboard tests | user approval | T1, T3 |
| 11 tests | T3 | Storefront tests | user approval | T1, T2 |
| 13 validate | V2 | Final validation (E2E) | T1–T3 | — |

Unlisted pairs are sequential. S2∥S3 and T1∥T2∥T3 are valid only because they touch disjoint repos (ownership above). S1 must finish, with `schema.graphql` regenerated and the migration applied, before S2 or S3 start.

---

# S1 — Backend implementation (saleor)
## Do
1. Model fields + `get_translated_keys` key (SPECS §5); create migration 0211 via `makemigrations` (named per §5).
2. GraphQL: `Product`, `ProductTranslation`, `ProductTranslatableContent` fields; `ProductInput.storage_conditions`; `TranslationInput.storage_conditions` (§4, `ADDED_IN_323`).
3. `clean_storage_conditions` in `product_cleaner.py`; call it from `ProductCreate.clean_input`, `ProductUpdate.clean_input`, `ProductBulkCreate.clean_base_fields` (§5, §6).
4. Category/collection translate guard (§6), shared via a small helper in `translations/mutations/utils.py`.
5. `PRODUCT_FIELDS` += `"storage_conditions"` (last) in `saleor/webhook/payloads.py` (§7).
6. CSV: `ProductFieldEnum.STORAGE_CONDITIONS` after `PRODUCT_MEDIA`; mapping entry after `"product weight"` (§7).
7. Regenerate `saleor/graphql/schema.graphql`; add CHANGELOG bullets (§11 BE-13).
8. Apply the migration to the local dev DB; confirm the API container reloaded (introspection shows `Product.storageConditions`). If it did not reload, report to the orchestrator; do not restart other services without approval.
## Rules
- `ProductBulkCreateInput` inherits the field from `ProductCreateInput`; do not redeclare it.
- `validate_input_against_model` builds a model instance from input keys, so passing the field to Category/Collection causes a TypeError/FieldError. The guard must run before it.
- No search (`product/search.py`) or filter changes (BE-12).
- Translation values are not stripped.
## Done when
- Introspection on `localhost:8000` returns all §4 fields and the enum value.
- `makemigrations --check` is clean; schema diff is empty.
- `ruff check` / `ruff format --check` / mypy on the changed files are clean.
- Existing suites run (first with `--create-db`) with only the expected failure: `saleor/graphql/product/tests saleor/graphql/translations/tests saleor/webhook/tests saleor/csv/tests saleor/graphql/csv/tests saleor/plugins/webhook/tests/test_webhook.py`.
- **Expected failing:** `saleor/csv/tests/export/products_data/test_get_products_data.py::test_get_products_data` (exports every mapped field; fixed in T1). Any other failure is a defect.
## Checklist
[ ] §4 SDL exact · [ ] §5 model/migration · [ ] §6 error matrix implemented · [ ] guard for category+collection · [ ] §7 payload key + CSV enum/mapping · [ ] schema.graphql regenerated · [ ] CHANGELOG ×2 · [ ] local DB migrated · [ ] lint/format/mypy clean · [ ] only the expected failure · [ ] no tests written · [ ] no commit/push

# S2 — Dashboard implementation (saleor-dashboard)
Depends on: S1
## Do
1. Regenerate `schema-main.graphql` (fetch-local-schema or fallback); `generate:main`. Review the schema diff: only §4 deltas.
2. Product page per SPECS §8 (fragment, form type, initial data, `PRODUCT_DETAILS_SAVE_FIELDS`, `ProductDetailsForm` textarea, submit mapping).
3. Translations per §8 (enum, fragment, mutation selection, product page field, product completion).
4. Export dialog option + label per §8.
5. Messages: formatjs ids via `eslint --fix`; `pnpm run extract-messages`.
6. `.changeset/product-storage-conditions.md` (`patch`).
## Rules
- Every `storageConditions` selection carries `@lockSchema(schema: "main")`.
- UI and enum use are gated by `isMainSchema()`. `@lockSchema` cannot strip enum values or input keys.
- Codegen uses `avoidOptionals.field: true`, so typed literals must include the new key:
  - `src/products/fixtures.ts` (`product()`).
  - `src/translations/components/TranslationsProductsPage/use-translation-product-form-app-response.test.ts` (`mockProductData`).
  - `src/products/views/ProductUpdate/handlers/useProductUpdateHandler.test.tsx` (`ProductUpdateSubmitData` literal).
  - Add `storageConditions` only; no new assertions (phase 11).
- Do not edit `*.stories.tsx` (user D4). The product translation completion count stays in scope.
- Do not touch `getGeneralEntityTranslationCompletion` or `createGeneralNameDescriptionSection` behavior for category/collection.
- `ProductCreatePage/form.tsx` is type-only and stays untouched.
## Done when
- `check-types:src` green.
- `pnpm test` green, including `src/graphql/lockSchema.test.ts`.
- eslint/prettier clean on changed files; `lint:changesets` green.
- `git diff --stat` touches only SPECS §15 dashboard files plus generated main files.
## Checklist
[ ] schema-main + main generated only (staging untouched) · [ ] @lockSchema on all selections · [ ] isMainSchema gating (form, translation field, completion, export) · [ ] Save enables on field-only change · [ ] clear → null · [ ] counter/maxLength 250 · [ ] messages extracted · [ ] changeset · [ ] fixtures/literals type-only · [ ] all gates green · [ ] no new tests · [ ] no commit/push

# S3 — Storefront implementation (react-storefront)
Depends on: S1
## Do
1. Extension fragment selections (SPECS §9); `generate:all` from the SDL path.
2. `mapProductExtensions` + `getStorageConditions` in `src/config/storefront-view.ts` (§9 resolution rule).
3. `page.tsx`: the one-prop change only.
4. `ProductAttributes`: new prop and accordion item directly after description; `"storage"` in `defaultValue`.
5. `pdp.attributes.storageConditions` in all 8 `messages/*.json` (§9 strings), placed next to `careInstructions`.
## Rules
- Do not edit `src/graphql/ProductDetails.graphql`, `src/lib/storefront/**`, `src/lib/saleor-translations.ts`, or templates (ADR 0006, core lock).
- The fragment may use `$languageCode` only because its sole spread is in `ProductDetails`.
- Plain text node only.
## Done when
- `typecheck` green (SDL env).
- `pnpm run test:run`, `lint`, `lint:design-tokens`, `lint:graphql-variants` and `data:lock:check` green.
- No new `dangerouslySetInnerHTML` in the diff.
- `core:lock:check` drift is exactly the 2 baseline lines.
## Checklist
[ ] extension fragment · [ ] mapper + reader typed · [ ] route 1-prop · [ ] item after Description, open, hidden when empty · [ ] 8 locales · [ ] no core-locked edits · [ ] gates green · [ ] no new tests · [ ] no commit/push

# V1 — Implementation validation (phase 9)
Depends on: S1, S2, S3. HITL-free; report to the orchestrator.
## Do
1. Re-run every S1/S2/S3 "Done when" gate. Record pass/fail per command, with the expected-failure list from S1.
2. Run the E2E checklist below (AC BE-01..13, DA-01..05, SF-01..03, SF-05) where feasible. Mark infeasible items with the reason; do not improvise.
   - SF-04 (escaping) and the order/hidden render details are proven by T3 vitest render tests in V2. Prefer them over manual checks, because of `"use cache"` staleness.
   - V1 never writes HTML test values.
3. Restore per the protocol below. If any restore step fails → STOP, report the exact remaining rows/values, and do nothing else.
## E2E checklist (local dev DB only, user D1)
Setup:
- Staff JWT (read-only; existing superuser, no new credentials):
  ```
  $BE python manage.py shell -c "from saleor.account.models import User; from saleor.core.jwt import create_access_token; print(create_access_token(User.objects.filter(is_superuser=True).first()))"
  ```
  No superuser → mark API-write items infeasible.
- Test product: `apple-juice` (default-channel). Test category: `apple-juice`'s category. Language: DE.

**Snapshot (before any write; print and keep in the report):**
- `Product(slug="apple-juice").storage_conditions`.
- Whether `ProductTranslation(product=apple-juice, language_code="de")` exists → pk + `storage_conditions`.
- Whether `CategoryTranslation(category=<that category>, language_code="de")` exists → pk + all translated fields.

API (curl `localhost:8000/graphql/`):
- [ ] Introspection shows §4 (BE-01).
- [ ] `productUpdate` `"  Keep refrigerated at 2–8 °C  "` → stored stripped (BE-03).
- [ ] 251 chars → INVALID, value unchanged (BE-04).
- [ ] Anonymous read (BE-06).
- [ ] `productTranslate` DE `{storageConditions:"Gekühlt lagern bei 2–8 °C"}` (BE-07).
- [ ] `categoryTranslate` DE `{storageConditions:"x"}` → INVALID, nothing saved; `{storageConditions:null}` → no error (BE-08).

Payload/CSV (read-only shell, while the values are set):
- [ ] `generate_product_payload(p)` and `generate_product_deleted_payload(p, [])` contain `storage_conditions` (BE-09).
- [ ] `generate_translation_payload(<DE ProductTranslation>)` keys contain it (BE-10).
- [ ] `get_product_export_fields_and_headers_info({"fields":["name","storage conditions"]})` + `get_products_data(...)` produce the header and value (BE-11). Do not call `exportProducts`: there is no Celery worker.

Storefront smoke (start dev **after** the values are set, so the cache is cold):
- Start the app:
  ```
  NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8000/graphql/ NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3000 NEXT_PUBLIC_DEFAULT_CHANNEL=default-channel STOREFRONT_CHANNELS=default-channel NEXT_PUBLIC_STOREFRONT_LOCALES=en,de CONTENT_PROVIDER=code pnpm dev
  ```
  [A] Env set inferred from `src/config/{channels,locale}.ts`.
- [ ] `curl -s localhost:3000/en/default-channel/products/apple-juice`: "Storage Conditions" after "Description", base text (SF-01).
- [ ] `/de/default-channel/products/<de slug or apple-juice>`: "Lagerungshinweise" + DE text (SF-02, SF-05).
- [ ] An untouched product (e.g. `ascii-tee`) has no label (SF-03).
- Stop dev when done.

Dashboard (user D2):
- Browser checks DA-01..04 run only if a browser tool is already available **and** login works without new credentials. Otherwise mark them infeasible and rely on S2 gates and T2.
- DA-05: covered by `lockSchema.test.ts`.

**Restore (mandatory; shell/ORM on the local dev DB):**
1. `apple-juice.storage_conditions` = snapshot value.
2. DE ProductTranslation:
   - created by V1 → delete the row;
   - pre-existing → restore its `storage_conditions` to the snapshot value.
3. DE CategoryTranslation:
   - created by V1 (e.g. by the `null` call) → delete the row;
   - pre-existing → restore all fields to the snapshot.
4. Any other value written → restore to the snapshot. No HTML test values may remain.
5. Re-read every touched row and diff it against the snapshot. List every touched row (model, pk, action) in the report.
## Done when
- The report lists every gate and AC as pass, fail or infeasible (with reason), plus the snapshot and restore diff.
- No source files modified. DB state equals the snapshot.
## Checklist
[ ] all gates re-run · [ ] expected-failure list respected · [ ] snapshot taken before writes · [ ] AC matrix filled · [ ] created rows deleted, values restored, re-read = snapshot · [ ] no source edits · [ ] no non-local writes

# T1 — Backend tests (phase 11)
Depends on: user approval of the implementation.
## Do
Write or extend tests covering SPECS §11/§12 BE-03..BE-11:
- `saleor/graphql/product/tests/mutations/test_product_create.py`, `test_product_update.py`, `test_product_bulk_create.py`
- `saleor/graphql/product/tests/queries/test_product_query.py`
- `saleor/graphql/translations/tests/mutations/test_product_translate.py`, `test_product_bulk_translate.py`, `test_category_translate.py`, `test_collection_translate.py`
- `saleor/graphql/translations/tests/test_translations.py`
- `saleor/webhook/tests/test_webhook_payloads.py` (product created/updated + deleted payload; translation keys ~l.1094)
- `saleor/csv/tests/export/products_data/test_get_products_data.py` (**update the expected failing test**: add `storage_conditions` to `expected_data`, set a value on one product), `test_prepare_headers.py`, `saleor/csv/tests/export/test_export.py`
## Rules
- Follow the given/when/then style of the neighboring tests. Use existing fixtures (`product`, `product_translation_fr`, `category`, `collection`, `staff_api_client`, `permission_manage_products`, `permission_manage_translations`).
- No production code changes. A failing test that reveals a defect → report it; do not fix in T1.
## Done when
The S1 suite list is fully green (0 expected failures); ruff clean.
## Checklist
[ ] happy/strip/blank/boundary/over/unicode/html cases · [ ] bulk paths · [ ] guard both entities · [ ] payload + translation keys · [ ] CSV header/order/empty cell · [ ] previously failing CSV test fixed · [ ] all green

# T2 — Dashboard tests (phase 11)
Depends on: user approval.
## Do
Tests for DA-01..DA-05:
- `src/products/views/ProductUpdate/handlers/utils.test.ts` (set, clear → null, absent → not sent)
- `src/products/components/ProductUpdatePage/form.test.ts` (change → payload; Save enabled)
- `.../ProductUpdatePage/saveComposition.test.ts`
- `src/translations/utils.test.ts`
- `src/translations/views/EntityLists/utils.test.ts` (product completion, main vs staging)
- Export field-list gating: extract the list into a pure helper in `ProductExportDialog/` only if needed for testability, and test main vs staging.
- `src/graphql/lockSchema.test.ts` stays green.
## Rules
- Mock the schema version the same way existing `*.stagingSchema.test.ts` files do (e.g. `src/attributes/utils/data.stagingSchema.test.ts`).
## Done when
`pnpm test`, `check-types:src`, eslint and prettier are green.
## Checklist
[ ] main + staging paths · [ ] clear semantics · [ ] completion count · [ ] export gating · [ ] all green

# T3 — Storefront tests (phase 11)
Depends on: user approval.
## Do
- New `src/config/storefront-view.test.ts`: base only; translation wins; whitespace translation → base; both blank → null; reader typing.
- New `src/ui/components/pdp/product-attributes.test.ts`:
  - `renderToStaticMarkup` + `createElement` + `NextIntlClientProvider` (en messages).
  - Follow the pattern in `src/lib/storefront/__contracts__/templates.contract.test.ts`.
  - Assert: order after Description; hidden when null; label from messages.
  - Assert escaping (SF-04): `"<b>x</b>"` appears as `&lt;b&gt;x&lt;/b&gt;` and is **not** emitted through the description `dangerouslySetInnerHTML` loop.
  - These tests replace manual SF-04 checks (`"use cache"` staleness).
- Optional: an `extensions` assertion in `src/lib/storefront/mappers/product.test.ts`.
## Rules
- Vitest env is node and the include glob is `*.test.ts`. No testing-library or jsdom (no new deps).
## Done when
`test:run`, `typecheck` (SDL env), `lint` and `data:lock:check` are green; core drift is baseline only.
## Checklist
[ ] mapper cases · [ ] render order/hidden/escape · [ ] 8-locale key parity asserted or checked · [ ] all green

# V2 — Final validation (phase 13)
Depends on: T1, T2, T3.
## Do
- Repeat V1 in full, with the same snapshot/restore protocol and **zero** expected failures. Include the full suites: backend paths from S1 (`--create-db` if the schema changed since the last run), `pnpm test` (dashboard), `pnpm run test:run` (storefront).
- Run the no-new-`dangerouslySetInnerHTML` diff check in the dashboard and storefront.
- Run `lint:graphql-variants` in the storefront.
- Confirm no commits: `git status` shows a dirty tree, and `git rev-parse --short HEAD` is unchanged vs baseline (saleor `692b070`, saleor-dashboard `78273c4`, react-storefront `f11c4a2`).
- Confirm no new deps: no diff in any lockfile or `package.json`/`pyproject.toml`.
## Done when
- The AC matrix is 100% pass or infeasible-with-reason.
- No lockfile/dependency diffs; no commits; validation data restored.
## Checklist
[ ] all gates green · [ ] AC matrix · [ ] no deps · [ ] no commits · [ ] data restored · [ ] report to orchestrator
