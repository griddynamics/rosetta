# Agent report: age-restricted products

## Experiment info

- **Task:** Staff can mark a product with a minimum age; customers who are too young can't buy it; the customer profile gets a birthday field. Definition of done: implemented end to end, tests in place, everything passing locally.
- **Method:** `/mattpocock-skills:grill-with-docs` (design interview, `GLOSSARY.md` and one ADR), then implementation. The backend was done directly. The dashboard and the storefront were each done by a separate background sub-agent, in parallel.
- **Runner:** Claude Code CLI on macOS. The backend ran in the existing Docker container `saleor-benchmark-saleor-1`.
- **Model:** claude-sonnet-5-5.
- **Start:** not recorded. The earliest timestamp I have is 2026-10-22 11:31 UTC (13:31 CEST), the first backend `makemigrations`. The design interview came before that.
- **End:** about 15:21 CEST on 2026-10-22, when this report was written.
- **Diffs:** `saleor.diff`, `saleor-dashboard.diff` and `react-storefront.diff` in this folder. They were made with `git add -N .` followed by `git diff`, nothing was committed. `GLOSSARY.md` and `docs/adr/` sit at the workspace root, which is not a git repository, so they are not in any diff.

## Actions

| Action | Done | Evidence |
|---|---|---|
| Interviewed the user about the design, in rounds | yes | 4 question rounds, then confirmation of the agreed rules |
| Wrote `GLOSSARY.md` | yes | `~/saleor-benchmark/GLOSSARY.md` |
| Wrote an ADR | yes | `docs/adr/0001-birthday-audit-events-survive-customer-deletion.md` |
| Wrote code | yes | backend: model fields, 3 migrations, `saleor/account/age.py`, GraphQL types and mutations, visibility and masking, checkout, draft-order and complete-checkout enforcement; dashboard and storefront through sub-agents. See the diffs. |
| Reviewed the code | no | No review pass (no code-review skill or reviewer run). Only linters and type checks, plus each sub-agent's own checks. |
| Wrote tests | yes | backend: 9 new test files, about 100 tests, covering age maths, birthday visibility and audit, product visibility, checkout, draft order, shop minimum age, product flag, and leaks. Dashboard and storefront: new tests listed in the sub-agents' reports. |
| Ran tests | yes | backend `pytest` runs per area and on the whole suite; dashboard `jest`; storefront `vitest` (the last two run by the sub-agents) |
| Ran tests multiple times | yes | full backend suite 4 times, with 9, 11 and 9 failed in the first three runs. The fourth run, with the 10 `test_tasks.py` tests excluded, gave `18421 passed, 1 skipped`. The checkout directory went from 1 benchmark failure to `1270 passed` after a fix. |
| Ran tests in a different order | no | There was no deliberate reordering or random-order run. The suite ran under xdist, and `test_tasks.py` was run serially with `-n0` for comparison. |
| Cleaned up leftovers | partly | Restored `schema.graphql` from git after I accidentally overwrote it with an empty file. Popped the git stash after the baseline comparison. Removed the temporary test-helper lines I had written. I did not delete the scratch logs in the container's `/tmp`. |
| Updated documentation | yes | `GLOSSARY.md`, ADR 0001, `saleor/CHANGELOG.md`, dashboard changeset and `docs/multi-schema.md`, storefront lock files |
| Started the application | partly | Applied my migrations to the running API's database (`manage.py migrate`) after the app was found unmigrated. Restarted the dashboard dev server with `FF_USE_STAGING_SCHEMA=true`. The API container and storefront dev server were already running. |
| Checked the API | yes | `curl` to `localhost:8000/graphql/`: `shop { minimumAge }` returned 18, and `products { isAgeRestricted ageAccess }` returned `false` and `ALLOWED`. These are the only live API checks. |
| Took a screenshot of the final result | no | I never opened a browser. The dashboard and storefront screens were not seen. |
| Ran `/cost`, `/usage` | no | These built-in commands can only be run by the user. `/context` output was pasted by the user (about 289k tokens used). |

## Test and lint results

- Backend: `ruff format`, `ruff check` and `mypy` on the changed backend modules were clean. `saleor/graphql/schema.graphql` was regenerated.
- Backend full suite, excluding `saleor/checkout/tests/test_tasks.py`: `18421 passed, 1 skipped`.
- `saleor/checkout/tests/test_tasks.py`: 10 tests fail. They fail the same way with my changes stashed, so they are not caused by this work. They count duplicated log records in this container's parallel runs.
- Storefront (sub-agent report): `vitest` 817 passed, `tsc`, eslint, prettier and the repo lint checks passed. The e2e specs were not run.
- Dashboard (sub-agent report): targeted `jest` 752 passed, `check-types:src` and the lint-rule tests passed. One unrelated test (`SortableTableBody.test.tsx`) failed once in the full run, and passes alone.

## Known gaps and notes

- The local API database was not migrated until the user reported it. I had only migrated the test database.
- The dashboard UI is hidden unless built with `FF_USE_STAGING_SCHEMA=true`, because the new fields are not in the released 3.23 schema. The running dashboard was restarted with the flag, but I did not verify the screens.
- The dashboard `saleor-dashboard.diff` includes regenerated GraphQL files that are tracked in that repo.
- Storefront gaps: the home-page featured products stay anonymous, add-to-cart errors that aren't age errors show nothing, and the new messages in 8 locales were machine-written and need a native review.
- Staff can't edit a birthday. Only the customer sets it, through `accountUpdate`.
- The privacy policy and terms were not changed. They probably need review because a birthday is new personal data.
