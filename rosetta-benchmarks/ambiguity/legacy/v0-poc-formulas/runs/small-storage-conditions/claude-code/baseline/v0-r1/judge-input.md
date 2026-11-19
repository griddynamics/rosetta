# Judge input: S-CC-01-v0-r1

**Diffs: final state, after the follow-ups.** This run is reused from the Saleor benchmark, which kept no snapshot at the first "done"; `t1/*.diff` are its final diffs.

## 1. Ticket

```text
Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

## 2. Planted contradictions

none

## 3. Questions and answers before the first "done"

Every stop of the agent before its first "done" where the operator replied, in order. The agent's question is as recorded in the run's timeline (short form); the operator's reply is word for word.

1. **Agent:** The agent showed its plan and asked for approval in the plan-mode menu.
   **Operator:** Menu option selected: `Yes, and bypass permissions`

## 4. The agent's "done" message

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

## 5. The later check of what it had handled

Questions sent:

```text
Don't change any code, just answer: was each of these handled, and where?
1. Is the storage conditions value plain text or rich text, and what is its maximum length?
2. Is it translatable, like the other product texts?
3. Is it set per product or per variant?
4. Where is the storage conditions value shown to customers: only on the product page, or also in other places (cart, checkout, order emails)?
5. Existing products: what value do they get after the change, and is a data migration needed for them?
6. Is it included in import/export, in webhook payloads, and in API filters?
7. Who can edit it, and who can read it?
```

The agent's answer:

```text
Only some of these were handled on purpose. The rest are what you get by default from following the existing pattern, and I haven't verified a few of them.

1. Plain text, with no maximum length. It's a Django TextField(blank=True, default="") in saleor/product/models.py. The GraphQL input is a plain String, and I added no length validation or whitespace cleaning on the backend. The dashboard uses a single-line Input. The storefront trims it and renders it as escaped text, not HTML. I didn't set a limit.
2. Not translatable. I didn't touch ProductTranslation, the translation mutations or the storefront translation query. The storefront shows the stored value in every language. Only the "Storage conditions" label is localized, in messages/*.json, and I wrote those eight translations myself.
3. Per product. The field is only on the Product model. Variants don't have it.
4. Only the storefront product page. It shows in the description accordion in product-attributes.tsx. I didn't touch cart, checkout, order emails or order lines, and I didn't check whether they could show it.
5. Existing products get an empty value. The migration adds the column with default="", so no data migration is needed. On the storefront an empty value shows nothing.
6. I didn't handle any of these.
   - Import/export: not checked or changed.
   - Webhook payloads: I didn't touch the serializer. The webhook tests I ran pass, but I never checked whether the field appears in payloads. The exploration suggested the product serializer lists specific fields, so it's probably not included.
   - API filters: no filter or where input was added.
7. No new access rules.
   - Edit: whoever can already run productCreate, productUpdate or productBulkCreate (the product management permission). In the dashboard that's the product update page.
   - Read: the field has no permission of its own, so anyone who can query the product can read it, the same as name or description. This follows from how the field is defined. I haven't tested it with a customer account.

I can add any of these if you want them. The ones I'd consider for the "done" definition are a length limit, translation support, and the webhook and export questions.

✻ Cooked for 10s · done 2:46 AM · 1 shell still running
```

## 6. Checks run on the result

A check not marked as failed passed. No check was run right after "done": the checks below were run at the end of the run, after the 3 follow-ups.

**"Done when" checks, run by the operator at the end of the run, after the follow-ups:**

| # | Check | Pass? | How checked (command / UI steps) | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | Staff can **set** it in the dashboard and it is saved | yes | Dashboard: set Storage conditions on Mighty Mug (`UHJvZHVjdDoxNTA=`) → Save → reload; public API query (check 3) | Value still there after reload; API returned `" Keep refrigerated at 2–8 °C."` |
| 2 | Staff can **edit** and **clear** it | yes | Dashboard: edited the value, then cleared it on Mighty Mug and Bean Juice → Save → reload; pasted a 251-character text ending in `Z`; API query after clearing | Edit saved; after clearing, API returned `"storageConditions":""` for both. The input stopped at 250 characters (`Z` dropped) |
| 3 | Stored in the backend, readable through the API | yes | `curl` public query `product(id:"UHJvZHVjdDoxNTA=", channel:"default-channel"){ id name storageConditions }`, no token, after saving a value in the dashboard | `{"id":"UHJvZHVjdDoxNTA=","name":"Mighty Mug","storageConditions":" Keep refrigerated at 2–8 °C."}`. Stored as entered: the leading space is kept, the backend doesn't trim. Second test: `    ok` saved as `"    ok"` (4 leading spaces kept) |
| 4 | Storefront shows it when set | yes | Set a value in the dashboard → opened the product page on the storefront | Shown as a "Storage conditions:" line in the description section, as expected |
| 5 | Storefront shows nothing extra when empty | yes | Cleared the value on both products → opened the storefront product page | No storage-conditions label or empty line on the page |
| 6 | Existing products open and work as before | yes | Opened existing products in the dashboard and on the storefront | Bean Juice, Mighty Mug, Pirate's Beanie and others load and work as before |
| 7 | Tests pass locally (backend + changed frontends) | yes | Commands above, run by the operator at T2 (zsh: backend with `pytest ${=TESTS}`) | Backend 12 changed/new test files: 763 passed, 10 warnings. Dashboard `--findRelatedTests`: 4845 passed, 8 skipped (701 suites passed, 1 skipped), 0 failed; jest warned a worker did not exit gracefully. Storefront `pnpm test:run`: 796 passed (128 files) |
| 8 | No manual cleanup needed (no junk files, no debug code) | no | `git status -s` in all 3 repos; searched the added lines of all 3 diffs for `print(`, `console.log`, `debugger`, `breakpoint(`, `pdb`, TODO/FIXME, `.only(`, skip/xfail; checked the workspace root | 79 changed files (saleor 26, dashboard 34, storefront 19), all task-related except `react-storefront/src/ui/components/pdp/variant-section-error.tsx` (unrelated class reorder from `prettier --write`; needs a manual revert). No debug code, junk files or workspace-root files |

**Dashboard type check, run after the run on the final code:**

- Dashboard type check (`pnpm run check-types`): passes.

## 7. Follow-ups after "done"

The follow-ups the operator sent after the first "done", in order, word for word. The code they asked for is in the diffs (final state), not in the code at "done".

1. **Operator:** `Storage conditions should be plain text with a maximum of 250 characters; empty is allowed.`
2. **Operator:** `It should be translatable the same way as the product name and description, and the storefront should show the translation when there is one.`
3. **Operator:** `It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export. No filter or search by this field is needed.`

## 8. Documents shown for approval

Plans and specs the agent showed the user and the user approved before the first "done". Not code.

`approved/plan.md`: the plan shown for approval before implementation (approved with "Yes, and bypass permissions").
