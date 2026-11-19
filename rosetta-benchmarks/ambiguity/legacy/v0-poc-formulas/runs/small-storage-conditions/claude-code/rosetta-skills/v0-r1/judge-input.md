# Judge input: S-CC-08-v0-r1

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

1. **Agent:** Four questions in one round:
  1. How to store it in the core (new Product field / attribute / metadata)?
  2. Value type and max length (plain text 250 / plain text unlimited / rich text)?
  3. Translatable? (no, out of scope / yes)
  4. Where customers see it on the storefront (labelled line under the description / appended to the description / attributes table)?
   **Operator:** 1: `A first-class nullable field on Product.`
  2: `Plain text, one optional field, max 250 characters. Empty is allowed.`
  3: `Yes. It is translatable the same way as the product name and description. The storefront shows the translation when there is one.`
  4: `Only on the storefront product page, in the product description area. Not in cart, checkout or order emails.`

2. **Agent:** The agent confirmed the 4 answers and wrote a draft brief (saleor: Product and ProductTranslation field, migration, create/update inputs, translate mutation; dashboard: input on create/update pages and translations page; storefront: labelled line under the description). Out of scope per the agent: cart, checkout, order emails, search indexing, webhook payload changes beyond the generated schema, Playwright e2e. It asked: (1) does "everything passes locally" include e2e? (recommended: unit/API tests, lint, typecheck, codegen), (2) approve the brief.
   **Operator:** `Unit tests and linters in all three repos, plus a manual check on the local stack. No Playwright e2e tests.`
  `Yes, I approve`

3. **Agent:** The agent wrote the tech spec (`plans/PRODUCT-STORAGE-CONDITIONS/PRODUCT-STORAGE-CONDITIONS-SPECS.md`) and asked to confirm 3 assumptions: (A1) refreshing the pinned dashboard schema from the local API changes a tracked file, OK? (A2) may the local API be restarted to apply the migration? (A3) storefront label location, to be confirmed during implementation.
   **Operator:** One message (the answers to A1–A3 are its last part):
  `Improvements you may want, optional:`
  `- Contradiction on HTML (§6 vs §8): §6 says "no HTML allowed (reject/strip)", but §8 stores <img src=x onerror=…> as text and renders it escaped. Stripping could silently change text like "Store < 8 °C". A plain-text field that is stored as-is and escaped on render would be safer.`
  `- Translation input: §4 shows TranslationInput # product: ProductTranslationInput, which is unclear. Extra answer 11 says to use the shared TranslationInput with no breaking change to productTranslate. The agent didn't ask, so I left it alone.`
  `It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export. No filter or search by this field is needed.`
  `On your assumptions: 1. Yes, refreshing the dashboard schema from the local API is fine, even if it changes a tracked file. 2. Yes, you may restart the local API to apply the migration. 3. Confirm during implementation.`

4. **Agent:** The agent asked how to add `storageConditions` to the translate input (shared `TranslationInput` + reject elsewhere / new `ProductTranslationInput` / shared and silently ignored).
   **Operator:** `The shared TranslationInput. No breaking change to productTranslate.`

5. **Agent:** The agent updated the tech spec (webhooks `PRODUCT_FIELDS` and CSV export added; HTML/whitespace handling changed to "store as submitted, no trimming in the core"; translation input = shared `TranslationInput`) and asked: should `categoryTranslate` and `collectionTranslate` reject or ignore the field? It also asked for approval of the tech spec.
   **Operator:** `Yes, reject it: categoryTranslate and collectionTranslate must return an INVALID error if storageConditions is set.`
  `Yes, I approve`

6. **Agent:** The agent wrote the execution plan (4 sessions: core, dashboard, storefront, manual check and docs; gates G1 plan, G2 after core, G3 after clients, G4 final acceptance) and asked for approval to start implementation.
   **Operator:** `Yes, I approve`
  `run all sessions autonomously: don't stop until fully completed`

## 4. The agent's "done" message

Short form from the run's timeline; the message itself was not recorded.

```text
The agent reported: core (field, migration, translation, webhook, CSV, bulk), dashboard (input on the product update page and the translations page), storefront (labelled line on the product page, 8 locales). Tests: core 32 new + 5169 regression, dashboard 931 suites, storefront 808 tests; manual check on the local stack. It asks for the final acceptance (`Yes, I approve the delivery`). The agent had put the field on the update page and the translations page and reported the missing create page as a deviation. Deviations reported by the agent: schema patched by hand (50 lines) instead of `fetch-local-schema`; bulk create uses MAX_LENGTH; a bulk translate crash fix that changes other fields' error codes. Not checked by hand: a real CSV export, the PL storefront page.
```

## 5. The later check of what it had handled

Questions sent:

```text
Don't change any code, just answer: was each of these handled, and where? 1. Is the storage conditions value set per product or per variant? 2. Existing products: what value do they get after the change, and is a data migration needed for them? 3. Who can edit it, and who can read it?
```

The agent's answer:

not recorded

## 6. Checks run on the result

A check not marked as failed passed. No check was run right after "done": the checks below were run at the end of the run, after three extra requests from the operator that were not follow-ups on the agent's result: the field on the dashboard's product-create dialog (added after "done"), a real CSV export on the local stack, and a look at the Polish storefront page.

**"Done when" checks, run by the operator at the end of the run:**

| # | Check | Pass? | How checked (command / UI steps) | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | Staff can **set** it in the dashboard and it is saved | yes | Operator, dashboard UI: typed a value in "Storage conditions" on a product and saved | Operator confirmed |
| 2 | Staff can **edit** and **clear** it | yes | Operator, dashboard UI: edited the value, then cleared it, saved each time | Operator confirmed |
| 3 | Stored in the backend, readable through the API | yes | Operator, API: `products { storageConditions }` query on `localhost:8000/graphql/` | Operator confirmed |
| 4 | Storefront shows it when set | yes | Operator, storefront product page on `localhost:3000` | Operator confirmed: the "Storage conditions: …" line shows under the description |
| 5 | Storefront shows nothing extra when empty | yes | Operator, storefront product page after clearing the value | Operator confirmed: nothing shown when empty |
| 6 | Existing products open and work as before | yes | Operator opened existing, untouched products in the dashboard and on the storefront | Operator confirmed |
| 7 | Tests pass locally (backend + changed frontends) | yes | Operator ran the tests. Counts reported by the agent (not re-counted by the operator): core 32 new + 5169 regression passed, dashboard 931 suites, storefront 808 tests | Operator confirmed they pass |
| 8 | No manual cleanup needed (no junk files, no debug code) | yes | Operator reviewed `git status` and `git diff` in the 3 repos | Operator confirmed: all changed files are the proper files; nothing committed (HEAD still the init commit) |

**Dashboard type check, run after the run on the final code:**

- Dashboard type check (`pnpm run check-types`): fails (`messages.ts(107,39)`: TS7053, implicit `any` when indexing by `ProductFieldEnum`; `ProductDetailsForm.test.tsx(48,17)`: TS2322, `null` not assignable to `OutputData`).

## 7. Follow-ups after "done"

none

## 8. Documents shown for approval

Plans and specs the agent showed the user and the user approved before the first "done". Not code.

`approved/PRODUCT-STORAGE-CONDITIONS-SPECS.md` (the tech spec), `approved/PRODUCT-STORAGE-CONDITIONS-PLAN.md` and `approved/01-plan-core.md` to `approved/04-plan-verify.md` (the execution plan), as saved at the end of the run.
