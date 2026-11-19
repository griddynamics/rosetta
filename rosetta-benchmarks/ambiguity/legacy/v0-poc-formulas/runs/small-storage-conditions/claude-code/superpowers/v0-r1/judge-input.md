# Judge input: S-CC-03-v0-r1

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

1. **Agent:** The agent stated its assumptions (plain text, optional, product level) and asked: translatable? (A untranslated / B translatable)
   **Operator:** `Yes. It is translatable the same way as the product name and description. The storefront shows the translation when there is one.`

2. **Agent:** Backend design (part 1 of 3): the agent asked "does this look right" (it chose CharField(250)).
   **Operator:** `Approved, continue.`

3. **Agent:** Dashboard and storefront design (parts 2 and 3).
   **Operator:** `Approved, continue.`

4. **Agent:** Spec written to the workspace root; spec review.
   **Operator:** `Approved, continue.`

5. **Agent:** Plan written; the agent asked: subagent-driven or native execution (it recommended native).
   **Operator:** `use your recommendation`

## 4. The agent's "done" message

Short form from the run's timeline; the message itself was not recorded.

```text
Agent's first "done". Caveats: no `productBulkCreate` test, whitespace-only stored as sent.
```

## 5. The later check of what it had handled

Questions sent:

```text
Don't change any code, just answer: was each of these handled, and where? 1. Plain text or rich text? Maximum length? 2. Product level or variant level? 3. Where is it shown? (cart, checkout, order emails, storefront product page, ...) 4. What happens to existing products? 5. Import/export, webhooks, API filters? 6. Who can edit it, and who can read it?
```

The agent's answer:

```text
Three of these were handled, either as assumptions I stated or by inheriting existing behaviour. Three were not decided at all, and I should have raised them.

1. Plain text or rich text? Maximum length? Handled.
- It's plain text, up to 250 characters, a CharField(250) like product name. This was one of the assumptions I wrote back before the design, and you didn't contradict it.
- The 250-character limit is tested on productCreate, productUpdate, productTranslate and productBulkTranslate. All four return an INVALID validation error.
- The dashboard shows it as a single-line input.

2. Product level or variant level? Handled, as a stated assumption.
- It's product level only. The field is on Product and ProductTranslation, with nothing on variants.

3. Where is it shown? Only partly.
- It appears in the storefront product description section and in the dashboard product and translations pages.
- It does not appear in the cart, checkout, order lines, order emails, listing cards, search results or SEO and JSON-LD data.
- You only asked for the product description, so I stopped there and never asked about the rest. For refrigerated goods you may want it in the cart or on order confirmations, so that's worth a decision from you.

4. What happens to existing products? Handled implicitly, not discussed.
- The migration adds two nullable columns and doesn't backfill. Existing products have no value, the storefront hides the block, and the dashboard shows an empty input.
- I applied the migration to the local dev database and checked an existing product there.
- I haven't tested it against a large table. A nullable column with no default should be a quick change on Postgres.

5. Import/export, webhooks, API filters? Mostly not decided.
- Translation webhooks: the translation created and updated payloads include the field, through get_translated_keys.
- Product webhooks and CSV export: the legacy product webhook payload and the CSV export don't include it, the same as the SEO fields. That happened by omission, not by a decision. If integrations or merchants need it, it has to be added.
- Filters and search: there's no filter, sort or search on it.
- productBulkCreate: the reviewer says it inherits the field and reports the length error correctly. I haven't tested it, and I haven't checked productBulkUpdate.

6. Who can edit it, and who can read it? Inherited, with no new permissions.
- Edit: it uses the existing permissions. MANAGE_PRODUCTS covers create and update, and MANAGE_TRANSLATIONS covers productTranslate and productBulkTranslate. The tests run with those permissions.
- Read: Product.storageConditions is a plain field like name and description, so anyone who can query the product can read it, including anonymous storefront visitors. The live storefront check confirmed that.
- Translation management: the translatable-content query (translation(kind: PRODUCT)) requires MANAGE_TRANSLATIONS, which is the existing behaviour.
- I added no field-level permission and no explicit test for anonymous reads.
```

## 6. Checks run on the result

A check not marked as failed passed. No check was run right after "done": the checks below were run at the end of the run, after 1 follow-up.

**"Done when" checks, run by the operator at the end of the run, after the follow-up:** 7 of 8 checks passed, 1 did not pass. Which check failed was not recorded. Check 7 (tests pass locally, backend + changed frontends): passed.

| # | Check |
| ---: | --- |
| 1 | Staff can **set** it in the dashboard and it is saved |
| 2 | Staff can **edit** and **clear** it |
| 3 | Stored in the backend, readable through the API |
| 4 | Storefront shows it when set |
| 5 | Storefront shows nothing extra when empty |
| 6 | Existing products open and work as before |
| 7 | Tests pass locally (backend + changed frontends) |
| 8 | No manual cleanup needed (no junk files, no debug code) |

**Dashboard type check, run after the run on the final code:**

- Dashboard type check (`pnpm run check-types`): passes.

## 7. Follow-ups after "done"

The follow-ups the operator sent after the first "done", in order, word for word. The code they asked for is in the diffs (final state), not in the code at "done".

1. **Operator:** `It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export. No filter or search by this field is needed.`
2. **Agent:** "Does that match what you mean by included in the CSV export?"
   **Operator:** `Yes, implement it`

## 8. Documents shown for approval

Plans and specs the agent showed the user and the user approved before the first "done". Not code.

`approved/2026-10-19-product-storage-conditions-design.md` (the spec) and `approved/2026-10-19-product-storage-conditions.md` (the plan), as saved at the end of the run.
