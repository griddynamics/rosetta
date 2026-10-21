# Agent report: product "storage conditions"

## Experiment info
- Task: add an optional, translatable "storage conditions" field (plain text, max 250 chars) to Products. Staff set it in the dashboard; customers see it in a separate labelled block after the description on the storefront. Also in product webhook payloads and CSV export; no filter/search.
- Method: Rosetta `coding-flow` (plugin mode) with HITL gates: discovery, design (approved), specs + plan with independent review (approved), implementation (approved), tests, test review, final validation. Work delegated to subagents (architect, engineer, reviewer, validator).
- Runner: Claude Code CLI (macOS, zsh), workspace ~/saleor-benchmark. Repos: `saleor`, `saleor-dashboard`, `react-storefront`.
- Model: orchestrator Sonnet 5.5 (`claude-sonnet-5-5`). Architect subagent requested as `opus`; engineer, reviewer and validator subagents requested as `sonnet`.
- Start/end: first workflow artifact (state file) created 2026-10-21 13:32 CEST; this report written 14:41 CEST. The session itself began earlier; I do not have an exact start timestamp, so the start is approximate.
- Nothing committed or pushed. For this report `git add -N .` was run in each repo (intent-to-add only; this changes the git index, not history).

## Diffs (git add -N . && git diff)
| Repo | File | Size | Stat |
|---|---|---|---|
| saleor | run-output/saleor.diff | 70k | 32 files, +1237 / -15 |
| saleor-dashboard | run-output/saleor-dashboard.diff | 116k | 38 files, +1270 / -37 |
| react-storefront | run-output/react-storefront.diff | 22k | 16 files, +285 / -3 |

## Actions
| Action | Done | Evidence |
|---|---|---|
| Wrote code | yes | Sessions S1/S2/S3 by engineer subagents; the three .diff files above. Migration `saleor/saleor/product/migrations/0211_product_storage_conditions.py`. |
| Reviewed the code | yes | Three reviewer subagents, independent of the implementers: `agents/TEMP/product-storage-conditions/review-code-{saleor,dashboard,storefront}.md` (0 blockers/majors). |
| Reviewed the specs/plan | yes | `review-plan.md` (0 blockers, 3 majors fixed in the plan before approval). |
| Wrote tests | yes | T1/T2/T3: 14 backend test files, dashboard tests (edited + 7 new), 3 new storefront test files; all in the .diff files. |
| Reviewed the tests | yes | `review-tests-{saleor,dashboard,storefront}.md`; their findings were fixed except those listed under "Not done". |
| Ran tests | yes | Backend in container `saleor-benchmark-saleor-1` (4004 passed, 1 skipped, 0 failed); dashboard `pnpm test` (937 suites, 6169 tests); storefront `test:run` (130 files, 835 tests). Source: `validation-v2.md`. |
| Ran tests multiple times | yes | Engineers re-ran after each fix; validators V1 and V2 each ran every suite from scratch; dashboard timeout flakes (e.g. SiteSettingsPage, SingleReferenceField, ProductTile, SettingsToggleRow) were re-run alone and passed. |
| Ran tests in a different order | no | Not done on purpose. Backend used `--create-db` once, then `--reuse-db`; no randomized or reversed order run. |
| Ran linters, type checks, migration checks | yes | ruff, mypy (non-test files), `makemigrations --check`, schema diff; dashboard check-types/eslint/prettier/lint:changesets; storefront typecheck/lint/design-tokens/graphql-variants/data:lock. `core:lock:check` fails only on 2 AGENTS.md lines that already failed before the change. |
| Cleaned up leftovers | partial | Validator V1 deleted the rows it created (ProductTranslation pk 30, 31; CategoryTranslation pk 1) and its staff token file; T1 deleted its temporary pytest file; V2 found only gitignored artifacts. Not fully clean: V1 reset `rating` and `search_index_dirty` on `apple-juice` by inference (not snapshotted), and `updated_at` and id counters cannot be restored. |
| Updated documentation | yes | `saleor/CHANGELOG.md` (2 bullets), `saleor-dashboard/.changeset/product-storage-conditions.md`, `locale/defaultMessages.json`, `schema.graphql`/`schema-main.graphql`. Specs and plan under `plans/product-storage-conditions/`. No repo CONTEXT/ARCHITECTURE docs exist in the workspace, so none updated. |
| Started the application | no | I did not start anything. The backend containers and a storefront dev server on :3000 were already running. The migration was applied to the local dev DB and the running API reloaded and served the new field. |
| Checked the API | yes | V1: live productUpdate/productTranslate/categoryTranslate calls (with snapshot and restore). V2: read-only introspection (`Product.storageConditions`, `ProductTranslation`, `TranslationInput`, `ProductFieldEnum.STORAGE_CONDITIONS`) and anonymous read. |
| Checked the storefront live | partial | V1/V2 GETs against :3000: apple-juice and monospace-tee return 200. V1 saw the block after Description in English. German not checkable (no `de` locale on that server); V2 saw no rendered block because values were NULL. |
| Checked the dashboard in a browser | no | No browser tool was available. Covered only by jest tests. |
| Took a screenshot of the final result | no | No browser or screenshot tool available. |

## Not done / caveats
- Not verified live: dashboard UI, German storefront render, reverse migration, product create and bulk translate against the real API, staging schema against a live staging API.
- Optional items left unchanged: gate `getProductUpdateVariables` with `isMainSchema()`, `whitespace-pre-line` for multi-line values, `trim()` in `getStorageConditions`.
- Spec change made after implementation: bulk translate over 250 chars is a request-level error (same as `name`), not a row error. No production fix was made for it.
- Backend engineer added `product_bulk_translate.py` (not in the plan) so updates to existing translations keep the value.
- mypy reports 105 errors in changed backend test files (same enum pattern as existing tests); not fixed.
