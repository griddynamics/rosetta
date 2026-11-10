Judge the diffs of the small task on Copilot. FOLLOW /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/SCORE-DIFFS.md EXACTLY (read it first, completely).

Inputs (all paths absolute):
- Judge prompt: /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/SCORE-DIFFS.md
- Runs: /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/saleor/runs/small-storage-conditions/copilot/ (7 method folders: baseline, grill-with-docs, superpowers, spec-kit, rosetta-flow, rosetta-light, rosetta-skills; in each, the diffs saleor.diff, saleor-dashboard.diff and react-storefront.diff). The `baseline` run is the DELTA reference.
- Base repos (before the change, at baseline-v1): /Users/olepoletaiev/saleor-judge/saleor, /Users/olepoletaiev/saleor-judge/saleor-dashboard, /Users/olepoletaiev/saleor-judge/react-storefront
- Task prompt, "Done when", hidden questions with answers, extra answers: /Users/olepoletaiev/saleor-judge/task-small.md
- Write the JSON to: /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/saleor/judge/judge-small-storage-conditions-copilot-v2.json
- Totals script: /Users/olepoletaiev/Downloads/Projects/rosetta/rosetta-benchmarks/saleor/scripts/score-diffs.py

Per run: what was already checked (do not re-check) and what the agent was directed with.

## baseline

Already checked (do not re-check):
- manage.py showmigrations was run at T1: `[ ] 0211_product_storage_conditions`, not applied to the dev database; every product query on the live API failed with "column product_product.storage_conditions does not exist". After follow-up 3 (the agent applied the migration), 0211 is `[X]`, `products { storageConditions }` returns data (null for Apple Juice and Monospace Tee), and the API, storefront and dashboard health checks are OK.
- Backend pytest on the 5 changed test files was run by the assistant after follow-up 3: 268 passed, 0 failed.
- Dashboard jest on the 4 changed test files was run: 4 suites, 53 passed; after follow-up 4 on 5 changed files: 5 suites, 73 passed.
- Storefront vitest on the 3 changed test files was run: 3 files, 10 passed. Storefront `pnpm test:run`: 127 files, 788 passed.
- Dashboard `jest --findRelatedTests` on the 24 changed source files was run by the assistant: first run 1 failed (`src/graphql/lockSchema.test.ts`, "leaves every generated document valid on the staging schema"; fails again alone); after follow-up 5: 698 suites passed, 1 skipped, 0 failed; 4835 tests passed, 8 skipped.
- Agent-reported (not re-run by the operator): full dashboard suite 929 suites / 6,138 tests passed after follow-up 5; dashboard `check-types:src` and focused lint; storefront type check and focused lint; `git diff --check` in the 3 repos. No screenshot or UI check by the agent.
- Dashboard UI check by the operator was run: after follow-up 4, set, edit, clear and reload work. A pasted 251-character text stopped at 250 characters with no message. Leading spaces are stored as entered. A value of only spaces was saved and the public API returned it as 4 spaces; the agent was not asked about whitespace.
- Storefront check by the operator was run: the value is shown when set and nothing when cleared. The storefront caches catalog data (`"use cache"`, up to 1 h), so a page showed `storageConditions: null` for a while after the API had the value; the agent did not change this.
- Translation check by the operator was run: a translation saved on the dashboard translations page under Polish (Poland) (`PL_PL`) was returned by the API. The storefront in Polish was not viewed (only English is enabled locally).
- Storefront pages of Apple Juice, Monospace Tee and Carrot Juice and the public product list were fetched: HTTP 200, no errors.
- Cleanup check (git status in the 3 repos, search of added lines for print(, console.log/debug, debugger, TODO, FIXME, XXX, breakpoint( ) was run: only untracked file is the migration 0211; no debug lines; no commits.

Agent was directed with:
1. Translatable per locale with base-value fallback: it is translatable the same way as the product name and description. The storefront shows the translation when there is one. An empty or missing translation falls back to the base value.
2. The storage conditions field must be limited to 250 characters. It is plain text, one optional field. Empty is allowed.
3. It must appear in product webhook payloads and be included in product CSV export. It is part of the product in the API. No filter or search by this field is needed.
4. The local app is broken: the API fails with "column product_product.storage_conditions does not exist". The migrations were not applied to the local database. Fix it so the feature works on the local stack.
5. The dashboard is broken: changing only the storage conditions field on the product page does not enable the Save button, so staff can't save the value. Fix it so storage conditions can be set, edited and cleared in the dashboard.
6. The dashboard test src/graphql/lockSchema.test.ts fails ("leaves every generated document valid on the staging schema") because ProductDetailsDocument, ProductTranslationDetailsDocument and ProductTranslationsDocument query storageConditions, which the staging schema doesn't have. Make all dashboard tests pass.

## grill-with-docs

Already checked (do not re-check):
- Agent-reported at T1 (not re-run by the operator): backend Ruff, a migration dry-run, 14 focused feature tests and 158 translation regressions; dashboard TypeScript, 53 Jest tests (42 after the Save fix) and Prettier; storefront 9 Vitest tests, Prettier, ESLint and TypeScript. The agent did no browser check ("No visual artifact was needed").
- manage.py showmigrations product was run by the assistant after T1: `[ ] 0211_product_storage_conditions`, not applied; the agent had run only a migration dry-run. A public API product query failed with "column product_product.storage_conditions does not exist" and the storefront home page showed "Something went wrong".
- After follow-up 1 (the agent applied the migration in the API container), the public API returns `storageConditions: null` for existing products and the storefront product page returns HTTP 200.
- Backend pytest on the 8 changed test files was run by the assistant: 394 passed, 16 warnings. Dashboard jest on the 7 changed test files: 7 suites, 91 tests passed. Storefront vitest on the 4 changed test files: 4 files, 12 tests passed. Full suites and linters were not run by the assistant.
- Dashboard UI check by the operator (Mighty Mug) was run: at T1 the Save button stayed disabled after typing; after follow-up 2, set, edit, clear and reload work.
- Public API check was run: `storageConditions` returned for a product with a value, `translation(languageCode:PL)` null; 29 products returned without errors, one with a value.
- Storefront check was run after the frontends were restarted with `bench.sh start` (the storefront caches product pages up to 1 h): `mighty-mug` shows a "Storage conditions" block after the description; `apple-juice` shows no block.
- Search of added lines for console.log, debugger, print(, TODO/FIXME, .only(, skip(/xfail, eslint-disable, @ts-ignore, breakpoint() was run: 0 hits in the 3 repos.

Agent was directed with:
1. Product level. All variants share one value.
2. Plain text, one optional field, max 250 characters. Empty is allowed.
3. A separate labelled block after the description, hidden when empty.
4. Translatable the same way as the product name and description. The storefront shows the translation when there is one.
5. An empty or missing translation falls back to the base value.
6. The input goes in the General Information card, under the description.
7. The 250 limit is enforced everywhere: the column, the API validation and the dashboard input; the translation uses the same limit. Whitespace-only input: trim it, and treat a blank result as empty.
8. "Storage conditions" in the UI; the label is a storefront UI message, translated like the other UI labels.
9. A translation is not restricted by the base value: it is translatable the same way as the product name and description, and the storefront shows the translation when there is one.
10. No filter or search by this field is needed.
11. It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export as one column with the base value, no translated columns. Include it in create, update and the translation mutation. Import is out of scope. Bulk-edit tooling stays unchanged.
12. Copy it on duplication like the other product fields. Then: there is no duplication feature; leave it out of scope.
13. Plain text; newlines are not preserved. Don't reject values with line breaks: replace line breaks with a space, trim, then apply the 250-character limit.
14. The field is storageConditions in the API and "Storage conditions" in the UI. Use "Storage conditions" as the glossary term too.
15. The storefront home page shows "Something went wrong loading this page", with the error "column product_product.storage_conditions does not exist".
16. The local stack is running in Docker on this machine. Yes, the local dev database only. Yes, you may restart the local API to apply the migration.
17. In the dashboard product page, after I type a value into Storage conditions, the Save button stays disabled, so the value can't be saved.

## superpowers

Already checked (do not re-check):
- Backend pytest on the 12 changed test files (saleor/csv, graphql/csv, graphql/product, graphql/translations, webhook) was run by the assistant: 549 passed, 16 warnings. The agent's own number was 560 (a different file selection).
- Dashboard jest on the 7 changed test files was run: 7 suites, 85 tests passed.
- Storefront vitest on the 3 changed test files was run: 3 files, 9 tests passed.
- Linters, type checks and full suites were not run by the assistant. Agent-reported: backend 298, cross-repo 290, dashboard 6,147, storefront 6, local migration suite 560, CSV 48; Ruff, schema generation, dashboard code generation, `lockSchema.test.ts`, `check-types:src`, storefront typecheck and lint. No screenshot or browser check by the agent.
- Live stack was checked read-only by the assistant after follow-up 2: migration `0211` is the last applied product migration, both `storage_conditions` columns exist (250), `products(first:100, channel:"default-channel")` returns all 29 products without errors. Before that, the same query failed with "column product_product.storage_conditions does not exist".
- Dashboard UI check by the operator was run: set, edit, clear and reload work. Public API (no token) returned `Keep refrigerated at 2–8 °C` on Mighty Mug and `null` for the Polish translation and the other 28 products.
- Storefront check was run: `mighty-mug` shows the "Storage conditions" block right after the description; `apple-juice` (HTTP 200) shows no block, empty label or placeholder.
- Search of added hand-written lines for console.log, debugger, print(, TODO/FIXME, .only, skip/xfail, eslint-disable, @ts-ignore was run: none found.

Agent was directed with:
1. Translatable: it is translatable the same way as the product name and description. The storefront shows the translation when there is one.
2. Plain text, one optional field, max 250 characters. Empty is allowed.
3. Only on the storefront product page, in the product description area. Not in cart, checkout or order emails. A separate labelled block after the description, hidden when empty.
4. Use subagent-driven execution.
5. No, work in place (no git worktrees).
6. Import/export, webhooks, API filters?
7. Please implement the code and the migrations, so we can actually test the feature.
8. It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export. No filter or search by this field is needed. Include it in create, update and the translation mutation. Import is out of scope. Yes, the local dev database only. Yes, you may restart the local API to apply the migration.

## spec-kit

Already checked (do not re-check):
- Backend pytest on the 6 changed test files was run by the operator: 241 passed.
- Dashboard `jest src/products src/translations` was run by the operator after follow-up 4: 97 suites, 761 tests passed. The full dashboard script was not run by the operator.
- Storefront `vitest run src/lib/storefront src/lib/catalog src/ui/components/pdp` was run by the operator: 18 files, 104 passed.
- Dashboard type check was run by the assistant on a clean copy of baseline-v1 with the diff applied (`tsc --noEmit` and the `tsc-strict`, e2e, e2e-legacy and scripts projects): `tsc-strict` reports one error, `src/translations/components/TranslationsProductsPage/use-translation-product-form-app-response.ts(94,37): error TS18047: 'lastFrame' is possibly 'null'`; the other projects pass. Known benchmark deficiency: ignore these type errors.
- At T1 the product query on the running local API failed with "column product_product.storage_conditions does not exist"; the agent applied migration 0211 to the local dev DB after follow-up 1, and existing products then return `storageConditions: null`.
- Dashboard UI check by the operator was run: a storage-only save was lost until follow-up 2; after it, set, edit, clear, reload and a 251-character test pass. A cleared value (Banana Juice) was still shown on the storefront until follow-up 3; after it, fixed.
- Storefront check was run: labelled block after the description when set; nothing when empty; existing products open.
- Agent-reported (not re-run by the operator): backend Ruff and diff-whitespace checks, dashboard TypeScript check, storefront typecheck and lint, backend suites (169 targeted earlier), dashboard 54 targeted, `createMinimalProduct` 5. The agent says the full dashboard script fails on `src/graphql/lockSchema.test.ts`; the operator did not confirm this. The manual walkthrough task (T040) was not run; no screenshot was taken.
- `git status --porcelain` per repo was run: saleor 20, dashboard 31, storefront 17 changed files; the untracked files are the feature's new files only. A stray `schema.graphql-e` was removed by the agent before T1.

Agent was directed with:
1. Plain text, one optional field, max 250 characters. Empty is allowed. The 250 limit is enforced in the column, the API validation and the dashboard input; the translation uses the same limit. Newlines are not preserved.
2. Translatable the same way as the product name and description. The storefront shows the translation when there is one. An empty or missing translation falls back to the base value. Staff translate it on the product translations page in the dashboard.
3. Only on the storefront product page, in the product description area. Not in cart, checkout or order emails. A separate labelled block after the description, hidden when empty.
4. Existing products: empty by default. A schema migration only; no data migration or backfill. Products without it look and work exactly as before.
5. Staff with the MANAGE_PRODUCTS permission can edit it, same as other product fields. Anyone can read it through the public product API.
6. Use the existing stack and patterns of the three repositories: saleor (Python, Django, GraphQL), saleor-dashboard (React, TypeScript), react-storefront (Next.js, TypeScript). No new dependencies.
7. It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export. No filter or search by this field is needed.
8. Use the shared TranslationInput. No breaking change to productTranslate.
9. categoryTranslate and collectionTranslate must return an INVALID error if storageConditions is set.
10. Count it in the translation progress. No stories edits.
11. The product update page and the create-product dialog on the product list (that dialog is the create flow).
12. The product query on the running local API returns an error: column product_product.storage_conditions does not exist. Make the storage conditions feature work on the running local stack.
13. Saving the product does not keep the storage conditions I entered. The value is only kept when I also change another field, such as the product rating. If I change only the storage conditions and save, the value is gone after reload.
14. After clearing the storage conditions of Banana Juice in the dashboard and saving, the storefront product page still displays the old storage conditions. The API returns no storage conditions for Banana Juice. A cleared value must disappear from the storefront product page.
15. The dashboard test src/products/views/ProductList/createMinimalProduct.test.ts, "creates a variant product with name and type only", fails. The create call now sends storageConditions: null, and the test expects no storageConditions field. Make the dashboard test suite pass.

## rosetta-flow

Already checked (do not re-check):
- Backend pytest on the 11 changed or new test files (uv, in the API container) was run by the assistant after T2: 445 passed.
- Dashboard jest on the 8 changed or new test files was run by the assistant: 8 suites, 83 tests passed.
- Storefront vitest on the 1 changed file was run by the assistant: 1 file, 7 tests passed.
- Agent-reported (full suites not re-run by the operator): Saleor focused 502 passed at T1, webhook/CSV 78 after follow-up 1; dashboard 98 suites / 773 tests; storefront 8 tests; Ruff, dashboard ESLint and Prettier, storefront typecheck, lock checks, design tokens. Dashboard `format:check` fails only on `agents/MEMORY.md`, which is unchanged since rosetta-v1. `git diff --check` fails on seven generated trailing-space lines in `saleor/graphql/schema.graphql`; the agent kept the generator output.
- At T1 the dev DB migrations ended at 0210: every product query on the live API failed with "column product_product.storage_conditions does not exist" and the storefront home page showed "Something Went Wrong". The agent applied migration 0211 after follow-up 2 with the operator's approval; after it, the DB has the column on `product_product` and `product_producttranslation`, the public product query returns data and the storefront home returns 200.
- Dashboard UI check by the operator was run: set, edit and clear on the product page work after reload. Storefront shows the block when set (Carrot Juice) and nothing when empty (Carrot Juice cleared, Banana Juice never set). The storefront caches product data (`catalog` life profile, 1 h revalidate; the `/api/revalidate` webhook is not configured locally), so a hard reload was needed to see changes.
- Public API read without token was run: `storageConditions` returned the saved value.
- The agent did not run a browser check or live manual validation (no browser tool or credentials) and wrote no test records to the dev DB.
- Search of added lines in the 3 repos for console.log, print(, debugger, breakpoint(, pdb, .only(, TODO/FIXME/XXX was run: none; no dependency file changed; untracked: migration 0211, a dashboard changeset and new test files.

Agent was directed with:
1. Translatable: it is translatable the same way as the product name and description, and the storefront shows the translation when there is one. Staff translate it on the product translations page in the dashboard, the same way as the product name and description.
2. Dashboard schema: stable schema only. Keep @lockSchema on reads only. The target is the main (3.23) build; the staging schema doesn't matter for this task.
3. Plain text, 250-character maximum. It is one optional field, and empty is allowed.
4. When only storage conditions are set, show the Description section with storage conditions only.
5. Extend the shared TranslationInput. No breaking change to productTranslate. categoryTranslate and collectionTranslate reject the field: they must return an INVALID error if storageConditions is set.
6. Storefront labels: keep the English fallback outside English.
7. Run the isolated local verification. You may write test data to the local dev database, with a snapshot first and a full restore after. Use a browser tool on the dashboard and storefront only if one is available without new credentials; otherwise use automated tests and API checks.
8. Commit the exact generator output; accept the seven generated whitespace reports.
9. Accept the delivery with the documented pre-existing format-check exception.
10. The storage conditions field must also be in product webhook payloads and in the product CSV export. It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export. No filter or search by this field is needed.
11. The storefront is broken. When I open the home page at http://localhost:3000, it shows "Something Went Wrong – Something went wrong loading this page." The error overlay says: "Runtime SaleorDataError: column product_product.storage_conditions does not exist". Existing products must open and work as before.
12. Yes, apply product migration 0211 to the local development database.

## rosetta-light

Already checked (do not re-check):
- Backend `pytest --create-db` on the 7 changed test files was run by the operator: 286 passed.
- Dashboard `jest --runTestsByPath` on the 8 changed test files plus `tsc --noEmit` was run: 8 suites, 96 passed, tsc clean.
- Storefront `vitest run` on the 3 changed test files plus `tsc --noEmit` was run: 3 files, 7 passed, tsc clean.
- Agent-reported (not re-run by the operator): backend 7 + 278 + 232 passed, dashboard 96, storefront 12; Ruff, ESLint, Prettier, tsc, lock checks. An independent reviewer subagent (agent) was run: no actionable findings; later PASS for the webhook/CSV additions with 278 CSV/webhook tests. The agent dropped and recreated the disposable `test_saleor` test database with approval.
- At T1 the running stack was not checked by the agent: every product query on the live API failed with "column product_product.storage_conditions does not exist" (migration 0211 was not applied to the dev DB). After follow-up 2 the agent applied product.0211_product_storage_conditions in `saleor-benchmark-api`; the last product migration is then 0211, storefront 308/200, dashboard 200, product page 200, and the public API returns `Keep refrigerated at 2–8 °C.` for apple-juice and `""` for carrot-juice.
- Browser check by the operator was run: Apple Juice set, Save became active, saved, reload kept; edit and clear work; storefront shows the labelled block after the description when set and no block when empty; Carrot Juice added to the cart.
- Diffs were read and grep for debug code was run: 66 files, all in scope; `saleor/graphql/schema.graphql` regenerated (has `STORAGE_CONDITIONS`); no leftover schema copies or debug prints. No UI or browser check by the agent.

Agent was directed with:
1. Plain text, 255 characters.
2. Translatable: it is translatable the same way as the product name and description. The storefront shows the translation when there is one.
3. A separate labelled block after the description, hidden when empty. It is shown only on the storefront product page, in the product description area. Not in cart, checkout or order emails.
4. Hide it when blank: no empty label or placeholder.
5. Drop and recreate the local test_saleor database. It is the disposable pytest test database with no real data; the local dev database must stay untouched.
6. The storefront schema source for codegen is http://localhost:8000/graphql/.
7. Preserve the two unrelated earlier entries in paper-core.lock.json.
8. Storage conditions must also be part of the product data that leaves the system: include it in product webhook payloads and in the product CSV export. No filter or search by this field is needed.
9. CSV: export the default product value only.
10. The running stack is broken: product queries on the local API fail with "column product_product.storage_conditions does not exist". The migration was never applied to the local Docker dev database, so product pages in the dashboard and the storefront don't work. Fix it.
11. Yes, rerun the read-only migration check. Yes, apply product.0211_product_storage_conditions to the local Docker development database. Yes, run the read-only validation alternative.

## rosetta-skills

Already checked (do not re-check):
- Backend pytest on the 5 changed test files (API container, `--reuse-db`) was run by the assistant after T2: 236 passed.
- Dashboard `jest` on the 5 changed test files was run: 5 suites, 71 tests passed.
- Storefront `vitest run` on the 2 changed test files was run: 2 files, 4 tests passed.
- Agent-reported (not re-run by the operator): 222 + 77 core tests, 41 dashboard tests + strict typecheck (`check-types:src`), 787 storefront tests + typecheck. Linters were not re-run by the operator. No UI check by the agent.
- At T1 every product query on the live API failed with "column product_product.storage_conditions does not exist" (migration 0211 was not applied; the agent had noted this itself during the first pass). After follow-up 2, `django_migrations` shows `0211_add_storage_conditions`, and the anonymous `products(first:2, channel:"default-channel")` query returns values, `translation(languageCode:PL)` included; existing products return `storageConditions: ""`.
- Dashboard UI check by the operator was run: Save stayed disabled until follow-up 3; after it, Apple Juice set, save, reload kept; edit, clear and set back work.
- Storefront check was run: Apple Juice page shows a "Storage conditions" block after the description; a product without a value shows no extra block; product page returns HTTP 200.
- Search of added lines for console.log, print(, debugger, breakpoint, pdb, .only, TODO/FIXME/XXX was run: none found; no dependency file changed.

Agent was directed with:
1. Plain text: one optional field, max 250 characters. Empty is allowed.
2. Translatable: it is translatable the same way as the product name and description. The storefront shows the translation when there is one.
3. A separate labelled block after the description, hidden when empty. It is shown only on the storefront product page, in the product description area. Not in cart, checkout or order emails.
4. Hide it when empty: no empty label or placeholder.
5. Preserve TranslationInput compatibility and add optional storageConditions to it.
6. Correct the fragment and configured schema source, then regenerate types.
7. finish the work fully
8. fix everything no HITL before done
9. Storage conditions must also be part of the product data that leaves the system: include it in product webhook payloads and in the product CSV export. No filter or search by this field is needed.
10. The running stack is broken: product queries on the local API fail with "column product_product.storage_conditions does not exist". The migration was never applied to the local Docker dev database, so product pages in the dashboard and the storefront don't work. Please fix it.
11. Yes, I understand the shared development database schema change and approve applying product.0211_add_storage_conditions.
12. In the dashboard, on a product page, typing a value into "Storage conditions" does not enable the Save button, so staff cannot save the value. Please fix it.
