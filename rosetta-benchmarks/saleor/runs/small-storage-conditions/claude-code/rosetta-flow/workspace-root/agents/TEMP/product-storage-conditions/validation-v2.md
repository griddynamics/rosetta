# V2 final validation: product-storage-conditions (phase 13)

Verdict: PASS. 0 blocker, 0 major. Fresh from-scratch run of all gates; read-only on source and DB (no writes this session).

## Final counts
| Repo | Gate | Result |
|---|---|---|
| saleor | `pytest --create-db -n 4` on the 6 S1 paths (product/tests, translations/tests, webhook/tests, csv/tests, graphql/csv/tests, plugins/webhook/tests/test_webhook.py) | 3845 passed, 0 failed |
| saleor | `pytest --reuse-db -n 4 saleor/product/tests` (T1 edited test_translation.py, test_product_search.py) | 159 passed, 1 skipped |
| saleor | total | **4004 passed / 1 skipped / 0 failed** (matches expected) |
| saleor | `makemigrations --check --dry-run` | "No changes detected" |
| saleor | `get_graphql_schema \| diff saleor/graphql/schema.graphql -` | empty (SCHEMA_SAME) |
| saleor | `ruff check saleor` / `ruff format --check saleor` | all passed / 4384 files formatted |
| saleor | mypy on 14 changed non-test .py + migration 0211 | Success, 15 files |
| dashboard | `pnpm test` | 937 suites passed (1 skipped of 938), 6169 tests passed, 8 skipped, 0 failed, no timeout flake this run (155 s) |
| dashboard | `check-types:src` | 4211 strict files pass |
| dashboard | eslint on 30 changed non-generated ts/tsx | 0 errors, 115 warnings (return-type class, pre-existing style) |
| dashboard | prettier --check (same + defaultMessages.json + changeset) | clean |
| dashboard | `lint:changesets` | 1 file, patch, pass |
| dashboard | `extract-messages` consistency | run, then `cmp` with pre-run copy of locale/defaultMessages.json: identical (no drift) |
| storefront | `test:run` | **130 files / 835 tests passed** |
| storefront | `typecheck` (SDL env), `lint` | pass; lint 0 errors / 26 warnings |
| storefront | `lint:design-tokens`, `lint:graphql-variants`, `data:lock:check` | pass (65 calls) |
| storefront | `core:lock:check` | rc=1, drift is exactly the 2 baseline lines (src/lib/{saleor,storefront}/AGENTS.md removed) |

## Repo hygiene
- HEAD unchanged: saleor 692b070, dashboard 78273c4, storefront f11c4a2. No commits, no stash.
- No diff in any lockfile, package.json or pyproject.toml.
- New `dangerouslySetInnerHTML`: `git diff -U0 -- src | grep` prints nothing in dashboard and storefront; none in the untracked new files either.
- Secret scan (JWT-like, private key, sk_live, secret_key=) over all changed/new files: no hits.
- git status, in scope only:
  - saleor (32): CHANGELOG, schema.graphql, 0211 migration (new), models.py, product types/mutations (create/update/cleaner/bulk_create), translations (types, utils, category/collection/product_bulk translate), csv/enums, csv/utils, webhook/payloads, plus 14 test files.
  - dashboard (38): schema-main.graphql, locale/defaultMessages.json, generated main files (fabbrica x2, hooks, typePolicies, types), fragments, products/translations source + tests, `.changeset/product-storage-conditions.md`, 8 new test files. schema-staging and fetch-schema outputs untouched.
  - storefront (16): 8 messages/*.json, page.tsx, storefront-view.ts, ProductDetailsExtension.graphql, product-attributes.tsx, mapper test, 3 new test files.
  - No stray temp/generated junk tracked or untracked. Gitignored only: saleor `.jwt_key.pem` (dev runtime, 10:56), `.pytest-queries`, `.ruff_cache`.

## Dev DB (read-only ORM queries, saleor-benchmark-db-1)
apple-juice storage_conditions NULL; rating 0.0; search_index_dirty False. ProductTranslation: only pk 1 `pl` (storage_conditions NULL); DE rows 0; total 29; translations with storage_conditions 0. CategoryTranslation total 0. Products with non-null storage_conditions 0; products dirty 0; rating NULL 0. Equals V1 snapshot and the V1 side-effect restores.

## Logs
`docker logs --since 4h saleor-benchmark-api`: one transient `NameError: ADDED_IN_323` at 10:20:04 (watchfiles reload while product_create.py was mid-edit by S1), followed by a clean restart and reload after 0211 landed; all later requests 200. No error since. saleor-1 container: no tracebacks.

## Live manual QA (read-only)
- Introspection on localhost:8000: Product.storageConditions String (nullable), ProductTranslation, ProductTranslatableContent, TranslationInput, ProductInput all have it; ProductFieldEnum contains STORAGE_CONDITIONS.
- Anonymous `product(slug:"apple-juice"){storageConditions translation(languageCode:DE){storageConditions}}` returns nulls (matches DB).
- Storefront dev server already running on :3000 (read-only GET): apple-juice and monospace-tee en PDPs return 200; the "Storage Conditions" string appears once, only in the messages blob (`"storageConditions":"Storage Conditions"`), not as a rendered item (both products have NULL value). The positive render is covered by vitest.

## AC matrix
Legend: T = verified by test (this run), L = verified live (this run, read-only), V1 = verified live in V1 with writes (not repeated: V2 had no write authorization beyond restore protocol, DB state would only be re-dirtied), I = infeasible.
| AC | Status | Evidence |
|---|---|---|
| BE-01 | L + T | introspection above; schema diff empty; test_translations.py / query tests green in 4004 |
| BE-02 | T partial | makemigrations --check clean; `--create-db` built test DB from 0211 and 4004 pass; reverse migrate not executed (would alter dev DB), two default-reversible AddField ops |
| BE-03 | T (+V1) | test_product_create/update (strip, blank, null, omitted); V1 live |
| BE-04 | T (+V1 update) | boundary 250/251 tests in create/update/bulk_create |
| BE-05 | T | test_product_bulk_create (persist, invalid row path); live infeasible (creates products) |
| BE-06 | T + L | test_product_query; live anon read returns field + translation (null values) |
| BE-07 | T (+V1) | test_product_translate, test_product_bulk_translate; V1 live productTranslate |
| BE-08 | T (+V1 category) | category + collection translate tests incl. whitespace-only INVALID, null OK |
| BE-09 | T (+V1) | test_webhook_payloads (created/updated/deleted) |
| BE-10 | T (+V1) | webhook payload translation keys test |
| BE-11 | T (+V1) | test_get_products_data (previously expected failure, now passing), test_prepare_headers, test_export |
| BE-12 | T | test_product_search.py passes; no search/filter files in diff |
| BE-13 | T static | CHANGELOG diff: bullets under GraphQL API and Webhooks (1 file changed, in diff list) |
| DA-01 | T, I live | ProductDetailsForm.test, utils.test (set/clear->null/absent), form.test, saveComposition.test; no browser tool |
| DA-02 | T partial, I live | counter/maxLength covered; reviewer-noted aria-invalid assertion gap (see findings) |
| DA-03 | T, I live | TranslationsProductsPage.test, EntityLists/utils.test (completion count) |
| DA-04 | T, I live | ProductExportDialogInfo.test (+stagingSchema), mocked Accordion |
| DA-05 | T | lockSchema.test.ts + 4 *.stagingSchema.test files pass; real FF_USE_STAGING_SCHEMA API path not run |
| DA-06 | T | check-types, jest 937 suites, eslint 0 err, prettier, lint:changesets, extract-messages consistent |
| SF-01 | T (+V1 live) | product-attributes.test.ts (order after Description, open) |
| SF-02 | T, I live | storefront-view.test.ts (translation wins, whitespace -> base); :3000 server has no `de` locale |
| SF-03 | T + L | hidden-when-null test; live monospace-tee/apple-juice no rendered item |
| SF-04 | T | escaping render test; no new dangerouslySetInnerHTML (diff check empty) |
| SF-05 | T | 8 messages files have key (parity), en label asserted |
| SF-06 | T | typecheck, lint, design-tokens, graphql-variants, data:lock pass; core:lock baseline only |

## Findings
Blocker: none.
Major: none.
Minor:
1. DA-01..04 never exercised in a browser (none available, per D2); rely on jest render tests with mocks. Accepted.
2. DA-05 end-to-end staging path (FF_USE_STAGING_SCHEMA against a live API) not run; handlers/utils.ts getProductUpdateVariables not gated by isMainSchema (noted in coding-flow-state; safe on staging only because of schema lock behavior). Accepted risk.
3. DA-02 error-state (aria-invalid at 251 chars) assertion gap and newline collapse in PDP (no whitespace-pre-line, user did not answer) remain as reviewer minors.
4. BE-02 reverse migration and BE-05/bulk/collection/create live paths not run live (test-covered).
5. Transient `NameError ADDED_IN_323` in api log at 10:20 (mid-implementation reload), self-resolved.
6. Dashboard `pnpm test` is timing sensitive under concurrent load; passed cleanly when run alone.
7. Backend plan-suite count requires the 7th path (saleor/product/tests) to reach 4004; the six paths in the S1 list alone give 3845/0/0.
