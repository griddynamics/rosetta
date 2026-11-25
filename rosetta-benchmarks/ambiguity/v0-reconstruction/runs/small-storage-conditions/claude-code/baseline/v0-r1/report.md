---
run_id: S-CC-01-v0-r1
poc_schema: ambiguity-poc/v2
prompt_version: v0
repeat: 1
t1_items: 1,1,1,1,1,1,0,0,1,1,1,0,1,1,1
---

# S-CC-01-v0-r1: v0 reconstruction

Reused Saleor run, rebuilt for the current formulas (see ../../../../README.md). Source: `legacy/v0-poc-formulas/runs/small-storage-conditions/claude-code/baseline/v0-r1/judge-input.md`.

## Checklist items at the first "done" (reconstructed)

Checks were run at the end of the run, after 3 follow-ups. The state at the first "done" comes from the done message (§4), the agent's later answer on what it had handled (§5) and the follow-ups (§7).

| Item | At "done" | Evidence |
| ---: | --- | --- |
| 1 | pass | §4: Product.storage_conditions is a text field ... migration 0211 |
| 2 | pass | §6 checks 1, 3, 4 pass; follow-ups did not change setting or reading the value |
| 3 | pass | §4: product update page has a new 'Storage conditions' input; §6 check 1 |
| 4 | pass | §6 check 4: shown as a 'Storage conditions:' line in the description section |
| 5 | pass | §4: new tests cover create, update, bulk create and a product query |
| 6 | pass | §4: text field; §6 check 1 saves 'Keep refrigerated at 2–8 °C' |
| 7 | fail | §5: 'Plain text, with no maximum length ... I didn't set a limit'; §7 follow-up 1 asks for 250 |
| 8 | fail | §4: 'Not translated: the value is not translated per language'; §7 follow-up 2 |
| 9 | pass | §5: 'Per product. The field is only on the Product model.' |
| 10 | pass | §5: 'Only the storefront product page' |
| 11 | pass | §5: 'default="", so no data migration is needed' |
| 12 | fail | §5: '6. I didn't handle any of these' (import/export, webhook payloads); §7 follow-up 3 |
| 13 | pass | §5: edit with the product management permission; read like name or description |
| 14 | pass | §6 check 6 (end of run): existing products work as before |
| 15 | pass | §4: typecheck passes, one unrelated jest failure that passes when re-run alone; §6 check 7; type check on final code passes |

## Appendix B

<details><summary>Answer at stop 1 (proxy: the requirements document approved before coding; no stop-1 question in this run)</summary>

Source: `saleor/runs/small-storage-conditions/claude-code/baseline/plan.md (the plan approved before coding)`. Written as a quote block (each line starts with `> `) and inner code fences as ~~~, so the scoring script reads the whole document; the script removes the `> ` before it counts.

> # Plan: Product "storage conditions" field (backend → dashboard → storefront)
>
> ## Context
> Products need a free-text `storageConditions` field (e.g. "Keep refrigerated at 2–8 °C"). Staff set it on the product update page in the dashboard; customers see it in the product description section on the storefront PDP. Done = implemented end to end, tests added, everything passing locally.
>
> ## 1. Backend (`saleor/`, run via docker container `saleor-benchmark-saleor-1`)
> - `saleor/product/models.py:~186`: add `storage_conditions = models.TextField(blank=True, default="")` to `Product`.
> - New migration `saleor/product/migrations/0211_product_storage_conditions.py` (depends on `0210_collection_external_reference_unique_constraint`), generated with `makemigrations product -n product_storage_conditions`.
> - `saleor/graphql/product/mutations/product/product_create.py:31` `ProductInput`: add `storage_conditions = graphene.String(description="Storage conditions of the product.")`. Create, update and bulk create inherit it via `construct_instance`.
> - `saleor/graphql/product/types/products.py:~946` `Product` type: add the same field (no resolver needed).
> - Regenerate `saleor/graphql/schema.graphql` (`python manage.py get_graphql_schema`).
> - `CHANGELOG.md` (3.23.0 → GraphQL API): add bullet.
> - Tests: extend `test_product_create.py`, `test_product_update.py` (query/input/assert pattern as `externalReference`), a bulk-create case, and a product query test under `graphql/product/tests/queries/`.
> - Verify: `pytest --reuse-db <files> -n0`, `makemigrations --check --dry-run`, `ruff check` and `ruff format`.
>
> ## 2. Dashboard (`saleor-dashboard/`, pnpm)
> - Copy the new schema to `schema-main.graphql` (and staging if applicable), then `pnpm run generate`.
> - `src/fragments/products.ts:~222`: add `storageConditions` to the `Product` fragment.
> - Form data: `ProductUpdatePage/types.ts` (`ProductUpdateFormData`), `products/utils/data.ts` (`getProductUpdatePageFormData`), `saveComposition.ts` (`PRODUCT_DETAILS_SAVE_FIELDS`), `views/ProductUpdate/handlers/utils.ts` (`getProductUpdateVariables`, send when changed, empty clears).
> - UI: `ProductDetailsForm.tsx`: add a text `Input` (name `storageConditions`, error handling, intl message, data-test-id). Run `pnpm run extract-messages` for `locale/defaultMessages.json`.
> - Tests: `src/products/fixtures.ts`, `handlers/utils.test.ts` (mirror the rating tests), `form.test.ts`, `useProductUpdateHandler.test.tsx` as needed.
> - Changeset via `pnpm run change:add` (must be `patch`).
> - Verify: `pnpm run check-types:src`, `pnpm jest src/products`, `pnpm run lint:eslint`, `pnpm run lint:prettier`.
>
> ## 3. Storefront (`react-storefront/`, pnpm)
> - Add `storageConditions` to `src/graphql/extensions/ProductDetailsExtension.graphql` (fork-owned extension point). Run `pnpm run generate` against the updated running API (check `NEXT_PUBLIC_SALEOR_API_URL`; otherwise use a local schema file). Regenerate `data-layer.lock.md` with `pnpm data:lock` if needed.
> - View model: add `storageConditions: string | null` to `ProductView` (`lib/storefront/contract/product.ts`), map in `mappers/product.ts` (`trim() || null`). Update the literal in `__contracts__/templates.contract.test.ts`.
> - Render: `ui/components/pdp/product-attributes.tsx`: new `storageConditions` prop, shown in the description accordion under the description (plain text, React-escaped). Pass it from `products/[slug]/page.tsx:~213`.
> - i18n: add `pdp.attributes.storageConditions` to all `messages/*.json` (de, en, fi, fr, ja, ko, nb, pl).
> - Tests: extend `mappers/product.test.ts`.
> - Verify: `pnpm run test:run`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run lint:graphql-variants`.
>
> ## Notes
> - No translation (per-language) support for the field; out of scope.
> - Dashboard create flow is minimal (name and type), so the field is on the update page only.
> - No git commits (repo isn't git; the saleor CLAUDE.md says not to commit).
> - Final check: manually query the live API (:8000) to confirm the field after migrating the DB.

</details>

<details><summary>Answer at stop 2 (proxy: the agent's "done" message; no stop-2 question in this run)</summary>

Word for word.

```text
Products now have a "storage conditions" field that staff can set in the dashboard and customers see on the storefront product page. All suites pass locally. I haven't tested the dashboard form or the storefront page in a browser.

Backend (saleor)
- Product.storage_conditions is a text field that defaults to empty, added in migration 0211_product_storage_conditions.
- It's exposed as storageConditions on the Product type and as an input on productCreate, productUpdate and productBulkCreate.
- I regenerated schema.graphql and added a CHANGELOG entry.
- I also ran the migration on the local DB and restarted the API container, and the running API now reports storageConditions.
- New tests cover create, update, bulk create and a product query. ruff is clean and no migration changes are pending.
- Broader run: 4074 passed (saleor/product, saleor/graphql/product, saleor/webhook, saleor/graphql/core).

Dashboard (saleor-dashboard)
- The product update page has a new "Storage conditions" input in the general details card. Clearing it sends an empty string, which clears the value on the product.
- The product creation flow only takes name and type, so the field is on the update page only.
- I added the three schema entries to schema-main.graphql and schema-staging.graphql by hand, because copying the backend dump would have been noisy. Then I regenerated types and locale/defaultMessages.json.
- There are new tests for the form-data mapping and for the update payload (set, cleared, unchanged), plus a patch changeset.
- Typecheck and the changeset check pass. The full jest run had one failure in OrderFulfillStockExceededDialog, an unrelated orders test. It passes when re-run alone.

Storefront (react-storefront)
- The product query selects the field, and it is mapped into the product view as storageConditions, trimmed, with blank values becoming null.
- It shows in the description section as a "Storage conditions:" line under the description text. It also shows when the product has no description. I added the label to all 8 locale files; the non-English wording is my own translation, so have a native speaker check it.
- The new component test caught a crash when a product had storage conditions but no description. I fixed it.
- Tests, typecheck, lint (warnings only), lint:graphql-variants and the design-token check pass, and I refreshed data-layer.lock.md.
- Not translated: the value is not translated per language, because the backend has no translation entry for it.
- Codegen setup: storefront codegen needs NEXT_PUBLIC_SALEOR_API_URL set. I pointed it at http://localhost:8000/graphql/ when running it.

Nothing is committed, per the repo rules.
```

</details>
