# Report: small-storage-conditions / claude-code / grill-with-docs

## Experiment info

- **Task:** add a "storage conditions" field to products (e.g. "Keep refrigerated at 2–8 °C"). Staff set it in the dashboard, customers see it in the product description on the storefront. Done = implemented end to end, tests in place, everything passes locally.
- **Method:** `/grill-with-docs` skill (grilling + domain-modeling). A design-tree interview (2 rounds of questions, user answered each, then explicit approval) came first. Implementation followed in three repos: `saleor`, `saleor-dashboard`, `react-storefront`.
- **Runner:** Claude Code (CLI), working directory `~/saleor-benchmark`. Backend commands ran inside the `saleor-benchmark-api` docker container.
- **Model:** Claude Sonnet 5.5 (`claude-sonnet-5-5`).
- **Start time:** about 11:35 CEST on 2026-10-20. This is an estimate; the start was not recorded. The first timestamped command (migration generation) ran at 11:50 CEST.
- **End time (diff export):** 2026-10-20 12:43 CEST.
- **Nothing was committed.** `git add -N .` was run in each repo, as requested, to include new files in the diff.

## Actions performed

| # | Action | Done | Evidence |
|---|--------|------|----------|
| 1 | Explored the codebase and looked up facts before asking questions | yes | `ls`, `grep` on the three repos; found the dashboard `CONTEXT.md`, the ADRs, the product model, and the storefront extension mechanism |
| 2 | Interviewed the user (grilling), then got approval | yes | 2 rounds of numbered questions (Q1–Q14); summary of the design; the user approved |
| 3 | Updated documentation: glossary | yes | `saleor-dashboard/CONTEXT.md` has a new "Storage conditions" term, written right after the terms were resolved |
| 4 | Wrote the backend code | yes | `saleor`: model field and migration `0211_product_storage_conditions.py`, GraphQL type and inputs, create/update/bulk cleaning, translate and bulk-translate, webhook payload, CSV export |
| 5 | Wrote the dashboard code | yes | `saleor-dashboard`: input in `ProductDetailsForm`, form data/types, update handler, fragments, translation page and mutation, message strings |
| 6 | Wrote the storefront code | yes | `react-storefront`: extension fragment, `mapProductExtensions`, `storage-conditions.tsx`, `ProductAttributes`, template provider, 8 locale files |
| 7 | Regenerated generated artifacts | yes | `saleor/graphql/schema.graphql` via `manage.py get_graphql_schema`; dashboard schemas and `graphql-codegen` (main and staging); storefront `graphql-codegen`; `formatjs extract` for `locale/defaultMessages.json` |
| 8 | Wrote tests | yes | Backend: create, update, bulk create, translate, bulk translate, webhook payload, CSV export. Dashboard: update form hook, mutation variables, form data, translation field, input component. Storefront: mapper, display component, all four PDP templates |
| 9 | Ran tests | yes | pytest in the container, `jest`, `vitest run` |
| 10 | Ran tests multiple times | yes | Backend ran 5 times (partial runs, then full runs of 5,275 → 14,391 tests). Dashboard and storefront were run repeatedly as fixes were made |
| 11 | Fixed failures found by the tests | yes | Found and fixed: a `max_length` error code that is not a valid API enum value (create/update, bulk create, bulk translate); a missing test import; test fixtures missing the new field; the existing CSV test's expected rows; dashboard schema-validation test (staging schema) |
| 12 | Ran tests in a different order or in isolation | partly | Targeted runs with `-k` and single files were done, plus `pytest -n` parallel runs (xdist, which varies order). No explicit random-order run |
| 13 | Ran linters, formatters and type checks | yes | `ruff check` and `ruff format`, `mypy`, `makemigrations --check` (no changes); `tsc --noEmit` and `eslint` (0 errors) in both frontends; storefront `paper-core-lock`, `data-layer-lock` and design-token checks |
| 14 | Reviewed the code | partly | Self-review through diffs and the screenshots. No separate review tool or `/code-review` skill was run |
| 15 | Started or used the application | yes | The local docker API and the Next.js storefront and dashboard dev servers were already running. Used them via `curl`, GraphQL calls and a headless Chrome |
| 16 | Checked the API | yes | `tokenCreate`, `productUpdate` (trimmed value), `productTranslate`, and a 251-character value returned `INVALID`; `product { storageConditions }` read back |
| 17 | Checked the UI in a browser | yes | Playwright with system Chrome: dashboard login, field loaded with its value and `maxlength=250`, saved through the UI and read back via API; storefront block present at `/en/default-channel/products/apple-juice` |
| 18 | Took screenshots of the result | yes | Storefront: block inside the Description section. Dashboard: field under the description with counter (saved in the session scratchpad: `pdp-block.png`, `dash-edit.png`) |
| 19 | Cleaned up leftovers | yes | Restored the demo product (value cleared, Polish translation row deleted via SQL); removed `schema-staging.graphql.orig`, the temp patch, `/tmp/backend_full.txt`, the container's `/tmp/schema.graphql` and the API token file |
| 20 | Updated changelogs | yes | `saleor/CHANGELOG.md` (feature entry and a breaking-changes entry); `saleor-dashboard/.changeset/product-storage-conditions.md` |
| 21 | Verified the Polish translated page in a browser | no | The running stack only serves `en`, and a second dev server was refused by Next. Covered by unit tests and an API translation check instead |
| 22 | Ran Playwright e2e tests | no | Out of scope as agreed with the user |
| 23 | Committed or pushed | no | Not done, per repo rules and the request |

## Known issues and notes

- Two dashboard test suites (`NavigatorSearch/Actions`, `SearchActionsList`) fail on this machine's Node 20 (`Object.groupBy` is not a function). They pass on Node 24 (6 suites, 48 tests). They don't touch this change.
- `pnpm` does not run on the installed Node version, so the underlying binaries (`graphql-codegen`, `jest`, `eslint`, `tsc`, `formatjs`, `vitest`) were called directly instead of the `pnpm` scripts.
- The storefront `docs:check` reports 4 stale references to a missing `skills/` folder. They predate this change.
- Breaking API change: `productTranslate` and `productBulkTranslate` now take `ProductTranslationInput` instead of `TranslationInput`. It is recorded in the changelog.
- The storage conditions value is shown only on the product page. Cart, checkout, order emails, list cards and SEO text are not covered.
- Diffs: `saleor.diff` (24 files, +919/−11), `saleor-dashboard.diff` (33 files, +762/−46), `react-storefront.diff` (15 files, +297/−29). The dashboard diff includes regenerated GraphQL files.
