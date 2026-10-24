# Agent report: product "storage conditions"

## Experiment info
- **Task:** add an optional "storage conditions" text field to products. Staff set it in the dashboard, and customers see it in the product description on the storefront. Done end to end, with tests.
- **Method:** Rosetta light plugin, with the `hitl` and `tech-specs` skills the task required. Flow: discovery (3 `discoverer` subagents) → HITL scope questions (2 batches) → tech spec → explicit user approval → implementation (`engineer` subagents: core first, then dashboard and storefront in parallel) → independent `reviewer` and `validator` subagents → review fixes (3 `engineer` subagents) → final fresh `validator` run → user approval of delivery.
- **Runner:** Claude Code CLI (macOS, zsh). The orchestrator delegated work to subagents.
- **Model:** Claude Sonnet 5.5 (`claude-sonnet-5-5`). Subagents are assumed to inherit it; I did not set a model override.
- **Start:** about 15:50 EDT, 2026-10-21. This is an estimate; I did not record the exact start.
- **End:** 17:56 EDT, 2026-10-21 (diff export time).
- **Repositories changed:** `saleor`, `saleor-dashboard`, `react-storefront`. Nothing is committed. The workspace root is not a git repo, but it holds `plans/`, `agents/IMPLEMENTATION.md` and this folder.
- **Diffs:** `run-output/saleor.diff` (22 files, 1436 lines), `run-output/saleor-dashboard.diff` (38 files, 1493 lines), `run-output/react-storefront.diff` (20 files, 605 lines). They were created with `git add -N .` followed by `git diff`, so new files appear in them. This left new files marked intent-to-add in each repo's index.

## Actions performed

| Action | Done | Evidence |
|---|---|---|
| Wrote code | yes | Core: model, migration `0211`, GraphQL, webhook, CSV, `schema.graphql`, `CHANGELOG.md`. Dashboard: fragments, forms, create dialog, translations page, generated types. Storefront: query extension, mapper, PDP component. All of it is in the three `.diff` files. The code was written by `engineer` subagents. |
| Reviewed the code | yes | An independent `reviewer` subagent made a static review of all three diffs and found 13 items. The notable ones were the `collectionTranslate` crash and the wrong storefront placement. I fixed those findings in a follow-up round. |
| Wrote tests | yes | Core: 25 storage-conditions tests in 4 new files, plus regression tests in the bulk-translate files. Dashboard: new and extended Jest tests, for example `ProductDetailsForm.test.tsx` and `TranslationsProductsPage.test.tsx`. Storefront: `product-attributes.test.ts`, `storage-conditions.test.ts`, `storefront-view.test.ts` and others. |
| Ran tests | yes | Core: `uv run pytest --reuse-db -n0 …` gave 3869 passed, 1 skipped. Dashboard: `pnpm exec jest -w 4` gave 6155 passed. Storefront: `pnpm verify` gave 806 tests passed. Also run: `check-types`, ESLint, ruff, mypy, GraphQL Inspector, `makemigrations --check`. |
| Ran tests multiple times | yes | Core suites ran in the engineer round, the fix round and the final validation. `pnpm verify` ran in the engineer, fix and validator rounds. Dashboard Jest ran in the engineer round and the final validation. Earlier full `pnpm test` runs had unrelated timeouts that passed on a lower-worker re-run. |
| Ran tests in a different order | no | I did not use random or reordered runs. The default xdist run was interrupted and I used `-n0` instead. |
| Cleaned up leftovers | partly | The core engineer dropped the partial `test_saleor_gw*` test databases and deleted a throwaway probe. The storefront engineer deleted a stray `/tmp/x` log. Scratch logs and a schema backup remain under the session scratchpad. The `brew install libmagic` stays (the user accepted it). |
| Updated documentation | yes | `agents/IMPLEMENTATION.md` (new workstream entry), the spec `plans/STORAGE-CONDITIONS/STORAGE-CONDITIONS-SPECS.md` (status), and `saleor/CHANGELOG.md`. Dashboard `locale/defaultMessages.json` was regenerated. I did not update `docs/CONTEXT.md` or `docs/ARCHITECTURE.md`. |
| Started the application | partly | I did not start the app from scratch. The dashboard (:9000) and storefront (:3000) dev servers were already running. I restarted the API container with `docker restart saleor-benchmark-api`, once during the core work and once at your request, and checked it. I also applied migration `0211` to the local dev DB with `uv run python manage.py migrate`. |
| Checked the API | yes | `/health/` returned 200. Introspection shows `storageConditions` on `Product`, `ProductInput`, `ProductTranslation` and `TranslationInput`. A read-only product query returned `null` for existing products. A structural comparison of the live and regenerated schemas found 0 differences. |
| Took a screenshot of the final result | no | None taken. I did not open the dashboard or storefront in a browser, and I ran no live GraphQL mutation because I have no staff credentials. UI behaviour is covered only by unit and component tests. |

## Other notes
- Two decisions came out of the HITL rounds. Where the storefront block goes: the first version put it after the whole accordion, and you asked for it directly after the description. How the dashboard behaves on the staging schema: you chose `@lockSchema` on reads only.
- Not done: the dashboard changeset (`pnpm run change:add`), and a native-speaker review of the 7 non-English storefront labels.
- Known gaps in the dashboard, listed in `agents/IMPLEMENTATION.md`: the translation progress count, the app-bridge payload and the export dialog do not cover the new field.
- `pnpm run format:check` in the dashboard fails on `agents/MEMORY.md`. I did not touch that file.
- Side effects outside the repos: `brew install libmagic` (the user later confirmed it is fine) and two local API container restarts.
- Nothing was committed. After the diff export, each repo's index has the new files marked intent-to-add.
