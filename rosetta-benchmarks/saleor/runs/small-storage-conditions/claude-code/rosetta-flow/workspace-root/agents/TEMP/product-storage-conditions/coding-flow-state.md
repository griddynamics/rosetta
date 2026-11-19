# coding-flow-state: product-storage-conditions

Size: MEDIUM-LARGE (3 repos: saleor, saleor-dashboard, react-storefront). Repo rule: no commit/push.
Task tool unavailable; this file is the ledger.

## Phases
- [x] 0 prerequisites (skills loaded; no docs/CONTEXT.md etc. in workspace root; per-repo docs/agents/domain.md + ADRs only)
- [~] 1 discovery (inline, partial) — see facts
- [x] 1b HITL questions answered: (a) translatable like name/description; storefront shows translation when present; (b) plain text, optional, max 250 chars, empty allowed; (c) separate labelled block after description, hidden when empty
- [x] 2 design done: agents/TEMP/product-storage-conditions/architecture-notes.md (real column on Product + ProductTranslation; migration 0211; dashboard textarea+translation; storefront via extension fragment)
- Q answers: Q1 shared TranslationInput; Q2 yes edit page.tsx; Q3 CHANGED: field IN product webhook payloads and IN product CSV export, NO filter/search; Q4 yes local dev DB only. Architect asked to revise notes for Q3.
- Notes revised (webhook PRODUCT_FIELDS, CSV export option STORAGE_CONDITIONS, dashboard export option, CHANGELOG x2). No blocking Qs.
- [x] 3 user_review_design APPROVED ("Yes, I reviewed the design")
- [x] 4 tech_plan done: plans/product-storage-conditions/product-storage-conditions-{SPECS,PLAN}.md (24 ACs; sessions S1 BE, S2 dashboard || S3 storefront, V1, T1-T3, V2)
- Items for user decision at phase 6: dev-DB test data writes (apple-juice + de translation, restored after); staff token via read-only shell from existing superuser; dashboard fixture exception in S2; browser tool/credentials unconfirmed.
- [x] 5 review_plan done: review-plan.md. 0 blockers; M1 DB data writes in V1 not authorized; M2 restore incomplete (translation rows, <b>x</b> value); M3 pytest --reuse-db stale -> need --create-db first run; 5 minors (tests phase 11 gate wording, lint:graphql-variants, mypy cmd, "use cache" staleness, dangerouslySetInnerHTML check).
- Decisions: D1 yes dev-DB writes w/ snapshot+full restore; D2 browser only if available w/o new creds else tests; D3 yes fixtures field-only; D4 keep progress count, drop stories. Architect updating plan.
- Plan/specs updated for M1-M3, minors, D1-D4 (V1 snapshot+full restore, no <b>x</b> write; --create-db first run; mypy cmd verified; tests phase 11 after impl approval).
- [x] 6 user_review_plan APPROVED ("Yes, I reviewed the plan")
- [~] 7 implementation: S1 backend DONE (ruff/mypy/migrate/schema OK; 3781 pass, 1 expected fail test_get_products_data; extra file product_bulk_translate.py translation_fields). S3 storefront DONE (12 files; typecheck/test:run 787/lint/data:lock pass; core:lock fails only baseline 2 AGENTS.md; extra import in page.tsx). S2 dashboard DONE (all gates pass except 3 existing tests in src/translations/views/EntityLists/utils.test.ts getProductTranslationCompletion: max 6->7; deferred to T2 per plan; extra: 3 typed literals in that file, ProductFieldEnum msg unconditional).
- [x] 7 implementation done (S1,S2,S3).
- review storefront DONE: 0 blocker/major; minor1 newlines collapse (whitespace-pre-line? owner call), minor2 getStorageConditions use trim(). review dashboard DONE: 0 blocker/major, 3 minor advisory; the 3 failing tests: first case 5->6, other two 6->7 (T2 updates all). review backend DONE: 0 blocker/major; accept translation_fields deviation (add file to spec §15); minors: guard deletes key from caller dict, translations not stripped (by spec; test in T1).
- [x] 8 review_code done (no blockers/majors in 3 repos).
- [x] 9 impl_validation done -> validation-v1.md. 0 blocker/major. Gates: BE 3781 pass +1 expected fail; dashboard 3 expected fails + 2 load-flake timeouts (pass alone); storefront OK (core:lock baseline only). Infeasible: DA-01..04 (no browser), SF-02 (no de locale on pre-existing :3000 dev server, left running), BE-05 and bulk/collection/create live not run. Restore: DB matches snapshot; deleted rows ProductTranslation pk30,31 + CategoryTranslation pk1; SLIP: probe set rating NULL + search_index_dirty true on apple-juice (not snapshotted), reset by inference to 0.0/False; updated_at + id counters not restorable.
- [x] 10 user_review_impl APPROVED ("Yes, I approve the implementation."). Newline question unanswered -> NOT implemented (assumption: no whitespace-pre-line).
- T3 storefront DONE: 3 new test files (storefront-view.test.ts 25, product-attributes.test.ts 18, product-details-extension.contract.test.ts 5); test:run 130 files/829 pass (+42); typecheck, lint 0 err, token/variants/data-lock pass; core:lock baseline only. T2 dashboard DONE: 6 test files edited, 7 new (3 main + 4 staging); pnpm test 934/936 suites, 2 timeout flakes (ProductTile, SettingsToggleRow) pass alone; check-types OK; eslint 0 err. Gaps: DA-05 real API path via FF_USE_STAGING_SCHEMA not run (relies on lockSchema.test.ts + gating tests); export field list tested via mocked Accordion. T1 backend DONE: 14 test files; plan suite 4000 pass/1 skip/0 fail; ruff clean; makemigrations --check clean; sqlmigrate backwards OK. FINDINGS: (1) productBulkTranslate >250 -> row code max_length not in ProductTranslateErrorCode -> protocol-level GraphQL error, errors null, nothing saved (same for name >250; pre-existing); test asserts actual behavior vs spec "row error" => possible spec gap, needs judgment; (2) mypy on changed test files 105 errors, same enum pattern as neighbouring tests; (3) no migration-apply test, BE-01/12/13 no unit test.
- [x] 11 tests done (T1,T2,T3).
- review-tests storefront DONE: 0 blocker/major; 5 minors (blank base+translation case; whitespace reader/render case; route wiring untested; contract test title over-claims; order test indexOf). review-tests dashboard DONE: 0 blocker; MAJOR1 counter test lacks aria-invalid error-state assertion for 251 chars (DA-02); minors: main-schema tests should mock isMainSchema true; export test uses querySelector; optional: getProductUpdateVariables staging omit-key test; DA-05 gap accepted. review-tests backend DONE: 0 blocker; MAJOR-1 bulk-translate >250 = spec wording gap (prod behavior acceptable, same as name; recommend spec text fix, NO prod change); minors: bulk create padded 250/251 + no-permission tests, category/collection "   " tests, BE-12 search fields unchanged test, tighten weak assertion in category/collection translate tests; mypy noise accepted.
- [x] 12 review_tests done (0 blockers).
- 12b T3 fixes DONE: test:run 130 files/835 pass; gates green (core:lock baseline). Whitespace-only into getStorageConditions/ProductAttributes directly renders empty item (route safe since mapper trims; optional hardening trim in reader, not applied). Route page.tsx->prop wiring still untested (E2E). T1 fixes DONE: plan suite 4004 pass/1 skip/0 fail; ruff, makemigrations clean; whitespace-only category/collection translate rejected INVALID (guard truthiness). T2 fixes DONE: pnpm test 937 suites/6169 pass; check-types, eslint 0 err, prettier OK. PROD FINDING: handlers/utils.ts getProductUpdateVariables (l.76-77) not gated by isMainSchema(); on staging safe only because form never sets key; test of that not kept (would fail). Needs user decision (optional hardening). SPECS bulk-translate row corrected (request-level error).
- [x] 12b fixes done.
- [x] 13 final_validation DONE -> validation-v2.md: 0 blocker/major. BE 4004 pass/1 skip; dashboard 937 suites/6169; storefront 130 files/835; all lint/type gates green (core:lock baseline only); DB at snapshot; no commits. Infeasible: DA-01..04 browser, SF-02 live, BE-02 reverse, BE-05 live, DA-05 live staging. Open optional: isMainSchema gate in getProductUpdateVariables, newline whitespace-pre-line, trim in getStorageConditions.
- [~] 12b test-review fixes: T1/T2/T3 resumed with fix lists; spec wording fix for bulk translate (SPECS §6/BE-07) to be disclosed to user.
- [~] 12 review_tests: 3 reviewers in parallel -> review-tests-{saleor,dashboard,storefront}.md
- [~] 11 tests: T1 backend || T2 dashboard || T3 storefront engineers running; then 12 review_tests, 13 final_validation V2.
- [~] 8 review_code: 3 reviewers in parallel (one per repo) -> agents/TEMP/product-storage-conditions/review-code-{saleor,dashboard,storefront}.md No tests in phase 7 (except D3 fixtures).
- (old line) 6 user_review_plan — (old line follows); waiting for decisions (D1 dev-DB data writes, D2 browser checks, D3 dashboard fixture exception, D4 optional extras) then strict approval "Yes, I reviewed the plan". Plan to be updated for M2/M3/minors + decisions. Open Qs: Q1 shared TranslationInput?, Q2 edit PDP page.tsx one prop?, Q3 export/search/legacy webhook out of scope?, Q4 apply migration to local docker DB? Needs approval sentence.
- Known: storefront `pnpm run verify` fails pre-change (missing AGENTS.md, skills/); backend tests only in docker container saleor-benchmark-saleor-1.
- [ ] 4 tech_plan
- [ ] 5 review_plan
- [ ] 6 user_review_plan
- [ ] 7 implementation
- [ ] 8 review_code
- [ ] 9 impl_validation
- [ ] 10 user_review_impl
- [ ] 11 tests
- [ ] 12 review_tests
- [ ] 13 final_validation

## Discovery facts
- Backend: saleor/saleor/product/models.py `Product` (l.179), `ProductTranslation` (l.277); description = SanitizedJSONField (Editor.js). Latest product migration 0210. Mutations: saleor/saleor/graphql/product/mutations/product/product_create.py, product_update.py.
- Dashboard: src/products/components/ProductUpdatePage (+ProductCreatePage/form.tsx), src/fragments/products.ts, src/products/views/ProductUpdate/handlers/utils.ts; generated types src/graphql/types.generated.ts; schema from backend.
- Storefront: src/graphql/ProductDetails.graphql (+ extensions/ProductDetailsExtension.graphql "fork-owned fields"), src/lib/storefront/{contract,mappers}/product.ts (descriptionHtml: string[]), PDP page.tsx; codegen `pnpm generate`; tests vitest.
