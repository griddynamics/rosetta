# Review: storefront S3 (product-storage-conditions)

TLDR: Matches SPECS section 9 and SF-01..06 (minus tests, deferred). No blocker or major. 2 minor notes.

Verified (evidence)
- Fragment: src/graphql/extensions/ProductDetailsExtension.graphql adds storageConditions + translation(languageCode: $languageCode); keeps __typename; same args as ProductDetails.graphql:15 so fields merge. Same cachedQuery doc, data:lock:check ok (65 calls), lint:graphql-variants ok, tsc --noEmit clean; src/gql (gitignored) has the field.
- Mapper src/config/storefront-view.ts:13-27: pickTranslatedField(...)?.trim() || null; blank translation falls back to base (saleor-translations.ts:11), blank base -> null; getStorageConditions returns non-empty string or null. As spec.
- UI product-attributes.tsx: item directly after description, before details; falsy -> not rendered (no label); plain text node, no dangerouslySetInnerHTML added.
- defaultValue ["description","storage"]: type="multiple"; unknown/absent value is a no-op, other items unchanged.
- i18n: pdp.attributes.storageConditions in all 8 messages files, values equal spec (ko at line 59, others 67; ko section is just shorter).
- page.tsx: 1 import + 1 prop only. No generated/unrelated/dependency changes; git status = 12 files, all in scope.
- core:lock:check: only the 2 pre-existing AGENTS.md drifts; no locked file touched.
- Caching: product data is under "use cache" (get-product-data.ts:53/161/233); field is in the same cached doc, so it follows existing product tags/TTL. Translation edits do not invalidate (accepted in SPECS section 13). No action.

Minor
1. product-attributes.tsx:~92 (AccordionContent): multi-line values (newlines from the dashboard Textarea) collapse to one line in HTML. Spec says plain text; optional fix: add `whitespace-pre-line` to the className. Not an AC; confirm with the owner before adding.
2. storefront-view.ts getStorageConditions: `value.length > 0` relies on the mapper trimming; a direct caller passing "  " would get a blank item. Harmless today (sole caller is page.tsx). Optional: `value.trim().length > 0`.

Pending (intentional): SF-04 vitest render test and mapper/getter tests (phase 11). Unverified here: runtime render.
