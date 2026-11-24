# Review: S2 dashboard implementation (product-storage-conditions)

TLDR: No blockers, no majors. Implementation matches SPECS §8 and PLAN S2. Three minor notes. Expected 3 failures confirmed as by design.

## Verified (evidence)
- Textarea, counter, maxLength 250, gated by isMainSchema(), placed after Description and before Rating, error via getFormErrors: ProductDetailsForm.tsx (diff hunks +97..+147). Counter follows the SeoForm pattern.
- Save enables: "storageConditions" in PRODUCT_DETAILS_SAVE_FIELDS (saveComposition.ts:10). Payload is form.changedData (ProductUpdatePage/form.tsx:411,434), so the key exists only when edited. Empty maps to null (handlers/utils.ts:76-78). On staging the field never changes, so nothing is sent (DA-05 holds). Initial data `?? ""` (utils/data.ts:212). Create page untouched.
- Translations: enum value, LONG field appended to the general section only when isMainSchema(), selections in fragment and mutation. Save works through the existing getParsedTranslationInputData default branch ({[field]: string}).
- Export: STORAGE_CONDITIONS added only when isMainSchema() (ProductExportDialogInfo.tsx:597). Label matches the spec text.
- @lockSchema(schema:"main") is on all 5 selections (fragments/products.ts:224, fragments/translations.ts:86 and 95, mutations.ts:20 and 32). Generated hooks carry it too. Ran `jest lockSchema.test.ts` and ProductUpdatePage tests: 91 passed.
- Generated files: schema-main.graphql delta is exactly the SPECS §4 fields (Product, ProductTranslation, ProductTranslatableContent, TranslationInput, ProductInput, ProductCreateInput, ProductBulkCreateInput, ProductFieldEnum). types, fabbrica and typePolicies deltas are consistent with it, with no stray edits. schema-staging, package.json and lockfiles are untouched.
- i18n: 4 new ids (hCQSOG, B3SLYm, PBRUO8, fp8Ua2) are in locale/defaultMessages.json. Counter id yi1HSj pre-exists.
- Changeset: `"saleor-dashboard": patch`, valid format.
- Diff is limited to spec-listed files. Test and fixture edits are field-only (3 literals plus utils.test.ts literals).

## Failing tests (by design)
utils.test.ts getProductTranslationCompletion fails on `max` only: Received 6 vs Expected 5, Received 7 vs Expected 6, and the third case likewise. The cause is the added +1 `max` from storageConditions in getProductTranslationCompletion (EntityLists/utils.ts:131-141). SPECS §8 requires +1 max (and +1 current when translated) when isMainSchema(). `current` is unchanged because the fixtures use null. The new maxima are correct: 5->6 and 6->7 in the test's terms. Note the task brief says 6->7, but the first case goes 5->6. Phase 11 should update all three.

## Findings
1. minor - ProductDetailsForm.tsx: `data.storageConditions?.length > STORAGE_CONDITIONS_MAX_LENGTH` compares `undefined > number` when the prop is undefined. It is false at runtime and the prop is optional, so it is harmless. maxLength makes the over-250 error state unreachable by typing; it only triggers through a server error or a programmatic value. DA-02 is still met through the server error. Fix (optional): `(data.storageConditions?.length ?? 0) > MAX`.
2. minor - The helper text "Shown to customers on the product page." asserts storefront behavior that only exists with the S3 fork. It is mandated by spec §8, so spec-compliant. It is an assumption for other storefronts. No action unless the user wants different wording.
3. minor - Translation completion: `max` always includes storageConditions even when the source product value is empty, so lists show e.g. 0/6 for products with no storage conditions. This matches the spec literally (+1 max). Flagging as a behavior note only.

No stale-form-state, dirty-state or null-vs-empty bugs found. Label a11y matches the SeoForm composite-label pattern, and the Textarea gets its label from the macaw component.

Not run: check-types:src, full pnpm test, eslint (outside this review's scope).
