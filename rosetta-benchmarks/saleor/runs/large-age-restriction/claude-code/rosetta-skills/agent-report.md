# Agent report: age-restricted products

## Experiment info

| Field | Value |
|---|---|
| Task | Age-restricted products: staff mark products, young customers cannot buy them, customer birthday field. Done = implemented end to end, tests in place, all passing locally. Required skills: hitl, tech-specs |
| Method | Rosetta workflow with human approvals at each gate (brief, specs, plan, runtime strategy, core, clients, final). Planning skill: 8 sessions (00-07). Subagents: engineer, reviewer, executor, discoverer, validator. Independent review after each session |
| Runner | Claude Code CLI (macOS), working tree of `/Users/isolomatov/saleor-benchmark` (three git repos: `saleor`, `saleor-dashboard`, `react-storefront`) |
| Model | claude-sonnet-5-5 |
| Start time | Not recorded in the session. The work began on 2026-10-26 (earlier context was summarized, so the exact first timestamp is not available to me) |
| End time | 2026-10-28T13:21Z (this report) |
| Commits | None. Nothing committed or pushed. `git add -N .` was run only to produce the diffs, so the index holds intent-to-add entries |

Diffs (made with `git add -N .` then `git diff`):

| Repo | File | Size |
|---|---|---|
| saleor | `run-output/saleor.diff` | 66 files, +5784 / -39 |
| saleor-dashboard | `run-output/saleor-dashboard.diff` | 61 files, +1705 / -27 |
| react-storefront | `run-output/react-storefront.diff` | 90 files, +2104 / -153 |

Not in the diffs: changes outside the three repos. They are the workspace docs (`docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `agents/IMPLEMENTATION.md`, `agents/MEMORY.md`), the `plans/AGE-RESTRICTED-PRODUCTS/` folder, and `backups/`. The workspace root is not a git repo.

## Actions

| Action | Done | Evidence |
|---|---|---|
| Wrote code | yes | The three diffs. Core: models and migrations (product 0211, site 0053, account 0106/0107, order 0229), `saleor/account/age.py`, `age_audit.py`, `saleor/{checkout,order}/age_restriction.py`, GraphQL changes. Dashboard: product, site-settings and customer pages. Storefront: `AgeBadge`, error mapping, birthday form, add-to-cart attach-and-retry |
| Wrote specs and plan before coding | yes | `plans/AGE-RESTRICTED-PRODUCTS/AGE-RESTRICTED-PRODUCTS-BRIEF.md`, `-SPECS.md`, `-PLAN.md`, `00`-`07` plan files |
| Asked for human approvals (HITL) | yes | Brief, specs, plan, runtime strategy, core (G1) and clients (G2) approved by the user. G2 was approved with "Yes, I approve", not the exact sentence I asked for; I accepted it as a strict approval. G-final: not yet received |
| Reviewed the code | yes | Independent reviewer subagent after each session, with fixes. Examples in the handoffs: stale `Site` settings in the in-lock re-check, the 3-minute checkout lock after a blocked completion, accidental birthday erasure in the dashboard, raw backend text on the storefront. See `plans/AGE-RESTRICTED-PRODUCTS/0*-handoff.md` |
| Wrote tests | yes | New core test files: `account/tests/test_age.py`, `test_age_audit.py`, `checkout/tests/test_age_restriction.py`, `test_complete_checkout_age_restriction.py`, `order/tests/test_age_restriction.py`, `payment/gateways/stripe/tests/test_webhooks_age_restriction.py`, and the graphql account, checkout, order, product and shop age tests. Also dashboard Jest and storefront Vitest tests. Storefront `src/app/actions.test.ts` is new |
| Ran tests | yes | Core: pytest runs of 18,161 (baseline), 18,372 and 18,615 passed (1 skipped). Dashboard: `check-types` and full Jest. Storefront: `pnpm verify` (998 tests, last run exit 0) |
| Ran tests multiple times | yes | The core full suite ran three times. Three Jest tests that failed under load (`CustomerTypeDetailsPage.dirtyState` x2, `OrderAddTransaction`) were re-run alone and passed. `pnpm verify` ran several times during the storefront fix |
| Ran tests in the repo's dev container | partly | At your request: `docker compose ... exec -T -w /app saleor pytest`. The failing test file passed (8 tests) and 129 other new age tests passed. The full backend suite was NOT run in the container |
| Ran tests in a different order | no | No reversed or random-order run. Parallel runs (`-n 4` vs `-n0`) only change distribution, so they are not an order check |
| Ran linters and type checks | yes | Core: ruff check and format, mypy on changed non-test files, schema diff empty, `makemigrations --check` clean, semgrep 0 findings (earlier session), deptry. Dashboard: eslint on changed files (0 errors after one fix), prettier, knip, `check-types`. Storefront: eslint, typecheck, `data:lock`, `core:lock` inside `pnpm verify` |
| Cleaned up leftovers | partly | Stopped the isolated API on port 8001 and removed the `age-check-db` container (checked then). Not cleaned: `backups/saleor-dev-pre-age-migration-*.dump` (contains customer data, kept on purpose for rollback), scratchpad files, and `git add -N` index entries (requested). I could not re-check the container state at report time because the Docker daemon is not running now |
| Updated documentation | yes | `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `agents/IMPLEMENTATION.md`, `agents/MEMORY.md`, each repo's `agents/IMPLEMENTATION.md`, core `CHANGELOG.md`, dashboard `.changeset/age-restricted-products.md`, storefront `data-layer.lock.md` and `paper-version.json`. Handoffs and the decision-to-test table are in `plans/AGE-RESTRICTED-PRODUCTS/HANDOFF.md` |
| Started the application | yes | An isolated `uvicorn saleor.asgi:application` on 127.0.0.1:8001 against a throwaway DB, used by the validator, then stopped. The dev API on port 8000 was already running; I did not start it. I did not start the dashboard or storefront dev servers |
| Checked the API | yes | An independent validator ran the GraphQL scenarios on port 8001, all PASS: `plans/AGE-RESTRICTED-PRODUCTS/07-validation-report.md`. A curl check showed a guest line add returns `AGE_RESTRICTION_LOGIN_REQUIRED`. After the dev-DB migration, `{ shop { minimumAge timeZone } }` on port 8000 returned 18 and UTC |
| Migrated the dev database (user request) | yes | Backup first with `pg_dump -Fc` (1,623 entries), then `manage.py migrate` applied the 5 pending migrations. `showmigrations` shows none pending and `makemigrations --check` is clean |
| Fixed a failing test (user request) | yes | `test_automatic_completion_blocked_for_ineligible_customer` counted duplicate log records in the dev container. Now asserts messages without a count, and uses `monkeypatch` for `propagate`. Passes in the container |
| Fixed the add-to-cart bug for a signed-in adult (user request) | yes, not browser-verified | Cause: a cart created before sign-in had no customer attached. `addVariantToCart` now attaches the customer and retries once. Three new unit tests; `pnpm verify` exit 0. I did not retry it in the browser on localhost:3000 |
| Took a screenshot of the final result | no | None taken. I did not drive the dashboard or storefront UI in a browser |

## Caveats

- There is no manual UI check of the dashboard or storefront. Their behavior is covered by unit tests, `pnpm verify` and the backend end-to-end run only.
- After the last storefront fix I ran the storefront gate only. The core full suite was last run before the test-only fix, which I verified in the dev container for that file and 129 related tests.
- Dashboard Jest has 3 tests that fail under load in files I did not touch; they pass alone. Older core tests such as `saleor/checkout/tests/test_tasks.py` use the same count-based log assertions and may fail in the dev container. I did not run or change them.
- Accepted risks and deviations are listed in `plans/AGE-RESTRICTED-PRODUCTS/07-handoff.md` and earlier handoffs.
- Final acceptance (G-final) is still pending from the user.
