# Research: Product Storage Conditions

All Technical Context items were resolvable from the codebase; no NEEDS CLARIFICATION remain.

## R1 — Backend field type and model location
- **Decision**: Add `storage_conditions = models.CharField(max_length=250, blank=True, default="")` to `Product` (`saleor/saleor/product/models.py`), plus a new migration after `0210_collection_external_reference_unique_constraint`.
- **Rationale**: Matches the spec (optional, plain text, 250-char cap). Non-null with empty default avoids nullable-vs-empty ambiguity and keeps the migration cheap (constant default, no backfill). `Product` already carries comparable short text (`seo_description`, `name`) as `CharField`.
- **Alternatives**: `TextField` (no DB-level cap, rejected); nullable like `SeoModel` (two "empty" states, rejected); product attribute or metadata (not a first-class, typed field; rejected).

## R2 — GraphQL API shape
- **Decision**: Add `storageConditions: String` to `ProductInput` (inherited by `ProductCreateInput` and `ProductUpdateInput`) and `storageConditions: String` on the `Product` output type. Regenerate `saleor/saleor/graphql/schema.graphql`.
- **Rationale**: Same pattern as `externalReference` / `rating` on `ProductInput`. Public product type fields are already readable wherever `description` is (FR-009); writes are gated by the existing `MANAGE_PRODUCTS` permission on the mutations.
- **Alternatives**: Separate mutation (unneeded); channel-scoped field (spec says product-level).

## R3 — Validation / normalisation
- **Decision**: In `ProductCreate.clean_input` (reused by update), strip the value; empty after strip → `""`; length > 250 → `ValidationError` with a field-keyed error code `INVALID` on `storageConditions`. Model max_length is a backstop only.
- **Rationale**: FR-007. Existing mutations raise field-keyed `ValidationError` in `clean_input` (see `clean_slug`, `clean_weight`). Plain-text rendering (FR-006) is handled by React escaping on the frontends; no sanitiser needed server-side.
- **Alternatives**: Rely on DB error (surfaces as a 500, rejected); silent truncation (violates spec).

## R4 — Dashboard
- **Decision**: Add a `storageConditions` text field to the product create and update forms (`ProductCreatePage/form.tsx`, `ProductUpdatePage/{ProductUpdatePage.tsx,types.ts,saveComposition.ts}`), form-data mapper (`products/utils/data.ts`), update handler payload (`views/ProductUpdate/handlers/utils.ts`), the `ProductDetails` fragment (`fragments/products.ts`) and create-mutation input wiring. Render with the existing text-input component used on the same page, placed beside the description card. Add a locale string via the repo's react-intl extraction.
- **Rationale**: `seoTitle` / `seoDescription` follow exactly this wiring path, so the field slots into the established save/dirty-tracking flow.
- **Schema/codegen**: dashboard types come from `schema-main.graphql` (release schema) and `schema-staging.graphql`. The new field is not in either until released, so run `pnpm fetch-local-schema` against the locally modified backend (script exists) and `pnpm generate`. Decision on committing the regenerated schema files is deferred to tasks (see Risks).
- **Changeset**: the dashboard uses `.changeset/`; add one (`lint:changesets` enforces it).

## R5 — Storefront
- **Decision (as implemented)**: `src/lib/storefront/contract/product.ts` and `mappers/product.ts` are hash-locked core files, and `ProductDetails.graphql` is core too, so the field goes through the fork-extension path: select `storageConditions` in `src/graphql/extensions/ProductDetailsExtension.graphql`, run `pnpm generate`, map it in `mapProductExtensions` and read it with `getStorageConditions` (both in `src/config/storefront-view.ts`), pass it through the PDP page (`products/[slug]/page.tsx`) to `ProductAttributes`. _The original plan text follows for reference:_ add `storageConditions` to `src/graphql/ProductDetails.graphql`, run `pnpm generate` (regenerates `src/gql/`), extend the product view contract and mapper with `storageConditions: string | null`, pass it through the PDP page to `ProductAttributes` (`src/ui/components/pdp/product-attributes.tsx`) and render it inside the existing description accordion item as a labelled paragraph (plain text, no `dangerouslySetInnerHTML`). Add the label to `messages/*.json` under `pdp.attributes` (English required; other locales follow whatever fallback the repo uses).
- **Rationale**: FR-004/005 say "in the product description area". The description accordion is that area; `careInstructions` shows how adjacent derived content is passed. The storefront keeps a lock file of data access (`data-layer.lock.md`); adding a field to an existing query does not change call rows, but `pnpm data:lock` will be run to confirm no diff.
- **Alternatives**: Separate accordion item (spec says in description); appending into the description HTML (couples to rich-text sanitiser, rejected).
- **Edge**: If the product has storage conditions but an empty description, the accordion item must still render.

## R7 — Translations (added after the first draft)
- **Decision**: Add nullable `storage_conditions` (max 250) to `ProductTranslation` (migration `0212`), a `ProductTranslationInput` (= `TranslationInput` + `storageConditions`) for `productTranslate` and `ProductBulkTranslateInput`, and `storageConditions` on `ProductTranslation` and `ProductTranslatableContent`. Dashboard: add `storageConditions` to the `ProductTranslation` fragment and `UpdateProductTranslations` mutation, and append a field to the product translation page's general section (`createStorageConditionsField`). Storefront: select `translation(languageCode: $languageCode) { storageConditions }` in `ProductDetailsExtension.graphql` and pick translation → base in `mapProductExtensions`.
- **Rationale**: Mirrors how name and description are translated. A separate input type avoids adding a product-only field to `TranslationInput`, which category and collection translations share. The 250 check is explicit in the product translate code because Django's `max_length` error code is not a valid GraphQL error-code enum value in the bulk path.
- **Alternatives**: Adding the field to `TranslationInput` (would expose it on categories and collections); counting the field in the language-list completion (an optional field would make products without storage conditions look incomplete); the page-level progress bar counts it like the SEO fields, which is existing behaviour.
- **Risk**: the storefront data cache is purged by webhooks that recognise product, category, collection, page and menu payloads; translation changes reach the page on the next product purge or the cache backstop, exactly as translated names and descriptions do today.

## R6 — Testing approach (per constitution IV/V)
- **Backend**: pytest — extend `saleor/saleor/graphql/product/tests/mutations/test_product_create.py` and `test_product_update.py` (set, update, clear, whitespace→empty, >250 rejected, permission denied) and a product query test for the output field.
- **Dashboard**: jest — extend `handlers/utils.test.ts` (payload) and form/data-mapper tests; run `check-types`, `lint:eslint`, `lint:prettier`.
- **Storefront**: vitest — extend `mappers/product.test.ts` and add a component test for `ProductAttributes` (present / absent / special chars); run `typecheck`, `lint`, `test:run`.

## Risks
- Dashboard/storefront codegen needs the new field in a schema: use the local backend schema; do not hand-edit generated files.
- Release-schema file in the dashboard (`schema-main.graphql`) may be policy-protected; confirm in tasks whether to update only `schema-staging.graphql`.
- Local run of pytest requires the Postgres test DB; confirm availability in quickstart.
