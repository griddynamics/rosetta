# Judge input: claims

## 1. Checklist

1. One storage-conditions field on the product (not an attribute, metadata or a label)
2. Staff can set it and customers can read it
3. Staff set it on the product in the dashboard
4. Customers see it in the product description on the storefront
5. Done end to end, with tests for the new field
6. Takes a short free-text value such as "Keep refrigerated at 2-8 °C"
7. Plain text, optional, at most 250 characters, empty allowed
8. Translatable like the product name and description; the storefront shows the translation
9. Set per product, not per variant
10. Shown only on the storefront product page, not in cart, checkout or emails
11. Existing products start empty: schema migration only, no data backfill
12. Part of the product in the API, webhook payloads and CSV export; no filter or search
13. Editing needs MANAGE_PRODUCTS; anyone can read it
14. Existing products open and work as before
15. The repos' own checks pass: tests, type check, lint

## 2. The agent's message when it said the task was done

Word for word.

```text
Storage conditions now works end to end. Staff set it on the product page in the dashboard, and customers see it inside the Description section on the storefront. Everything passes locally except two dashboard test suites that need a newer Node (details under Checks).

What changed

Backend (saleor)
- Field. A new optional storageConditions field on Product and on ProductTranslation, max 250 characters, with migration 0211.
- API. The field is exposed on Product, ProductTranslation and ProductTranslatableContent. It is accepted by productCreate, productUpdate, productBulkCreate, productTranslate and productBulkTranslate.
- Behaviour. Values are trimmed and blank input is stored as empty. Over-length input returns a normal INVALID validation error. Setting it requires MANAGE_PRODUCTS.
- Also included. It appears in product webhook payloads and the product CSV export. I regenerated schema.graphql and added a CHANGELOG.md entry.

Dashboard (saleor-dashboard)
- Product page. A "Storage conditions" input sits under the description in General Information, with a 250-character limit and counter.
- Translation page. The same field is added to the product translation page.
- Housekeeping. I regenerated the schemas and types, added message strings, a patch changeset, and the Storage conditions term in CONTEXT.md.

Storefront (react-storefront)
- The block shows a translated "Storage conditions" label and the value as plain text.
- The value falls back to the product's own text when there is no translation. It is hidden when empty, and the label is translated in all 8 locales.

Checks

- Backend: 14,391 tests pass, plus ruff, mypy and the migration check.
- Storefront: tsc, lint (0 errors), 817 tests, and the paper-core and data-layer lock checks all pass.
- Dashboard: tsc, lint and 6,144 tests pass, with 2 NavigatorSearch suites failing on this machine's Node 20 (Object.groupBy is missing). Those suites pass under Node 24, and they don't touch this change.
- Live stack: I set the value through the dashboard UI and saw it on the storefront. Trimming, the 251-character rejection and saving a translation worked through the API. I restored the demo product afterwards.
- Not checked in a browser: the Polish translated page. That stack only serves en, and I couldn't start a second dev server. Translation fallback is covered by unit tests, and the translation save worked through the API.

Things to know

- Breaking API change. productTranslate and productBulkTranslate now take ProductTranslationInput instead of TranslationInput. Clients that declare that variable type by name must switch. The JSON payload is unchanged, and the changelog lists it under breaking changes.
- Create form. The dashboard has no product-create form. The create dialog only takes a name and type, so staff set the field on the product page afterwards.
- Storefront placement. The storefront rules say not to edit the locked contract, mapper or product route. I used the sanctioned extension mechanism plus a small context provider in the PDP template. A custom PDP template that doesn't use the preset layout won't show the block unless it wraps its layout in the provider.
- Not done: CSV import, and Playwright e2e tests (as agreed). Nothing is committed.

✻ Cooked for 12s · done 12:16 PM
```
