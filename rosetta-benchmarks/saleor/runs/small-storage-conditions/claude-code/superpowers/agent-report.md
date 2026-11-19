# Report: small-storage-conditions / claude-code / superpowers

## Experiment info

| Field | Value |
|---|---|
| Task | Add an optional, translatable "storage conditions" field to products: set in the dashboard, shown in the product description on the storefront; later extended (user requirement) to product webhook payloads and CSV export. No filter/search. |
| Method | Superpowers skills: brainstorming (architectural path) -> writing-plans -> executing-plans (inline) + test-driven-development; one fresh-context final review by a subagent. |
| Runner | Claude Code (CLI) |
| Model | Claude Sonnet 5.5 (`claude-sonnet-5-5`); final-review subagent ran on Opus |
| Start time | Not recorded by me. Earliest artifact of the task: design spec written 2026-10-19 14:48 EEST (brainstorming began shortly before). |
| End time | 2026-10-19 ~15:50 EEST (diffs saved) |
| Repos changed | `saleor`, `saleor-dashboard`, `react-storefront` (all left uncommitted; `git add -N .` run only to produce the diffs) |

Not a git repo, so no diff: `/Users/agavrilita/saleor-benchmark/docs/superpowers/{specs,plans}/` (spec and plan written there).

## Diffs (this directory)

| File | Size | Notes |
|---|---|---|
| `saleor.diff` | 22 files, +767/-4 | includes new migration `0211_product_storage_conditions.py` |
| `saleor-dashboard.diff` | 39 files, +4756/-2575 | **Mostly not hand-written**: `schema-main.graphql` and `src/graphql/*.generated.ts` were already modified before this task started (setup had synced them to the local API); my codegen re-ran on top of that, so those files carry a large pre-existing diff. Excluding them: 33 files, +639/-31. |
| `react-storefront.diff` | 17 files, +190/-5 | includes an automatic 10-line `CLAUDE.md` change written by `next dev` (not by me) |

## Actions performed

| Action | Done? | Evidence |
|---|---|---|
| Explored the code before designing | yes | read-only greps/reads of models, GraphQL types, translation mutations, dashboard form/translations, storefront PDP/mappers |
| Asked clarifying question / wrote back understanding | yes | one question (translatable?), answered yes; assumptions listed in chat |
| Wrote design spec and implementation plan | yes | `docs/superpowers/specs/2026-10-19-product-storage-conditions-design.md`, `docs/superpowers/plans/2026-10-19-product-storage-conditions.md` |
| Wrote code | yes | see the three `.diff` files; backend model/migration/GraphQL/translations/webhook payload/CSV export, dashboard form/translations/export dialog, storefront query/mapper/component/page/locales |
| Wrote tests | yes | backend: create/update/translate/bulk-translate/queries/category guard/webhook payload/CSV headers+export; dashboard: payload, form, translations builder, completion, export fields, staging-schema gating; storefront: translation picker, extension mapper, component render |
| Followed TDD (watched tests fail first) | yes, mostly | RED observed for backend (12 failed), dashboard (9 failed, later 6, 3 staging, export), storefront (17 failed), webhook/CSV; exception: the category-translate guard test was written together with its implementation, so its RED was not observed separately |
| Ran tests | yes | `docker exec ... pytest ...`, `npx jest ...`, `npx vitest run` / `pnpm test:run` |
| Ran tests multiple times | yes | targeted subsets after each change, then broad suites; e.g. backend 12 new tests -> 955 -> 14262 -> 3674 passed; dashboard full jest run twice; storefront 807 passed |
| Ran tests in a different order / randomized | no | only different subsets and xdist parallelism (`-n 4/6`); no shuffle/random-order option used |
| Ran linters / type checks | yes | `ruff check` + `ruff format --check` (clean), `tsc --noEmit`, `tsc-strict` (clean), eslint (0 errors), storefront `pnpm typecheck`/`pnpm lint` (0 errors), `data:lock:check` ok |
| Regenerated generated artifacts | yes | backend `get_graphql_schema` -> `schema.graphql` (verified up to date); dashboard schema via introspection of local API + `generate:main`/`generate:staging`; storefront `pnpm generate`; `extract-messages` |
| Fixed a defect found by a test run | yes | lockSchema validation failure on staging schema -> `@lockSchema(schema: "main")` + `isMainSchema()` gating |
| Reviewed the code | yes | fresh-context review by an Opus subagent over all three repos; I also read diffs/outputs myself |
| Acted on review findings | yes | 2 findings fixed test-first: bulk-translate `max_length` error code (RED reproduced then GREEN), translation completion count mismatch; 1 finding ruled "leave" (app-SDK payload); minors deferred |
| Updated documentation | yes | `saleor/CHANGELOG.md`, `saleor-dashboard/.changeset/storage-conditions-field.md`, `locale/defaultMessages.json`, GraphQL field/enum descriptions tagged `ADDED_IN_323`, spec/plan docs |
| Started the application | no | the stack (docker `saleor-benchmark-api`, `next dev` on :3001, dashboard vite on :9000) was already running; I did not start or restart anything. I applied migration `0211` to the dev DB (`manage.py migrate product`, output: `Applying product.0211_product_storage_conditions... OK`) |
| Checked the API | yes | scripted GraphQL calls against `http://localhost:8000/graphql/`: `productUpdate`, `productTranslate`, translatable-content query all returned the value |
| Checked the storefront output | yes | `curl http://localhost:3001/en/default-channel/products/apple-juice` HTML contained "Storage conditions" and "Keep refrigerated"; translated (`pl`) rendering could not be checked live (locale not enabled locally) |
| Took a screenshot / opened the UI in a browser | no | no screenshots; dashboard form and export checkbox were verified by tests only, not visually |
| Cleaned up leftovers | partly | yes: reverted demo product (id 152) storage conditions to empty via API, removed a stray `/tmp/pdp.html`; no: scratch files left in the session scratchpad (`schema-*.graphql`, `introspect.cjs`, `e2e.py`, `progress.md`, `lint.out`, saved HTML) and the Docker test DB was reused (`--reuse-db`) |
| Committed / pushed | no | per repo rules; only `git add -N .` for the diffs |

## Known gaps / caveats (also reported to the user)

- Storage conditions are not shown in cart, checkout, order lines or order emails (not requested).
- Backend allows whitespace-only values; only the storefront trims them.
- No test for `productBulkCreate` / `productBulkUpdate` with the new field.
- Non-English storefront labels (de, fi, fr, ja, ko, nb, pl) written by the model, not reviewed by a native speaker.
- Full dashboard jest run showed load-related flaky failures in unrelated suites (different ones each run); all passed when re-run in isolation.
