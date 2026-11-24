# Product Storage Conditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, translatable "storage conditions" text to products: editable in the dashboard, shown on the storefront product page.

**Architecture:** A nullable `storage_conditions` column on `Product` and `ProductTranslation`, exposed as GraphQL `storageConditions` everywhere `name` is (type, create/update input, translation types and inputs). Dashboard and storefront consume the regenerated schema. Each follows the existing `name`/`description` pattern in its repo.

**Tech Stack:** Django + graphene + pytest (`saleor`); React/TS, Apollo, Jest, graphql-codegen (`saleor-dashboard`); Next.js, urql, graphql-codegen, next-intl (`react-storefront`).

**Spec:** `docs/superpowers/specs/2026-10-19-product-storage-conditions-design.md`

## Global Constraints

- Field: optional, plain text, product level, `CharField(max_length=250)`, null/blank allowed. GraphQL name `storageConditions`.
- Translatable via `ProductTranslation.storage_conditions`; storefront shows the translation when present, else the base value, else nothing.
- Follow existing patterns; no new dependencies; no unrelated refactors.
- Do NOT commit or push; leave changes in the working tree (overrides any "commit" habit).
- Add tests for every change; run relevant tests + linters before finishing.
- Tasks are ordered: Task 1 (backend) must finish, including schema.graphql, before Tasks 2 and 3 run codegen.

## Review Focus

- Empty string / whitespace / `null` storage conditions: storefront renders no block; update mutation can clear the value.
- Value longer than 250 chars: mutation returns a validation error, not a 500.
- Translation exists but `storageConditions` is null/empty while base has a value: storefront falls back to the base value.
- Translating via `productTranslate` with only `storageConditions` set does not wipe `name`/`description` translations.
- Unicode/special characters (`2–8 °C`) round-trip through create, read, translation and render unchanged.

---

### Task 1: Backend field, GraphQL, translations

**Files:**
- Modify: `saleor/saleor/product/models.py` (`Product`, `ProductTranslation`, `get_translated_keys`)
- Create: `saleor/saleor/product/migrations/0211_product_storage_conditions.py` (generate with `makemigrations`)
- Modify: `saleor/saleor/graphql/product/types/products.py` (`Product` type), `saleor/saleor/graphql/product/mutations/product/product_create.py` (`ProductInput`) and the update path if it has its own input/cleaning
- Modify: `saleor/saleor/graphql/translations/types.py` (`ProductTranslation`, `ProductTranslatableContent`), `saleor/saleor/graphql/translations/mutations/product_translate.py` and `product_bulk_translate.py` (`translation_fields`), and the translation input type
- Modify: `saleor/saleor/graphql/schema.graphql` (regenerate), CHANGELOG if convention requires
- Test: `saleor/saleor/graphql/product/tests/mutations/test_product_create.py`, `test_product_update.py`, `saleor/saleor/graphql/translations/tests/mutations/test_product_translate.py`, `test_product_bulk_translate.py`, `saleor/saleor/graphql/translations/tests/test_translations.py`, product type query tests

**Interfaces:**
- Produces: GraphQL `Product.storageConditions: String`, `ProductTranslation.storageConditions: String`, `ProductTranslatableContent` exposes it via its product/translation; `ProductInput.storageConditions: String`; translation input field `storageConditions: String`.

- [ ] **Step 1: Write failing tests** (mirror the neighbouring `name`/`description` tests in each file):
  - create: `productCreate` with `storageConditions: "Keep refrigerated at 2–8 °C"` returns it and persists it.
  - update: `productUpdate` sets it, and sets `""`/`null` to clear it.
  - validation: 251-character value returns an error on field `storageConditions`.
  - translate: `productTranslate` with `{storageConditions: "Réfrigérer à 2–8 °C"}` stores it and `translation(languageCode: FR) { storageConditions }` returns it; translating only this field leaves existing translated `name` intact.
  - bulk translate: `translationFields` accepts `storageConditions`.
  - query: `product { storageConditions }` returns the base value.
- [ ] **Step 2: Run to verify failure:** `cd saleor && pytest saleor/graphql/product/tests/mutations/test_product_create.py saleor/graphql/translations/tests -k storage -v` → FAIL (unknown field).
- [ ] **Step 3: Add `storage_conditions = models.CharField(max_length=250, blank=True, null=True)` to `Product` and `ProductTranslation`; include `"storage_conditions": self.storage_conditions` in `ProductTranslation.get_translated_keys`; run `python manage.py makemigrations product -n product_storage_conditions` so it is numbered `0211`.**
- [ ] **Step 4: Expose in GraphQL:** `storage_conditions = graphene.String(description="Storage conditions of the product.")` on the `Product` type resolving the translated value only via `translation`, not overriding the base field; add to `ProductInput` and both translation types/inputs; add `"storage_conditions"` to `translation_fields` in `product_bulk_translate.py` and to the translate mutation's field handling. Regenerate the schema (`npm run build-schema` in `saleor`, or the repo's equivalent in `package.json`).
- [ ] **Step 5: Run tests and lint:** `pytest saleor/graphql/product saleor/graphql/translations saleor/product -q` and `ruff check saleor && ruff format --check saleor`; also run the schema-up-to-date test/check the repo has. Expected: all PASS.

### Task 2: Dashboard

**Files:**
- Modify: `saleor-dashboard/src/products/components/ProductDetailsForm/ProductDetailsForm.tsx` (input under description), the product create/update pages, form data types, submit handlers/payload builders under `src/products/` (find via `grep -rn "seoDescription\|description:" src/products`)
- Modify: `saleor-dashboard/src/fragments/products.ts` (product fragment), `saleor-dashboard/src/fragments/translations.ts` (`ProductTranslation`: add `storageConditions` to `product` and `translation`), `src/translations/queries.ts`/`mutations.ts` if they select fields explicitly
- Modify: `saleor-dashboard/src/translations/components/TranslationsProductsPage/TranslationsProductsPage.tsx`, `create-product-translate-form-payload-event.ts`, `use-translation-product-form-app-response.ts`, and `TranslationInputFieldName` enum usage
- Modify: `saleor-dashboard/locale/defaultMessages.json` (via the repo's `extract-messages` script) for the new intl messages
- Regenerate: `npm run generate:main` (and `generate:staging` if the repo checks both in)
- Test: existing `*.test.ts` next to the touched payload builders (e.g. `create-product-translate-form-payload-event.test.ts` and the product-form payload tests), plus a `ProductDetailsForm` test

**Interfaces:**
- Consumes: Task 1 `storageConditions` on `Product`, `ProductInput`, `ProductTranslation`, and the translation input.
- Produces: product form data key `storageConditions: string`; translation field name `TranslationInputFieldName.storageConditions`.

- [ ] **Step 1: Write failing tests:** product update/create payload includes `storageConditions` from form data; translation payload for field `storageConditions` is sent as `{ storageConditions: "<text>" }`; `ProductDetailsForm` renders a "Storage conditions" input with the initial value and calls `onChange` with name `storageConditions` when edited.
- [ ] **Step 2: Run to verify failure:** `cd saleor-dashboard && npx jest <touched test files>` → FAIL.
- [ ] **Step 3: Regenerate types** (`npm run generate:main`, pointing codegen at the updated local schema as the repo documents), then add the input, payload wiring, fragment fields and translation row. Empty input sends `""` (clears the value).
- [ ] **Step 4: Run:** `npx jest src/products src/translations`, `npx tsc --noEmit`, `npx eslint <changed files>` → all PASS.

### Task 3: Storefront

**Files:**
- Modify: `react-storefront/src/graphql/ProductDetails.graphql` (`storageConditions` top level and inside `translation`), regenerate with `npm run generate`
- Modify: `react-storefront/src/lib/storefront/contract/product.ts` and `mappers/product.ts` (resolve translation-first, fall back to base, `null` when blank), `mappers/product.test.ts`
- Modify: the PDP description component under `react-storefront/src/ui/components/pdp/` that receives `descriptionHtml`/the product view (see `products/[slug]/page.tsx:214`) to render the block
- Modify: every file in `react-storefront/messages/*.json` (de, en, fi, fr, ja, ko, nb, pl) with a "Storage conditions" label key
- Test: `mappers/product.test.ts`, a component test next to the PDP component, and `lib/storefront/__contracts__/templates.contract.test.ts` if it enumerates product fields

**Interfaces:**
- Consumes: Task 1 `Product.storageConditions` and `translation(languageCode:).storageConditions`.
- Produces: product view field `storageConditions: string | null` (non-blank text or null).

- [ ] **Step 1: Write failing tests:** mapper returns the translated value when present; falls back to the base value when translation is null or blank; returns `null` when both are null/blank/whitespace. Component renders the label and text when set (including `2–8 °C`) and renders nothing when `null`.
- [ ] **Step 2: Run to verify failure:** `cd react-storefront && npx vitest run <files>` (or the runner in `package.json` `test` script) → FAIL.
- [ ] **Step 3: Implement** the query change + `npm run generate`, mapper resolution, the labelled block directly under the description (only when non-null), and the i18n label in all locale files (use the English text if no better translation is available for a locale; translate for de/fr/pl/etc. where straightforward). Read `node_modules/next/dist/docs/` first if touching routing/server components, per the repo's CLAUDE.md.
- [ ] **Step 4: Run:** the repo's unit tests, `npx tsc --noEmit`, lint (`npm run lint`) and the i18n/knip checks if the scripts exist → all PASS. Check `e2e/` for product-page specs affected by the new query field; update fixtures/mocks if they enumerate fields.

### Task 4: Cross-repo verification

- [ ] **Step 1:** Run the full relevant suites from Tasks 1-3 once more from a clean state (migration applied to a fresh test DB, codegen re-run produces no diff).
- [ ] **Step 2:** If a local stack is available (see `logs/` and `seed.dump`), set a value via `productUpdate`, add a translation, and confirm the storefront PDP shows base and translated text. Report anything that could not be run.
- [ ] **Step 3:** Summarize changes and how they were checked, per the repo rules.
