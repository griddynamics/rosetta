# Agent report: product "storage conditions" field

## Experiment info
| Item | Value |
|---|---|
| Task | Add an optional "storage conditions" field to products: staff set it in the dashboard (product create flow and product update page), customers see it in the product description on the storefront. Done = implemented end to end, tests in place, everything passes locally. Required skills: hitl, tech-specs. |
| Method | Rosetta workflow with human-in-the-loop gates: discovery, questions, brief approval, tech spec (approved), execution plan (approved), then sessions 01 core, 02 dashboard, 03 storefront, 04 manual check and docs. Follow-up requests from the user: field also in the create flow, real CSV export check, Polish storefront check. Spec, plan and handoff are in `plans/PRODUCT-STORAGE-CONDITIONS/`. |
| Runner | Claude Code CLI (Rosetta plugin core-claude), macOS, repos side by side in `~/saleor-benchmark` (`saleor`, `saleor-dashboard`, `react-storefront`) |
| Model | Claude Sonnet 5.5 (`claude-sonnet-5-5`) |
| Start time | Not recorded. The earliest artifact written is `plans/.../PRODUCT-STORAGE-CONDITIONS-SPECS.md` at 2026-10-21 12:57:19 EDT. |
| End time | 2026-10-21 15:14 EDT (diffs saved) |
| Commits | None. `git add -N .` was run in the three repos only to produce these diffs. |

Diffs (after `git add -N .` and `git diff`): `run-output/saleor.diff` (22 files, +882/-4), `run-output/saleor-dashboard.diff` (37 files, +726/-13, includes regenerated GraphQL files and the schema patch), `run-output/react-storefront.diff` (17 files, +157/-4).
Not in the diffs: changes at the workspace root, which is not a git repo: `plans/PRODUCT-STORAGE-CONDITIONS/*`, `agents/IMPLEMENTATION.md`, `agents/MEMORY.md`.

## Actions performed
| Action | Done | Evidence |
|---|---|---|
| Wrote code | yes | Core: `Product.storage_conditions` and `ProductTranslation.storage_conditions`, migration `0211_product_storage_conditions`, GraphQL types and inputs, shared `TranslationInput`, category/collection translate rejection, bulk create/translate, webhook `PRODUCT_FIELDS`, CSV export column, CHANGELOG. Dashboard: create dialog, product form, translations page, fragments, schema patch, changeset. Storefront: extension fragment, `mapProductExtensions`, `ProductStorageConditions`, 8 locale labels. See `run-output/*.diff`. |
| Reviewed the code | partial | Self-review only: diff inspection, a per-type comparison of the dashboard schema against the core schema (found and fixed one misapplied hunk), ruff, mypy, tsc, eslint, prettier. No separate reviewer agent and no `/code-review` run. |
| Wrote tests | yes | Core: `test_product_storage_conditions.py`, `test_product_storage_conditions_translate.py`, plus webhook, CSV and prepare-headers tests. Dashboard: `ProductDetailsForm.test.tsx`, `translationSectionBuilders.test.ts`, `CreateProductDialog` tests (incl. staging schema), `createMinimalProduct` tests, handler/data/translation util tests. Storefront: `storefront-view.test.ts`, `product-storage-conditions.test.ts`. |
| Ran tests | yes | Core: new tests 32 passed. Wide regression (graphql/product, product, translations, webhook, graphql/webhook, graphql/core, csv, core): 5169 passed, 1 skipped. Dashboard: full Jest passed with `-w 2` (932 suites, 6154 tests). Storefront: `vitest run` 129 files, 808 tests passed. Lint: ruff, mypy, `makemigrations --check`, eslint (0 errors), prettier, changeset lint, storefront design-token, GraphQL-variants and lock checks. |
| Ran tests multiple times | yes | Core test files re-run after fixes (bulk-translate error code, category null input, bulk policy). Dashboard full Jest run 5 times. Four of those full runs failed 2 to 4 unrelated suites; they pass alone and the `-w 2` run passed all. |
| Ran tests in a different order | no | No deliberate reordering or randomised order. Parallel workers (xdist, Jest workers) vary order implicitly only. |
| Cleaned up leftovers | partial | Done: test values on Apple Juice reverted, "ZZ Storage Test" product deleted, test export file and its DB rows deleted, `saleor/media` removed, token files deleted. Left behind: scratch files in the session scratchpad dir, a few HTML dumps in `/tmp` (`pg_*.html`, `pl_pln.html`, `en.html`, `p.html`), `/tmp/run_export.py` in the dev container, and a git-ignored `saleor/.venv` created by `uv run` on the host. |
| Updated documentation | yes | `saleor/docs/CATALOG-CONTEXT.md`, `saleor-dashboard/docs/CONTEXT.md`, `react-storefront/docs/CONTEXT.md`, each repo's `agents/IMPLEMENTATION.md`, workspace `agents/IMPLEMENTATION.md` and `agents/MEMORY.md`, `saleor/CHANGELOG.md`, dashboard changeset, spec section 13, `plans/.../HANDOFF.md`. |
| Started the application | no | The API, dashboard and storefront were already running. I did not start or restart anything. The API container auto-reloads on code changes. I applied the migration with `migrate product` in the dev container. Tests and migration commands ran in that container because the host lacks `libmagic`. |
| Checked the API | yes | Token via `tokenCreate` with the documented dev admin login. Set, cleared, over-long (251 chars gives `INVALID`) and PL translation values on Apple Juice. Category translate rejection. Live introspection shows `storageConditions` on `Product`. |
| Took a screenshot of the final result | yes | Playwright screenshots saved in the session scratchpad: `pdp.png` (storefront line under the description), `dash.png` (product page input), `create.png` (create dialog with the field), `tr.png` (translations page), `pl-default.png` and `pl-pln.png`. |

## Other checks and limits
- Real product CSV export: queued through the API, stayed `PENDING` because the local stack has no Celery worker. I then ran `export_products_task` directly. The file had the header `storage conditions` and the correct values (value for the product that has one, empty cell for the one that does not).
- Dashboard UI on the live stack: create dialog, edit and save on the product page, and the translations page show the field.
- Polish storefront page: not shown. Only `en` is enabled locally, so `/pl/default-channel` redirects to `/en` and `/pl/channel-pln` returns 200 with a "Page Not Found" page. I did not read env files or change config (user declined). Translation and fallback were shown through live API data fed into the real `mapProductExtensions`.
- Deviations from the approved spec (spec section 13): the dashboard schema was patched from the core diff instead of `fetch-local-schema`; the storefront uses the fork extension path; bulk create reports `MAX_LENGTH` for an over-long value; bulk translate error codes are now normalised.
- Incidents: one `git stash` and `git stash pop` in `saleor-dashboard` while checking a flaky test (working tree restored, 28 changed files intact). A first manual export script failed on my own mistake (model class instead of GraphQL type) and was fixed.
- Credentials: I used the documented local dev admin login to obtain short-lived tokens. No `.env` or key files were read.
- Not done: no commits, no Playwright e2e tests (excluded by the user), no run of the dashboard export dialog.
