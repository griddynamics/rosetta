# Review: product-storage-conditions SPECS + PLAN (advisory)

Reviewer: read-only. Verdict: sound and well-grounded; 0 blockers, 3 major, 5 minor. Every recommendation is advisory.

## 1. Coverage vs request and approved decisions
| Request / decision | AC | Plan step | Status |
|---|---|---|---|
| Field exists, optional, plain text, max 250, empty allowed | BE-01..04 | S1.1-3 | covered |
| Staff set it in dashboard | DA-01, DA-02 | S2.2 | covered |
| Customers see it, labelled block after description, hidden when empty | SF-01..05 | S3.1-5 | covered. The "block" is an accordion item open by default [A2]. Reasonable, but it is a UX interpretation. |
| Translatable like name/description, storefront shows translation when present | BE-07, DA-03, SF-02 | S1.2, S2.3, S3.2 | covered |
| Shared TranslationInput | BE-08 | S1.4 | covered, with the category/collection guard |
| One-prop edit to PDP page.tsx | SF-01 | S3.3 | covered |
| Product webhook payloads | BE-09, BE-10 | S1.5 | covered |
| Product CSV export | BE-11, DA-04 | S1.6, S2.4 | covered |
| NO filter/search | BE-12 | S1 rules | covered |
| Migration on local dev DB only | BE-02 | S1.8 | covered, see M1 |
| Tests, all pass locally | all | T1-T3, V2 | covered, see m1 |

Beyond the literal request, but justified or approved (no scope creep found):
- `productBulkCreate` and `productBulkTranslate` inherit the field.
- The category/collection guard is a consequence of the shared input.
- The dashboard export-dialog option and the `isMainSchema()` gating are needed for export and for dual-schema support.
- CHANGELOG, changeset and 8-locale label are repo conventions.

Mildly extra, optional: translation-completion progress count (S2.3) and `.stories.tsx` edits. Both follow existing patterns. Keep them, or drop them if a tighter diff is preferred.

## 2. Spot-verification (real repos)
| # | Claim | Result |
|---|---|---|
| 1 | `PRODUCT_FIELDS` in `saleor/webhook/payloads.py` l.666, used at l.724 (create/update) and l.763 (deleted) | OK. Tuple ends with `"metadata"`. |
| 2 | `HEADERS_TO_FIELDS_MAPPING["fields"]` has `"product weight"` | OK. The `csv/utils/products_data.py` `.values(*export_fields)` path works for a plain column. |
| 3 | `ProductFieldEnum.PRODUCT_MEDIA` in `graphql/csv/enums.py` l.43, followed by `VARIANT_ID` | OK |
| 4 | Latest migration is `0210_collection_external_reference_unique_constraint` | OK |
| 5 | `ADDED_IN_323` in `descriptions.py` l.18 | OK |
| 6 | CHANGELOG `# 3.23.0` with `### GraphQL API` and `### Webhooks` | OK (`saleor/CHANGELOG.md`) |
| 7 | Containers `saleor-benchmark-saleor-1`, `-api`, `-db-1` | OK, all running |
| 8 | `PRODUCT_DETAILS_SAVE_FIELDS` in `saveComposition.ts` | OK |
| 9 | `ProductDetailsExtension.graphql` has only `__typename`; `mapProductExtensions(_product: ProductShell)` returns `{}` | OK |
| 10 | `messages/*.json` count is 8, with `careInstructions` at l.66 (ko is l.58) | OK. The plan says "placed next to careInstructions", so the ko line shift is harmless. |
| 11 | Dashboard `schema.graphql` symlinks to `schema-main.graphql`; `fetch-local-schema` writes `schema.graphql` | OK |
| 12 | `package.json` scripts `generate:main`, `check-types:src`, `extract-messages`, `lint:changesets`; storefront `typecheck`, `lint:design-tokens`, `data:lock:check`, `core:lock:check` | OK |
| 13 | Vitest aliases `server-only` and includes `src/**/*.test.ts`, so a `storefront-view.test.ts` can import the `server-only` module | OK |
| 14 | `pickTranslatedField` trims for the translation check but not the fallback | OK. The `.trim() \|\| null` in the plan covers the base value. |
| 15 | `ProductBulkCreateErrorCode.MAX_LENGTH` exists; bulk calls `clean_base_fields` (l.580) before `clean_instance` (l.689) | OK, ordering is right |
| 16 | `getProductUpdateVariables` sends only changed fields, so staging never gets `storageConditions` | OK. The `!== undefined` pattern matches `rating`. |
| 17 | `get_translated_keys` for ProductTranslation at models.py l.303 | OK. A second one at l.116 belongs to CategoryTranslation; do not confuse them. |
| 18 | `TranslationInput` is used by product, category and collection translate and by `product_bulk_translate` | OK. Guard scope is exactly as claimed. |
| 19 | `validate_input_against_model` drops falsy values before validating | OK, which is why `""` and `null` pass for category. The guard must still drop the key before `update_or_create(defaults=...)`. |

## 3. Findings (ranked)

### MAJOR
**M1. Validation DB writes go beyond what the user authorized.**
- Evidence: the user approved only "migration may be applied to LOCAL dev DB". PLAN Governing rules self-extend this to "validation data in V1/V2". V1 runs `productUpdate`, `productTranslate`, `categoryTranslate` and a `<b>x</b>` write against `apple-juice`, mints a superuser JWT, and pytest creates/reuses `test_saleor*` DBs.
- Fix: get explicit user OK for the V1/V2 data writes, or replace them with read-only checks (the pytest tests plus read-only shell payload/CSV calls, and GraphQL run inside pytest on the test DB).
- If kept: snapshot the prior values first and restore to them, not blindly to null.

**M2. The restore step is incomplete.**
- Evidence: V1 "Restore" only nulls the `apple-juice` value and the DE translation. `productTranslate` creates a `ProductTranslation` row, and `categoryTranslate(null)` may create a `CategoryTranslation` row. Neither is deleted, and the category row is not mentioned at all. The `<b>x</b>` value set for SF-04 is covered only by "revert any other value".
- Fix: record pre-state, then delete created translation rows (or use a throwaway product/category created and deleted by the same session). List every touched row in the V1 report.

**M3. `pytest --reuse-db` will hit a stale test DB.**
- Evidence: the DB server already has `test_saleor` and `test_saleor_gw8`, created before the new column exists. The plan's command is `pytest --reuse-db`. With `--reuse-db` the existing schema is reused and the new migration is not applied, so tests that touch `storage_conditions` fail with an undefined column. This is likely and would be mistaken for a defect. S1's "only the expected failure" gate would be false-red.
- Fix: the first run after the migration uses `--create-db` (or drop and recreate the test DBs). Document it in the Environment block. This is also test-DB writes inside the local container; mention it under M1.

### MINOR
**m1. Tests deferred to phase 11, which conflicts with "tests in place" and the repo rule "tests for every change".**
- Evidence: PLAN rule 12 says phase 7 writes no tests, and S1 deliberately leaves `test_get_products_data` red.
- Fix: make the phase-10 gate explicit in the orchestrator ledger, so the work is never reported "done" between phases 7 and 11. Alternatively let S1 fix that one test inline, since it is a mechanical `expected_data` update.

**m2. The `lint:graphql-variants` gate is missing.**
- Evidence: the storefront `verify` includes it, but S3 and V gates omit it. The extension fragment edit could touch what it checks.
- Fix: add `pnpm run lint:graphql-variants` to S3 "Done when".

**m3. `mypy` and the `docs:check`/baseline notes are unverified.**
- Evidence: the plan marks `mypy <paths>` as [A]. Changed paths under `saleor/graphql/...` may need the full config.
- Fix: run `mypy` once on the changed files at S1 and record the result. Baseline red is already acknowledged.

**m4. Storefront stale `"use cache"` makes the SF-01..SF-04 manual checks unreliable.**
- Evidence: V1 notes this, but relies on restarting `pnpm dev` between edits.
- Fix: use a fresh product/slug per case, or assert through the vitest render tests in T3. Prefer the latter so V1 needs fewer DB writes (supports M1).

**m5. Sanitization wording.**
- Evidence: SF-04 and §10 are right: a React text node escapes the value. The only `dangerouslySetInnerHTML` in `product-attributes.tsx` (l.77) is the description loop.
- Fix: add a T3 assertion that the new item is not rendered through that loop (it is outside `descriptionHtml.map`), and add a lint/grep step checking no new `dangerouslySetInnerHTML` appears in the diff.

## 4. Gap check (item 4)
- Permissions: covered (existing perms; public read).
- Translation fallback: covered (blank or whitespace translation falls back to base; verified `pickTranslatedField`).
- XSS: covered (text node, escaped); see m5.
- Other Product writers: only `productCreate`, `productUpdate` and `productBulkCreate` accept `ProductInput`. No variant or other mutation writes this column. No gap.
- Other consumers of the schema:
  - Storefront `scripts/deploy-catalog-translations.mjs` uses `TranslationInput!` and is unaffected because the change is additive.
  - Saleor API docs and the `schema.graphql` check are covered.
- Generated files: covered (`schema.graphql`, dashboard `generate:main`, storefront `gql/` is gitignored).
- Webhooks: legacy and subscription payloads covered; the variant, checkout and order claim verified.

## 5. Ordering and parallelism
- S1 first, then S2 || S3 || V: sound. Disjoint repos, so there are no file collisions.
- One hidden coupling: S2 depends on the running API reloading (`--reload`). Plan has a fallback (hand-applied SDL). Good.
- S3 reads `saleor/graphql/schema.graphql` by absolute path. That works without a running API.
- T1 || T2 || T3 is fine. T1 touches only `saleor/`, T2 only `saleor-dashboard/`, T3 only `react-storefront/`.
- Single point of contention: the local DB (S1 migrate, then V1 writes, then pytest test DB). Sequential in the plan, so OK.
