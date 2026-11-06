# V1 validation report: product-storage-conditions (phase 9)

Verdict: PASS with caveats. No blocker, no major defect in the implementation. One process finding (my own probe side-effects, restored by inference) and several items infeasible/partial.

## 1. Gates (re-run)
| Repo | Command | Result |
|---|---|---|
| saleor | `makemigrations --check --dry-run` (container) | "No changes detected" PASS |
| saleor | `get_graphql_schema \| diff schema.graphql -` | empty PASS |
| saleor | `ruff check saleor`, `ruff format --check saleor` | clean PASS |
| saleor | `pytest --create-db -n` on the 6 plan paths (product/translations/webhook/csv/graphql csv/test_webhook.py) | 3781 passed, 1 failed: only `test_get_products_data` (expected) PASS |
| saleor | mypy | not re-run (reviewer ran; not in V1 gate list given) |
| dashboard | `pnpm test` | 5 failed. 3 = expected getProductTranslationCompletion (max-only, 5->6, 6->7 etc.). 2 extra (SiteSettingsPage, SingleReferenceField) = jest 5000 ms timeouts under load (parallel pytest/tsc running); re-run in isolation: both PASS, plus `lockSchema.test.ts` PASS. Treated as flake, not a finding on the diff |
| dashboard | `check-types:src` | all 4205 strict files pass PASS |
| dashboard | eslint on 17 changed non-generated ts/tsx | 0 errors (68 warnings, incl. return-type warnings; pre-existing class) PASS |
| dashboard | prettier --check (changed files, defaultMessages.json, changeset) | clean PASS |
| dashboard | `lint:changesets` | PASS (1 file, patch) |
| dashboard | no new `dangerouslySetInnerHTML` in diff | prints nothing PASS; schema-staging/package.json/lockfile: no diff |
| storefront | `generate:all`, `typecheck` (SDL env) | PASS |
| storefront | `test:run` | 127 files, 787 tests PASS |
| storefront | `lint` (0 errors, 26 warnings), `lint:design-tokens`, `lint:graphql-variants`, `data:lock:check` (65 calls) | PASS |
| storefront | `core:lock:check` | rc=1, drift exactly the 2 baseline AGENTS.md lines (expected) |
| storefront | no new `dangerouslySetInnerHTML` | prints nothing PASS |
| all | HEAD unchanged: saleor 692b070, dashboard 78273c4, storefront f11c4a2; dirty trees 17 / 25 / 12 entries | PASS |

Not run: dashboard `extract-messages` (would rewrite a tracked file). The 4 new ids (hCQSOG, B3SLYm, PBRUO8, fp8Ua2) are present in `locale/defaultMessages.json` (diff).

## 2. AC matrix
| AC | Status | Evidence |
|---|---|---|
| BE-01 | PASS | Live introspection: `storageConditions` on Product, ProductTranslation, ProductTranslatableContent, TranslationInput, ProductInput, ProductCreateInput, ProductBulkCreateInput; `ProductFieldEnum` order PRODUCT_MEDIA, STORAGE_CONDITIONS, VARIANT_ID. Schema diff empty |
| BE-02 | PARTIAL | `makemigrations --check` clean, 0211 applied on dev DB, pytest DBs created from it. Reverse (migrate backwards) not executed (would alter the dev DB schema; not authorized). Two AddField ops reverse by default |
| BE-03 | PASS | `"  Keep refrigerated at 2–8 °C  "` stored stripped; `"   "` -> null; omitted key (`rating:null` update) leaves value; unicode `保存方法: 冷蔵 2–8 °C` stored |
| BE-04 | PASS (update only) | 251 chars -> `errors[{field:storageConditions, code:INVALID}]`, product null, value unchanged; `" "+250a+" "` accepted, stored length 250. Create/bulkCreate not run live (would create products); covered by code review only |
| BE-05 | INFEASIBLE live | productBulkCreate creates products (not authorized). Code: `clean_base_fields` calls cleaner (per reviewer) |
| BE-06 | PASS | Anonymous `product(slug,channel){storageConditions translation(languageCode:DE){storageConditions}}` returned base + DE value. Anonymous productUpdate denied (MANAGE_PRODUCTS) |
| BE-07 | PASS (productTranslate) / INFEASIBLE (bulk) | DE `Gekühlt lagern bei 2–8 °C` saved; 251 chars -> INVALID, nothing changed. productBulkTranslate not run live. Permission-denied case relies on existing behavior (not run) |
| BE-08 | PASS (category) / INFEASIBLE (collection) | categoryTranslate DE `"x"` -> INVALID "Storage conditions can only be translated for products.", no row created; `null` and `""` -> no error; `{null, name}` -> saved name. Collection not run (no collection written to; code path shares the guard per review) |
| BE-09 | PASS | `generate_product_payload` and `generate_product_deleted_payload(p, [])` contain `storage_conditions` = value |
| BE-10 | PASS | `generate_translation_payload(DE ProductTranslation)` keys include `{"key":"storage_conditions","value":"Gekühlt lagern bei 2–8 °C"}` |
| BE-11 | PASS | `get_product_export_fields_and_headers_info({"fields":["name","storage conditions"]})` -> file headers `[id, name, storage conditions]`; `get_products_data` row value set; null product (Monospace Tee) -> None (empty cell) |
| BE-12 | PASS | `PRODUCT_SEARCH_FIELDS == ['name','description_plaintext']`; no search/filter files in diff |
| BE-13 | PASS | CHANGELOG diff: one bullet under GraphQL API, one under Webhooks |
| DA-01..DA-04 | INFEASIBLE (browser) | No browser tool available. Covered statically: reviewer evidence + typecheck/jest/lint green; handler/form code reviewed by review-code-dashboard |
| DA-05 | PASS | `lockSchema.test.ts` passes; staging schema/generated untouched |
| DA-06 | PASS | check-types, jest (except known 3), eslint, prettier, lint:changesets, messages present |
| SF-01 | PASS | Live (existing dev server on :3000): `/en/default-channel/products/apple-juice` rendered order Description, Storage Conditions, Product Details, Shipping & Returns; item `data-state="open"`, text `Keep refrigerated at 2–8 °C` as plain div text |
| SF-02 | INFEASIBLE live | The :3000 dev server (PID 17145, pre-existing, not started by me) has no `de` locale: `/de/...` 308 redirects to `/en/...`. I did not stop someone else's server and Next refuses a second dev instance in the same dir. API side verified (BE-06 DE value); mapper logic is for T3 |
| SF-03 | PASS | `monospace-tee` (untouched product) HTML has no Storage Conditions label in rendered output (label string occurs only inside the messages blob) |
| SF-04 | NOT RUN (by plan: T3 vitest) | `<b>x</b>` never written. Diff check: no new `dangerouslySetInnerHTML` |
| SF-05 | PARTIAL | Key present in all 8 messages files with spec values (`en` "Storage Conditions", `de` "Lagerungshinweise", etc.; ko at line 59, others 67). Runtime en only |
| SF-06 | PASS | see gates |

## 3. Snapshot / restore (local dev DB `saleor-benchmark-db-1`)
Snapshot before writes: `Product 152 apple-juice` storage_conditions = NULL, category 43 `juices`; ProductTranslation rows for product 152: only pk 1 `pl` (name "Sok jabłkowy", storage_conditions NULL); no DE ProductTranslation; CategoryTranslation total 0 (no DE row for category 43); ProductTranslation total 29; products with non-null storage_conditions 0.

Touched rows:
| Model | pk | Action |
|---|---|---|
| Product | 152 | storage_conditions set (several values), then reset to NULL; also see "side effects" |
| ProductTranslation | 30 (round 1) | created by V1 (de), deleted |
| ProductTranslation | 31 (round 2, for the storefront smoke) | created by V1 (de), deleted |
| CategoryTranslation | 1 (de, name "Saft DE") | created by V1 (call `{storageConditions:null,name:"Saft DE"}`), deleted |

Final re-read (after restore2): product 152 storage_conditions NULL; PTs for product 152 = [(1,'pl','Sok jabłkowy',NULL)]; CategoryTranslation total 0, no DE; ProductTranslation total 29; products with storage_conditions 0; PTs with storage_conditions 0; anonymous API read returns `storageConditions: null, translation: null`. Equals the snapshot on every snapshotted field. No `<b>x</b>` or HTML value written. Token file deleted from scratchpad; no secret printed.

### Side effects not covered by the snapshot (disclosure)
1. I used `productUpdate {rating:null}` as an "omitted storageConditions key" probe. This set `Product 152.rating` to NULL. I had not snapshotted `rating`. Evidence it was previously 0.0: all 28 other products have 0.0 and apple-juice was the only NULL. I restored it to 0.0 (inferred, not snapshot-proven).
2. `productUpdate` set `search_index_dirty = True` on product 152 (no Celery worker to clear it). All other 28 products are False; I reset it to False (inferred).
3. `Product.updated_at` for product 152 advanced (was not snapshotted; auto_now, not restored). Harmless metadata.
4. Round 1 restore used a stale pk after the second round had recreated the DE row with pk 31; the first restore2 command deleted it. Final state verified clean as above. Sequences (pk counters) for ProductTranslation/CategoryTranslation advanced; not restorable and irrelevant.
5. The storefront dev server (:3000, not mine) cached the PDP with `use cache`; apple-juice en page may serve the stale value until the TTL. Dev server left running as found.

## 4. Findings
Blocker: none.
Major: none.
Minor:
1. (process, mine) rating/search_index_dirty side effects above; restore by inference.
2. (reviewer minor-1, confirmed code only) `ProductDetailsForm` comparison `data.storageConditions?.length > MAX` on possibly undefined; harmless.
3. (reviewer, unverified live) multi-line values collapse to a single line in the PDP (no `whitespace-pre-line`); behavior note.
4. dashboard `pnpm test` is timing sensitive under concurrent load (2 unrelated tests exceeded 5 s while pytest ran); pass in isolation.
5. Spec §15 omits `saleor/graphql/translations/mutations/product_bulk_translate.py` (needed for the bulk update path); reviewer recommended adding it. Diff contains it (16 saleor files incl. migration).
6. ProductBulkTranslate/bulkCreate/create/collection translate paths unexercised live: recommend T1 covers them (plan already does).

Commands (essentials): `docker exec -w /app saleor-benchmark-saleor-1 python -m pytest --create-db -p no:cacheprovider -n ...`, `pnpm test`, `pnpm run check-types:src`, storefront `NEXT_PUBLIC_SALEOR_API_URL=<schema.graphql> pnpm run {generate:all,typecheck,test:run,lint,lint:design-tokens,lint:graphql-variants,data:lock:check,core:lock:check}`, GraphQL via urllib script against `localhost:8000/graphql/` with a staff JWT created by the plan's read-only shell method, ORM snapshot/restore scripts via `manage.py shell` (scratchpad `snap.py`, `restore2.py`), `curl localhost:3000/...`.
