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
