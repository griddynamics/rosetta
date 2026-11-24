# Task 1 (small): product storage conditions — judge inputs

Copied word for word from rosetta-benchmarks/BENCHMARKS.md, section 4 (Task 1), at the current commit. Extra answers: rows 1 to 38 (all rows of the table at this commit); the "First asked in" column is left out.

**Starter Prompt:**

```text
Products need a "storage conditions" field (e.g. "Keep refrigerated at 2–8 °C").
Staff should be able to set it on a product in the dashboard, and customers should see it in the product description on the storefront.

Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally.
```

**Done when** (evaluator only): staff can set, edit and clear it in the dashboard; it is stored and exposed through the API; the storefront shows it when set and nothing extra when empty; existing products keep working; tests pass.

**Hidden questions** (evaluator only; never in the prompt, the AI must not know about them). The answer is the product decision: the programmer gives exactly this answer when the agent asks, and the judge checks the code against it.

| # | Question | Answer |
| ---: | --- | --- |
| 1 | Plain text or rich text? Maximum length? | Plain text, one optional field, max 250 characters. Empty is allowed. |
| 2 | Translatable, like other product texts? | Yes. It is translatable the same way as the product name and description. The storefront shows the translation when there is one. |
| 3 | Product level or variant level? | Product level. All variants share one value. |
| 4 | Where is it shown? | Only on the storefront product page, in the product description area. Not in cart, checkout or order emails. |
| 5 | Existing products? | Empty by default. A schema migration only; no data migration or backfill. Products without it look and work exactly as before. |
| 6 | Import/export, webhooks, API filters? | It is part of the product in the API, so it appears in product webhook payloads, and it is included in product CSV export. No filter or search by this field is needed. |
| 7 | Who can edit it? | Staff with the `MANAGE_PRODUCTS` permission, same as other product fields. Anyone can read it through the public product API. |

**Task 1 (small): extra answers**

| # | Question | Answer |
| ---: | --- | --- |
| 1 | Where does the value live: a real field on Product, or metadata / an attribute? | A first-class nullable field on Product. |
| 2 | How is it shown on the storefront: a separate block, or inside the description HTML? | A separate labelled block after the description, hidden when empty. |
| 3 | Name of the field? | `storageConditions` in the API, "Storage conditions" in the UI. |
| 4 | What does "everything passes locally" include? E2E tests? | Unit tests and linters in all three repos, plus a manual check on the local stack. No Playwright e2e tests. |
| 5 | Where is the 250-character limit enforced (DB column, API validation, dashboard input, translation)? | Everywhere: 250 in the column, the API validation and the dashboard input; the translation uses the same limit. |
| 6 | Whitespace-only input: store as empty? | Yes. Trim it, and treat a blank result as empty. |
| 7 | Where does the input go in the dashboard product page? | In the General Information card, under the description. |
| 8 | Empty or missing translation: fall back to the base value? | Yes. An empty or missing translation falls back to the base value. |
| 9 | Settable at product creation? CSV import? | Include it in create, update and the translation mutation. Import is out of scope. (Export and webhooks: hidden question 6.) |
| 10 | ADR? Changelog? | No ADR. Add a short CHANGELOG entry and regenerate the schema where needed. |
| 11 | Translation API: add the field to the shared `TranslationInput`, or a new product-only input (breaking for existing `productTranslate` callers)? | The shared `TranslationInput`. No breaking change to `productTranslate`. |
| 12 | May the storefront product page (`page.tsx`) be edited to place the block? | Yes. |
| 13 | May the migration be applied to the local Docker dev database? | Yes, the local dev database only. |
| 14 | May the agent write test data to the local dev database during validation (with snapshot and restore)? | Yes, with a snapshot first and a full restore after. |
| 15 | Should validation use a browser tool on the dashboard and storefront? | Only if one is available without new credentials; otherwise automated tests and API checks. |
| 16 | May the implementation step add the new field to existing dashboard test fixtures and typed test literals (so typecheck passes)? | Yes, the field only, no new assertions. |
| 17 | Optional extras: count the field in the dashboard translation progress? Edit `.stories.tsx` files? | Count it in the translation progress. No stories edits. |
| 18 | Preserve newlines typed into the field on the storefront (e.g. `whitespace-pre-line`)? | No. Plain text; newlines are not preserved. |
| 19 | Note, not a hidden question: if it asks which dashboard screens must let staff set the field. The dashboard has no routed product create page: `/products/add` redirects to a "create product" dialog on the product list. | The product update page and the create-product dialog on the product list (that dialog is the create flow). |
| 20 | Should staff edit translations on the dashboard's product translation page? | Yes. Staff translate it on the product translations page in the dashboard, the same way as the product name and description. |
| 21 | Run the local tests and refresh the schemas against the local stack? Is refreshing the dashboard schema from the local API OK even if it changes a tracked file? | Yes, run against the local stack. Regenerate the schema where needed, and refresh the dashboard schema from the local API; the tracked schema file may change. The local dev database only. |
| 22 | May the local API be restarted to apply the migration? | Yes, you may restart the local API to apply the migration. |
| 23 | `categoryTranslate` and `collectionTranslate` share `TranslationInput`: reject the field or ignore it there? | Reject it: they must return an INVALID error if `storageConditions` is set. |
| 24 | May it enable the `pl` locale in the local storefront config and restart the dev server, to show a real Polish page? | No. Don't change the local config or restart anything; the evidence shown is enough. |
| 25 | How should the dashboard behave on the staging schema (keep `@lockSchema` on reads only, hide the field on staging builds, or remove `@lockSchema`)? | Keep `@lockSchema` on reads only. The target is the main (3.23) build; the staging schema doesn't matter for this task. |
| 26 | May it install `libmagic` with Homebrew on the host machine (the API or the backend tests do not run without it)? | Yes, installing libmagic is fine. (It should already be installed in advance, see section 3.1.) |
| 27 | What business problem should the storage-conditions field solve? (Intent capture, 1 of 2; no table row; operator decision.) | Both staff accuracy and customer decision-making: staff can communicate handling requirements accurately, and customers can decide whether a product suits their storage capabilities. |
| 28 | Who is the primary customer and what is their pain point? (Intent capture, 1 of 2; no table row; operator decision.) | Both groups: staff need to publish storage guidance, and customers need to read it before buying. |
| 29 | What measurable outcome should define success for the initial release? (Intent capture, 1 of 2; no table row; operator decision.) | Staff can save storage conditions on a product and customers can view them. |
| 30 | What triggered this initiative now? (Intent capture, 1 of 2; no table row; operator decision.) | Not yet defined. |
| 31 | Which stakeholders should be represented for this work? (Intent capture, 2 of 2; no table row; operator decision.) | Product owner and engineering team. |
| 32 | Who makes the final scope decision, and who influences it? (Intent capture, 2 of 2; no table row; operator decision.) | Product owner decides; engineering advises. |
| 33 | Are there communication or reporting requirements while this work proceeds? (Intent capture, 2 of 2; no table row; operator decision.) | None. |
| 34 | Does the workflow-selected feature boundary match the intended work? (Intent capture, 2 of 2; no table row; operator decision.) | Yes; deliver the end-to-end staff-entry and storefront-display capability. |
| 35 | Which products should support storage conditions? (Intent capture round 2 for the rerun, Q1 of 4; no table row; operator decision.) | All product types. |
| 36 | How should the open assumptions be handled (storefront block label, product owner for scope and priority, reporting cadence)? (Intent capture round 2, assumption confirmation; no table row; no recommended option; operator decision. Under review by the team: section 4 says an assumption the agent asks to confirm counts as its proposal.) | Accept assumptions: keep these as open items in the artifacts. |
| 37 | The Rosetta discoverer subagent could not start because its requested model (GPT-6 Luna) is not available. May it retry with GPT-5.6 Terra, the session model, and continue discovery? (Menu: "Approve retry with GPT-5.6 Terra" / "Choose another available model" / "Stop this task" / Other; no "(Recommended)" mark; the agent's own proposal and first option; no table row.) | Yes, retry the discovery subagent with GPT-5.6 Terra (the session model) and continue. Select the first option, "Approve retry with GPT-5.6 Terra". |
| 38 | Discovery is blocked: the agent assumed the source root `saleor/product`, but the repository uses a different one. Approve a corrected read-only discovery pass that first locates the source roots? (Menu: "Approve corrected read-only discovery" / "Stop the task" / "Provide source-root guidance" / Other; the agent says "I recommend" the corrected pass and "select the first option"; no table row.) | Yes, approve the corrected read-only discovery pass: first locate the source roots, then map the exact end-to-end implementation. No files are changed. Select the first option, "Approve corrected read-only discovery". |
