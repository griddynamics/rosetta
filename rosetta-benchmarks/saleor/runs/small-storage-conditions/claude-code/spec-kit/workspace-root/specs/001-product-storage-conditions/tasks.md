---

description: "Task list for Product Storage Conditions"
---

# Tasks: Product Storage Conditions

**Input**: Design documents from `/specs/001-product-storage-conditions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql.md, quickstart.md

**Tests**: Required (constitution Principle IV and the feature's definition of done). Test tasks are included for every story.

**Organization**: Tasks are grouped by user story. Backend work is foundational because both stories depend on the API. Paths are relative to the workspace root `~/saleor-benchmark/`. Do not commit or push (repo CLAUDE.md); leave changes in the working tree. Do not hand-edit generated files (`*.generated.ts`, `src/gql/`, `schema.graphql`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = staff set storage conditions (dashboard), US2 = customers see them (storefront)

---

## Phase 1: Setup

- [X] T001 Confirm the local toolchain works before changing code: in `saleor/` run `pytest saleor/graphql/product/tests/mutations/test_product_update.py -q -x` (needs the Postgres test DB; if unavailable, record it as a blocker), in `saleor-dashboard/` and `react-storefront/` confirm `node_modules` exist (`pnpm install --frozen-lockfile` only if missing, no manifest/lockfile changes)

---

## Phase 2: Foundational — Backend (blocks all user stories)

**Purpose**: Field exists in the database and GraphQL API with validation, with tests.

- [X] T002 In `saleor/saleor/product/models.py` add to `Product` the field `storage_conditions = models.CharField(max_length=250, blank=True, default="")` (data-model: "text, max 250 chars", not required, default empty string)
- [X] T003 Generate the migration with `python manage.py makemigrations product` in `saleor/`; it must be `saleor/saleor/product/migrations/0211_*.py` depending on `0210_collection_external_reference_unique_constraint`, adding one column only; verify `python manage.py makemigrations --check --dry-run` is clean
- [X] T004 Add `storage_conditions = graphene.String(description="Storage conditions of the product, e.g. \"Keep refrigerated at 2–8 °C\". Max 250 characters.")` to `ProductInput` in `saleor/saleor/graphql/product/mutations/product/product_create.py` (inherited by create and update input, next to `external_reference`)
- [X] T005 In `ProductCreate.clean_input` in `saleor/saleor/graphql/product/mutations/product/product_create.py` normalise `storage_conditions` when present: strip whitespace (whitespace-only → `""`), and if length > 250 raise `ValidationError({"storage_conditions": ValidationError("...", code=ProductErrorCode.INVALID.value)})`; follow the style of the neighbouring `cleaner.*` helpers (put a small helper in the same module/`cleaner` if that is where siblings live). Confirm `ProductUpdate` reuses this path
- [X] T006 [P] Add `storage_conditions = graphene.String(description="Storage conditions of the product.")` to the `Product` type in `saleor/saleor/graphql/product/types/products.py` (next to `seo_description`); resolve to `""` when unset
- [X] T007 Regenerate the API schema in `saleor/` with `python manage.py get_graphql_schema > saleor/graphql/schema.graphql`; the diff must contain only the two new `storageConditions` fields
- [X] T008 [P] Extend `saleor/saleor/graphql/product/tests/mutations/test_product_create.py`: create with storage conditions persists; create without it gives `""`; whitespace-only stored as `""`; 251 characters rejected with field `storageConditions` and code `INVALID`; exactly 250 accepted; text with `–`, `°C`, `<b>&` stored verbatim
- [X] T009 [P] Extend `saleor/saleor/graphql/product/tests/mutations/test_product_update.py`: set, change, clear (`""`), omitted field leaves value unchanged, 251 rejected, user without `MANAGE_PRODUCTS` denied (follow the existing permission-test pattern in that file)
- [X] T010 [P] Add a product query test in `saleor/saleor/graphql/product/tests/queries/` (extend the existing single-product query test module) asserting `storageConditions` is returned for a product with a value and `""` for one without, including as an anonymous channel-scoped customer
- [X] T011 Add a `CHANGELOG.md` entry in `saleor/` (unreleased section) describing the new `Product.storageConditions` field and `ProductInput.storageConditions`
- [X] T012 Run in `saleor/`: the new/changed test modules, `pytest saleor/graphql/product/tests -q`, `ruff check` and `ruff format --check` on changed files; fix failures

**Checkpoint**: backend API complete and tested.

---

## Phase 3: User Story 1 — Staff set storage conditions in the dashboard (Priority: P1) 🎯 MVP

**Goal**: Staff can set, change and clear the field on the product page; it persists.

**Independent Test**: Quickstart manual steps 1, 4, 6, 7 — set, reload, clear, over-length error, existing product unchanged.

- [X] T013 [US1] Make the new field available to dashboard codegen: in `saleor-dashboard/` run `pnpm fetch-local-schema` against the locally running modified backend (see `scripts/fetch-local-schema.cjs`) and decide per research R4 which schema file(s) to update; the diff must contain only `storageConditions` additions. If the local backend cannot be run, add the two fields to `schema-staging.graphql` by hand in the exact generated format and say so in the final summary _(Done: hand-added the fields to `schema-main.graphql` and `schema-staging.graphql` in generated format, since `fetch-local-schema` writes a different file; `pnpm generate` then ran clean.)_
- [X] T014 [P] [US1] Add `storageConditions` to the product details fragment in `saleor-dashboard/src/fragments/products.ts` (next to `seoDescription`)
- [X] T015 [US1] Run `pnpm generate` in `saleor-dashboard/` to regenerate `src/graphql/*.generated.ts`; verify only storage-conditions related changes appear
- [X] T016 [P] [US1] Add `storageConditions: string` to the form-data type in `saleor-dashboard/src/products/components/ProductUpdatePage/types.ts` and map it (default `""`) in `saleor-dashboard/src/products/utils/data.ts` next to `seoDescription`
- [X] T017 [US1] Add `"storageConditions"` to the dirty-field list in `saleor-dashboard/src/products/components/ProductUpdatePage/saveComposition.ts` and include it in the initial form data and submit data in `saleor-dashboard/src/products/components/ProductUpdatePage/ProductUpdatePage.tsx`
- [X] T018 [US1] Render a "Storage conditions" text input (max length 250, using the same input component and error display pattern as neighbouring cards, with a react-intl message and a placeholder such as "e.g. Keep refrigerated at 2–8 °C") in the product update page `saleor-dashboard/src/products/components/ProductUpdatePage/ProductUpdatePage.tsx`; show the server error for `storageConditions` on the field; disabled for read-only state like the other fields
- [X] T019 [US1] Send `storageConditions` in the update payload in `saleor-dashboard/src/products/views/ProductUpdate/handlers/utils.ts` (only when `data.storageConditions !== undefined`, so clearing sends `""`), and make sure the error mapping in `handlers/errors.ts` surfaces the field error if field lists are enumerated there
- [X] T020 [P] [US1] Add `storageConditions` to the product create form in `saleor-dashboard/src/products/components/ProductCreatePage/form.tsx` (type, initial `""`, submit data) and render the same input in the create page component, and pass it in the create mutation input in `saleor-dashboard/src/products/views/ProductCreate/` (locate the existing `seo` mapping there) _(Not applicable: `ProductCreatePage/form.tsx` is not used by any page; products are created via the list's minimal-create flow and edited on the update page. No change made.)_
- [X] T021 [P] [US1] Update the product fixtures in `saleor-dashboard/src/products/fixtures.ts` and the `fabbrica`/mock factories if type-check requires the new field
- [X] T022 [P] [US1] Tests (jest): extend `saleor-dashboard/src/products/views/ProductUpdate/handlers/utils.test.ts` (payload contains `storageConditions` when set, `""` when cleared, absent when undefined) and add/extend a test for the form-data mapper in `saleor-dashboard/src/products/utils/` (default `""`, value passthrough); extend an existing ProductUpdatePage/ProductCreatePage component test if one exists, otherwise a small render test asserting the field shows the value and reports changes
- [X] T023 [US1] Run `pnpm extract-messages` (check `package.json` for the exact script) so `saleor-dashboard/locale/defaultMessages.json` includes the new strings, and add a changeset file in `saleor-dashboard/.changeset/` (follow existing naming and format; `pnpm lint:changesets` must pass)
- [X] T024 [US1] Run in `saleor-dashboard/`: `pnpm check-types`, `pnpm lint:eslint` and `pnpm lint:prettier` on changed files (avoid unrelated reformatting), `pnpm test` (or `pnpm test:quiet`); fix failures

**Checkpoint**: US1 works end to end against the local backend.

---

## Phase 4: User Story 2 — Customers see storage conditions on the storefront (Priority: P1)

**Goal**: The product page shows a labelled, plain-text storage-conditions line in the description area; nothing when empty.

**Independent Test**: Quickstart manual steps 2, 3, 4, 5.

- [X] T025 [US2] Make the new field available to storefront codegen: apply the backend schema (`saleor/saleor/graphql/schema.graphql`) per `react-storefront/.graphqlrc.ts` (the `GITHUB_ACTION=generate-schema-from-file` path reads `schema.graphql`; use a temporary copy placed per that config, or point `NEXT_PUBLIC_SALEOR_API_URL` at the local API); do not commit the temporary schema copy _(Done via a temporary copy of the backend schema, removed afterwards. `src/gql/` is gitignored.)_
- [X] T026 [US2] Add `storageConditions` to `react-storefront/src/graphql/ProductDetails.graphql` (after `description`), run `pnpm generate`, and verify only storage-conditions related changes in `react-storefront/src/gql/`
- [X] T027 [P] [US2] Add `storageConditions: string | null` ("empty is null") to the product view type in `react-storefront/src/lib/storefront/contract/product.ts` and map it in `react-storefront/src/lib/storefront/mappers/product.ts` (`product.storageConditions?.trim() || null`) _(Changed approach: the contract and mapper are hash-locked core files, so the field goes through `ProductDetailsExtension.graphql`, `mapProductExtensions` and `getStorageConditions` in `src/config/storefront-view.ts` instead.)_
- [X] T028 [US2] Pass `storageConditions` from the view model through `react-storefront/src/app/(storefront)/[locale]/[channel]/(main)/products/[slug]/page.tsx` to `ProductAttributes` (same way `careInstructions` is passed)
- [X] T029 [US2] In `react-storefront/src/ui/components/pdp/product-attributes.tsx` render, inside the description accordion item, a paragraph with a label (translation key `pdp.attributes.storageConditions`) and the text as a plain React text child (never `dangerouslySetInnerHTML`); the description accordion item must render when there is storage conditions even if `descriptionHtml` is empty, and must render nothing for it when the value is null
- [X] T030 [P] [US2] Add `"storageConditions": "Storage conditions"` under `pdp.attributes` in `react-storefront/messages/en.json`, and add the same key to the other locale files in `react-storefront/messages/` in whatever form the repo already uses for untranslated keys (check how a recently added key was handled; if all locales must contain every key, add the English text)
- [X] T031 [P] [US2] Tests (vitest): extend `react-storefront/src/lib/storefront/mappers/product.test.ts` (value mapped, empty/whitespace → null, missing → null), update fixtures/contract tests in `react-storefront/src/lib/storefront/__contracts__/templates.contract.test.ts` if they enumerate view fields, and add `react-storefront/src/ui/components/pdp/product-attributes.test.tsx` covering: shown with label when present, absent when null, shown when description is empty, `<b>5 & 8</b>` rendered literally (no `<b>` element)
- [X] T032 [US2] Run in `react-storefront/`: `pnpm typecheck`, `pnpm lint`, `pnpm lint:design-tokens`, `pnpm test:run`, and `pnpm data:lock` (confirm `data-layer.lock.md` has no diff); fix failures

**Checkpoint**: US2 works; both stories work together.

---

## Phase 5: Polish & Cross-Cutting

- [X] T033 Walk through every manual scenario in `specs/001-product-storage-conditions/quickstart.md` against the locally running backend, dashboard and storefront, and record the results _(Superseded by T036; see its note for what was and was not verified.)_
- [X] T034 Run the full verification set from `quickstart.md` once more in all three repositories and confirm migration check and schema diff are clean; list any check that could not be run and why
- [X] T035 Review the combined diff for Constitution compliance (no unrelated changes, no new dependencies, no manifest/lockfile/`seed.dump`/`logs`/`envs` changes, no temporary schema copies left behind) and write the final summary: what changed per repo and how it was verified

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → (Phase 3 and Phase 4 can proceed in parallel; each needs the backend schema from T007) → Phase 5.
- Within Phase 2: T002 → T003; T004 → T005; T006 parallel with T004/T005; T007 after T004–T006; T008–T010 after T005/T006; T012 last.
- US1: T013 → T015 (T014 before T015) → T016–T021 → T022 → T023 → T024.
- US2: T025 → T026 → T027–T030 → T031 → T032.

## Parallel Opportunities

- Backend: T006 with T004/T005; tests T008, T009, T010 together.
- Dashboard: T014, T016, T020, T021, T022 touch different files.
- Storefront: T027, T030, T031 touch different files.
- Whole stories: US1 and US2 can be done by separate workers after T007.

## Implementation Strategy

- **MVP**: Phase 1 + Phase 2 + US1 (staff can record the data and the API is tested). Value to customers arrives with US2, which is also P1, so the feature is complete only after Phase 4.
- Deliver backend first, then dashboard and storefront; verify each repo's checks at its own checkpoint before moving on.


## Phase 6: Convergence

- [X] T036 Run the manual end-to-end scenarios in quickstart.md against the real stack: apply migration `0211` to the local dev database, restart the dev API container (`saleor-benchmark-api`) so it serves the new code, then start the dashboard and storefront and verify scenarios 1–7 (set, persist, storefront label, update, clear, literal `<b>5 & 8</b>`, 251-character error, pre-existing product unchanged); record the results per US1/AC1-3, US2/AC1-3 and SC-001..SC-003 (partial) _(Done: migration 0211 applied to the dev DB; the API (uvicorn `--reload`) serves the new code. Verified live through the API and the running storefront: set and read back, label and text shown on `/en/default-channel/products/apple-juice`, `<b>5 & 8</b>` shown escaped as literal text, whitespace-only clears and the line disappears, 251 characters rejected with `storageConditions`/`INVALID`; the test product was restored to empty. The dashboard UI was NOT exercised in a browser; it is covered by jest tests only.)_
- [X] T037 Confirm in the dashboard that a staff user without product-edit permission cannot change storage conditions (field disabled or save rejected with the permission error), and record the result per US1/AC4 (partial) _(Done by inspection: product routes are wrapped in `MANAGE_PRODUCTS` permission checks in `saleor-dashboard/src/products/index.tsx`, and the API rejects the write without it (tested in `test_update_product_storage_conditions_no_permission`). The field has no separate per-field permission handling.)_
- [X] T038 Review the bulk-create validation of `storageConditions` in `saleor/saleor/graphql/product/bulk_mutations/product_bulk_create.py` (and its two tests in `test_product_bulk_create.py`): it is not named in plan.md or tasks.md; either keep it with a one-line justification in plan.md (needed because `ProductBulkCreateInput` inherits the field and over-length input would otherwise fail at the database) or remove it (unrequested) _(Done: kept, justification added to plan.md.)_
- [X] T039 Record in plan.md research R5 that the storefront field is delivered through `ProductDetailsExtension.graphql` and `mapProductExtensions` instead of editing `ProductDetails.graphql` and the locked contract/mapper, so the plan matches the implementation per plan: R5 (contradicts) _(Done: research.md R5 updated.)_


## Phase 7: Convergence

- [X] T040 Exercise the dashboard UI end to end against the running stack (dashboard on :9000, migrated API on :8000), for example with a throwaway Playwright script from `saleor-dashboard/` that is not added to the repo: open a product, enter "Keep refrigerated at 2–8 °C" in the Storage conditions field, save, reload and confirm it persists, then clear it, save and confirm it is empty, and enter 251 characters and confirm the field error is shown and nothing is saved; restore the test product afterwards and record results per US1/AC1-3 and SC-001 (partial) _(Done with a throwaway Playwright script (system Chrome, kept outside the repo): logged in, opened "Apple Juice", entered "Keep refrigerated at 2–8 °C", saved, reloaded and it persisted; cleared, saved, reloaded and it was empty; the input stops at 250 characters (maxlength), so the 251-character server error is covered by the API and jest tests rather than the UI. Product restored to empty.)_


## Phase 8: Convergence

- [X] T041 CRITICAL: Fix the TypeScript error TS2769 in `react-storefront/src/ui/components/pdp/product-attributes.test.ts` (line 15: `createElement(NextIntlClientProvider, { locale, messages }, ...)` fails because the provider props type requires `children`; pass the child inside the props object or cast the props as the repo does elsewhere), then run `npx tsc --noEmit`, `npx vitest run` and eslint (with `NEXT_PUBLIC_SALEOR_API_URL` pointing at the backend `schema.graphql`) in `react-storefront/` and confirm all are clean, per Constitution V (contradicts) _(Done: props are cast with `ComponentProps<typeof NextIntlClientProvider>` and the child passed as the third argument, because eslint forbids a `children` prop. `tsc --noEmit` reports 0 errors, vitest passes (804), eslint and prettier are clean.)_

## Phase 9: Translations (requirement added after the first implementation)

- [X] T042 Add nullable `storage_conditions = models.CharField(max_length=250, blank=True, null=True)` to `ProductTranslation` in `saleor/saleor/product/models.py` and generate migration `0212_producttranslation_storage_conditions` (FR-010, FR-012)
- [X] T043 Add `ProductTranslationInput` (`TranslationInput` plus `storageConditions`) in `saleor/saleor/graphql/translations/mutations/product_translate.py`, use it in `productTranslate` and in `ProductBulkTranslateInput.translationFields`, and add `storage_conditions` to the bulk mutation's `translation_fields` (FR-010)
- [X] T044 Trim the translated value and reject more than 250 characters with an `INVALID` error on `storageConditions`, in both `productTranslate` and `productBulkTranslate` (`clean_storage_conditions` in `product_translate.py`, called from `ProductBulkTranslate.clean_translations`) (FR-012)
- [X] T045 Expose `storageConditions` on `ProductTranslation` and `ProductTranslatableContent` in `saleor/saleor/graphql/translations/types.py`; regenerate `saleor/saleor/graphql/schema.graphql` (FR-010)
- [X] T046 [P] Backend tests in `saleor/saleor/graphql/translations/tests/mutations/test_product_translate.py` and `test_product_bulk_translate.py`: set, update with trim, 250 accepted, 251 rejected, no permission denied, bulk success and bulk too-long; update the `ProductTranslationInput` variable type in `test_translations.py`
- [X] T047 Dashboard: add `ProductTranslationInput` and the new fields to `schema-main.graphql` and `schema-staging.graphql`; add `storageConditions` to the `ProductTranslation` fragment (`src/fragments/translations.ts`) and to the `UpdateProductTranslations` mutation (`src/translations/mutations.ts`, input type `ProductTranslationInput`); run `pnpm generate` (FR-010)
- [X] T048 Dashboard: add `TranslationInputFieldName.storageConditions` (`src/translations/types.ts`), `createStorageConditionsField` (`src/translations/translationSectionBuilders.ts`) and append it to the general section in `src/translations/components/TranslationsProductsPage/TranslationsProductsPage.tsx`; extract messages and update the changeset (FR-010)
- [X] T049 [P] Dashboard tests: `translationSectionBuilders.test.ts`, `utils.test.ts` and `bulkSubmit.test.ts` for the new field; fix the fixtures that need `storageConditions` (FR-010)
- [X] T050 Storefront: select `translation(languageCode: $languageCode) { storageConditions }` in `react-storefront/src/graphql/extensions/ProductDetailsExtension.graphql`, regenerate, and make `mapProductExtensions` in `src/config/storefront-view.ts` prefer a non-empty trimmed translation, then the base value, then `null` (FR-011)
- [X] T051 [P] Storefront tests in `src/config/storefront-view.test.ts`: translation preferred; null, empty and whitespace translations fall back; translation used when the base is empty; null when neither is set (FR-011)
- [X] T052 Verify against the running stack and clean up: translated and fallback text via the API for PL, DE and EN; storefront pages for three untouched products (real translation shown, empty translation falls back, no translation falls back); remove all test data _(Done. The local storefront serves only `en`, and `/pl` redirects to `/en`, so the check used English translations; Polish was checked through the API only. The dashboard translation page was not exercised in a browser.)_
- [X] T053 Update spec, plan, data model, contract and research for translations (new User Story 3, FR-010..FR-012, R7)


## Phase 10: Convergence

- [X] T054 Remove the leftover test value from the dev database: Apple Juice (`apple-juice`) still has storage conditions "Keep refrigerated at 2–8 °C", set during the dashboard translation-page check after the T052 cleanup; clear it (no translation rows carry a value), per T052 (contradicts) _(Done: Apple Juice's storage conditions and every test translation value were cleared at the end of this pass; the database has no product or translation with a storage-conditions value.)_
- [X] T055 Complete the dashboard translation-page check from T052 against the running stack: on `/translations/PL/products/<id>` click Edit on "Storage conditions", enter a Polish text, save, reload and confirm it persists, then clear it, save and confirm the original text is used again; the page and the empty input were seen, but the save and reload step never completed (the throwaway script timed out), per US3/AC1-2 and FR-010 (partial) _(Done with a throwaway Playwright script outside the repo: on `/translations/PL/products/<id>` entered a Polish text, saved, reloaded and it showed; cleared it, saved, reloaded and it was back to "needs translation". Typing 251 characters and saving is rejected and the row stays in edit mode with "Try again"; the translation input has no `maxLength` attribute, the server enforces the limit.)_
- [X] T056 Show the translated text on a storefront locale other than the default one: enable `pl` locally for the check (for example `NEXT_PUBLIC_STOREFRONT_LOCALES=en,pl` on a throwaway storefront run, not committed) and confirm a product with a Polish translation shows it on `/pl/...` and one without shows the original; so far only English translations were rendered, and Polish was verified through the API only, per US3/AC1,3 and FR-011 (partial) _(Done with a throwaway copy of the storefront in the scratchpad (webpack dev mode, port 3001, `NEXT_PUBLIC_STOREFRONT_LOCALES=en,pl`), deleted afterwards; nothing in the repo changed. `/pl/...` for a product with a Polish translation showed the Polish label and text, `/en/...` showed the original, and `/pl/...` for a product without a translation showed the original text.)_

## Phase 11: Webhook payloads and CSV export (requirement added after the translation work)

- [X] T057 Add `"storage_conditions"` to `PRODUCT_FIELDS` in `saleor/saleor/webhook/payloads.py` so product created, updated and deleted payloads carry it (FR-013)
- [X] T058 Add `STORAGE_CONDITIONS = "storage conditions"` to `ProductFieldEnum` in `saleor/saleor/graphql/csv/enums.py` and map `"storage conditions": "storage_conditions"` in `ProductExportFields.HEADERS_TO_FIELDS_MAPPING` in `saleor/saleor/csv/utils/__init__.py`; regenerate `saleor/saleor/graphql/schema.graphql` (FR-014)
- [X] T059 [P] Backend tests: payload tests in `saleor/saleor/webhook/tests/test_webhook_payloads.py` (set, empty, deleted payload); CSV tests in `saleor/saleor/csv/tests/export/test_export.py`, `products_data/test_get_products_data.py`, `products_data/test_prepare_headers.py` and the enum test in `saleor/saleor/graphql/csv/tests/mutations/test_export_products.py` (FR-013, FR-014)
- [X] T060 Dashboard: add `STORAGE_CONDITIONS` to `ProductFieldEnum` in `schema-main.graphql` and `schema-staging.graphql`, list it in the export dialog (`src/products/components/ProductExportDialog/ProductExportDialogInfo.tsx`) with a label in `messages.ts`; regenerate types and extract messages; test in `messages.test.tsx` (FR-014)
- [X] T061 Update spec (US4, FR-013, FR-014, out-of-scope list), plan, data model and contract
- [X] T062 Run the full verification for all three repos and a live export check: backend full product, csv, webhook and translation tests with `ruff`, migration and schema checks; dashboard type-check, lint and full jest; storefront type-check and vitest _(Done: backend 4085 tests pass with `ruff`, migration and schema checks clean; dashboard type-check clean, eslint 0 errors, full jest 6153 pass with 0 failures; storefront `tsc` 0 errors, vitest 811 pass, eslint 0 errors. Live check against the dev database: CSV export with the new column gave header `storage conditions` and the row value, and the product webhook payload carried the value; test values were cleared afterwards.)_


## Phase 12: Convergence

- [X] T063 Include the translated storage conditions in the translation webhook payloads: add `"storage_conditions": self.storage_conditions` to `ProductTranslation.get_translated_keys()` in `saleor/saleor/product/models.py` (it currently lists only `name` and `description`, so `TRANSLATION_CREATED` and `TRANSLATION_UPDATED` payloads for a product translation omit it), and add a test next to `test_generate_product_translation_payload` in `saleor/saleor/webhook/tests/test_webhook_payloads.py` plus a check that the existing translation payload tests still pass, per FR-010 and the requirement that the field is translatable like name and description (partial) _(Done: `storage_conditions` added to `ProductTranslation.get_translated_keys()`; new payload test plus the existing one now asserts the key. Backend 4086 tests pass (product, translation, webhook, CSV), `ruff` clean, no migration drift, schema matches.)_
