# Agent report: product "storage conditions" field

## Experiment info
- **Task:** add a product "storage conditions" field (plain text, optional, max 250 chars). Staff set it in the dashboard (edit page and create dialog), customers see it on the storefront product page. Also translatable, in product CSV export and in webhook payloads. DoD: implemented end to end, tests in place, everything passes locally.
- **Method:** Rosetta `coding-flow` (13 phases: discovery, design, tech plan, plan review, implementation, code review, validation, tests, test review, final validation). Human approval gates at design, plan, implementation. Work delegated to subagents (discoverer, architect, reviewer, engineer, validator, executor).
- **Runner:** Claude Code CLI, with the Rosetta plugin.
- **Model:** claude-sonnet-5-5 (orchestrator). Subagents used the models set by the workflow.
- **Start time:** about 12:20 on 2026-11-03 (EET). Approximate: the first artifact, a discovery report, is stamped 12:22:26.
- **End time:** about 15:26 on 2026-11-03 (EET). Final validation report written 13:59; the rest of the time went to Q&A with the user and this report.
- **State:** nothing committed or pushed. Changes are in the working trees. `git add -N .` was run only to produce the diffs.

## Diffs (`~/saleor-benchmark/run-output/`)
| Repo | File | Size |
|---|---|---|
| saleor | `saleor.diff` | 32 files, +1447/-7 |
| saleor-dashboard | `saleor-dashboard.diff` | 40 files, +991/-12 |
| react-storefront | `react-storefront.diff` | 17 files, +337/-4 |

The dashboard diff includes the hand-edited `schema-main.graphql` and the generated codegen files.

## Actions performed
| Action | Done | Evidence |
|---|---|---|
| Discovery of the three repos | yes | `agents/TEMP/storage-conditions/discovery-{saleor,dashboard,storefront}.md` |
| Architecture options and decision | yes | `architecture-notes.md` (3 options, Option A chosen) |
| Asked the user design questions and recorded the decisions | yes | decisions D1-D9 and I1-I6 in `coding-flow-state.md` and SPECS |
| Wrote specs and plan | yes | `plans/storage-conditions/storage-conditions-{SPECS,PLAN}.md` |
| Reviewed the plan (subagent) | yes | `review-plan.md` |
| Wrote code | yes | core: model, migration 0211, GraphQL type and inputs, translations, CSV, webhook. Dashboard: edit page, create dialog, translations page, export dialog. Storefront: extension query, mapper, PDP block, 8 locale files. See the three `.diff` files and `impl-*.md` |
| Created a DB migration and applied it to the local dev DB | yes | `saleor/product/migrations/0211_product_storage_conditions.py`, applied with the single user-approved migrate command |
| Regenerated schema and codegen | yes | core `schema.graphql` (+50), dashboard `schema-main.graphql` (hand-edited, +50) and `*.generated.ts` |
| Reviewed the code (subagent, per repo) | yes | `review-code-{core,dashboard,storefront}.md` |
| Validated the implementation | partly | `validation-impl.md`, `validation-final.md`. No staff login was available (user declined credentials), so logged-in flows are NOT VERIFIED |
| Wrote tests | yes | 14 core test files added or edited. Dashboard: 4 new test files plus edits. Storefront: 4 new test files plus an extended mapper test. See `tests-*.md` |
| Reviewed the tests (subagent) | yes | `review-tests-{core,dashboard,storefront}.md` |
| Ran tests | yes | core: 4108 passed, 1 skipped, 0 failed. Dashboard: full suite green. Storefront: `pnpm verify`, 847 tests green |
| Ran tests multiple times | yes | core baseline failed with 181 errors from a stale test DB, then passed with `--create-db`. Dashboard had one unrelated 5 s timeout flake (`ChannelPaymentGatewaysSection`) in the first final run and passed on rerun. Each suite also ran before and after the changes |
| Ran tests in a different order or randomized | no | not done |
| Ran linters, type checks and formatters | yes | dashboard type check, eslint, prettier and changesets clean. Storefront `pnpm verify` includes lint and typecheck. Core linters were part of the core checks recorded in `tests-core.md` and `validation-final.md` |
| Updated documentation | yes | `agents/IMPLEMENTATION.md` entry, `agents/MEMORY.md` lesson, core `CHANGELOG.md`, dashboard changeset `.changeset/product-storage-conditions.md`, dashboard `locale/defaultMessages.json` |
| Started the application | no | the core API, dashboard dev server and storefront dev server were already running locally. I used them and did not start them |
| Checked the API | yes | unauthenticated GraphQL queries: `storageConditions` returned null for all 29 products. Anonymous `productUpdate` was rejected with a `MANAGE_PRODUCTS` permission error. See `validation-final.md` |
| Checked the storefront live | partly | product pages `apple-juice` and `ascii-tee` render and hide the block when the value is empty. Rendering a non-empty value was NOT VERIFIED live (no way to set one without a login) and is covered by unit tests only |
| Took a screenshot of the final result | no | no screenshots taken |
| Cleaned up leftovers | partly | no throwaway users or DB rows were created. The test DB was recreated by `--create-db`. I did not run a dedicated cleanup pass over temp files, and `agents/TEMP/storage-conditions/` is left in place |
| Committed or pushed | no | not allowed by the repo `CLAUDE.md` |

## Not verified
- Dashboard UI save and create flows (no staff login).
- Translation saved in the dashboard and shown on the storefront.
- Storefront cache after a translation-only edit. The revalidate route has no translation handling.
- The 251-character validation message in the UI.
- Live CSV export.
- Storefront rendering of a non-empty value.
- Which core test is the one skipped is not identified.

## Known limitations
- Bulk translate with more than 250 characters returns a raw enum serialization error and saves nothing. The same happens for `name`.
- A dashboard build against the staging schema does not load the saved value. The target is the main (3.23) schema, as the user chose.
- Translation completion ignores the new field.
