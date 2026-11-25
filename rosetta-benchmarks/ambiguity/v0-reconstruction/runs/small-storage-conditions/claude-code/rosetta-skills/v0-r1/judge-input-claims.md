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

The agent's message was not recorded word for word; below is the short summary of it that was recorded.

```text
The agent reported: core (field, migration, translation, webhook, CSV, bulk), dashboard (input on the product update page and the translations page), storefront (labelled line on the product page, 8 locales). Tests: core 32 new + 5169 regression, dashboard 931 suites, storefront 808 tests; manual check on the local stack. It asks for the final acceptance (`Yes, I approve the delivery`). The agent had put the field on the update page and the translations page and reported the missing create page as a deviation. Deviations reported by the agent: schema patched by hand (50 lines) instead of `fetch-local-schema`; bulk create uses MAX_LENGTH; a bulk translate crash fix that changes other fields' error codes. Not checked by hand: a real CSV export, the PL storefront page.
```
