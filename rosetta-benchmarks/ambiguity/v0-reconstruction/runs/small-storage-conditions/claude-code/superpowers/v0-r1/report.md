---
run_id: S-CC-03-v0-r1
poc_schema: ambiguity-poc/v2
prompt_version: v0
repeat: 1
t1_items: 1,1,1,1,1,1,1,0,1,1,1,0,1,1,1
---

# S-CC-03-v0-r1: v0 reconstruction

Reused Saleor run, rebuilt for the current formulas (see ../../../../README.md). Source: `legacy/v0-poc-formulas/runs/small-storage-conditions/claude-code/superpowers/v0-r1/judge-input.md`.

## Checklist items at the first "done" (reconstructed)

Checks at the end, after 1 follow-up (webhooks + CSV export). Operator: 7 of 8 checks passed; the failing one was not recorded. The Saleor report (section 8, 'Why not 5') names the error in the final code: translations still shown after the value is removed. The follow-up did not touch translation, so that error was there at the first "done".

| Item | At "done" | Evidence |
| ---: | --- | --- |
| 1 | pass | Saleor report hidden row 1: CharField on Product |
| 2 | pass | §6: 7 of 8 checks passed; the error found concerns translations only |
| 3 | pass | §5: dashboard product page |
| 4 | pass | §5: storefront product description section |
| 5 | pass | §5: 250 limit tested on productCreate, productUpdate, productTranslate, productBulkTranslate |
| 6 | pass | §5: plain text CharField(250) |
| 7 | pass | §5: plain text, up to 250, optional |
| 8 | fail | Saleor report section 8 'Why not 5': translations still shown after the value is removed. The operator did not record which item; mapped here to item 8 (translation behaviour). If mapped to item 7 instead, Trust and pass rate do not change: item 7 is not flagged by a majority either. |
| 9 | pass | §5: product level only |
| 10 | pass | §5: storefront product description only |
| 11 | pass | §5: nullable columns, no backfill |
| 12 | fail | §5: product webhook payload and CSV export do not include it 'by omission'; §7 follow-up 1 |
| 13 | pass | §5: MANAGE_PRODUCTS for create and update; public read |
| 14 | pass | §6: check 6 among the 7 passed (the failing check concerns translations) |
| 15 | pass | §6: check 7 tests pass; type check on final code passes |

## Appendix B

<details><summary>Answer at stop 1 (proxy: the requirements document approved before coding; no stop-1 question in this run)</summary>

Source: `saleor/runs/small-storage-conditions/claude-code/superpowers/workspace-root/docs/superpowers/specs/2026-10-19-product-storage-conditions-design.md (the design spec approved before coding)`. Written as a quote block (each line starts with `> `) and inner code fences as ~~~, so the scoring script reads the whole document; the script removes the `> ` before it counts.

> # Product "storage conditions" field — design
>
> ## Goal
> Products get an optional "storage conditions" text (e.g. "Keep refrigerated at 2–8 °C").
> Staff set it on a product in the dashboard; customers see it in the product description on the storefront.
> The field is translatable like product `name`/`description`; the storefront shows the translation when one exists.
>
> Done = implemented end to end across `saleor`, `saleor-dashboard`, `react-storefront`, with tests, and all relevant tests/linters passing locally. Per repo rules: follow existing patterns, no new dependencies, no commits or pushes (changes stay in the working tree).
>
> ## Decisions
> - Optional short plain text, product level (not variant). `CharField(max_length=250)`, nullable/blank, like `name`.
> - Translatable via `ProductTranslation.storage_conditions`.
> - Approach: first-class field on `Product` and `ProductTranslation` (not metadata/attributes).
>
> ## Backend (`saleor`)
> - `Product.storage_conditions` and `ProductTranslation.storage_conditions`; migration `0211`; add to `ProductTranslation.get_translated_keys`.
> - GraphQL: `Product.storageConditions`, `ProductTranslation.storageConditions`, `ProductInput` (create/update), translation inputs (`productTranslate`, `productBulkTranslate`). Translated read through `translation(languageCode:)` as for `name`.
> - Regenerate `schema.graphql`; add CHANGELOG entry if the repo convention requires it.
> - Tests: model/translated keys, create/update mutations, translate and bulk-translate mutations, type resolution.
>
> ## Dashboard (`saleor-dashboard`)
> - Regenerate schema/types (`generate:main`).
> - `ProductDetailsForm`: "Storage conditions" text input under description; wired into form data, create/update payloads, product fragment/query, error display.
> - `TranslationsProductsPage`: short-text row next to name; translation query/fragment and `productTranslate` payload.
> - Tests: form payload, translation payload, `ProductDetailsForm` render/change.
>
> ## Storefront (`react-storefront`)
> - `ProductDetails.graphql`: `storageConditions` at top level and inside `translation(languageCode:)`; run `generate`.
> - Resolve translation-first, fall back to base, hide when both empty (same pattern as name/description).
> - Render a labelled "Storage conditions" block under the description only when a value exists; new i18n message added to all locale files.
> - Tests: resolution (translated / fallback / empty), component render/hide; check existing e2e specs for impact.
>
> ## Verification
> - Backend: apply migration, pytest for product/translations/schema subsets, ruff.
> - Dashboard: Jest, `tsc`, eslint.
> - Storefront: unit tests, `tsc`, lint.

</details>

<details><summary>Answer at stop 2 (proxy: the agent's "done" message; no stop-2 question in this run)</summary>

The agent's message was not recorded word for word; below is the short summary of it that was recorded.

```text
Agent's first "done". Caveats: no `productBulkCreate` test, whitespace-only stored as sent.
```

</details>
